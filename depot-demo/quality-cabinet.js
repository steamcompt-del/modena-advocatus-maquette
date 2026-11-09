/* Revue humaine de fichiers fictifs conservés dans le navigateur. */
(function (global) {
  'use strict';
  function node(tag, className, text) {
    const result = document.createElement(tag);
    if (className) result.className = className;
    if (text !== undefined) result.textContent = text;
    return result;
  }
  function button(text, className = 'qc-button') { const result = node('button', className, text); result.type = 'button'; return result; }
  function qualityName(report) {
    return {clear: 'Aucune alerte automatique détectée', warning: 'Qualité à vérifier', partial: 'Analyse incomplète', blocked: 'Ouverture ou analyse bloquée'}[report?.status] || 'Analyse indisponible';
  }
  function reviewName(record) {
    if (record.review?.status === 'validated') return 'Validé par le cabinet';
    if (record.review?.status === 'replacement') return 'À remplacer';
    return record.report?.status === 'clear' ? 'Reçu — à vérifier par le cabinet' : 'Reçu — qualité à vérifier';
  }
  function addReport(parent, report) {
    const details = node('details', 'qc-report');
    details.append(node('summary', '', `${qualityName(report)} · ${report?.analyzedPages || 0}/${report?.pageCount || '?'} page(s) analysée(s)`));
    details.append(node('p', '', 'Le contrôle automatique est indicatif. Il ne garantit ni la lisibilité de chaque information, ni la présence de toutes les pages attendues.'));
    const issues = node('ul');
    for (const issue of report?.issues || []) issues.append(node('li', '', issue.message));
    for (const page of report?.pages || []) {
      for (const issue of page.issues || []) issues.append(node('li', '', `Page ${page.number} : ${issue.message}`));
    }
    if (issues.children.length) details.append(issues);
    else details.append(node('p', '', report?.status === 'clear' ? 'Aucune anomalie détectée par les contrôles disponibles. Vérifiez le document avec l’aperçu.' : 'Aucun diagnostic complet disponible. Consultez le document ou demandez une nouvelle copie.'));
    parent.append(details);
  }
  async function mount({container, caseToken, onReplacement} = {}) {
    if (!container || !caseToken) throw new Error('Une zone et une référence de dossier sont nécessaires pour la revue.');
    let destroyed = false, refreshVersion = 0, currentDialog = null;
    let thumbnailObserver = null, thumbnailQueue = [], thumbnailBusy = false, thumbnailController = null;
    const thumbnailCanvases = new Set();
    function clearThumbnails() {
      thumbnailObserver?.disconnect(); thumbnailObserver = null;
      thumbnailQueue = []; thumbnailController?.abort();
      for (const canvas of thumbnailCanvases) { canvas.width = 1; canvas.height = 1; }
      thumbnailCanvases.clear();
    }
    async function drawThumbnails() {
      if (thumbnailBusy || destroyed || currentDialog?.open) return;
      thumbnailBusy = true;
      try {
        while (!destroyed && !currentDialog?.open && thumbnailQueue.length) {
          const task = thumbnailQueue.shift();
          if (task.version !== refreshVersion || !task.button.isConnected) continue;
          const controller = new AbortController(); thumbnailController = controller;
          task.message.textContent = 'Chargement de l’aperçu…';
          try {
            if (!global.DocumentQuality?.render) throw new Error('Aperçu indisponible');
            await global.DocumentQuality.render(task.file, 1, task.canvas, {maxWidth: 320, signal: controller.signal});
            if (destroyed || controller.signal.aborted || task.version !== refreshVersion || !task.button.isConnected) {
              task.canvas.width = 1; task.canvas.height = 1;
            } else {
              task.canvas.hidden = false;
              task.button.classList.add('qc-thumbnail--ready');
              task.message.textContent = 'Ouvrir en grand';
            }
          } catch (cause) {
            if (!destroyed && !controller.signal.aborted && task.version === refreshVersion && task.button.isConnected) {
              task.message.textContent = 'Miniature indisponible';
              task.button.classList.add('qc-thumbnail--unavailable');
            }
          } finally {
            if (controller.signal.aborted) { task.canvas.width = 1; task.canvas.height = 1; }
            if (thumbnailController === controller) thumbnailController = null;
          }
          // Donner la priorité à l’aperçu grand format sans perdre la miniature interrompue.
          if (!destroyed && controller.signal.aborted && task.version === refreshVersion && task.button.isConnected) {
            task.message.textContent = 'Aperçu de la première page';
            thumbnailQueue.unshift(task);
            if (currentDialog?.open) break;
          }
        }
      } finally {
        thumbnailBusy = false;
        if (!destroyed && !currentDialog?.open && thumbnailQueue.length) drawThumbnails();
      }
    }
    function prepareThumbnail(record, version) {
      const isPdf = record.report?.kind === 'pdf' || record.file?.type === 'application/pdf';
      const preview = button('', 'qc-thumbnail');
      preview.setAttribute('aria-label', `Agrandir la première page : ${record.label}`);
      const canvas = node('canvas'); canvas.hidden = true; canvas.setAttribute('aria-hidden', 'true');
      const message = node('span', 'qc-thumbnail-message', 'Aperçu de la première page');
      const caption = node('span', 'qc-thumbnail-caption', isPdf ? `PDF · page 1 sur ${record.report?.pageCount || '?'}` : 'Image originale');
      preview.append(canvas, message, caption);
      preview.disabled = !(record.file instanceof Blob) || !record.file.size;
      if (preview.disabled) message.textContent = 'Fichier original indisponible';
      preview.addEventListener('click', () => openReview(record, preview));
      thumbnailCanvases.add(canvas);
      return {button: preview, canvas, message, file: record.file, version, queued: false};
    }
    function watchThumbnails(tasks) {
      const queue = task => {
        if (task.queued || task.button.disabled || task.version !== refreshVersion) return;
        task.queued = true; thumbnailQueue.push(task); drawThumbnails();
      };
      if (typeof global.IntersectionObserver !== 'function') { tasks.forEach(queue); return; }
      const byButton = new Map(tasks.map(task => [task.button, task]));
      thumbnailObserver = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const task = byButton.get(entry.target);
          thumbnailObserver?.unobserve(entry.target);
          if (task) queue(task);
        }
      }, {rootMargin: '240px 0px', threshold: 0.01});
      tasks.filter(task => !task.button.disabled).forEach(task => thumbnailObserver.observe(task.button));
    }
    const intro = node('p', 'qc-intro', 'Ouvrez chaque document pour le valider ou demander une nouvelle copie.');
    intro.tabIndex = -1;
    const status = node('p', 'qc-status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    const list = node('div', 'qc-list');
    container.classList.add('qc-cabinet'); container.replaceChildren(intro, status, list);
    async function refresh() {
      const version = ++refreshVersion;
      clearThumbnails();
      try {
        if (!global.QualityStore) throw new Error('Le stockage des documents n’est pas disponible. Rechargez la page.');
        const records = await global.QualityStore.list(caseToken);
        if (destroyed || version !== refreshVersion) return;
        let previewChanged = false;
        if (currentDialog?.open) {
          const shown = records.find(record => record.id === currentDialog.dataset.recordId);
          if (!shown || String(shown.version) !== currentDialog.dataset.recordVersion) { previewChanged = true; currentDialog.close(); }
        }
        list.replaceChildren();
        status.textContent = `${records.length ? `${records.length} fichier(s) disponible(s) dans ce navigateur.` : ''}${previewChanged ? ' L’aperçu a été fermé car le document a été remplacé ou supprimé.' : ''}`;
        if (!records.length) {
          list.append(node('p', 'qc-empty', 'Aucun fichier à ouvrir pour ce dossier. Les anciens dossiers de démonstration contiennent uniquement des statuts fictifs. Testez un nouveau dépôt avec des fichiers fictifs pour utiliser la vérification.'));
          return;
        }
        const thumbnailTasks = [];
        for (const record of records) {
          const article = node('article', 'qc-card');
          const top = node('div', 'qc-card-top');
          const title = node('h3', '', record.label);
          const badge = node('span', `qc-badge qc-badge--${record.review?.status || 'received'}`, reviewName(record));
          top.append(title, badge); article.append(top);
          const body = node('div', 'qc-card-body');
          const thumbnail = prepareThumbnail(record, version); thumbnailTasks.push(thumbnail);
          const content = node('div', 'qc-card-content');
          content.append(node('p', 'qc-file-name', `${record.fileName} · version ${record.version} · ${record.report?.pageCount || '?'} page(s)`));
          if (record.review?.reason) content.append(node('p', 'qc-reason', `Remplacement demandé : ${record.review.reason}`));
          addReport(content, record.report);
          const isPdf = record.report?.kind === 'pdf' || record.file?.type === 'application/pdf';
          const open = button(isPdf ? 'Aperçu du PDF' : 'Aperçu de l’image', 'qc-button qc-button--primary');
          open.setAttribute('aria-label', `${open.textContent} : ${record.label}`);
          open.disabled = !(record.file instanceof Blob) || !record.file.size;
          if (open.disabled) content.append(node('p', 'qc-error', 'Le fichier original n’est plus accessible dans ce navigateur.'));
          open.addEventListener('click', () => openReview(record, open));
          const actions = node('div', 'qc-card-actions'); actions.append(open);
          if (record.review?.status === 'validated' || record.review?.status === 'replacement') {
            const revisit = button('Revoir la vérification'); revisit.disabled = open.disabled;
            revisit.addEventListener('click', () => openReview(record, revisit)); actions.append(revisit);
          }
          content.append(actions); body.append(thumbnail.button, content); article.append(body); list.append(article);
        }
        watchThumbnails(thumbnailTasks);
      } catch (cause) {
        if (destroyed || version !== refreshVersion) return;
        status.textContent = cause.message || 'Impossible de lire les documents de ce navigateur.';
        list.replaceChildren();
        const retry = button('Réessayer'); retry.addEventListener('click', refresh); list.append(retry);
      }
    }
    function openReview(originalRecord, trigger) {
      if (destroyed) return;
      if (currentDialog) currentDialog.close();
      thumbnailController?.abort();
      let record = originalRecord, page = 1, pageCount = Math.max(1, record.report?.pageCount || 1), zoom = 1, rotation = 0;
      let renderer = null, recognition = null, generation = 0, reading = false, ocrRunning = false, saving = false, closed = false;
      const viewed = new Set();
      const dialog = node('dialog', 'qc-dialog'); currentDialog = dialog;
      dialog.dataset.recordId = record.id; dialog.dataset.recordVersion = String(record.version);
      const dialogTitleId = `qc-title-${Math.random().toString(36).slice(2)}`;
      dialog.setAttribute('aria-labelledby', dialogTitleId);
      const header = node('div', 'qc-dialog-header');
      const headingGroup = node('div');
      const title = node('h2', '', record.label); title.id = dialogTitleId;
      headingGroup.append(title, node('p', 'qc-file-name', record.fileName));
      const close = button('Fermer'); close.setAttribute('aria-label', 'Fermer l’aperçu du document');
      close.addEventListener('click', () => dialog.close()); header.append(headingGroup, close);
      const toolbar = node('div', 'qc-toolbar'); toolbar.setAttribute('aria-label', 'Navigation dans le document');
      const previous = button('← Précédente'), next = button('Suivante →');
      const pageLabel = node('label', 'qc-page-select'); pageLabel.append(node('span', '', 'Page'));
      const select = node('select'); pageLabel.append(select);
      const zoomOut = button('−'), zoomIn = button('+'), zoomLabel = node('span', 'qc-zoom-label', '100 %');
      zoomOut.setAttribute('aria-label', 'Réduire le zoom'); zoomIn.setAttribute('aria-label', 'Agrandir le document');
      const rotate = button('Tourner de 90°');
      const download = node('a', 'qc-button', 'Télécharger l’original');
      let originalURL;
      try { originalURL = URL.createObjectURL(record.file); download.href = originalURL; download.download = record.fileName; }
      catch { download.hidden = true; }
      toolbar.append(previous, pageLabel, next, zoomOut, zoomLabel, zoomIn, rotate, download);
      const renderStatus = node('p', 'qc-status'); renderStatus.setAttribute('role', 'status'); renderStatus.setAttribute('aria-live', 'polite');
      const viewport = node('div', 'qc-viewport'); viewport.tabIndex = 0; viewport.setAttribute('aria-label', 'Aperçu du document, défilement possible avec les touches fléchées');
      const canvas = node('canvas'); canvas.setAttribute('aria-label', 'Aperçu de la page'); viewport.append(canvas);
      const pageIssues = node('div', 'qc-page-issues');
      const ocrBox = node('details', 'qc-ocr'); ocrBox.append(node('summary', '', 'Aide à la lecture du texte (facultative)'));
      ocrBox.append(node('p', '', 'La reconnaissance de texte peut se tromper, surtout sur l’écriture manuscrite. Vérifiez toujours l’original. Elle ne valide pas la qualité du document.'));
      const ocrButton = button('Essayer de lire le texte de cette page');
      const ocrStatus = node('p', 'qc-status'); ocrStatus.setAttribute('role', 'status'); ocrStatus.setAttribute('aria-live', 'polite');
      const ocrOutput = node('pre', 'qc-ocr-output'); ocrOutput.hidden = true;
      ocrBox.append(ocrButton, ocrStatus, ocrOutput);
      const review = node('section', 'qc-review');
      review.append(node('h3', '', 'Votre vérification'));
      const reviewedCount = node('p', 'qc-viewed');
      const confirmLabel = node('label', 'qc-confirm'); const confirm = node('input'); confirm.type = 'checkbox';
      confirmLabel.append(confirm, node('span', '', 'J’ai vérifié toutes les pages : les informations nécessaires sont lisibles et le document est complet.'));
      const validate = button('Valider ce document', 'qc-button qc-button--primary');
      const reasonLabel = node('label', 'qc-replacement-field'); reasonLabel.append(node('span', '', 'Motif de la demande de remplacement'));
      const reason = node('textarea'); reason.rows = 3; reason.maxLength = 600; reason.placeholder = 'Ex. Page 2 illisible : merci d’envoyer une photo plus nette.'; reasonLabel.append(reason);
      const replace = button('Demander une nouvelle version');
      const reviewStatus = node('p', 'qc-status'); reviewStatus.setAttribute('role', 'status'); reviewStatus.setAttribute('aria-live', 'polite');
      review.append(reviewedCount, confirmLabel, validate, reasonLabel, replace, reviewStatus);
      dialog.append(header, toolbar, renderStatus, viewport, pageIssues, ocrBox, review);
      document.body.append(dialog);
      function sync() {
        previous.disabled = page <= 1; next.disabled = page >= pageCount;
        zoomOut.disabled = zoom <= 0.75; zoomIn.disabled = zoom >= 2;
        select.value = String(page); zoomLabel.textContent = `${Math.round(zoom * 100)} %`;
        const allViewed = viewed.size === pageCount;
        confirm.disabled = !allViewed || reading || record.report?.status === 'blocked';
        if (confirm.disabled) confirm.checked = false;
        reviewedCount.textContent = `${viewed.size}/${pageCount} page(s) ouverte(s). ${allViewed ? 'Confirmez votre vérification avant de valider.' : 'Ouvrez chaque page avant de valider le document.'}`;
        validate.disabled = !allViewed || !confirm.checked || reading || saving || record.report?.status === 'blocked';
        replace.disabled = saving || reason.value.trim().length < 3;
        ocrButton.disabled = reading || ocrRunning || !viewed.has(page) || !global.DocumentQuality?.recognize;
      }
      function refreshPages() {
        select.replaceChildren();
        for (let number = 1; number <= pageCount; number++) { const option = node('option', '', `${number} / ${pageCount}`); option.value = String(number); select.append(option); }
      }
      async function draw() {
        renderer?.abort(); recognition?.abort(); ocrRunning = false; ocrStatus.textContent = ''; ocrOutput.hidden = true; ocrOutput.textContent = '';
        renderer = new AbortController(); const signal = renderer.signal, current = ++generation;
        reading = true; canvas.hidden = true; confirm.checked = false; renderStatus.textContent = `Ouverture de la page ${page}…`; pageIssues.replaceChildren(); sync();
        try {
          if (!global.DocumentQuality?.render) throw new Error('Le moteur d’aperçu n’est pas disponible. Rechargez la page.');
          const baseWidth = Math.max(260, Math.min(1000, viewport.clientWidth - 32));
          const result = await global.DocumentQuality.render(record.file, page, canvas, {maxWidth: Math.round(baseWidth * zoom), rotation, signal});
          if (closed || signal.aborted || current !== generation) return;
          if (Number.isInteger(result.pageCount) && result.pageCount > 0 && result.pageCount !== pageCount) { pageCount = result.pageCount; refreshPages(); }
          canvas.hidden = false; canvas.style.width = `${canvas.width}px`; canvas.style.height = 'auto';
          viewed.add(page); renderStatus.textContent = `Page ${page} sur ${pageCount}. Vous pouvez agrandir l’aperçu pour lire les détails.`;
          const findings = record.report?.pages?.find(item => item.number === page)?.issues || [];
          if (findings.length) { const ul = node('ul'); findings.forEach(item => ul.append(node('li', '', item.message))); pageIssues.append(ul); }
          if (record.report?.status === 'blocked') pageIssues.append(node('p', 'qc-error', 'Ce fichier a été signalé comme bloqué. Demandez une nouvelle version avant de le valider.'));
          else if (record.report?.status === 'partial') pageIssues.append(node('p', '', 'L’analyse automatique est incomplète. Votre vérification visuelle reste nécessaire.'));
        } catch (cause) {
          if (closed || signal.aborted || current !== generation) return;
          viewed.delete(page); renderStatus.textContent = cause.message || 'Impossible d’ouvrir cette page. Demandez une nouvelle copie.';
        } finally {
          if (!closed && current === generation) { reading = false; sync(); }
        }
      }
      previous.addEventListener('click', () => { if (page > 1) { page--; draw(); } });
      next.addEventListener('click', () => { if (page < pageCount) { page++; draw(); } });
      select.addEventListener('change', () => { page = Number(select.value); draw(); });
      zoomOut.addEventListener('click', () => { zoom = Math.max(0.75, zoom - 0.25); draw(); });
      zoomIn.addEventListener('click', () => { zoom = Math.min(2, zoom + 0.25); draw(); });
      rotate.addEventListener('click', () => { rotation = (rotation + 90) % 360; draw(); });
      confirm.addEventListener('change', sync); reason.addEventListener('input', sync);
      ocrButton.addEventListener('click', async () => {
        recognition?.abort(); recognition = new AbortController(); const signal = recognition.signal, currentPage = page;
        ocrRunning = true; ocrOutput.hidden = true; ocrStatus.textContent = 'Lecture du texte en cours…'; sync();
        try {
          const result = await global.DocumentQuality.recognize(record.file, page, {signal, onProgress: progress => { if (!signal.aborted && !closed) ocrStatus.textContent = progress.message || 'Lecture du texte en cours…'; }});
          if (closed || signal.aborted || page !== currentPage) return;
          ocrOutput.textContent = result.text?.trim() || 'Aucun texte reconnu sur cette page.'; ocrOutput.hidden = false;
          ocrStatus.textContent = 'Lecture indicative terminée. Comparez le texte avec la page originale.';
        } catch (cause) { if (!closed && !signal.aborted) ocrStatus.textContent = cause.message || 'La reconnaissance du texte n’a pas abouti.'; }
        finally { if (!closed && !signal.aborted) { ocrRunning = false; sync(); } }
      });
      async function save(statusValue) {
        if (saving || (statusValue === 'validated' && validate.disabled) || (statusValue === 'replacement' && replace.disabled)) return;
        saving = true; reviewStatus.textContent = 'Enregistrement…'; sync();
        try {
          record = await global.QualityStore.setReview(record.id, record.version, {status: statusValue, reason: reason.value.trim()});
          if (destroyed) return;
          if (statusValue === 'replacement') {
            reviewStatus.textContent = 'Remplacement demandé dans le dossier. Aucun message n’a été envoyé au client.';
            if (onReplacement) {
              try { await onReplacement({label: record.label, reason: record.review.reason}); }
              catch { reviewStatus.textContent += ' La demande de complément n’a pas pu être préparée automatiquement ; préparez-la depuis le dossier.'; }
            }
          } else reviewStatus.textContent = 'Document validé par le cabinet dans cette démonstration.';
          await refresh();
        } catch (cause) { if (!closed) reviewStatus.textContent = cause.message || 'Impossible d’enregistrer la vérification.'; }
        finally { if (!closed) { saving = false; sync(); } }
      }
      validate.addEventListener('click', () => save('validated'));
      replace.addEventListener('click', () => save('replacement'));
      dialog.addEventListener('close', () => {
        closed = true; generation++; renderer?.abort(); recognition?.abort();
        if (originalURL) URL.revokeObjectURL(originalURL);
        canvas.width = 1; canvas.height = 1; dialog.remove();
        if (currentDialog === dialog) { currentDialog = null; document.body.classList.remove('qc-dialog-open'); }
        if (trigger.isConnected) trigger.focus(); else if (!destroyed) intro.focus();
        drawThumbnails();
      }, {once: true});
      if (typeof dialog.showModal !== 'function') { if (originalURL) URL.revokeObjectURL(originalURL); dialog.remove(); currentDialog = null; status.textContent = 'Ce navigateur ne permet pas cet aperçu. Utilisez un navigateur récent.'; return; }
      refreshPages(); sync(); dialog.showModal(); document.body.classList.add('qc-dialog-open'); close.focus(); draw();
    }
    const listener = event => { if (event.detail?.caseToken === caseToken) refresh(); };
    global.addEventListener('quality-store-change', listener);
    let channel;
    try { if (global.BroadcastChannel) { channel = new BroadcastChannel('modena-document-quality'); channel.onmessage = event => { if (event.data?.caseToken === caseToken) refresh(); }; } } catch {}
    await refresh();
    return {refresh, destroy() { destroyed = true; refreshVersion++; clearThumbnails(); currentDialog?.close(); channel?.close(); global.removeEventListener('quality-store-change', listener); container.replaceChildren(); }};
  }
  global.QualityCabinet = {mount};
})(window);
