/* Maquette de démonstration : aucun fichier n'est lu ou envoyé. Le nom du client est
   attaché au dossier fictif ; les autres données d'état civil restent dans la session. */
const templates = {
  lydie: {
    name: 'Me Lydie NAVENNEC NORMAND',
    sets: [
      { title: 'Dommage corporel', items: ['Certificat médical initial', 'Comptes rendus médicaux et examens', 'Arrêts de travail', 'Justificatifs de frais et pertes de revenus', 'Courriers de l’assureur'] },
      { title: 'Copropriété et locatif', items: ['Contrat de bail ou titre de propriété', 'Échanges avec l’autre partie', 'Mises en demeure', 'Décomptes de charges ou loyers'] }
    ]
  },
  romain: {
    name: 'Me Romain NORMAND',
    sets: [
      { title: 'Droit immobilier', items: ['Compromis ou promesse de vente', 'Acte de vente', 'Diagnostics immobiliers', 'Échanges avec le vendeur ou le notaire'] },
      { title: 'Droit automobile', items: ['Certificat d’immatriculation', 'Constat ou procès-verbal', 'Contrat d’assurance', 'Devis et factures de réparation'] }
    ]
  },
  elsa: {
    name: 'Me Elsa SADAKA',
    sets: [
      { title: 'Dommage corporel', items: ['Certificat médical initial', 'Comptes rendus médicaux et examens', 'Arrêts de travail', 'Justificatifs de frais', 'Courriers de l’assureur'] },
      { title: 'Droit des étrangers', items: ['Passeport', 'Titre de séjour actuel ou expiré', 'Décision administrative contestée', 'Justificatifs de domicile et de situation familiale'] }
    ]
  },
  lou: {
    name: 'Me Lou LEVY-HADIDA',
    sets: [
      { title: 'Pénal victimes', items: ['Plainte ou récépissé de dépôt de plainte', 'Convocations et décisions reçues', 'Certificats médicaux', 'Éléments de preuve disponibles'] },
      { title: 'Droit de la consommation', items: ['Contrat ou bon de commande', 'Factures et preuves de paiement', 'Échanges avec le professionnel', 'Mise en demeure éventuelle'] }
    ]
  }
};
const storageKey = 'modena-demo-request';
const templateStorageKey = 'modena-demo-templates-v1';
const invitationStorageKey = 'modena-demo-invitations-v1';
const identityStoragePrefix = 'modena-demo-identity-v1:';
const identityFields = ['firstName','lastName','birthDate','email','address','postalCode','city'];
const uuidPattern = /^[0-9a-f-]{36}$/i;
function safeLabels(value,limit=30){return Array.isArray(value)?value.filter(label=>typeof label==='string'&&label.trim()&&label.length<=120).slice(0,limit):[]}
function safeClientName(value){return typeof value==='string'?value.trim().replace(/\s+/g,' ').slice(0,160):''}
function clientNameFor(invitation){
  if(invitation.clientName)return invitation.clientName;
  const identity=loadCaseIdentity(invitation.token);
  return identity?safeClientName(`${identity.firstName} ${identity.lastName}`):'';
}
function searchKey(value){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr').replace(/\s+/g,' ').trim()}
function normalizeFollowUp(value){
  if(!value||!uuidPattern.test(value.token)||!Number.isFinite(value.expiresAt))return null;
  return {token:value.token,items:safeLabels(value.items),revision:Number.isInteger(value.revision)&&value.revision>0?value.revision:1,createdAt:Number(value.createdAt)||0,expiresAt:value.expiresAt,submittedAt:Number(value.submittedAt)||0,received:safeLabels(value.received),missing:safeLabels(value.missing)};
}
function saveCaseIdentity(token,identity){
  try {
    const safe=Object.fromEntries(identityFields.map(field=>[field,String(identity[field]??'').trim().slice(0,250)]));
    sessionStorage.setItem(`${identityStoragePrefix}${token}`,JSON.stringify(safe));
    return true;
  }catch{return false}
}
function loadCaseIdentity(token){
  try {
    const parsed=JSON.parse(sessionStorage.getItem(`${identityStoragePrefix}${token}`));
    if(!parsed||typeof parsed!=='object'||!identityFields.every(field=>typeof parsed[field]==='string'))return null;
    return parsed;
  }catch{return null}
}
function deleteCaseIdentity(token){try{sessionStorage.removeItem(`${identityStoragePrefix}${token}`)}catch{/* Démonstration dans le navigateur. */}}
function loadInvitations(){
  try {
    const parsed=JSON.parse(localStorage.getItem(invitationStorageKey));
    if(!Array.isArray(parsed))return [];
    let migratedName=false;
    const invitations=parsed.filter(entry=>entry&&uuidPattern.test(entry.token)&&templates[entry.lawyer]&&Array.isArray(entry.items)&&Number.isFinite(entry.expiresAt))
      .slice(-40).map(entry=>{
        let clientName=safeClientName(entry.clientName);
        if(!clientName&&entry.submittedAt&&!entry.deletedAt){
          const identity=loadCaseIdentity(entry.token);
          clientName=identity?safeClientName(`${identity.firstName} ${identity.lastName}`):'';
          if(clientName)migratedName=true;
        }
        return {token:entry.token,lawyer:entry.lawyer,clientName,items:safeLabels(entry.items),createdAt:Number(entry.createdAt)||0,expiresAt:entry.expiresAt,revoked:Boolean(entry.revoked),submittedAt:Number(entry.submittedAt)||0,deletedAt:Number(entry.deletedAt)||0,received:safeLabels(entry.received,40),missing:safeLabels(entry.missing),followUp:normalizeFollowUp(entry.followUp)};
      });
    if(migratedName||parsed.some(entry=>entry&&typeof entry==='object'&&('passwordSalt' in entry||'passwordHash' in entry)))persistInvitations(invitations);
    return invitations;
  }catch{return []}
}
function persistInvitations(next){try{localStorage.setItem(invitationStorageKey,JSON.stringify(next.slice(-40)));return true}catch{return false}}
function invitationUrl(token){const url=new URL('client.html',location.href);url.searchParams.set('invite',token);return url.toString()}
function invitationState(invitation){return invitation.deletedAt?'Supprimé':invitation.submittedAt?'Reçu':invitation.revoked?'Révoqué':invitation.expiresAt<=Date.now()?'Expiré':'Actif'}
function invitationReference(invitation){return `M-${invitation.token.slice(0,8).toUpperCase()}`}
function dossierUrl(token){const url=new URL('dossier.html',location.href);url.searchParams.set('id',token);return url.toString()}
function supplementUrl(token){const url=new URL('complement.html',location.href);url.searchParams.set('request',token);return url.toString()}
function updateInvitation(token,change){const next=loadInvitations().map(entry=>entry.token===token?{...entry,...change}:entry);return persistInvitations(next)}
function requestSignature(request){return JSON.stringify([request.lawyer,request.items.filter(item=>item.selected).map(item=>item.label)])}
function loadUserTemplates(){
  try {
    const parsed=JSON.parse(localStorage.getItem(templateStorageKey));
    if(!Array.isArray(parsed))return [];
    return parsed.filter(entry=>entry&&typeof entry.id==='string'&&entry.id.startsWith('user:')&&templates[entry.lawyer]&&typeof entry.title==='string'&&entry.title.trim()&&entry.title.length<=80&&Array.isArray(entry.items))
      .slice(0,50).map(entry=>({id:entry.id,lawyer:entry.lawyer,title:entry.title,items:entry.items.filter(label=>typeof label==='string'&&label.trim()&&label.length<=120).slice(0,30)}));
  } catch {return []}
}
let userTemplates=loadUserTemplates();
function persistUserTemplates(next){try{localStorage.setItem(templateStorageKey,JSON.stringify(next));userTemplates=next;return true}catch{return false}}
function templatesFor(lawyer){
  const builtIn=templates[lawyer].sets.map((set,index)=>({id:`base:${index}`,title:set.title,items:set.items,builtIn:true}));
  return [...builtIn,...userTemplates.filter(set=>set.lawyer===lawyer).map(set=>({...set,builtIn:false}))];
}
function findTemplate(lawyer,id){return templatesFor(lawyer).find(set=>set.id===id)}
function requestItems(labels){return labels.map(label=>({label,selected:true,custom:false}))}
const defaultRequest = () => ({lawyer:'lydie',templateId:'base:0',items:requestItems(templates.lydie.sets[0].items)});
function safeRequest(){
  try {
    const parsed = JSON.parse(sessionStorage.getItem(storageKey));
    if (!parsed || !templates[parsed.lawyer] || !Array.isArray(parsed.items)) return defaultRequest();
    const migratedId=Number.isInteger(parsed.set)?`base:${parsed.set}`:'base:0';
    const templateId=typeof parsed.templateId==='string'?parsed.templateId:migratedId;
    const chosen=findTemplate(parsed.lawyer,templateId);
    if(!chosen)return {lawyer:parsed.lawyer,templateId:'base:0',items:requestItems(templates[parsed.lawyer].sets[0].items)};
    const items = parsed.items.filter(x=>x && typeof x.label==='string' && x.label.trim() && x.label.length<=120).slice(0,30).map(x=>({label:x.label,selected:Boolean(x.selected),custom:Boolean(x.custom)}));
    return {lawyer:parsed.lawyer,templateId,items};
  } catch { return defaultRequest(); }
}
function saveRequest(request){try{sessionStorage.setItem(storageKey,JSON.stringify(request));}catch{/* L'aperçu reste utilisable sans stockage de session. */}}
function element(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node}
function pieceCount(count){return `${count} pièce${count>1?'s':''}`}

function initLawyer(){
  const lawyerSelect=document.querySelector('#lawyer-select');
  const templateSelect=document.querySelector('#template-select');
  const list=document.querySelector('#lawyer-checklist');
  const customForm=document.querySelector('#custom-item-form');
  const templateEditor=document.querySelector('#template-editor');
  const newTemplateButton=document.querySelector('#new-template');
  const editTemplateButton=document.querySelector('#edit-template');
  const copyTemplateButton=document.querySelector('#copy-template');
  const templateItemList=document.querySelector('#template-item-list');
  const templateItemError=document.querySelector('#template-item-error');
  const status=document.querySelector('#template-status');
  const deletePanel=document.querySelector('#template-delete');
  const invitationStatus=document.querySelector('#invitation-status');
  const invitationResult=document.querySelector('#invitation-result');
  const invitationHistory=document.querySelector('#invitation-history');
  let request=safeRequest();
  let currentInviteToken=null;
  let templateDraft=null;
  let templateBaseline='';
  function setStatus(message){status.textContent=message}
  function setInvitationStatus(message){invitationStatus.textContent=message}
  function formatDate(timestamp){return new Intl.DateTimeFormat('fr-FR',{dateStyle:'long',timeStyle:'short'}).format(new Date(timestamp))}
  async function copyText(value,label,report=setInvitationStatus){
    try {await navigator.clipboard.writeText(value);report(`${label} copié. Il fonctionne uniquement dans ce navigateur de démonstration.`);return}
    catch {/* Certains navigateurs n'autorisent pas l'API Clipboard. */}
    const field=document.createElement('textarea');field.value=value;field.style.position='fixed';field.style.opacity='0';document.body.append(field);field.select();
    const copied=document.execCommand('copy');field.remove();report(copied?`${label} copié.`:'Copie indisponible : sélectionnez la valeur affichée pour la copier.');
  }
  function revokeInvitation(token){
    const current=loadInvitations();const target=current.find(entry=>entry.token===token);if(!target)return;
    if(!persistInvitations(current.map(entry=>entry.token===token?{...entry,revoked:true}:entry))){setInvitationStatus('Impossible de révoquer ce lien dans ce navigateur.');return}
    setInvitationStatus(`Le lien ${invitationReference(target)} est révoqué.`);renderInvitations();
  }
  function renderReceived(){
    const container=document.querySelector('#received-list');container.replaceChildren();
    const all=loadInvitations().filter(entry=>entry.submittedAt&&!entry.deletedAt).sort((a,b)=>b.submittedAt-a.submittedAt);
    const terms=searchKey(document.querySelector('#received-search').value).split(' ').filter(Boolean);
    const received=all.filter(entry=>{const haystack=searchKey(`${clientNameFor(entry)} ${invitationReference(entry)} ${templates[entry.lawyer].name}`);return terms.every(term=>haystack.includes(term))});
    document.querySelector('#received-count').textContent=terms.length?`${received.length} dossier${received.length>1?'s':''} trouvé${received.length>1?'s':''} sur ${all.length}.`:`${all.length} dossier${all.length>1?'s':''} reçu${all.length>1?'s':''}.`;
    if(!all.length){container.append(element('p','received-empty','Aucun dossier reçu pour le moment. Terminez un formulaire client pour en voir apparaître un ici.'));return}
    if(!received.length){container.append(element('p','received-empty','Aucun dossier ne correspond à cette recherche. Essayez le nom du client ou sa référence.'));return}
    received.forEach(entry=>{
      const name=clientNameFor(entry),reference=invitationReference(entry);
      const row=element('article','received-row');const body=element('div');body.append(element('strong','received-row__name',name||reference));
      body.append(element('span','received-row__reference',name?`${reference} · ${templates[entry.lawyer].name}`:templates[entry.lawyer].name));
      body.append(element('span','',`Déposé le ${formatDate(entry.submittedAt)} · ${pieceCount(entry.received.length)} présente${entry.received.length>1?'s':''} · ${pieceCount(entry.missing.length)} manquante${entry.missing.length>1?'s':''}`));
      const link=element('a','button-secondary','Ouvrir le dossier →');link.href=dossierUrl(entry.token);link.setAttribute('aria-label',`Ouvrir le dossier ${name||reference}`);row.append(body,link);container.append(row);
    });
  }
  function renderInvitations(){
    const all=loadInvitations().filter(entry=>entry.lawyer===request.lawyer).reverse();
    const signature=requestSignature(request);
    const active=all.find(entry=>invitationState(entry)==='Actif'&&JSON.stringify([entry.lawyer,entry.items])===signature);
    currentInviteToken=active?.token||null;invitationResult.hidden=!active;
    if(active){
      document.querySelector('#invitation-url').value=invitationUrl(active.token);
      document.querySelector('#invitation-expiry').textContent=`${invitationReference(active)} · valable jusqu’au ${formatDate(active.expiresAt)}. La demande est destinée à ${templates[active.lawyer].name}.`;
      document.querySelector('#open-invitation').href=invitationUrl(active.token);
    }
    invitationHistory.hidden=all.length===0;
    const historyList=document.querySelector('#invitation-list');historyList.replaceChildren();
    all.slice(0,8).forEach(entry=>{
      const state=invitationState(entry);const row=element('li');
      row.append(element('span','',invitationReference(entry)),element('span','history-meta',`${state} · jusqu’au ${formatDate(entry.expiresAt)} · ${entry.items.length} pièce(s) + identité`));
      if(state==='Actif'){
        const actions=element('span','history-actions');const copy=element('button','','Copier');copy.type='button';copy.setAttribute('aria-label',`Copier le lien ${invitationReference(entry)}`);copy.addEventListener('click',()=>copyText(invitationUrl(entry.token),'Lien'));
        const revoke=element('button','','Révoquer');revoke.type='button';revoke.setAttribute('aria-label',`Révoquer le lien ${invitationReference(entry)}`);revoke.addEventListener('click',()=>revokeInvitation(entry.token));actions.append(copy,revoke);row.append(actions);
      }
      historyList.append(row);
    });
    renderReceived();
  }
  function templateFormData(){return {title:document.querySelector('#template-title').value,items:[...templateItemList.querySelectorAll('input')].map(input=>input.value)}}
  function templateIsDirty(){return templateDraft&&JSON.stringify(templateFormData())!==templateBaseline}
  function updateTemplateDraftStatus(){
    document.querySelector('#template-draft-status').textContent=templateIsDirty()?'Modifications non enregistrées':templateDraft?.mode==='edit'?'Aucune modification':'Non enregistrée';
  }
  function closeTemplateEditor(force=false){
    if(templateEditor.hidden)return true;
    if(!force&&templateIsDirty()&&!window.confirm('Abandonner les modifications non enregistrées de cette liste type ?'))return false;
    templateEditor.hidden=true;templateDraft=null;templateItemList.replaceChildren();deletePanel.hidden=true;
    [newTemplateButton,editTemplateButton,copyTemplateButton].forEach(button=>button.setAttribute('aria-expanded','false'));
    return true;
  }
  function renumberTemplateItems(){
    [...templateItemList.children].forEach((row,index)=>{
      row.querySelector('label span').textContent=`Pièce ${String(index+1).padStart(2,'0')}`;
      row.querySelector('input').id=`template-item-${index}`;
      row.querySelector('label').htmlFor=`template-item-${index}`;
      row.querySelector('[data-move="up"]').disabled=index===0;
      row.querySelector('[data-move="down"]').disabled=index===templateItemList.children.length-1;
      row.querySelector('[data-move="up"]').setAttribute('aria-label',`Monter la pièce ${index+1}`);
      row.querySelector('[data-move="down"]').setAttribute('aria-label',`Descendre la pièce ${index+1}`);
      row.querySelector('[data-remove]').setAttribute('aria-label',`Supprimer la pièce ${index+1}`);
    });
    updateTemplateDraftStatus();
  }
  function addTemplateItem(value='',focus=false){
    if(templateItemList.children.length>=30){showTemplateError('La liste peut contenir au maximum 30 pièces.');return}
    const row=element('div','template-item-row');
    const label=element('label','field');label.append(element('span'));
    const input=element('input');input.type='text';input.maxLength=120;input.required=true;input.placeholder='Ex. Certificat médical initial';input.value=value;
    input.addEventListener('input',()=>{showTemplateError('');updateTemplateDraftStatus()});label.append(input);
    const controls=element('div','template-item-row__actions');
    const up=element('button','template-item-row__move','↑');up.type='button';up.dataset.move='up';up.title='Monter';
    const down=element('button','template-item-row__move','↓');down.type='button';down.dataset.move='down';down.title='Descendre';
    const remove=element('button','text-button','Supprimer');remove.type='button';remove.dataset.remove='';
    up.addEventListener('click',()=>{const previous=row.previousElementSibling;if(previous){templateItemList.insertBefore(row,previous);renumberTemplateItems();input.focus()}});
    down.addEventListener('click',()=>{const next=row.nextElementSibling;if(next){templateItemList.insertBefore(next,row);renumberTemplateItems();input.focus()}});
    remove.addEventListener('click',()=>{const next=row.nextElementSibling?.querySelector('input')||row.previousElementSibling?.querySelector('input');row.remove();renumberTemplateItems();(next||document.querySelector('#add-template-item')).focus()});
    controls.append(up,down,remove);row.append(label,controls);templateItemList.append(row);renumberTemplateItems();
    if(focus)input.focus();
  }
  function showTemplateError(message){templateItemError.textContent=message;templateItemError.hidden=!message}
  function startTemplateEditor(mode){
    if(!closeTemplateEditor())return;
    const selected=findTemplate(request.lawyer,request.templateId);
    if(mode==='edit'&&(!selected||selected.builtIn))return;
    templateDraft={mode,id:mode==='edit'?selected.id:null,lawyer:request.lawyer};
    templateEditor.hidden=false;templateItemList.replaceChildren();showTemplateError('');deletePanel.hidden=true;
    const title=mode==='edit'?selected.title:mode==='copy'?`Copie de ${selected.title}`:'';
    const items=mode==='new'?['']:selected.items;
    document.querySelector('#template-editor-title').textContent=mode==='edit'?'Modifier la liste type':mode==='copy'?'Copier la liste type':'Créer une liste type';
    document.querySelector('#template-title').value=title;
    document.querySelector('#show-delete-template').hidden=mode!=='edit';
    document.querySelector('#save-template').textContent=mode==='edit'?'Enregistrer les modifications':'Créer et enregistrer la liste';
    items.forEach(item=>addTemplateItem(item));
    templateBaseline=JSON.stringify(templateFormData());updateTemplateDraftStatus();
    const button=mode==='edit'?editTemplateButton:mode==='copy'?copyTemplateButton:newTemplateButton;
    button.setAttribute('aria-expanded','true');setStatus('');templateEditor.scrollIntoView({block:'nearest'});document.querySelector('#template-title').focus();
  }
  function activateTemplate(id){const chosen=findTemplate(request.lawyer,id);if(!chosen)return;request.templateId=id;request.items=requestItems(chosen.items);setStatus('');saveRequest(request);render()}
  function normalizedTitle(value){return value.trim().replace(/\s+/g,' ')}
  function titleInUse(title,exceptId){return templatesFor(request.lawyer).some(set=>set.id!==exceptId&&set.title.toLocaleLowerCase('fr')===title.toLocaleLowerCase('fr'))}
  function render(){
    lawyerSelect.value=request.lawyer;
    templateSelect.replaceChildren();
    const builtIn=element('optgroup');builtIn.label='Listes proposées';
    const personal=element('optgroup');personal.label='Listes créées par le cabinet';
    templatesFor(request.lawyer).forEach(set=>{const option=element('option','',set.title);option.value=set.id;(set.builtIn?builtIn:personal).append(option)});
    templateSelect.append(builtIn);if(personal.children.length)templateSelect.append(personal);
    templateSelect.value=request.templateId;
    const chosen=findTemplate(request.lawyer,request.templateId);
    editTemplateButton.hidden=Boolean(chosen?.builtIn);
    copyTemplateButton.hidden=!chosen?.builtIn;
    list.replaceChildren();
    request.items.forEach((item,index)=>{
      const row=element('div','check-row');
      const label=element('label');label.style.display='flex';label.style.alignItems='center';label.style.gap='15px';label.style.flex='1';label.style.cursor='pointer';
      const input=element('input');input.type='checkbox';input.checked=item.selected;input.setAttribute('aria-label',`Demander : ${item.label}`);
      input.addEventListener('change',()=>{item.selected=input.checked;saveRequest(request);updatePreview()});
      label.append(input,element('strong','',item.label));row.append(label);
      if(item.custom){const remove=element('button','remove-item','Retirer');remove.type='button';remove.setAttribute('aria-label',`Retirer : ${item.label}`);remove.addEventListener('click',()=>{request.items.splice(index,1);saveRequest(request);render()});row.append(remove)}
      else row.append(element('span','row-index',String(index+1).padStart(2,'0')));
      list.append(row);
    });
    updatePreview();
  }
  function updatePreview(){document.querySelector('#preview-lawyer').textContent=templates[request.lawyer].name;document.querySelector('#selected-count').textContent=String(request.items.filter(x=>x.selected).length);saveRequest(request);renderInvitations()}
  lawyerSelect.addEventListener('change',()=>{if(!closeTemplateEditor()){lawyerSelect.value=request.lawyer;return}request.lawyer=lawyerSelect.value;document.querySelector('#demo-case-result').hidden=true;activateTemplate('base:0')});
  templateSelect.addEventListener('change',()=>{if(!closeTemplateEditor()){templateSelect.value=request.templateId;return}activateTemplate(templateSelect.value)});
  customForm.addEventListener('submit',event=>{event.preventDefault();const input=customForm.elements['custom-item'];const label=input.value.trim();if(!label)return;if(request.items.some(x=>x.label.toLocaleLowerCase('fr')===label.toLocaleLowerCase('fr'))){input.setCustomValidity('Cette pièce figure déjà dans la liste.');input.reportValidity();return}if(request.items.length>=30){input.setCustomValidity('La limite de cette démonstration est de 30 pièces.');input.reportValidity();return}input.setCustomValidity('');request.items.push({label,selected:true,custom:true});input.value='';saveRequest(request);render();input.focus()});
  customForm.elements['custom-item'].addEventListener('input',event=>event.target.setCustomValidity(''));
  newTemplateButton.addEventListener('click',()=>startTemplateEditor('new'));
  editTemplateButton.addEventListener('click',()=>startTemplateEditor('edit'));
  copyTemplateButton.addEventListener('click',()=>startTemplateEditor('copy'));
  document.querySelector('#cancel-template').addEventListener('click',()=>closeTemplateEditor());
  document.querySelector('#template-title').addEventListener('input',event=>{event.target.setCustomValidity('');showTemplateError('');updateTemplateDraftStatus()});
  document.querySelector('#add-template-item').addEventListener('click',()=>addTemplateItem('',true));
  templateItemList.addEventListener('keydown',event=>{if(event.key==='Enter'&&event.target.matches('input')){event.preventDefault();addTemplateItem('',true)}});
  templateEditor.addEventListener('submit',event=>{
    event.preventDefault();if(!templateDraft)return;
    const titleInput=document.querySelector('#template-title');const title=normalizedTitle(titleInput.value);
    if(!title){titleInput.setCustomValidity('Donnez un nom à la liste.');titleInput.reportValidity();return}
    if(titleInUse(title,templateDraft.id)){titleInput.setCustomValidity('Une liste de cet avocat porte déjà ce nom.');titleInput.reportValidity();return}
    const inputs=[...templateItemList.querySelectorAll('input')];
    if(!inputs.length){showTemplateError('Ajoutez au moins une pièce à demander.');document.querySelector('#add-template-item').focus();return}
    const items=inputs.map(input=>normalizedTitle(input.value));
    const emptyIndex=items.findIndex(item=>!item);
    if(emptyIndex!==-1){showTemplateError('Chaque pièce doit avoir un intitulé.');inputs[emptyIndex].focus();return}
    const duplicate=items.find((item,index)=>items.findIndex(other=>other.toLocaleLowerCase('fr')===item.toLocaleLowerCase('fr'))!==index);
    if(duplicate){showTemplateError(`La pièce « ${duplicate} » figure deux fois dans la liste.`);inputs[items.indexOf(duplicate)].focus();return}
    const {mode,id:existingId,lawyer}=templateDraft;
    if(mode!=='edit'&&userTemplates.length>=50){showTemplateError('La limite de 50 listes types est atteinte pour cette démonstration.');return}
    const id=existingId||`user:${crypto.randomUUID()}`;
    const next=mode==='edit'?userTemplates.map(set=>set.id===id?{...set,title,items}:set):[...userTemplates,{id,lawyer,title,items}];
    if(!persistUserTemplates(next)){showTemplateError('Impossible d’enregistrer dans ce navigateur. Vérifiez que le stockage local est autorisé.');return}
    closeTemplateEditor(true);activateTemplate(id);
    setStatus(mode==='edit'?`La liste type « ${title} » a été mise à jour, avec ses pièces enregistrées.`:`La liste type « ${title} » et ses ${items.length} pièces sont enregistrées pour ${templates[lawyer].name}.`);
  });
  document.querySelector('#show-delete-template').addEventListener('click',()=>{deletePanel.hidden=false;document.querySelector('#cancel-delete-template').focus()});
  document.querySelector('#cancel-delete-template').addEventListener('click',()=>{deletePanel.hidden=true;document.querySelector('#show-delete-template').focus()});
  document.querySelector('#confirm-delete-template').addEventListener('click',()=>{
    const selected=templateDraft?.mode==='edit'?findTemplate(templateDraft.lawyer,templateDraft.id):null;if(!selected||selected.builtIn)return;
    if(!persistUserTemplates(userTemplates.filter(set=>set.id!==selected.id))){showTemplateError('Impossible de supprimer dans ce navigateur.');return}
    closeTemplateEditor(true);activateTemplate('base:0');setStatus(`La liste type « ${selected.title} » a été supprimée de ce navigateur.`);
  });
  document.querySelector('#generate-invitation').addEventListener('click',()=>{
    try {
    const days=Number(document.querySelector('#invitation-validity').value);const now=Date.now();
    const invitation={token:crypto.randomUUID(),lawyer:request.lawyer,items:request.items.filter(item=>item.selected).map(item=>item.label),createdAt:now,expiresAt:now+days*86400000,revoked:false,submittedAt:0,deletedAt:0,received:[],missing:[]};
    if(!persistInvitations([...loadInvitations(),invitation])){setInvitationStatus('Impossible de créer le lien : le stockage local du navigateur est indisponible.');return}
    setInvitationStatus(`Lien ${invitationReference(invitation)} créé pour ${templates[request.lawyer].name}. Aucun e-mail n’a été envoyé.`);renderInvitations();
    } catch {setInvitationStatus('Impossible de créer le lien dans ce navigateur. Vérifiez que la page est ouverte en HTTPS ou sur 127.0.0.1.');}
  });
  document.querySelector('#copy-invitation').addEventListener('click',()=>{if(currentInviteToken)copyText(invitationUrl(currentInviteToken),'Lien')});
  document.querySelector('#revoke-invitation').addEventListener('click',()=>{if(currentInviteToken)revokeInvitation(currentInviteToken)});
  document.querySelector('#create-demo-case').addEventListener('click',()=>{
    try {
      const now=Date.now(),items=request.items.filter(item=>item.selected).map(item=>item.label);
      const invitation={token:crypto.randomUUID(),lawyer:request.lawyer,clientName:'Camille DÉMONSTRATION',items,createdAt:now,expiresAt:now+7*86400000,revoked:false,submittedAt:now,deletedAt:0,received:['État civil','Pièce d’identité — recto','Pièce d’identité — verso',...items.slice(0,2)],missing:items.slice(2)};
      if(!persistInvitations([...loadInvitations(),invitation]))throw new Error('storage');
      saveCaseIdentity(invitation.token,{firstName:'Camille',lastName:'DÉMONSTRATION',birthDate:'1980-01-01',email:'camille@example.invalid',address:'1 rue de démonstration',postalCode:'00000',city:'Créteil'});
      document.querySelector('#open-demo-case').href=dossierUrl(invitation.token);
      document.querySelector('#demo-case-result').hidden=false;
      document.querySelector('#demo-case-status').textContent=`Exemple ${invitationReference(invitation)} créé. Vous pouvez ouvrir le dossier directement.`;
      renderReceived();
    }catch{document.querySelector('#demo-case-status').textContent='Impossible de créer un dossier fictif dans ce navigateur.'}
  });
  document.querySelector('#received-search').addEventListener('input',renderReceived);
  render();
}

function initClient(){
  const form=document.querySelector('#client-form');
  const token=new URLSearchParams(location.search).get('invite');
  const invitation=token?loadInvitations().find(entry=>entry.token===token):null;
  if(token&&(!invitation||invitationState(invitation)!=='Actif')){
    form.hidden=true;document.querySelector('#invalid-invitation').hidden=false;
    document.querySelector('#client-lawyer').textContent='Cabinet MODENA Advocatus';
    document.querySelector('#invalid-invitation-reason').textContent=invitation?.deletedAt?'Ce dossier a été supprimé. Demandez une nouvelle invitation au cabinet.':invitation?.submittedAt?'Cette demande a déjà été transmise. Contactez le cabinet pour ajouter une pièce.':invitation?.revoked?'Ce lien a été révoqué par le cabinet. Demandez une nouvelle invitation.':invitation?'Ce lien a expiré. Demandez une nouvelle invitation au cabinet.':'Ce lien est inconnu dans ce navigateur de démonstration. Demandez une nouvelle invitation au cabinet.';
    return;
  }
  const request=invitation?{lawyer:invitation.lawyer,items:requestItems(invitation.items)}:safeRequest();
  document.querySelector('#client-lawyer').textContent=templates[request.lawyer].name;
  if(invitation){document.querySelector('.client-intro .eyebrow').textContent=`Invitation ${invitationReference(invitation)} · démonstration`;}
  const documentList=document.querySelector('#client-document-list');
  const requested=request.items.filter(item=>item.selected);
  const fileAccept='.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png';
  requested.forEach((item,index)=>{
    const section=element('section','client-document');
    const heading=element('h4','',`${String(index+1).padStart(2,'0')}. ${item.label}`);
    const fileLabel=element('label','upload-field');fileLabel.append(element('span','','Document à transmettre'));
    const input=element('input');input.type='file';input.name=`piece-${index}`;input.accept=fileAccept;input.setAttribute('aria-label',`Fichier : ${item.label}`);fileLabel.append(input,element('small','','PDF, JPG ou PNG · 10 Mo maximum'));
    const unavailableLabel=element('label','unavailable');const checkbox=element('input');checkbox.type='checkbox';checkbox.name=`missing-${index}`;unavailableLabel.append(checkbox,element('span','','Je n’ai pas cette pièce'));
    checkbox.addEventListener('change',()=>{section.classList.toggle('is-unavailable',checkbox.checked);input.disabled=checkbox.checked;if(checkbox.checked)input.value=''});
    section.append(heading,fileLabel,unavailableLabel);documentList.append(section);
  });
  if(!requested.length)documentList.append(element('p','section-description','Aucune pièce complémentaire n’a été demandée.'));
  function showStep(step){
    document.querySelectorAll('[data-step]').forEach(panel=>{panel.hidden=Number(panel.dataset.step)!==step});
    document.querySelectorAll('[data-step-label]').forEach(label=>{label.classList.toggle('is-current',Number(label.dataset.stepLabel)===step)});
    const panel=document.querySelector(`[data-step="${step}"]`);const heading=panel.querySelector('h2');heading?.setAttribute('tabindex','-1');heading?.focus({preventScroll:true});window.scrollTo({top:0,behavior:'smooth'});
  }
  function validateIdentity(){
    for(const input of form.querySelectorAll('[data-step="1"] input')){if(!input.checkValidity()){input.reportValidity();input.focus();return false}}
    return true;
  }
  function validateFiles(){
    const front=form.elements.idFront,back=form.elements.idBack;
    for(const input of [front,back]){if(!input.files.length){input.setCustomValidity('Veuillez sélectionner ce côté de la pièce d’identité.');input.reportValidity();input.focus();return false}input.setCustomValidity('')}
    for(const input of form.querySelectorAll('[data-step="2"] input[type=file]')){
      if(input.disabled)continue;
      if(input.name.startsWith('piece-')&&!input.files.length){input.setCustomValidity('Ajoutez ce document ou cochez « Je n’ai pas cette pièce ».');input.reportValidity();input.focus();return false}
      input.setCustomValidity('');
      if(input.files[0]&&input.files[0].size>10*1024*1024){input.setCustomValidity('Ce fichier dépasse 10 Mo.');input.reportValidity();input.focus();return false}
      const file=input.files[0];if(file&&!/\.(pdf|jpe?g|png)$/i.test(file.name)){input.setCustomValidity('Choisissez un fichier PDF, JPG ou PNG.');input.reportValidity();input.focus();return false}
    }
    return true;
  }
  form.addEventListener('change',event=>{if(event.target.type==='file')event.target.setCustomValidity('')});
  document.querySelectorAll('[data-next]').forEach(button=>button.addEventListener('click',()=>{const next=Number(button.dataset.next);if(next===2&&validateIdentity())showStep(2);if(next===3&&validateFiles()){renderReview();showStep(3)}}));
  document.querySelectorAll('[data-back]').forEach(button=>button.addEventListener('click',()=>showStep(Number(button.dataset.back))));
  function reviewGroup(title,rows){const group=element('section','review-group');group.append(element('h3','',title));const list=element('ul');rows.forEach(([label,value])=>{const item=element('li');item.append(element('span','',label),element('span','',value));list.append(item)});group.append(list);return group}
  function renderReview(){
    const summary=document.querySelector('#review-content');summary.replaceChildren();
    const data=new FormData(form);summary.append(reviewGroup('État civil',[["Nom",`${data.get('firstName')} ${data.get('lastName')}`],["Date de naissance",String(data.get('birthDate'))],["Adresse e-mail",String(data.get('email'))],["Adresse",`${data.get('address')}, ${data.get('postalCode')} ${data.get('city')}`]]));
    summary.append(reviewGroup('Pièce d’identité',[["Recto",form.elements.idFront.files[0].name],["Verso",form.elements.idBack.files[0].name]]));
    if(requested.length)summary.append(reviewGroup('Pièces du dossier',requested.map((item,index)=>[item.label,form.elements[`missing-${index}`].checked?'Pièce non disponible':form.elements[`piece-${index}`].files[0].name])));
    summary.append(reviewGroup('Réception prévue',[["Avocat destinataire",templates[request.lawyer].name],["Référence",invitation?invitationReference(invitation):'Aperçu sans invitation'],["Notification",'E-mail de signalement, sans pièce jointe']]));
  }
  document.querySelector('#finish-demo').addEventListener('click',()=>{
    if(invitation){
      const latest=loadInvitations().find(entry=>entry.token===invitation.token);
      if(!latest||invitationState(latest)!=='Actif'){alert('Ce lien ne permet plus de déposer des pièces. Demandez une nouvelle invitation au cabinet.');return}
      const data=new FormData(form);
      const identity=Object.fromEntries(identityFields.map(field=>[field,data.get(field)]));
      if(!saveCaseIdentity(invitation.token,identity)){alert('Le navigateur ne peut pas conserver les informations fictives pour l’aperçu de l’avis. Réessayez après avoir autorisé le stockage de session.');return}
      const received=['État civil','Pièce d’identité — recto','Pièce d’identité — verso'];
      const missing=[];
      requested.forEach((item,index)=>{(form.elements[`missing-${index}`].checked?missing:received).push(item.label)});
      if(!updateInvitation(invitation.token,{clientName:safeClientName(`${identity.firstName} ${identity.lastName}`),submittedAt:Date.now(),received,missing})){deleteCaseIdentity(invitation.token);alert('Le navigateur ne peut pas enregistrer ce dépôt de démonstration. Réessayez après avoir autorisé le stockage local.');return}
      document.querySelector('#completion-reference').textContent=invitationReference(invitation);
      document.querySelector('#completion-counts').textContent=`${pieceCount(received.length)} indiquée${received.length>1?'s':''} comme présente${received.length>1?'s':''} · ${pieceCount(missing.length)} indisponible${missing.length>1?'s':''}.`;
      const missingBlock=document.querySelector('#completion-missing-block');missingBlock.hidden=missing.length===0;
      const missingList=document.querySelector('#completion-missing-list');missingList.replaceChildren(...missing.map(label=>element('li','',label)));
    }else{
      document.querySelector('#completion-title').textContent='Aperçu terminé.';
      document.querySelector('#completion-intro').textContent='Vous avez essayé le formulaire sans invitation. Aucun dossier n’a été créé ; générez un lien depuis l’espace cabinet pour tester la réception.';
      document.querySelector('#completion-counts').hidden=true;
      document.querySelector('.completion-help').hidden=true;
      document.querySelector('.completion-demo-link a').href='index.html';
      document.querySelector('.completion-demo-link a').textContent='Revenir à l’espace cabinet →';
    }
    form.hidden=true;document.querySelector('.client-intro').hidden=true;document.querySelector('.client-rail').hidden=true;document.querySelector('.client-layout').classList.add('is-complete');document.querySelector('#completion').hidden=false;const heading=document.querySelector('#completion-title');heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});window.scrollTo({top:0,behavior:'smooth'});
  });
  form.addEventListener('submit',event=>event.preventDefault());
}
function initSupplement(){
  const token=new URLSearchParams(location.search).get('request');
  const invitation=loadInvitations().find(entry=>entry.followUp?.token===token);
  const request=invitation?.followUp;
  const unavailable=document.querySelector('#supplement-unavailable');
  function showUnavailable(message,canRefresh=false){document.querySelector('#supplement-content').hidden=true;unavailable.hidden=false;document.querySelector('#supplement-unavailable-title').textContent=canRefresh?'La liste des pièces a changé.':'Cette demande n’est plus accessible.';document.querySelector('#supplement-unavailable-reason').textContent=message;const refresh=document.querySelector('#supplement-reload');refresh.hidden=!canRefresh;if(canRefresh)refresh.href=location.href}
  if(!invitation||!request){showUnavailable('Ce lien est inconnu ou a été remplacé par une demande plus récente. Vérifiez que vous utilisez le dernier lien transmis par le cabinet.');return}
  if(invitation.deletedAt){showUnavailable('Ce dossier a été supprimé. Contactez le cabinet.');return}
  if(request.submittedAt){showUnavailable('Ce lien a déjà été utilisé. Contactez le cabinet si vous devez transmettre une autre pièce.');return}
  if(request.expiresAt<=Date.now()){showUnavailable('Ce lien a expiré. Demandez un nouveau lien au cabinet.');return}
  document.querySelector('#supplement-content').hidden=false;
  document.querySelector('#supplement-lawyer').textContent=templates[invitation.lawyer].name;
  document.querySelector('#supplement-reference').textContent=invitationReference(invitation);
  const form=document.querySelector('#supplement-form');
  const list=document.querySelector('#supplement-items');
  request.items.forEach((label,index)=>{
    const section=element('section','client-document');
    section.append(element('h3','',`${String(index+1).padStart(2,'0')}. ${label}`));
    const fileLabel=element('label','upload-field');fileLabel.append(element('span','','Document à transmettre'));
    const input=element('input');input.type='file';input.name=`supplement-piece-${index}`;input.accept='.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png';input.setAttribute('aria-label',`Fichier : ${label}`);
    fileLabel.append(input,element('small','','PDF, JPG ou PNG · 10 Mo maximum'));
    const missingLabel=element('label','unavailable');const checkbox=element('input');checkbox.type='checkbox';checkbox.name=`supplement-missing-${index}`;
    missingLabel.append(checkbox,element('span','','Je n’ai toujours pas cette pièce'));
    checkbox.addEventListener('change',()=>{section.classList.toggle('is-unavailable',checkbox.checked);input.disabled=checkbox.checked;if(checkbox.checked)input.value=''});
    section.append(fileLabel,missingLabel);list.append(section);
  });
  form.addEventListener('change',event=>{if(event.target.type==='file')event.target.setCustomValidity('')});
  form.addEventListener('submit',event=>{
    event.preventDefault();
    const latest=loadInvitations().find(entry=>entry.token===invitation.token);
    if(!latest||latest.deletedAt||latest.followUp?.token!==token||latest.followUp.submittedAt||latest.followUp.expiresAt<=Date.now()){
      showUnavailable('Ce lien ne permet plus de transmettre des pièces. Contactez le cabinet.');return;
    }
    if(latest.followUp.revision!==request.revision){showUnavailable('La liste des pièces a changé depuis l’ouverture de cette page. Actualisez la demande pour voir la liste à jour.',true);return}
    for(const input of form.querySelectorAll('input[type=file]')){
      if(input.disabled)continue;
      const file=input.files[0];
      if(!file){input.setCustomValidity('Ajoutez ce document ou cochez « Je n’ai toujours pas cette pièce ».');input.reportValidity();input.focus();return}
      if(file.size>10*1024*1024){input.setCustomValidity('Ce fichier dépasse 10 Mo.');input.reportValidity();input.focus();return}
      if(!/\.(pdf|jpe?g|png)$/i.test(file.name)){input.setCustomValidity('Choisissez un fichier PDF, JPG ou PNG.');input.reportValidity();input.focus();return}
      input.setCustomValidity('');
    }
    const receivedNow=[],missingNow=[];
    request.items.forEach((label,index)=>{(form.elements[`supplement-missing-${index}`].checked?missingNow:receivedNow).push(label)});
    const received=new Set(latest.received),missing=new Set(latest.missing);
    receivedNow.forEach(label=>{received.add(label);missing.delete(label)});
    missingNow.forEach(label=>{if(!received.has(label))missing.add(label)});
    const allItems=new Set([...latest.items,...request.items]);
    const followUp={...latest.followUp,submittedAt:Date.now(),received:receivedNow,missing:missingNow};
    if(!updateInvitation(invitation.token,{items:[...allItems],received:[...received],missing:[...missing],followUp})){
      alert('Le navigateur ne peut pas enregistrer ce complément fictif. Réessayez après avoir autorisé le stockage local.');return;
    }
    document.querySelector('.supplement-layout').hidden=true;
    document.querySelector('.client-intro').hidden=true;
    const completion=document.querySelector('#supplement-completion');completion.hidden=false;
    document.querySelector('#supplement-completion-reference').textContent=invitationReference(invitation);
    document.querySelector('#supplement-completion-counts').textContent=`${pieceCount(receivedNow.length)} ajoutée${receivedNow.length>1?'s':''} · ${pieceCount(missingNow.length)} encore indisponible${missingNow.length>1?'s':''}.`;
    const remainingBlock=document.querySelector('#supplement-remaining-block');remainingBlock.hidden=missing.size===0;
    document.querySelector('#supplement-remaining-list').replaceChildren(...[...missing].map(label=>element('li','',label)));
    document.querySelector('#supplement-open-case').href=dossierUrl(invitation.token);
    const heading=document.querySelector('#supplement-completion-title');heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});window.scrollTo({top:0,behavior:'smooth'});
  });
}
function demoPdf(lines){
  const encoder=new TextEncoder();
  const ascii=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7e]/g,'?').replace(/[\\()]/g,'\\$&');
  const stream=`BT /F1 14 Tf 48 780 Td 22 TL ${lines.map(line=>`(${ascii(line)}) Tj T*`).join(' ')} ET`;
  const objects=[
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${encoder.encode(stream).length} >>\nstream\n${stream}\nendstream`
  ];
  let output='%PDF-1.4\n',offsets=[0];
  objects.forEach((object,index)=>{offsets.push(encoder.encode(output).length);output+=`${index+1} 0 obj\n${object}\nendobj\n`});
  const start=encoder.encode(output).length;
  output+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach(offset=>{output+=`${String(offset).padStart(10,'0')} 00000 n \n`});
  output+=`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`;
  return encoder.encode(output);
}
function demoZip(files){
  const encoder=new TextEncoder(),chunks=[],directory=[];let offset=0;
  const crcTable=Array.from({length:256},(_,index)=>{let value=index;for(let bit=0;bit<8;bit++)value=value&1?0xedb88320^(value>>>1):value>>>1;return value>>>0});
  function crc32(data){let crc=0xffffffff;for(const byte of data)crc=crcTable[(crc^byte)&255]^(crc>>>8);return (crc^0xffffffff)>>>0}
  function header(size){const bytes=new Uint8Array(size);return {bytes,view:new DataView(bytes.buffer)}}
  files.forEach(file=>{
    const name=encoder.encode(file.name),data=file.data,crc=crc32(data),local=header(30+name.length);
    local.view.setUint32(0,0x04034b50,true);local.view.setUint16(4,20,true);local.view.setUint16(6,0x0800,true);local.view.setUint32(14,crc,true);local.view.setUint32(18,data.length,true);local.view.setUint32(22,data.length,true);local.view.setUint16(26,name.length,true);local.bytes.set(name,30);
    chunks.push(local.bytes,data);
    const central=header(46+name.length);central.view.setUint32(0,0x02014b50,true);central.view.setUint16(4,20,true);central.view.setUint16(6,20,true);central.view.setUint16(8,0x0800,true);central.view.setUint32(16,crc,true);central.view.setUint32(20,data.length,true);central.view.setUint32(24,data.length,true);central.view.setUint16(28,name.length,true);central.view.setUint32(42,offset,true);central.bytes.set(name,46);directory.push(central.bytes);
    offset+=local.bytes.length+data.length;
  });
  const directorySize=directory.reduce((total,part)=>total+part.length,0),end=header(22);
  end.view.setUint32(0,0x06054b50,true);end.view.setUint16(8,files.length,true);end.view.setUint16(10,files.length,true);end.view.setUint32(12,directorySize,true);end.view.setUint32(16,offset,true);
  return new Blob([...chunks,...directory,end.bytes],{type:'application/zip'});
}
function archiveFor(invitation){
  const encoder=new TextEncoder(),reference=invitationReference(invitation);
  const files=[{name:'00_Lisez-moi/NOTICE.txt',data:encoder.encode(`DEMONSTRATION ${reference}\n\nCette archive ne contient aucun document client.\nLes PDF ont ete crees pour illustrer le classement.\n`)}];
  files.push({name:'01_Etat_civil/fiche-etat-civil.pdf',data:demoPdf(['MODENA - DOSSIER FICTIF','Etat civil de demonstration','Aucune donnee personnelle du formulaire client n est incluse.'])});
  files.push({name:'02_Identite/recto.pdf',data:demoPdf(['MODENA - DOSSIER FICTIF','Piece d identite - recto','Aucune image ni document original n est inclus.'])});
  files.push({name:'02_Identite/verso.pdf',data:demoPdf(['MODENA - DOSSIER FICTIF','Piece d identite - verso','Aucune image ni document original n est inclus.'])});
  invitation.received.filter(label=>!['État civil','Pièce d’identité — recto','Pièce d’identité — verso'].includes(label)).forEach((label,index)=>{
    const slug=label.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,55)||'piece';
    files.push({name:`03_Pieces/${String(index+1).padStart(2,'0')}-${slug}.pdf`,data:demoPdf(['MODENA - DOSSIER FICTIF',`Piece ${index+1} : ${label}`,'Le fichier choisi par le client n a pas ete lu.'])});
  });
  files.push({name:'00_Lisez-moi/pieces-manquantes.txt',data:encoder.encode(invitation.missing.length?`Pieces declarees indisponibles :\n${invitation.missing.map(label=>`- ${label}`).join('\n')}\n`:'Aucune piece declaree indisponible.\n')});
  return demoZip(files);
}
function initDossier(){
  const token=new URLSearchParams(location.search).get('id');
  const invitation=loadInvitations().find(entry=>entry.token===token);
  const unavailable=document.querySelector('#case-unavailable');
  if(!invitation||!invitation.submittedAt){unavailable.hidden=false;return}
  document.querySelector('#case-reference').textContent=invitationReference(invitation);
  const caseClientName=clientNameFor(invitation);
  document.querySelector('#case-heading').textContent=caseClientName?`Dossier de ${caseClientName}`:'Dossier client';
  document.querySelector('#case-content').hidden=false;
  document.querySelector('#case-lawyer').textContent=templates[invitation.lawyer].name;
  document.querySelector('#case-email-subject').textContent=`MODENA · pièces disponibles · ${invitationReference(invitation)}`;
  if(invitation.deletedAt){showDeleted();return}
  if(invitation.followUp?.submittedAt){
    document.querySelector('#case-email-title').textContent='Complément de pièces reçu';
    document.querySelector('#case-email-subject').textContent=`MODENA · complément reçu · ${invitationReference(invitation)}`;
    document.querySelector('#case-email-intro').textContent='Le client a répondu à la demande complémentaire. Voici l’état actuel des pièces et le lien vers son dossier.';
  }
  document.querySelector('#case-email-link').href=`${dossierUrl(invitation.token)}#case-download`;
  const identity=loadCaseIdentity(invitation.token);
  if(identity){
    const formattedBirthDate=identity.birthDate?new Intl.DateTimeFormat('fr-FR').format(new Date(`${identity.birthDate}T00:00:00`)):'—';
    const rows=[['Prénom',identity.firstName],['Nom',identity.lastName],['Date de naissance',formattedBirthDate],['Adresse e-mail',identity.email],['Adresse postale',identity.address],['Code postal',identity.postalCode],['Ville',identity.city]];
    const details=document.querySelector('#case-email-identity');
    rows.forEach(([label,value])=>details.append(element('dt','',label),element('dd','',value||'—')));
  }else{document.querySelector('#case-email-identity-unavailable').hidden=false}
  const emailPieces=document.querySelector('#case-email-pieces');
  [...invitation.received.map(label=>[label,'Transmise']),...invitation.missing.map(label=>[label,'Non disponible'])]
    .forEach(([label,status])=>{const row=element('li');row.append(element('span','',label),element('strong',status==='Non disponible'?'case-missing':'',status));emailPieces.append(row)});
  document.querySelector('#case-summary').textContent=`${pieceCount(invitation.received.length)} présente${invitation.received.length>1?'s':''} · ${pieceCount(invitation.missing.length)} signalée${invitation.missing.length>1?'s':''} indisponible${invitation.missing.length>1?'s':''}.`;
  const list=document.querySelector('#case-items');
  invitation.received.forEach(label=>{const row=element('li');row.append(element('span','',label),element('strong','','Reçue'));list.append(row)});
  invitation.missing.forEach(label=>{const row=element('li');row.append(element('span','',label),element('strong','case-missing','Manquante'));list.append(row)});
  const followUpForm=document.querySelector('#followup-form');
  const followUpItems=document.querySelector('#followup-items');
  const followUpStatus=document.querySelector('#followup-status');
  const followUpExtra=document.querySelector('#followup-extra');
  const openFollowUp=invitation.followUp&&!invitation.followUp.submittedAt&&invitation.followUp.expiresAt>Date.now()?invitation.followUp:null;
  const extraItems=openFollowUp?openFollowUp.items.filter(label=>!invitation.items.includes(label)):[];
  const extraList=document.querySelector('#followup-extra-items');
  const extraListWrap=document.querySelector('#followup-extra-list-wrap');
  if(invitation.missing.length){
    invitation.missing.forEach((label,index)=>{
      const row=element('label','followup-choice');const input=element('input');input.type='checkbox';input.value=label;input.checked=openFollowUp?openFollowUp.items.includes(label):true;input.name=`followup-${index}`;
      row.append(input,element('span','',label));followUpItems.append(row);
    });
  }else{followUpItems.append(element('p','field-help','Aucune pièce n’est actuellement signalée manquante. Vous pouvez ajouter de nouvelles pièces ci-dessous.'))}
  function renderExtraItems(){
    extraListWrap.hidden=extraItems.length===0;
    extraList.replaceChildren(...extraItems.map((label,index)=>{
      const row=element('li');const remove=element('button','text-button','Retirer');remove.type='button';remove.setAttribute('aria-label',`Retirer ${label}`);
      remove.addEventListener('click',()=>{extraItems.splice(index,1);renderExtraItems();followUpStatus.textContent=`Pièce retirée : « ${label} ».`;followUpExtra.focus()});
      row.append(element('span','',label),remove);return row;
    }));
  }
  renderExtraItems();
  function addExtraItem(){
    const label=followUpExtra.value.trim().replace(/\s+/g,' ');
    if(!label){followUpStatus.textContent='Saisissez le nom de la pièce à ajouter.';followUpExtra.focus();return false}
    const latest=loadInvitations().find(entry=>entry.token===invitation.token);
    if(!latest||latest.deletedAt){followUpStatus.textContent='Ce dossier n’est plus disponible.';return false}
    if([...latest.items,...extraItems].some(item=>item.toLocaleLowerCase('fr')===label.toLocaleLowerCase('fr'))){followUpExtra.setCustomValidity('Cette pièce figure déjà dans le dossier ou dans la demande.');followUpExtra.reportValidity();return false}
    const selectedCount=followUpItems.querySelectorAll('input:checked').length;
    if(latest.items.length+extraItems.length>=30||selectedCount+extraItems.length>=30){followUpStatus.textContent='La limite de 30 pièces pour ce dossier ou cette demande est atteinte.';return false}
    extraItems.push(label);followUpExtra.value='';followUpExtra.setCustomValidity('');renderExtraItems();followUpStatus.textContent=`Pièce ajoutée : « ${label} ».`;followUpExtra.focus();return true;
  }
  function renderFollowUp(){
    const request=invitation.followUp;
    const active=request&&!request.submittedAt&&request.expiresAt>Date.now();
    document.querySelector('#followup-result').hidden=!active;
    if(active){
      const url=supplementUrl(request.token);
      document.querySelector('#followup-url').value=url;
      document.querySelector('#open-followup-url').href=url;
      followUpStatus.textContent=`Demande en cours : ${pieceCount(request.items.length)} demandée${request.items.length>1?'s':''}, jusqu’au ${new Intl.DateTimeFormat('fr-FR',{dateStyle:'long',timeStyle:'short'}).format(new Date(request.expiresAt))}. Vous pouvez modifier les pièces sans changer ce lien.`;
    }else if(request?.submittedAt){followUpStatus.textContent=`Dernier complément reçu : ${pieceCount(request.received.length)} ajoutée${request.received.length>1?'s':''}, ${pieceCount(request.missing.length)} encore indisponible${request.missing.length>1?'s':''}.`}
    else if(request){followUpStatus.textContent='Le dernier lien de complément a expiré. Vous pouvez en créer un nouveau.'}
    else{followUpStatus.textContent=''}
  }
  followUpForm.addEventListener('submit',event=>{
    event.preventDefault();
    if(followUpExtra.value.trim()&&!addExtraItem())return;
    const selected=[...followUpItems.querySelectorAll('input:checked')].map(input=>input.value);
    const latest=loadInvitations().find(entry=>entry.token===invitation.token);
    if(!latest||latest.deletedAt){followUpStatus.textContent='Ce dossier n’est plus disponible.';return}
    if((latest.followUp?.revision||0)!==(invitation.followUp?.revision||0)||(latest.followUp?.submittedAt||0)!==(invitation.followUp?.submittedAt||0)){followUpStatus.textContent='Le dossier a changé dans un autre onglet. Actualisez cette page avant de modifier la demande.';return}
    const items=[...selected,...extraItems];
    if(!items.length){followUpStatus.textContent='Cochez au moins une pièce ou ajoutez une nouvelle pièce à demander.';return}
    if(items.length>30){followUpStatus.textContent='La limite de cette démonstration est de 30 pièces par demande.';return}
    const now=Date.now();
    const active=latest.followUp&&!latest.followUp.submittedAt&&latest.followUp.expiresAt>now?latest.followUp:null;
    if(active&&JSON.stringify(active.items)===JSON.stringify(items)){followUpStatus.textContent='La demande contient déjà ces pièces. Le lien reste inchangé.';return}
    const followUp={token:active?.token||crypto.randomUUID(),items,revision:active?active.revision+1:1,createdAt:now,expiresAt:now+7*86400000,submittedAt:0,received:[],missing:[]};
    if(!updateInvitation(invitation.token,{followUp})){followUpStatus.textContent='Impossible de créer le lien de complément dans ce navigateur.';return}
    invitation.followUp=followUp;renderFollowUp();
    followUpStatus.textContent=active?'Demande mise à jour. Le lien de complément reste le même.':'Demande créée. Copiez le lien de complément pour le client.';
  });
  followUpExtra.addEventListener('input',()=>followUpExtra.setCustomValidity(''));
  document.querySelector('#add-followup-extra').addEventListener('click',addExtraItem);
  document.querySelector('#copy-followup-url').addEventListener('click',async()=>{
    const input=document.querySelector('#followup-url');
    try{await navigator.clipboard.writeText(input.value);followUpStatus.textContent='Lien de complément copié. Aucun e-mail n’a été envoyé.'}
    catch{input.focus();input.select();followUpStatus.textContent='Copie indisponible : le lien est sélectionné pour être copié manuellement.'}
  });
  renderFollowUp();
  let downloadStarted=false;
  document.querySelector('#download-case').addEventListener('click',event=>{
    const blob=archiveFor(invitation),url=URL.createObjectURL(blob),link=event.currentTarget;link.href=url;link.download=`MODENA-${invitationReference(invitation)}-DEMONSTRATION.zip`;setTimeout(()=>URL.revokeObjectURL(url),60000);
    downloadStarted=true;document.querySelector('#download-status').textContent='Téléchargement lancé. Vérifiez que le ZIP est bien enregistré et lisible avant de supprimer ce dossier.';
    updateDeleteButton();
  });
  const checked=document.querySelector('#case-download-confirm'),deleteButton=document.querySelector('#show-case-delete');
  function updateDeleteButton(){deleteButton.disabled=!(downloadStarted&&checked.checked)}
  checked.addEventListener('change',updateDeleteButton);
  deleteButton.addEventListener('click',()=>{document.querySelector('#case-delete-confirm').hidden=false;document.querySelector('#confirm-case-delete').focus()});
  document.querySelector('#cancel-case-delete').addEventListener('click',()=>{document.querySelector('#case-delete-confirm').hidden=true;deleteButton.focus()});
  document.querySelector('#confirm-case-delete').addEventListener('click',()=>{
    if(!downloadStarted||!checked.checked)return;
    if(!updateInvitation(invitation.token,{deletedAt:Date.now(),clientName:'',items:[],received:[],missing:[],followUp:null})){document.querySelector('#download-status').textContent='Suppression impossible dans ce navigateur. Réessayez.';return}
    deleteCaseIdentity(invitation.token);
    showDeleted();
  });
  function showDeleted(){deleteCaseIdentity(invitation.token);document.querySelector('#case-heading').textContent='Dossier supprimé';document.querySelector('#case-content .case-layout').hidden=true;document.querySelector('#case-followup').hidden=true;document.querySelector('#case-download').hidden=true;document.querySelector('#case-deleted').hidden=false;document.querySelector('#case-summary').textContent='Dossier supprimé de la démonstration.';document.querySelector('#case-items').replaceChildren()}
}
if(document.body.dataset.view==='lawyer')initLawyer();
if(document.body.dataset.view==='client')initClient();
if(document.body.dataset.view==='complement')initSupplement();
if(document.body.dataset.view==='dossier')initDossier();
