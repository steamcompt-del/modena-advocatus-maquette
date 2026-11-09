/* Contrôles locaux indicatifs. Aucun document ni texte OCR ne quitte ce navigateur.
   Une analyse sans alerte ne constitue jamais une validation du document. */
(function (global) {
  'use strict';
  const base = new URL('.', document.currentScript?.src || document.baseURI);
  const vendor = new URL('assets/vendor/', base);
  const limits = Object.freeze({ maxPages: 200, analysisMs: 90000, operationMs: 20000, maxImagePixels: 40000000, maxCanvasPixels: 4000000, analysisWidth: 1200 });
  let pdfLibraryPromise;
  let ocrLibraryPromise;
  const canvasJobs = new WeakMap();

  function issue(code, message) { return { code, message }; }
  function failure(code, message) { const error = new Error(message); error.code = code; return error; }
  function cancelled(signal) { if (signal?.aborted) throw failure('cancelled', 'L’analyse a été interrompue.'); }
  function notify(callback, progress) { try { callback?.(progress); } catch { /* L’interface ne doit pas interrompre le moteur. */ } }
  function run(promise, { signal, timeout = limits.operationMs, cancel } = {}) {
    return new Promise((resolve, reject) => {
      let settled = false;
      let timer;
      function finish(callback, value, stop = false) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
        if (stop) { try { Promise.resolve(cancel?.()).catch(() => {}); } catch { /* Déjà arrêté. */ } }
        callback(value);
      }
      function abort() { finish(reject, failure('cancelled', 'L’analyse a été interrompue.'), true); }
      // Attacher les deux branches même si le signal est déjà annulé évite une promesse orpheline.
      Promise.resolve(promise).then(value => finish(resolve, value), error => finish(reject, error));
      if (signal?.aborted) { abort(); return; }
      signal?.addEventListener('abort', abort, { once: true });
      timer = setTimeout(() => finish(reject, failure('timeout', 'L’analyse prend trop de temps sur cet appareil. Une vérification manuelle est nécessaire.'), true), timeout);
    });
  }

  function fileKind(bytes) {
    if (bytes.length >= 8 && [137,80,78,71,13,10,26,10].every((value,index) => bytes[index] === value)) return 'png';
    if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'jpeg';
    let start = '';
    for (let index = 0; index < Math.min(1024,bytes.length); index++) start += String.fromCharCode(bytes[index]);
    if (start.includes('%PDF-')) return 'pdf';
    return null;
  }
  async function inspect(file, { maxFileSizeMB = 100, signal } = {}) {
    cancelled(signal);
    if (!file || typeof file.slice !== 'function' || !Number.isFinite(file.size) || file.size < 1) throw failure('empty-file', 'Ce fichier est vide ou ne peut pas être ouvert. Choisissez une autre copie.');
    const maxSize = Number(maxFileSizeMB);
    if (!(maxSize > 0) || file.size > maxSize * 1024 * 1024) throw failure('file-too-large', `Ce fichier dépasse la limite de ${maxSize > 0 ? maxSize : 10} Mo par fichier.`);
    const bytes = new Uint8Array(await run(file.slice(0,65536).arrayBuffer(), { signal }));
    const format = fileKind(bytes);
    if (!format) throw failure('unsupported-format', 'Ce fichier ne correspond pas à un PDF, un JPG ou un PNG lisible.');
    const extension = String(file.name || '').split('.').pop().toLowerCase();
    if (file.name && !({ pdf: ['pdf'], png: ['png'], jpeg: ['jpg','jpeg'] }[format]).includes(extension)) throw failure('format-mismatch', 'Le contenu du fichier ne correspond pas à son extension. Exportez-le à nouveau en PDF, JPG ou PNG.');
    const acceptedMimes = { pdf: ['application/pdf'], png: ['image/png'], jpeg: ['image/jpeg','image/jpg'] };
    if (file.type && file.type !== 'application/octet-stream' && !acceptedMimes[format].includes(file.type.toLowerCase())) throw failure('format-mismatch', 'Le type annoncé du fichier ne correspond pas à son contenu. Choisissez une autre copie.');
    let width = 0, height = 0;
    if (format === 'png' && bytes.length >= 24) {
      const view = new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
      width = view.getUint32(16); height = view.getUint32(20);
    } else if (format === 'jpeg') {
      // Lecture des dimensions avant décodage, sans supposer que le fichier est bien formé.
      let offset = 2;
      while (offset + 8 < bytes.length) {
        if (bytes[offset] !== 255) break;
        const marker = bytes[offset + 1];
        if (marker === 218 || marker === 217) break;
        if (marker === 255) { offset++; continue; }
        const length = (bytes[offset+2] << 8) + bytes[offset+3];
        if (length < 2) break;
        if ([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)) { height = (bytes[offset+5] << 8) + bytes[offset+6]; width = (bytes[offset+7] << 8) + bytes[offset+8]; break; }
        offset += length + 2;
      }
    }
    return { format, kind: format === 'pdf' ? 'pdf' : 'image', width, height };
  }

  async function getPdfLibrary(signal) {
    if (!pdfLibraryPromise) {
      pdfLibraryPromise = import(new URL('pdfjs/pdf.mjs', vendor).href).then(library => {
        library.GlobalWorkerOptions.workerSrc = new URL('pdfjs/pdf.worker.mjs', vendor).href;
        return library;
      }).catch(error => { pdfLibraryPromise = null; throw failure('engine-unavailable', 'Le lecteur PDF n’a pas pu démarrer. Réessayez ou demandez une vérification au cabinet.'); });
    }
    return run(pdfLibraryPromise, { signal });
  }
  async function openPdf(file, signal) {
    const library = await getPdfLibrary(signal);
    const data = new Uint8Array(await run(file.arrayBuffer(), { signal }));
    cancelled(signal);
    let task;
    try {
      task = library.getDocument({ data, cMapUrl: new URL('pdfjs/cmaps/', vendor).href, cMapPacked: true,
        standardFontDataUrl: new URL('pdfjs/standard_fonts/', vendor).href, wasmUrl: new URL('pdfjs/wasm/', vendor).href,
        isEvalSupported: false, enableXfa: true, useSystemFonts: false, stopAtErrors: true });
      const pdf = await run(task.promise, { signal, cancel: () => task.destroy() });
      if (pdf.isPureXfa) { await task.destroy(); throw failure('unsupported-pdf', 'Ce PDF contient un formulaire spécial que l’aperçu ne peut pas vérifier. Exportez une copie PDF standard ou demandez une vérification manuelle.'); }
      return { pdf, operations:library.OPS, close: () => task.destroy() };
    } catch (error) {
      try { await task?.destroy(); } catch { /* Ressources déjà libérées. */ }
      if (error.code) throw error;
      if (error.name === 'PasswordException') throw failure('password-protected', 'Ce PDF est protégé par un mot de passe. Choisissez une copie accessible au cabinet.');
      if (['InvalidPDFException','MissingPDFException','FormatError'].includes(error.name)) throw failure('invalid-pdf', 'Ce PDF est endommagé ou ne peut pas être ouvert. Choisissez une autre copie.');
      throw failure('pdf-unavailable', 'Le PDF n’a pas pu être vérifié sur cet appareil. Réessayez ou demandez une vérification manuelle.');
    }
  }
  async function openImage(file, info, signal) {
    if (info.width * info.height > limits.maxImagePixels) throw failure('resource-limit', 'Cette image est trop grande pour être analysée sur cet appareil. La qualité reste à vérifier.');
    const image = new Image();
    const url = URL.createObjectURL(file);
    let released = false;
    const close = () => { if (!released) { released = true; image.src = ''; URL.revokeObjectURL(url); } };
    try {
      const ready = new Promise((resolve,reject) => { image.onload = resolve; image.onerror = () => reject(failure('invalid-image','Cette image ne peut pas être ouverte. Choisissez une autre copie.')); });
      image.src = url;
      await run(ready, { signal, cancel: close });
      if (!image.naturalWidth || !image.naturalHeight) throw failure('invalid-image','Cette image ne contient pas de page visible.');
      if (image.naturalWidth * image.naturalHeight > limits.maxImagePixels) throw failure('resource-limit','Cette image est trop grande pour être analysée sur cet appareil. La qualité reste à vérifier.');
      return { image, width: image.naturalWidth, height: image.naturalHeight, close };
    } catch (error) { close(); throw error; }
  }

  function dimensions(width,height,maxWidth,rotation = 0) {
    const angle = ((Math.round(rotation / 90) * 90) % 360 + 360) % 360;
    const swap = angle === 90 || angle === 270;
    const targetWidth = swap ? height : width, targetHeight = swap ? width : height;
    const scale = Math.min(Math.max(100,Math.min(2400,Number(maxWidth) || 1100)) / targetWidth, Math.sqrt(limits.maxCanvasPixels / (targetWidth * targetHeight)));
    return { width: Math.max(1,Math.round(targetWidth*scale)), height: Math.max(1,Math.round(targetHeight*scale)), scale, angle };
  }
  function drawImage(source,canvas,maxWidth,rotation) {
    const size = dimensions(source.width,source.height,maxWidth,rotation);
    canvas.width = size.width; canvas.height = size.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw failure('canvas-unavailable','L’aperçu n’est pas disponible dans ce navigateur.');
    context.fillStyle = '#fff'; context.fillRect(0,0,canvas.width,canvas.height);
    context.save(); context.translate(canvas.width/2,canvas.height/2); context.rotate(size.angle*Math.PI/180);
    context.drawImage(source.image,-source.width*size.scale/2,-source.height*size.scale/2,source.width*size.scale,source.height*size.scale); context.restore();
    return { width: source.width, height: source.height };
  }
  async function drawPdfPage(page,canvas,maxWidth,rotation,signal) {
    cancelled(signal);
    const native = page.getViewport({ scale: 1, rotation: page.rotate + rotation });
    const size = dimensions(native.width,native.height,maxWidth);
    const viewport = page.getViewport({ scale: size.scale, rotation: page.rotate + rotation });
    canvas.width = Math.max(1,Math.ceil(viewport.width)); canvas.height = Math.max(1,Math.ceil(viewport.height));
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw failure('canvas-unavailable','L’aperçu n’est pas disponible dans ce navigateur.');
    const task = page.render({ canvasContext: context, viewport, background: 'rgb(255,255,255)' });
    try { await run(task.promise, { signal, cancel: () => task.cancel() }); }
    catch (error) {
      // cancel() lance l'arrêt ; attendre sa promesse libère effectivement le canvas.
      task.cancel(); await task.promise.catch(() => {}); throw error;
    }
    return { width: Math.round(native.width), height: Math.round(native.height) };
  }

  function multiply(left,right) {
    return [left[0]*right[0]+left[2]*right[1],left[1]*right[0]+left[3]*right[1],
      left[0]*right[2]+left[2]*right[3],left[1]*right[2]+left[3]*right[3],
      left[0]*right[4]+left[2]*right[5]+left[4],left[1]*right[4]+left[3]*right[5]+left[5]];
  }
  // Détection conservatrice d'une page scannée, à partir des pixels ORIGINAUX
  // et des dimensions physiques de placement, jamais à partir du canvas agrandi.
  function analyzePdfImages(operatorList,{ operations,view,userUnit=1,getImageSize=()=>null } = {}) {
    if (!operations || !Array.isArray(view) || view.length!==4) return [];
    const pageWidth=Math.abs(view[2]-view[0]),pageHeight=Math.abs(view[3]-view[1]),pageArea=pageWidth*pageHeight;
    if (!pageArea) return [];
    let state={ matrix:[1,0,0,1,0,0],textMode:0,fillAlpha:1 },visibleCharacters=0;
    const stack=[],candidates=[];
    const save=()=>stack.push({ ...state,matrix:[...state.matrix] });
    const restore=()=>{ if(stack.length)state=stack.pop(); };
    function candidate(width,height,matrix) {
      if (!(width>0&&height>0)) return;
      const footprint=Math.abs(matrix[0]*matrix[3]-matrix[1]*matrix[2]);
      if (footprint/pageArea<0.65 || footprint/pageArea>1.5) return;
      const points=[[0,0],[1,0],[0,1],[1,1]].map(([x,y])=>[matrix[0]*x+matrix[2]*y+matrix[4],matrix[1]*x+matrix[3]*y+matrix[5]]);
      const left=Math.max(Math.min(...points.map(p=>p[0])),Math.min(view[0],view[2]));
      const right=Math.min(Math.max(...points.map(p=>p[0])),Math.max(view[0],view[2]));
      const bottom=Math.max(Math.min(...points.map(p=>p[1])),Math.min(view[1],view[3]));
      const top=Math.min(Math.max(...points.map(p=>p[1])),Math.max(view[1],view[3]));
      if (Math.max(0,right-left)*Math.max(0,top-bottom)/pageArea<0.65) return;
      const printedWidth=Math.hypot(matrix[0],matrix[1])*userUnit,printedHeight=Math.hypot(matrix[2],matrix[3])*userUnit;
      if (!printedWidth||!printedHeight)return;
      candidates.push({ width,height,dpi:Math.min(width*72/printedWidth,height*72/printedHeight) });
    }
    for(let index=0;index<operatorList.fnArray.length;index++){
      const op=operatorList.fnArray[index],args=operatorList.argsArray[index]||[];
      if(op===operations.save){save();continue;}
      if(op===operations.restore){restore();continue;}
      if(op===operations.transform){state.matrix=multiply(state.matrix,args);continue;}
      if(op===operations.paintFormXObjectBegin){save();if(args[0])state.matrix=multiply(state.matrix,args[0]);continue;}
      if(op===operations.paintFormXObjectEnd){restore();continue;}
      if(op===operations.beginGroup){save();if(args[0]?.matrix)state.matrix=multiply(state.matrix,args[0].matrix);continue;}
      if(op===operations.endGroup){restore();continue;}
      if(op===operations.setTextRenderingMode){state.textMode=args[0];continue;}
      if(op===operations.setGState){for(const [key,value]of args[0]||[])if(key==='ca')state.fillAlpha=value;continue;}
      if([operations.showText,operations.showSpacedText].includes(op)&&![3,7].includes(state.textMode)&&state.fillAlpha>0){
        visibleCharacters+=(args[0]||[]).reduce((count,glyph)=>count+(typeof glyph?.unicode==='string'?glyph.unicode.trim().length:0),0);continue;
      }
      if(op===operations.paintImageXObject){const size=getImageSize(args[0]);candidate(args[1]||size?.width,args[2]||size?.height,state.matrix);continue;}
      if(op===operations.paintInlineImageXObject){candidate(args[0]?.width,args[0]?.height,state.matrix);continue;}
      if(op===operations.paintImageXObjectRepeat){
        const size=getImageSize(args[0]);for(let position=0;position<(args[3]?.length||0);position+=2)candidate(size?.width,size?.height,multiply(state.matrix,[args[1],0,0,args[2],args[3][position],args[3][position+1]]));continue;
      }
      if(op===operations.paintInlineImageXObjectGroup){for(const placement of args[1]||[])candidate(placement.w,placement.h,multiply(state.matrix,placement.transform));}
    }
    // Une image décorative sous du texte vectoriel ne suffit pas à qualifier une page de scan.
    // Le texte OCR invisible (mode 3) ne masque pas une image scannée de faible définition.
    if(visibleCharacters>=80)return [];
    const scan=candidates.find(image=>image.dpi<120);
    return scan?[issue('low-resolution-scan',`L’image principale de cette page est de faible définition (${scan.width} × ${scan.height} pixels). Le texte peut rester difficile à lire même en zoomant. Vérifiez-la ou fournissez une meilleure copie.`)]:[];
  }

  // Heuristiques volontairement prudentes : indices à vérifier, pas score de lisibilité.
  function analyzePixels(imageData, { originalWidth = imageData.width, originalHeight = imageData.height, checkResolution = true } = {}) {
    const { data, width, height } = imageData;
    if (!data || width < 3 || height < 3 || data.length < width*height*4) return [issue('analysis-unavailable','L’image est trop petite pour analyser sa qualité.')];
    const pixels = width*height;
    const gray = new Float32Array(pixels);
    let sum = 0, squared = 0, dark = 0, almostWhite = 0;
    for (let index = 0; index < pixels; index++) {
      const offset = index*4, alpha = data[offset+3]/255;
      const value = (0.2126*data[offset]+0.7152*data[offset+1]+0.0722*data[offset+2])*alpha + 255*(1-alpha);
      gray[index] = value; sum += value; squared += value*value;
      if (value < 180) dark++; if (value > 247) almostWhite++;
    }
    const mean = sum/pixels, deviation = Math.sqrt(Math.max(0,squared/pixels-mean*mean));
    let lapSum = 0, lapSquared = 0, count = 0;
    for (let y = 1; y < height-1; y+=2) for (let x = 1; x < width-1; x+=2) {
      const index = y*width+x;
      const lap = 4*gray[index]-gray[index-1]-gray[index+1]-gray[index-width]-gray[index+width];
      lapSum += lap; lapSquared += lap*lap; count++;
    }
    const sharpness = count ? lapSquared/count-(lapSum/count)**2 : 0;
    const issues = [];
    if (checkResolution && (Math.min(originalWidth,originalHeight) < 600 || Math.max(originalWidth,originalHeight) < 1000)) issues.push(issue('low-resolution','La définition de cette image peut être insuffisante pour lire les petits caractères. Vérifiez avec le zoom.'));
    if (almostWhite/pixels > 0.9997 && dark/pixels < 0.0003) issues.push(issue('possibly-blank','Cette page semble vide ou très pâle. Vérifiez qu’elle contient bien le document attendu.'));
    else if (mean < 40 && dark/pixels > 0.95) issues.push(issue('too-dark','Cette page semble très sombre. Vérifiez que le texte reste lisible.'));
    else {
      if (deviation < 14) issues.push(issue('low-contrast','Le contraste semble faible. Vérifiez que les informations restent lisibles.'));
      if (deviation >= 14 && sharpness < 20) issues.push(issue('possible-blur','Cette page semble manquer de netteté. Vérifiez le texte en zoomant.'));
    }
    return issues;
  }

  async function analyze(file, { maxFileSizeMB = 10, onProgress, signal } = {}) {
    const report = { version: 1, status: 'partial', fileName: String(file?.name || 'document'), size: Number(file?.size)||0,
      kind: /\.pdf$/i.test(file?.name || '') ? 'pdf' : 'image', pageCount: 0, analyzedPages: 0, pages: [], issues: [], analyzedAt: Date.now() };
    const started = Date.now();
    let pdfDocument, imageSource, canvas;
    try {
      notify(onProgress,{ stage:'opening',current:0,total:0,message:'Ouverture du document…' });
      const info = await inspect(file,{ maxFileSizeMB,signal }); report.kind = info.kind;
      canvas = document.createElement('canvas');
      if (info.kind === 'image') {
        report.pageCount = 1;
        imageSource = await openImage(file,info,signal);
        drawImage(imageSource,canvas,limits.analysisWidth,0);
        cancelled(signal);
        const issues = analyzePixels(canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height),{ originalWidth:imageSource.width,originalHeight:imageSource.height });
        report.pages.push({ number:1,width:imageSource.width,height:imageSource.height,issues }); report.analyzedPages = 1;
        notify(onProgress,{ stage:'analyzing',current:1,total:1,message:'Image analysée.' });
      } else {
        pdfDocument = await openPdf(file,signal); report.pageCount = pdfDocument.pdf.numPages;
        if (!Number.isInteger(report.pageCount) || report.pageCount < 1) throw failure('invalid-pdf','Ce PDF ne contient aucune page accessible.');
        for (let number = 1; number <= report.pageCount; number++) {
          cancelled(signal);
          if (number > limits.maxPages || Date.now()-started > limits.analysisMs) { report.issues.push(issue('analysis-budget',`Analyse partielle : ${report.analyzedPages} page(s) sur ${report.pageCount}. Ce document dépasse le budget d’analyse de cet appareil ; le cabinet doit vérifier les autres pages.`)); break; }
          notify(onProgress,{ stage:'analyzing',current:number-1,total:report.pageCount,message:`Vérification de la page ${number} sur ${report.pageCount}…` });
          let page;
          try {
            page = await run(pdfDocument.pdf.getPage(number),{ signal });
            const size = await drawPdfPage(page,canvas,limits.analysisWidth,0,signal);
            const issues = analyzePixels(canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height),{ checkResolution:false });
            // Un contrôle de densité source peut échouer sans invalider le rendu visuel déjà analysé.
            try {
              const operatorList=await run(page.getOperatorList(),{signal});
              issues.push(...analyzePdfImages(operatorList,{operations:pdfDocument.operations,view:page.view,userUnit:page.userUnit,
                getImageSize:id=>{try{return (id.startsWith('g_')?page.commonObjs:page.objs).get(id)}catch{return null}}}));
            } catch(error) { if(error.code==='cancelled')throw error; }
            report.pages.push({ number,...size,issues }); report.analyzedPages++;
          } catch (error) {
            if (error.code === 'cancelled') throw error;
            report.pages.push({ number,width:0,height:0,issues:[issue('page-unavailable',`La page ${number} n’a pas pu être entièrement analysée. Une vérification manuelle est nécessaire.`)] });
          } finally { try { page?.cleanup(); } catch { /* Page déjà libérée. */ } }
        }
        notify(onProgress,{ stage:'analyzing',current:report.analyzedPages,total:report.pageCount,message:`${report.analyzedPages} page(s) analysée(s) sur ${report.pageCount}.` });
      }
      cancelled(signal);
      report.status = report.analyzedPages !== report.pageCount || report.issues.length ? 'partial' : report.pages.some(page => page.issues.length) ? 'warning' : 'clear';
    } catch (error) {
      const blocked = ['empty-file','file-too-large','unsupported-format','format-mismatch','invalid-image','password-protected','invalid-pdf'].includes(error.code);
      report.status = blocked ? 'blocked' : 'partial';
      report.issues.push(issue(error.code || 'analysis-unavailable',error.code ? error.message : 'L’analyse n’a pas pu être terminée. Une vérification manuelle est nécessaire.'));
    } finally {
      try { await pdfDocument?.close(); } catch { /* Lecture terminée. */ }
      imageSource?.close(); if (canvas) { canvas.width = 0; canvas.height = 0; }
    }
    return report;
  }

  async function renderFile(file,pageNumber,canvas,{ maxWidth = 1100,rotation = 0,signal } = {}) {
    let pdfDocument,imageSource;
    const page = Number(pageNumber);
    if (!Number.isInteger(page) || page < 1) throw failure('invalid-page','Cette page n’existe pas.');
    const angle = ((Math.round(Number(rotation || 0)/90)*90)%360+360)%360;
    try {
      const info = await inspect(file,{ maxFileSizeMB:100,signal });
      if (info.kind === 'image') {
        if (page !== 1) throw failure('invalid-page','Cette image ne contient qu’une page.');
        imageSource = await openImage(file,info,signal);
        const size = drawImage(imageSource,canvas,maxWidth,angle); cancelled(signal);
        return { pageCount:1,...size };
      }
      pdfDocument = await openPdf(file,signal);
      if (page > pdfDocument.pdf.numPages) throw failure('invalid-page','Cette page n’existe pas.');
      const pdfPage = await run(pdfDocument.pdf.getPage(page),{ signal });
      try { const size = await drawPdfPage(pdfPage,canvas,maxWidth,angle,signal); return { pageCount:pdfDocument.pdf.numPages,...size }; }
      finally { try { pdfPage.cleanup(); } catch { /* Page déjà libérée. */ } }
    } finally { try { await pdfDocument?.close(); } catch { /* Terminé. */ } imageSource?.close(); }
  }
  function render(file,pageNumber,canvas,options={}) {
    const previous=canvasJobs.get(canvas)||Promise.resolve();
    const next=previous.catch(()=>{}).then(()=>{cancelled(options.signal);return renderFile(file,pageNumber,canvas,options)});
    canvasJobs.set(canvas,next);
    const clear=()=>{if(canvasJobs.get(canvas)===next)canvasJobs.delete(canvas)};
    next.then(clear,clear);
    return next;
  }

  async function getOcrLibrary(signal) {
    if (global.Tesseract?.createWorker) return global.Tesseract;
    if (!ocrLibraryPromise) ocrLibraryPromise = new Promise((resolve,reject) => {
      const script = document.createElement('script'); script.src = new URL('tesseract/tesseract.min.js',vendor).href;
      script.onload = () => global.Tesseract?.createWorker ? resolve(global.Tesseract) : reject(failure('ocr-unavailable','La reconnaissance de texte n’a pas pu démarrer.'));
      script.onerror = () => { script.remove(); reject(failure('ocr-unavailable','La reconnaissance de texte n’a pas pu être chargée.')) }; document.head.append(script);
    }).catch(error => { ocrLibraryPromise = null; throw error; });
    return run(ocrLibraryPromise,{ signal });
  }
  async function recognize(file,pageNumber,{ onProgress,signal } = {}) {
    const canvas = document.createElement('canvas');
    let worker,stopped = false;
    function stop() { stopped = true; return worker?.terminate(); }
    try {
      cancelled(signal);
      notify(onProgress,{ stage:'ocr',current:0,total:100,message:'Préparation de la lecture du texte…' });
      await render(file,pageNumber,canvas,{ maxWidth:1800,signal });
      const library = await getOcrLibrary(signal);
      const pending = library.createWorker(['fra','eng'],1,{
        workerPath:new URL('tesseract/worker.min.js',vendor).href,
        corePath:new URL('tesseract/core/',vendor).href,
        langPath:new URL('tesseract/lang',vendor).href,
        workerBlobURL:false,gzip:true,cacheMethod:'none',
        logger:message => { if (!stopped) notify(onProgress,{ stage:'ocr',current:Math.round((message.progress || 0)*100),total:100,message:message.status === 'recognizing text' ? 'Lecture du texte en cours…' : 'Chargement du lecteur de texte local…' }); }
      }).then(created => { worker = created; if (stopped) created.terminate(); return created; });
      await run(pending,{ signal,timeout:60000,cancel:stop });
      cancelled(signal);
      const result = await run(worker.recognize(canvas,{}, { text:true }),{ signal,timeout:60000,cancel:stop });
      return { text:String(result.data.text || '').slice(0,200000),confidence:Number.isFinite(result.data.confidence)?result.data.confidence:null };
    } catch (error) {
      if (error.code) throw error;
      throw failure('ocr-unavailable','La reconnaissance du texte a échoué. Vous pouvez vérifier le document avec le zoom.');
    } finally { stopped = true; try { await worker?.terminate(); } catch { /* Déjà arrêté. */ } canvas.width = 0; canvas.height = 0; }
  }
  global.DocumentQuality = Object.freeze({ analyze,render,recognize,analyzePixels,analyzePdfImages,limits });
})(window);
