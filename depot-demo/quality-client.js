/* Analyse et aperçu locaux. Aucun fichier ni résultat OCR n'est envoyé à un tiers. */
(function () {
  'use strict';
  function node(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function button(text, action) {
    const el = node('button', 'button-secondary', text); el.type = 'button';
    el.addEventListener('click', action); return el;
  }
  function attach({ form, bindings, maxFileSizeMB }) {
    const states = [];
    let queue = Promise.resolve();
    let activeDialog = null;
    const summary = node('p', 'dq-form-status'); summary.setAttribute('role', 'status');
    form.append(summary);
    const progress = node('div', 'dq-deposit-progress');
    const progressText = node('p'); progressText.setAttribute('role', 'status');
    const progressBar = node('progress'); progressBar.max = bindings.length || 1;
    progressBar.setAttribute('aria-label', 'Pièces prêtes à transmettre');
    progress.append(progressText, progressBar);
    const progressHost = form.querySelector('[data-step="2"] .dq-guidance') || form.querySelector('.dq-guidance');
    progressHost?.after(progress);
    function updateProgress() {
      const ready = states.filter(state => state.unavailable?.checked || (!state.pending && state.report?.status !== 'blocked' && state.previewSeen && state.accept.checked)).length;
      progressBar.value = ready;
      progressText.textContent = `${ready} / ${bindings.length} pièce${bindings.length > 1 ? 's' : ''} prête${bindings.length > 1 ? 's' : ''} à transmettre ou signalée${bindings.length > 1 ? 's' : ''} indisponible${bindings.length > 1 ? 's' : ''}`;
    }

    async function openPreview(state) {
      if (!state.file || !state.report || state.report.status === 'blocked') return;
      activeDialog?.close();
      const file = state.file, report = state.report;
      const dialog = node('dialog', 'dq-dialog'); activeDialog = dialog;
      const head = node('div', 'dq-dialog-head');
      const title = node('h2', '', state.label); title.id = `dq-dialog-${states.indexOf(state)}`;
      dialog.setAttribute('aria-labelledby', title.id);
      const close = button('Fermer l’aperçu', () => dialog.close());
      head.append(title, close);
      const instruction = node('p', 'dq-help', 'Vérifiez le texte, les bords et le nombre de pages. Le fichier original reste inchangé.');
      const bar = node('div', 'dq-toolbar');
      const pageSelect = node('select'); pageSelect.setAttribute('aria-label', 'Page à afficher');
      const total = report.pageCount || 1;
      for (let n = 1; n <= total; n++) { const option = node('option', '', `Page ${n} sur ${total}`); option.value = String(n); pageSelect.append(option); }
      let page = 1, rotation = 0, zoom = 1, paintVersion = 0, busy = false;
      const status = node('p', 'dq-help'); status.setAttribute('role', 'status');
      const alerts = node('ul', 'dq-issues');
      const viewport = node('div', 'dq-preview-scroll'); viewport.tabIndex = 0;
      viewport.setAttribute('aria-label', 'Aperçu du document, défilement possible');
      const canvas = node('canvas'); canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', 'Aperçu du document'); viewport.append(canvas);
      const ocrDetails = node('details', 'dq-ocr'); ocrDetails.append(node('summary', '', 'Aide à la lecture du texte (facultatif)'));
      const ocrText = node('pre', 'dq-ocr-text');
      const ocrStatus = node('p', 'dq-help', 'Lecture automatique indicative du texte imprimé. Elle peut contenir des erreurs et ne valide pas le document.'); ocrStatus.setAttribute('role', 'status');
      let ocrController = null, renderController = null;
      const ocrButton = button('Lire le texte de cette page', async () => {
        if (busy) return;
        const selectedPage = page;
        ocrController?.abort(); const controller = new AbortController(); ocrController = controller;
        ocrButton.disabled = true; ocrText.textContent = ''; ocrStatus.textContent = 'Lecture du texte sur cet appareil…';
        try {
          const result = await window.DocumentQuality.recognize(file, selectedPage, {
            signal: controller.signal,
            onProgress: progress => { if (!controller.signal.aborted) ocrStatus.textContent = progress.message || 'Lecture du texte en cours…'; }
          });
          if (controller.signal.aborted || page !== selectedPage || !dialog.open) return;
          ocrText.textContent = result.text || 'Aucun texte reconnu. Cela ne prouve pas que la page est illisible.';
          ocrStatus.textContent = 'Texte indicatif : comparez-le à l’original. Les écritures manuscrites, signatures et certaines langues peuvent être mal reconnues.';
        } catch (error) { if (!controller.signal.aborted) ocrStatus.textContent = error.message || 'Lecture automatique indisponible. Vérifiez l’aperçu.'; }
        finally { if (ocrController === controller) ocrButton.disabled = false; }
      });
      ocrDetails.append(ocrStatus, ocrButton, ocrText);
      async function paint() {
        const version = ++paintVersion; renderController?.abort(); renderController = new AbortController();
        ocrController?.abort(); ocrText.textContent = ''; ocrButton.disabled = true;
        busy = true; status.textContent = `Ouverture de la page ${page}…`;
        alerts.replaceChildren();
        const pageReport = report.pages?.find(item => item.number === page);
        for (const issue of pageReport?.issues || []) alerts.append(node('li', '', issue.message));
        try {
          await window.DocumentQuality.render(file, page, canvas, { maxWidth: Math.round(1100 * zoom), rotation, signal: renderController.signal });
          if (version !== paintVersion || !dialog.open) return;
          canvas.style.width = `${Math.round(100 * zoom)}%`;
          status.textContent = `Page ${page} sur ${total} · zoom ${Math.round(100 * zoom)} %`;
          state.previewSeen = true; state.accept.disabled = false;
          updateProgress();
          ocrButton.disabled = false;
        } catch (error) { if (version === paintVersion && dialog.open) { canvas.width = 0; status.textContent = error.message || 'Aperçu indisponible. Choisissez une autre copie du document.'; } }
        finally { if (version === paintVersion) busy = false; }
      }
      pageSelect.addEventListener('change', () => { page = Number(pageSelect.value); paint(); });
      const smaller = button('Zoom −', () => { zoom = Math.max(.75, zoom - .25); paint(); });
      const bigger = button('Zoom +', () => { zoom = Math.min(2, zoom + .25); paint(); });
      const turn = button('Tourner', () => { rotation = (rotation + 90) % 360; paint(); });
      bar.append(pageSelect, smaller, bigger, turn);
      const done = button('Terminer la vérification', () => dialog.close());
      dialog.append(head, instruction, bar, status, alerts, viewport, ocrDetails, done);
      document.body.append(dialog);
      dialog.addEventListener('close', () => {
        renderController?.abort(); ocrController?.abort(); paintVersion++;
        canvas.width = 0; canvas.height = 0; dialog.remove();
        if (activeDialog === dialog) { activeDialog = null; document.body.classList.remove('dq-preview-open'); }
        state.preview.focus();
      }, { once: true });
      document.body.classList.add('dq-preview-open');
      dialog.showModal(); close.focus(); await paint();
    }

    for (const binding of bindings) {
      const { input, label, unavailable } = binding;
      const upload = input.closest('.upload-field');
      const unit = node('div', 'dq-input-unit'); upload.before(unit); unit.append(upload);
      const originalAccept = input.accept;
      let cameraRequested = false;
      function resetPicker() { input.accept = originalAccept; input.removeAttribute('capture'); cameraRequested = false; }
      input.addEventListener('click', () => {
        if (cameraRequested) { input.accept = 'image/jpeg,image/png'; input.setAttribute('capture', 'environment'); }
        else resetPicker();
        cameraRequested = false;
      });
      input.addEventListener('cancel', resetPicker);
      const camera = button('Prendre une photo', () => {
        if (input.disabled) return;
        cameraRequested = true; input.click();
      });
      camera.classList.add('dq-camera'); camera.setAttribute('aria-label', `Prendre une photo : ${label}`);
      const cameraHelp = node('p', 'dq-camera-help', 'Document à plat, quatre coins visibles, sans reflet. Vous pourrez vérifier la photo avant de l’envoyer.');
      const fileName = node('p', 'dq-file-name'); fileName.hidden = true;
      unit.append(camera, cameraHelp, fileName);
      const card = node('section', 'dq-card'); card.hidden = true; card.setAttribute('aria-label', `Qualité : ${label}`);
      const heading = node('strong', 'dq-status'); heading.setAttribute('role', 'status');
      const meta = node('p', 'dq-help');
      const issues = node('ul', 'dq-issues');
      const actions = node('div', 'dq-actions');
      const state = { input, label, unavailable, file: null, report: null, pending: false, generation: 0, controller: null, previewSeen: false };
      const preview = button('Voir les pages', () => openPreview(state));
      const replace = button('Remplacer le fichier', () => { resetPicker(); input.click(); });
      const acceptance = node('label', 'dq-accept');
      const accept = node('input'); accept.type = 'checkbox'; accept.disabled = true;
      const acceptText = node('span'); acceptance.append(accept, acceptText);
      accept.addEventListener('change', () => { summary.textContent = ''; updateProgress(); });
      state.card = card; state.heading = heading; state.accept = accept; state.preview = preview;
      actions.append(preview, replace); card.append(heading, meta, issues, actions, acceptance); unit.append(card);
      states.push(state);
      function clear() {
        state.generation++; state.controller?.abort();
        if (activeDialog?.open) activeDialog.close();
        state.file = null; state.report = null; state.pending = false; state.previewSeen = false;
        accept.checked = false; accept.disabled = true; card.hidden = true; input.setCustomValidity('');
        fileName.hidden = true; fileName.textContent = ''; updateProgress();
      }
      function selectFile() {
        resetPicker(); clear(); summary.textContent = '';
        const file = input.files[0]; if (!file || input.disabled) return;
        state.file = file; state.pending = true;
        const size = file.size >= 1048576 ? `${(file.size / 1048576).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Mo` : `${Math.max(1, Math.round(file.size / 1024))} Ko`;
        fileName.textContent = `${file.name} · ${size}`; fileName.hidden = false;
        const generation = state.generation; const controller = new AbortController(); state.controller = controller;
        card.hidden = false; card.dataset.state = 'pending'; heading.textContent = 'Analyse en attente…';
        meta.textContent = 'Le fichier est analysé sur cet appareil. Aucun document n’est envoyé à un service extérieur.';
        issues.replaceChildren(); preview.disabled = true; acceptance.hidden = true;
        queue = queue.catch(() => {}).then(async () => {
          if (controller.signal.aborted) return;
          heading.textContent = 'Ouverture et analyse du fichier…';
          let report;
          try {
            report = await window.DocumentQuality.analyze(file, {
              maxFileSizeMB, signal: controller.signal,
              onProgress: progress => { if (state.generation === generation) heading.textContent = progress.message || `Analyse : ${progress.current || 0} / ${progress.total || '?'} pages`; }
            });
          } catch { report = { version: 1, status: 'partial', fileName: file.name, size: file.size, pageCount: 0, analyzedPages: 0, pages: [], issues: [{ code: 'engine', message: 'L’analyse n’a pas pu être effectuée. Aucune conclusion sur la lisibilité.' }] }; }
          if (state.generation !== generation || controller.signal.aborted) return;
          state.report = report; state.pending = false; card.dataset.state = report.status; updateProgress();
          heading.textContent = { clear: 'Analyse terminée · à vérifier visuellement', warning: 'Qualité à vérifier', partial: 'Analyse incomplète', blocked: 'Fichier non utilisable' }[report.status] || 'Analyse incomplète';
          meta.textContent = report.pageCount ? `${report.analyzedPages} / ${report.pageCount} page(s) analysée(s). Ce contrôle ne garantit ni la lisibilité ni la présence de toutes les pages attendues.` : 'Aucune vérification complète de ce fichier n’a pu être effectuée.';
          for (const issue of report.issues || []) issues.append(node('li', '', issue.message));
          for (const page of report.pages || []) for (const issue of page.issues || []) issues.append(node('li', '', `Page ${page.number} : ${issue.message}`));
          preview.disabled = report.status === 'blocked'; acceptance.hidden = report.status === 'blocked';
          acceptText.textContent = report.status === 'clear' ? 'Après aperçu, je confirme que les pages sont lisibles et complètes.' : 'J’ai vérifié l’aperçu et je souhaite transmettre ce fichier malgré les réserves de l’analyse.';
          if (report.status !== 'blocked') issues.append(node('li', 'dq-next', 'Ouvrez l’aperçu, vérifiez les pages, puis cochez la confirmation.'));
        });
      }
      input.addEventListener('change', selectFile);
      unavailable?.addEventListener('change', () => { camera.disabled = unavailable.checked; if (unavailable.checked) clear(); updateProgress(); });
      if (input.files.length) selectFile();
    }
    updateProgress();
    function validate() {
      const active = states.filter(state => !state.input.disabled && state.input.files.length);
      for (const state of active) {
        let message = '';
        if (state.file !== state.input.files[0] || state.pending) message = `Attendez la fin de l’analyse : ${state.label}.`;
        else if (!state.report || state.report.status === 'blocked') message = `Remplacez le fichier non utilisable : ${state.label}.`;
        else if (!state.previewSeen || !state.accept.checked) message = `Ouvrez l’aperçu et confirmez votre vérification : ${state.label}.`;
        if (message) {
          summary.textContent = message; state.card.scrollIntoView({ block: 'center', behavior: 'smooth' });
          (state.preview.disabled ? state.input : state.preview).focus(); return false;
        }
      }
      summary.textContent = ''; return true;
    }
    return {
      validate,
      entries: () => states.filter(state => !state.input.disabled && state.file && state.report && state.report.status !== 'blocked').map(state => ({ label: state.label, file: state.file, report: { ...state.report, clientCheckedAt: Date.now() } })),
      message: text => { summary.textContent = text; },
      destroy: () => { activeDialog?.close(); for (const state of states) state.controller?.abort(); }
    };
  }
  window.QualityClient = { attach };
})();
