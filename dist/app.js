import {games,gameHtml,gameResult} from './games.js';
import {content,interests} from './content.js';
import {esc,download,localRead,localWrite} from './core.js';
import {configured,rpc} from './api.js';
import {stages,pages,missingItems,progressCounts,LEGACY_PAGE_KEYS} from './reporting.js';
import {participantFile,sessionCode,FREE_SESSION_CODE} from './transfer.js';
import {installComfort} from './comfort.js';
installComfort();
const root=document.querySelector('main');
const KEY='diagnostic-participant-v1',DEMO_KEY='diagnostic-demo-v1',PENDING_KEY='diagnostic-inscription-v1',LOCAL_KEY='diagnostic-local-v1';
const urlParams=new URLSearchParams(location.search);
const localMode=!configured()||urlParams.get('local')==='1';
let state=null,error='',storageWarning='',savingFor=null,saveTimer;
function restored(key){const s=localRead(key);if(!s||typeof s.id!=='string'||typeof s.name!=='string'||!s.answers||typeof s.answers!=='object'||Array.isArray(s.answers))return null;if(s.programVersion!==2){const key=LEGACY_PAGE_KEYS[Number(s.position)||0];s.position=Math.max(0,pages.findIndex(p=>(p.id||p.type)===key));s.programVersion=2;}s.position=Math.max(0,Math.min(pages.length-1,Number(s.position)||0));s.revision=Number(s.revision)||0;return s;}
const val=k=>esc(state?.answers?.[k]??'');
const pending=()=>state&&!state.demo&&!state.local&&state.savedRevision!==state.revision;
function option(name,value,label,type='radio'){
 const current=state.answers[name];
 const checked=type==='checkbox'?Array.isArray(current)&&current.includes(value):current===value;
 return `<label class="option"><input type="${type}" name="${esc(name)}" value="${esc(value)}" ${checked?'checked':''}><span>${esc(label)}</span></label>`;
}
function field(name,label,area=false){return `<label for="${name}">${label}</label>${area?`<textarea id="${name}" name="${name}" maxlength="2000">${val(name)}</textarea>`:`<input id="${name}" name="${name}" maxlength="200" value="${val(name)}">`}`;}
function persist(target=state){
 if(!target)return;
 if(!localWrite(target.demo?DEMO_KEY:target.local?LOCAL_KEY:KEY,target))storageWarning='La copie locale est indisponible. Gardez cette page ouverte et téléchargez une copie avant de partir.';
}
function changed(){state.revision++;state.updatedAt=new Date().toISOString();persist();clearTimeout(saveTimer);saveTimer=setTimeout(sync,900);status();}
function status(){
 const el=document.querySelector('#save-status');if(!el||!state)return;
 const failed=!!error;
 el.className='save-banner '+(failed?'save-error':state.demo?'save-demo':pending()?'save-pending':'save-ok');
 el.textContent=storageWarning?'Attention : la sauvegarde sur ce poste est indisponible. Téléchargez votre résultat avant de quitter.':state.local?'Réponses enregistrées sur ce poste uniquement. À la fin, téléchargez le résultat pour votre animateur.':state.demo?'Mode démonstration : vos essais restent sur ce poste.':error||(savingFor===state?'Enregistrement en cours…':pending()?'Réponses conservées sur ce poste, transmission en attente.':state.savedAt?'Réponses reçues par l’animateur à '+new Date(state.savedAt).toLocaleTimeString('fr-FR'):'Séance rejointe. Vous pouvez commencer.');
 const retry=document.querySelector('#retry');if(retry)retry.hidden=state.demo||!pending()||savingFor===state;
 const warn=document.querySelector('#storage-warning');if(warn){warn.textContent=storageWarning;warn.hidden=!storageWarning;}
}
async function sync(){
 if(!state||state.demo||state.local||savingFor||!pending())return;
 const current=state,revision=current.revision;savingFor=current;status();
 try{
  await rpc('save_participant',{p_id:current.id,p_secret:current.secret,p_answers:structuredClone(current.answers),p_position:current.position,p_revision:revision,p_finished:!!current.finished});
  current.savedAt=new Date().toISOString();current.savedRevision=revision;if(state===current||restored(KEY)?.id===current.id)persist(current);if(state===current)error='';
 }catch(e){if(state===current)error=e.message;}
 finally{savingFor=null;status();if(state===current&&pending()&&!error)saveTimer=setTimeout(sync,100);}
}
function saveBar(){return '<div id="save-status" class="save-banner" role="status" aria-live="polite"></div><p id="storage-warning" class="error" hidden></p><button id="retry" class="small secondary" hidden>Réessayer la transmission</button>';}
function bindSave(){document.querySelector('#retry')?.addEventListener('click',()=>{error='';sync();});status();}
function welcome(){
 const previous=restored(localMode?LOCAL_KEY:KEY),trial=restored(DEMO_KEY);const active=!localMode;
 root.innerHTML=`<div class="intro"><p class="eyebrow">Diagnostic de départ · 1 h 30</p><h1>Vos usages du numérique</h1><p class="lead">Des questions et des exercices pour préparer des ateliers adaptés à vos besoins.</p>${!active?'<div class="notice"><strong>Prêt pour votre séance.</strong><br>Vos réponses restent sur cet ordinateur. À la fin, vous téléchargerez un fichier à remettre à votre animateur.</div>':''}${previous?`<section class="card resume-card"><p class="eyebrow">Parcours retrouvé sur ce poste</p><h2>${esc(previous.name)}${previous.local?'':' · '+esc(previous.code)}</h2><p>${previous.finished?'Parcours terminé':'Étape '+(previous.position+1)+' sur '+pages.length}${!previous.local&&previous.savedRevision!==previous.revision?' · Des réponses restent à transmettre.':''}</p><div class="actions"><button id="resume">Reprendre mon parcours</button><button class="secondary" id="forget">Effacer la copie locale</button></div></section>`:''}<form class="card" id="join"><h2>${active?'Rejoindre ma séance':'Commencer mon diagnostic'}</h2><div class="form-row"><div><label for="name">Prénom ou pseudonyme</label><input id="name" name="name" maxlength="60" autocomplete="given-name" placeholder="Ex. Camille" required></div></div>${active?'<p class="muted">Vos réponses sont accessibles à votre animateur pour préparer les ateliers. Vous n’avez pas de compte à créer.</p>':'<p class="muted">Votre animateur utilisera vos réponses pour préparer les ateliers. Utilisez un pseudonyme distinct si vous préférez. Aucun compte à créer ; aucun envoi automatique.</p>'}<p id="join-error" role="alert"></p><div class="actions"><button type="submit">${active?'Rejoindre la séance':'Commencer le diagnostic'}</button><details><summary>Essayer avant de commencer</summary><button type="button" class="secondary" id="demo">Essayer la démonstration</button></details>${trial?'<button type="button" class="secondary" id="resume-demo">Reprendre mon essai</button>':''}</div></form><div class="welcome-points"><p><strong>À votre rythme</strong><br>Vous pouvez passer une question et y revenir.</p><p><strong>Avec votre animateur</strong><br>Les manipulations se font sur l’ordinateur.</p><p><strong>Sans classement</strong><br>« Je ne sais pas » est une réponse utile.</p></div></div>`;
 document.querySelector('#demo').onclick=()=>{start(document.querySelector('#name').value.trim()||'Mon essai','DEMO',true);render(true);};
 document.querySelector('#resume-demo')?.addEventListener('click',()=>{state=trial;error='';render(true);});
 document.querySelector('#resume')?.addEventListener('click',()=>{state=previous;error='';render(true);sync();});
 document.querySelector('#forget')?.addEventListener('click',()=>{if(confirm(localMode?'Votre animateur a-t-il récupéré le fichier ? Effacer cette copie supprimera vos réponses de ce poste.':'Effacer uniquement la copie sur ce poste ? Les réponses déjà transmises resteront chez votre animateur.')){try{localStorage.removeItem(localMode?LOCAL_KEY:KEY);}catch{}state=null;welcome();}});
 document.querySelector('#join').onsubmit=async e=>{
  e.preventDefault();if(!active){try{const f=new FormData(e.target);const name=f.get('name').trim();if(!name)throw Error('Indiquez un prénom ou pseudonyme.');if(previous&&!confirm('Commencer un nouveau parcours sur ce poste ? Téléchargez d’abord le résultat précédent s’il n’a pas été récupéré.'))return;start(name,sessionCode(urlParams.get('code')||FREE_SESSION_CODE),false,{id:crypto.randomUUID(),secret:'',local:true});render(true);}catch(err){document.querySelector('#join-error').textContent=err.message;}return;}
  const button=e.submitter;button.disabled=true;button.textContent='Connexion…';
  const f=new FormData(e.target),name=f.get('name').trim(),code='ACTIVE';
  try{
   if(!name)throw Error('Indiquez votre prénom ou un pseudonyme.');
   let next=localRead(PENDING_KEY);
   if(!next||next.name!==name||next.code!==code)next={id:crypto.randomUUID(),secret:crypto.randomUUID()+crypto.randomUUID(),name,code};
   localWrite(PENDING_KEY,next);
   const joined=await rpc('join_active',{p_name:name,p_id:next.id,p_secret:next.secret});
   if(!joined?.code)throw Error('La séance n’a pas pu être identifiée. Prévenez votre animateur.');
   start(name,joined.code,false,next);try{localStorage.removeItem(PENDING_KEY);}catch{}render(true);changed();
  }catch(err){const target=document.querySelector('#join-error');target.textContent=err.message;target.className='error';button.disabled=false;button.textContent='Rejoindre la séance';}
 };
}
function start(name,code,demo,ids={id:crypto.randomUUID(),secret:''}){
 state={...ids,name,code,demo,programVersion:2,position:0,answers:{},revision:0,savedRevision:-1,startedAt:new Date().toISOString()};error='';storageWarning='';persist();
}
function currentHtml(p){if(p.type==='game')return gameHtml(p,state.answers);if(p.type==='question')return `<p class="number">${p.id} · ${esc(p.theme)}</p><h1 class="question" id="page-title" tabindex="-1">${esc(p.q)}</h1><fieldset><legend class="muted">Choisissez une réponse.</legend>${p.options.map((o,i)=>option(p.id,'ABCD'[i],o)).join('')}${option(p.id,'NSP','Je ne sais pas')}</fieldset>`;
 if(p.type==='challenge')return `<div class="split"><p class="eyebrow">${p.id} · À faire sur l’ordinateur</p><span class="pill">Repère : ${p.time} min</span></div><h1 id="page-title" tabindex="-1">${esc(p.title)}</h1><ol class="exercise">${p.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol>${p.id==='D1'?'<p><a href="./Depart.txt" download>Télécharger Depart.txt si l’animateur ne l’a pas déjà installé</a></p>':''}${['D5','D6'].includes(p.id)?'<p><a href="./entrainement.html" target="atelier_exercice" rel="noopener">Ouvrir la page d’exercice dans un autre onglet</a></p>':''}${p.id==='D4'?field('D4_commune','Commune')+field('D4_horaire','Horaire trouvé')+field('D4_source','Adresse de la page'):''}<fieldset><legend>Comment cela s’est-il passé ?</legend>${['Réalisé seul','Réalisé avec aide','Essayé sans terminer','Non tenté'].map(o=>option(p.id,o,o)).join('')}</fieldset>${field(p.id+'_note','Une difficulté ou une remarque ? (facultatif)',true)}<p class="muted">L’animateur pourra observer votre réalisation. Le temps n’est pas une note.</p>`;
 if(p.type==='situation')return `<p class="eyebrow">${p.id} · Situation du quotidien</p><h1 id="page-title" tabindex="-1">${esc(p.title)}</h1><p>${esc(p.text)}</p>${field(p.id,'Que feriez-vous ?',true)}<p class="muted">Vous pouvez aussi demander à répondre à l’oral.</p>`;
 if(p.type==='pause')return '<p class="eyebrow">À mi-parcours</p><h1 id="page-title" tabindex="-1">Une pause de 5 minutes</h1><p>Vous reprendrez ensuite avec les e-mails et les situations du quotidien.</p><p>Gardez cette page ouverte. L’animateur vous indiquera quand continuer.</p>';
 if(p.type==='habits')return `<p class="eyebrow">Accueil · 5 minutes avec l’animateur</p><h1 id="page-title" tabindex="-1">Vos habitudes</h1><fieldset><legend>Quels appareils utilisez-vous ?</legend>${['Ordinateur','Smartphone','Tablette','Aucun'].map(o=>option('devices',o,o,'checkbox')).join('')}</fieldset><fieldset><legend>Avez-vous Internet chez vous ?</legend>${['Oui','Non','Je ne sais pas'].map(o=>option('internet',o,o)).join('')}</fieldset>${['computer_ease','mobile_ease'].map((key,i)=>`<label for="${key}">${i===0?'Sur ordinateur, vous vous sentez…':'Sur smartphone, vous vous sentez…'}</label><select id="${key}" name="${key}"><option value="">Choisir (facultatif)</option>${['Pas à l’aise','Peu à l’aise','Plutôt à l’aise','Très à l’aise','Je n’utilise pas cet appareil'].map(v=>`<option ${state.answers[key]===v?'selected':''}>${v}</option>`).join('')}</select>`).join('')}${field('already','Une chose que vous faites déjà seul',true)}${field('help','Une chose pour laquelle vous demandez de l’aide',true)}`;
 return `<p class="eyebrow">Bilan · 5 minutes avec l’animateur</p><h1 id="page-title" tabindex="-1">Vos envies pour la suite</h1><fieldset><legend>Choisissez jusqu’à trois sujets utiles pour vous.</legend><p id="interest-count" class="number" aria-live="polite">${(state.answers.interests||[]).length} / 3 sujets choisis</p>${interests.map(o=>option('interests',o,o,'checkbox')).join('')}</fieldset>${field('other_interest','Un autre sujet ?')}${field('success','Aujourd’hui, vous avez réussi à…',true)}${field('goal','Votre objectif pour les ateliers',true)}`;
}
function sectionNav(stage){return `<nav aria-label="Parties du parcours"><ol>${stages.map((s,i)=>`<li><button class="stage-button ${i===stage?'active':''}" data-stage="${i}" ${i===stage?'aria-current="step"':''}><span class="stage-number">${i+1}</span><span>${s.title}<small>${s.minutes}</small></span></button></li>`).join('')}</ol></nav>`;}
function render(focus=false){
 if(state.finished){finishScreen();return;}if(state.reviewing){reviewScreen();return;}
 const p=pages[state.position];
 root.innerHTML=`<div class="layout"><aside class="steps"><p class="eyebrow">${esc(state.name)}</p><p class="session-label">${state.demo?'Démonstration':state.local?'Mon diagnostic':'Séance '+esc(state.code)}</p><label class="number" for="progress">Étape ${state.position+1} sur ${pages.length}</label><progress id="progress" value="${state.position+1}" max="${pages.length}"></progress><details class="mobile-sections"><summary>Changer de partie</summary>${sectionNav(p.stage)}</details><div class="desktop-sections">${sectionNav(p.stage)}</div><div class="aside-actions"><button class="small secondary" id="review">Relire mon parcours</button><button class="small secondary" id="backup">Télécharger une copie</button><button class="small text-button" id="leave">Revenir à l’accueil</button></div></aside><section class="work-area">${saveBar()}<div class="card question-card"><p class="category-banner">${esc(stages[p.stage].title)} · ${esc(stages[p.stage].minutes)} pour cette partie</p>${currentHtml(p)}<div id="limit-error" role="alert"></div><div class="actions navigation-actions"><button class="secondary" id="prev" ${state.position===0?'disabled':''}>Précédent</button>${['question','situation','game'].includes(p.type)?'<button class="text-button" id="skip">Passer pour le moment</button>':''}<button id="next">${state.position===pages.length-1?'Relire et terminer':'Continuer'}</button></div></div></section></div>`;
 document.querySelectorAll('input,textarea,select').forEach(el=>el.addEventListener('input',()=>{
  const name=el.name;if(!name)return;
  if(el.type==='checkbox'){
   if(name==='devices'&&el.checked){document.querySelectorAll('input[name="devices"]').forEach(c=>{if(c!==el&&(el.value==='Aucun'||c.value==='Aucun'))c.checked=false;});}
   const checked=[...document.querySelectorAll(`input[name="${name}"]:checked`)];
   if(name==='interests'&&checked.length>3){el.checked=false;const notice=document.querySelector('#limit-error');notice.textContent='Vous avez choisi trois sujets. Décochez-en un pour en choisir un autre.';notice.className='notice';return;}
   state.answers[name]=checked.map(c=>c.value);
   const counter=document.querySelector('#interest-count');if(counter)counter.textContent=(state.answers.interests||[]).length+' / 3 sujets choisis';
  }else state.answers[name]=el.value;
  if(p.type==='game'&&new RegExp('^'+p.id+'_\\d+$').test(name)){delete state.answers[p.id];const r=gameResult(p,state.answers);document.querySelector('#game-progress').textContent=r.answered+' / '+r.total+' cartes renseignées';}
  const notice=document.querySelector('#limit-error');notice.textContent='';notice.className='';changed();
 }));
 document.querySelector('#game-unknown')?.addEventListener('click',()=>{p.items.forEach((_,i)=>delete state.answers[p.id+'_'+i]);state.answers[p.id]='NSP';changed();render(true);});
 document.querySelector('#prev').onclick=()=>navigate(state.position-1);
 document.querySelector('#next').onclick=()=>state.position===pages.length-1?openReview():navigate(state.position+1);
 document.querySelector('#skip')?.addEventListener('click',()=>navigate(state.position+1));
 document.querySelector('#review').onclick=openReview;document.querySelector('#backup').onclick=backup;
 document.querySelector('#leave').onclick=()=>{persist();sync();welcome();};
 document.querySelectorAll('[data-stage]').forEach(b=>b.onclick=()=>navigate(pages.findIndex(p=>p.stage===Number(b.dataset.stage))));
 bindSave();if(focus)focusTitle();
}
function focusTitle(){document.querySelector('#page-title')?.focus();window.scrollTo(0,0);}
function navigate(position){state.reviewing=false;state.position=Math.max(0,Math.min(pages.length-1,position));changed();render(true);}
function openReview(){state.reviewing=true;persist();reviewScreen();}
function backup(){if(!state.demo){download('resultat-'+state.code+'-'+state.name.replace(/[^a-zA-Z0-9-]/g,'_')+'-'+state.id.slice(0,8)+'.json',JSON.stringify(participantFile(state),null,2),'application/json');}else{const {secret,...safe}=state;download('essai-'+state.id+'.json',JSON.stringify(safe,null,2),'application/json');}}
function reviewScreen(){
 const missing=missingItems(state.answers),n=progressCounts(state.answers);
 root.innerHTML=`<div class="narrow"><p class="eyebrow">Avant de terminer</p><h1 id="page-title" tabindex="-1">Relire mon parcours</h1><p>Vous pouvez revenir sur vos réponses ou terminer avec des questions laissées de côté.</p>${saveBar()}<div class="metrics review-metrics"><div class="metric"><strong>${n.questions} / 12</strong><span>questions renseignées</span></div><div class="metric"><strong>${n.challenges} / 6</strong><span>défis renseignés</span></div><div class="metric"><strong>${n.games} / ${games.length}</strong><span>mini-jeux renseignés</span></div><div class="metric"><strong>${n.situations} / 3</strong><span>situations renseignées</span></div></div><section class="card"><h2>${missing.length?'À reprendre si vous le souhaitez':'Toutes les questions sont renseignées'}</h2>${missing.length?`<p>${missing.length} élément${missing.length>1?'s':''} sans réponse ou à compléter. Une réponse donnée à l’oral peut rester vide ici.</p><div class="review-links">${missing.map(p=>`<button class="secondary small" data-page="${p.index}">${p.id} · ${esc(p.label)}</button>`).join('')}</div>`:'<p>Vous pouvez relire une partie avant de terminer.</p>'}<details><summary>Revenir à une partie du parcours</summary>${stages.filter(s=>!s.ids.includes('pause')).map(s=>{const i=stages.indexOf(s);return `<button class="secondary small" data-page="${pages.findIndex(p=>p.stage===i)}">${s.title}</button>`;}).join(' ')}</details></section><section class="card"><h2>Mes priorités</h2><p>${state.answers.interests?.length?esc(state.answers.interests.join(' · ')):'Aucun sujet choisi pour le moment.'}</p><p>${esc(state.answers.goal||'Vous pourrez aussi expliquer votre objectif à l’animateur.')}</p><div class="actions"><button class="secondary" data-page="${pages.length-1}">Modifier mon bilan</button><button id="finish">${state.demo?'Terminer mon essai':state.local?'Terminer mon diagnostic':'Terminer et transmettre'}</button></div></section></div>`;
 document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>navigate(Number(b.dataset.page)));
 document.querySelector('#finish').onclick=()=>{state.reviewing=false;state.finished=true;changed();finishScreen();sync();};bindSave();focusTitle();
}
function finishScreen(){
 root.innerHTML=`<div class="narrow"><p class="eyebrow">${state.demo?'Démonstration terminée':'Parcours terminé'}</p><h1 id="page-title" tabindex="-1">Merci, ${esc(state.name)}</h1><p>${state.demo?'Vous avez découvert le parcours. Vos essais ne sont pas transmis.':'Vos réponses aideront votre animateur à préparer les prochains ateliers.'}</p>${saveBar()}<section class="card">${state.local?'<h2>Dernière étape : remettre votre résultat</h2><ol class="exercise"><li>Cliquez sur « Télécharger mon résultat ».</li><li>Le fichier se trouve normalement dans Téléchargements.</li><li>Demandez à votre animateur de le récupérer sur sa clé USB ou dans le dossier partagé qu’il vous indique.</li></ol><p>Ne fermez pas cette page avant sa confirmation. Télécharger ne transmet pas le résultat.</p>':''}<h2>Votre objectif pour la suite</h2><p>${esc(state.answers.goal||'Vous pourrez en parler avec votre animateur.')}</p><div class="actions"><button class="secondary" id="backup">${state.local?'Télécharger mon résultat':'Télécharger ma copie'}</button><button id="edit">Relire mes réponses</button></div>${state.demo||state.local?'':'<p class="muted">Avant de fermer, vérifiez ci-dessus que les réponses sont reçues par l’animateur.</p>'}</section><button class="text-button" id="home">Retour à l’accueil</button></div>`;
 document.querySelector('#backup').onclick=backup;document.querySelector('#edit').onclick=()=>{state.finished=false;changed();openReview();};document.querySelector('#home').onclick=welcome;bindSave();focusTitle();
}
window.addEventListener('online',()=>{error='';sync();});
window.addEventListener('beforeunload',e=>{if(pending()||(state&&storageWarning)){e.preventDefault();e.returnValue='';}});
setInterval(()=>{if(pending())sync();},15000);
welcome();
