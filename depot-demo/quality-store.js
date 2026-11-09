/* Stockage local de la démonstration : aucun transfert réseau de documents. */
(function (global) {
  'use strict';
  const DATABASE = 'modena-document-quality-v1';
  const STORE = 'documents';
  const CASES = 'cases';
  let opening;
  let channel;
  const validToken = value => typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value);
  const clean = (value, max = 400) => typeof value === 'string' ? value.trim().slice(0, max) : '';
  function error(message, code) { const result = new Error(message); result.code = code; return result; }
  function storageError(cause) {
    if (cause?.code) return cause;
    if (cause?.name === 'QuotaExceededError') return error('Le stockage de ce navigateur est plein. Aucun nouvel envoi n’a été enregistré. Libérez de l’espace ou choisissez des fichiers plus petits.', 'quota');
    return error('Le navigateur ne peut pas conserver ces fichiers localement. Vérifiez que le stockage du site est autorisé, puis réessayez.', 'storage');
  }
  function issues(value) {
    return Array.isArray(value) ? value.slice(0, 100).map(item => ({code: clean(item?.code, 80), message: clean(item?.message)})).filter(item => item.message) : [];
  }
  function normalizeReport(value, file) {
    const source = value && typeof value === 'object' ? value : {};
    const pages = Array.isArray(source.pages) ? source.pages.slice(0, 2000).map(page => ({
      number: Number.isInteger(page?.number) && page.number > 0 ? page.number : 0,
      width: Number.isFinite(page?.width) ? Math.max(0, page.width) : 0,
      height: Number.isFinite(page?.height) ? Math.max(0, page.height) : 0,
      issues: issues(page?.issues)
    })).filter(page => page.number) : [];
    const pageCount = Number.isInteger(source.pageCount) && source.pageCount > 0 ? source.pageCount : 0;
    const analyzedPages = Number.isInteger(source.analyzedPages) && source.analyzedPages >= 0 ? source.analyzedPages : 0;
    let status = ['clear', 'warning', 'partial', 'blocked'].includes(source.status) ? source.status : 'partial';
    const pageNumbers = new Set(pages.map(page => page.number));
    const complete = pageCount > 0 && analyzedPages === pageCount && pages.length === pageCount && pageNumbers.size === pageCount && pages.every(page => page.number <= pageCount);
    if (!complete && status !== 'blocked') status = 'partial';
    const reportIssues = issues(source.issues);
    if (status === 'clear' && (reportIssues.length || pages.some(page => page.issues.length))) status = 'warning';
    return {version: 1, status, fileName: clean(file.name, 260) || 'document', size: file.size,
      kind: source.kind === 'pdf' ? 'pdf' : 'image', pageCount, analyzedPages, pages, issues: reportIssues,
      analyzedAt: Number.isFinite(source.analyzedAt) ? source.analyzedAt : Date.now(),
      clientCheckedAt: Number.isFinite(source.clientCheckedAt) && source.clientCheckedAt > 0 ? source.clientCheckedAt : 0};
  }
  function open() {
    if (opening) return opening;
    opening = new Promise((resolve, reject) => {
      if (!global.indexedDB) { reject(error('Ce navigateur ne propose pas le stockage local nécessaire à cette démonstration.', 'unavailable')); return; }
      let request, settled = false;
      const timer = setTimeout(() => { if (!settled) { settled = true; reject(error('L’ouverture du stockage local prend trop de temps. Fermez les autres onglets de la maquette puis réessayez.', 'timeout')); } }, 15000);
      try { request = global.indexedDB.open(DATABASE, 1); }
      catch (cause) { clearTimeout(timer); reject(storageError(cause)); return; }
      request.onupgradeneeded = () => {
        const db = request.result;
        const files = db.createObjectStore(STORE, {keyPath: 'id'});
        files.createIndex('caseToken', 'caseToken', {unique: false});
        db.createObjectStore(CASES, {keyPath: 'token'});
      };
      request.onsuccess = () => {
        clearTimeout(timer);
        if (settled) { request.result.close(); return; }
        settled = true;
        const db = request.result;
        db.onversionchange = () => { db.close(); opening = undefined; };
        resolve(db);
      };
      request.onerror = () => { clearTimeout(timer); if (!settled) { settled = true; reject(storageError(request.error)); } };
      request.onblocked = () => { clearTimeout(timer); if (!settled) { settled = true; reject(error('Le stockage est utilisé par un autre onglet. Fermez les anciens onglets de la maquette puis réessayez.', 'blocked')); } };
    }).catch(cause => { opening = undefined; throw cause; });
    return opening;
  }
  async function transaction(stores, mode, work) {
    const db = await open();
    return new Promise((resolve, reject) => {
      let tx, result, failure;
      try { tx = db.transaction(stores, mode); } catch (cause) { reject(storageError(cause)); return; }
      const fail = cause => { failure = cause; try { tx.abort(); } catch { reject(cause); } };
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => reject(failure || storageError(tx.error));
      tx.onerror = () => { if (!failure) failure = storageError(tx.error); };
      try { work(tx, value => { result = value; }, fail); } catch (cause) { fail(storageError(cause)); }
    });
  }
  function announce(caseToken) {
    try { global.dispatchEvent(new CustomEvent('quality-store-change', {detail: {caseToken}})); } catch {}
    try {
      if (!channel && global.BroadcastChannel) channel = new BroadcastChannel('modena-document-quality');
      channel?.postMessage({caseToken});
    } catch {}
  }
  async function saveBatch(caseToken, entries) {
    if (!validToken(caseToken)) throw error('La référence du dossier est invalide.', 'invalid-case');
    if (!Array.isArray(entries) || entries.length > 40) throw error('La liste des fichiers à conserver est invalide.', 'invalid-batch');
    const labels = new Set();
    const prepared = entries.map(entry => {
      const label = clean(entry?.label, 120);
      if (!label || labels.has(label) || !(entry.file instanceof Blob) || !entry.file.size) throw error('Chaque pièce doit avoir un nom distinct et un fichier non vide.', 'invalid-file');
      labels.add(label);
      return {label, file: entry.file, fileName: clean(entry.file.name, 260) || 'document', report: normalizeReport(entry.report, entry.file)};
    });
    const result = await transaction([STORE, CASES], 'readwrite', (tx, done, fail) => {
      const records = [];
      const cases = tx.objectStore(CASES);
      const caseRequest = cases.get(caseToken);
      caseRequest.onsuccess = () => {
        if (caseRequest.result?.deletedAt) { fail(error('Ce dossier a été supprimé. Les fichiers ne peuvent plus y être ajoutés.', 'deleted-case')); return; }
        if (!caseRequest.result) cases.put({token: caseToken, deletedAt: 0});
        const store = tx.objectStore(STORE);
        for (const entry of prepared) {
          const id = `${caseToken}:${encodeURIComponent(entry.label)}`;
          const request = store.get(id);
          request.onsuccess = () => {
            const old = request.result;
            const record = {...entry, id, caseToken, version: Number.isInteger(old?.version) ? old.version + 1 : 1,
              savedAt: Date.now(), review: {status: 'received', reason: '', at: 0}};
            records.push(record); store.put(record);
          };
        }
        done(records);
      };
    });
    announce(caseToken);
    return result;
  }
  async function list(caseToken) {
    if (!validToken(caseToken)) throw error('La référence du dossier est invalide.', 'invalid-case');
    const result = await transaction([STORE], 'readonly', (tx, done) => {
      const request = tx.objectStore(STORE).index('caseToken').getAll(caseToken);
      request.onsuccess = () => done(request.result);
    });
    return result.sort((a, b) => a.savedAt - b.savedAt || a.label.localeCompare(b.label, 'fr'));
  }
  async function setReview(id, version, review) {
    if (typeof id !== 'string' || !Number.isInteger(version) || version < 1) throw error('Cette version de pièce est invalide.', 'invalid-version');
    const status = review?.status, reason = clean(review?.reason, 600);
    if (!['received', 'replacement', 'validated'].includes(status)) throw error('Le statut de vérification est invalide.', 'invalid-review');
    if (status === 'replacement' && reason.length < 3) throw error('Indiquez pourquoi le document doit être remplacé.', 'reason-required');
    const result = await transaction([STORE, CASES], 'readwrite', (tx, done, fail) => {
      const store = tx.objectStore(STORE), request = store.get(id);
      request.onsuccess = () => {
        const current = request.result;
        if (!current || current.version !== version) { fail(error('Le client a remplacé cette pièce, ou elle a été supprimée. Actualisez le dossier avant de la vérifier.', 'stale-version')); return; }
        const caseRequest = tx.objectStore(CASES).get(current.caseToken);
        caseRequest.onsuccess = () => {
          if (caseRequest.result?.deletedAt) { fail(error('Ce dossier a été supprimé.', 'deleted-case')); return; }
          if (status === 'validated' && (!(current.file instanceof Blob) || !current.file.size || current.report?.status === 'blocked')) {
            fail(error('Ce fichier ne peut pas être validé : son ouverture ou son analyse est bloquée.', 'unreadable-file')); return;
          }
          const updated = {...current, review: {status, reason: status === 'replacement' ? reason : '', at: Date.now()}};
          store.put(updated); done(updated);
        };
      };
    });
    announce(result.caseToken);
    return result;
  }
  async function deleteCase(caseToken) {
    if (!validToken(caseToken)) throw error('La référence du dossier est invalide.', 'invalid-case');
    await transaction([STORE, CASES], 'readwrite', (tx, done) => {
      tx.objectStore(CASES).put({token: caseToken, deletedAt: Date.now()});
      const request = tx.objectStore(STORE).index('caseToken').openCursor(caseToken);
      request.onsuccess = () => { const cursor = request.result; if (cursor) { cursor.delete(); cursor.continue(); } };
      done(true);
    });
    announce(caseToken);
  }
  global.QualityStore = {saveBatch, list, setReview, deleteCase};
})(window);
