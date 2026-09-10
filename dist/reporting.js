import {games,gameResult} from './games.js';
import {content,interests} from './content.js';
import {questionResult,csv} from './core.js';
export const stages=[
 {title:'Mes habitudes',minutes:'5 min',ids:['habits']},
 {title:'Appareil, clavier et souris',minutes:'12 min',ids:['Q1','G1','D1','Q2','G2','D2']},
 {title:'Fichiers et documents',minutes:'15 min',ids:['Q3','G3','D3','Q4','G4','D5']},
 {title:'Chercher et vérifier',minutes:'10 min',ids:['Q5','Q6','G5','D4']},
 {title:'Pause',minutes:'5 min',ids:['pause']},
 {title:'Communiquer par e-mail',minutes:'10 min',ids:['Q7','G6','D6']},
 {title:'Protéger ses comptes',minutes:'10 min',ids:['Q9','G7','G8','S1']},
 {title:'Démarches en ligne',minutes:'8 min',ids:['Q10','G9','S2']},
 {title:'Mobile, réseaux et IA',minutes:'10 min',ids:['Q8','G10','Q11','G11','Q12','G12','S3']},
 {title:'Mes envies et mon bilan',minutes:'5 min',ids:['bilan']}
];
const all=[...content.questions.map(x=>({...x,type:'question'})),...content.challenges.map(x=>({...x,type:'challenge'})),...content.situations.map(x=>({...x,type:'situation'})),...games.map(x=>({...x,type:'game'}))];
export const pages=stages.flatMap((s,stage)=>s.ids.map(id=>({...all.find(x=>x.id===id)||{type:id},stage})));
export const LEGACY_PAGE_KEYS=['habits',...content.questions.map(q=>q.id),...content.challenges.slice(0,3).map(q=>q.id),'pause',...content.challenges.slice(3).map(q=>q.id),...content.situations.map(q=>q.id),'bilan'];
export const gestures=[
 {id:'D1_open',challenge:'D1',label:'Ouvrir un dossier et un fichier'},
 {id:'D1_window',challenge:'D1',label:'Réduire puis réafficher une fenêtre'},
 {id:'D2_text',challenge:'D2',label:'Saisir et corriger le texte'},
 {id:'D3_folder',challenge:'D3',label:'Créer un dossier'},
 {id:'D3_save',challenge:'D3',label:'Nommer et enregistrer au bon endroit'},
 {id:'D3_find',challenge:'D3',label:'Retrouver et rouvrir la copie'},
 {id:'D4_search',challenge:'D4',label:'Formuler une recherche'},
 {id:'D4_source',challenge:'D4',label:'Identifier une source et relever l’information'},
 {id:'D5_download',challenge:'D5',label:'Télécharger le fichier'},
 {id:'D5_find',challenge:'D5',label:'Retrouver et ouvrir le téléchargement'},
 {id:'D6_text',challenge:'D6',label:'Préparer destinataire, objet et texte'},
 {id:'D6_file',challenge:'D6',label:'Sélectionner une pièce jointe'}
];
export const observationLabels={'NO':'Non observé','0':'Non réalisé malgré l’aide','1':'Guidage étape par étape','2':'Aide ponctuelle','3':'Sans aide'};
export const domains=[
 {label:'Appareil et clavier',questions:['Q1','Q2'],challenges:['D1','D2'],interest:'Clavier et souris'},
 {label:'Fichiers et documents',questions:['Q3','Q4'],challenges:['D3','D5'],interest:'Fichiers et photos'},
 {label:'Recherche Internet',questions:['Q5','Q6'],challenges:['D4'],interest:'Recherche Internet'},
 {label:'E-mails',questions:['Q7'],challenges:['D6'],interest:'E-mails et pièces jointes'},
 {label:'Sécurité',questions:['Q9'],challenges:[],interest:'Sécurité des comptes'},
 {label:'Démarches',questions:['Q10'],challenges:[],interest:'Démarches et formulaires'},
 {label:'Mobile',questions:['Q8'],challenges:[],interest:'Smartphone et tablette'},
 {label:'Réseaux sociaux',questions:['Q11'],challenges:[],interest:'Réseaux sociaux'},
 {label:'Intelligence artificielle',questions:['Q12'],challenges:[],interest:'Intelligence artificielle'}
];
export function answered(a,p){return typeof a[p.id]==='string'&&a[p.id].trim()!=='';}
export function missingItems(answers){return pages.flatMap((p,index)=>p.id&&(p.type==='game'?['NR','partial'].includes(gameResult(p,answers).status):!answered(answers,p))?[{id:p.id,index,label:p.type==='question'?p.theme:p.title}]:[]);}
export function progressCounts(answers){return {questions:content.questions.filter(q=>answered(answers,q)).length,challenges:content.challenges.filter(q=>answered(answers,q)).length,situations:content.situations.filter(q=>answered(answers,q)).length,games:games.filter(g=>['done','NSP'].includes(gameResult(g,answers).status)).length};}
export function observedStatus(participant,domain){
 const selected=gestures.filter(g=>domain.challenges.includes(g.challenge));
 if(!selected.length)return null;
 const codes=selected.map(g=>participant.observations?.[g.id]??'NO');
 if(codes.some(c=>['0','1','2'].includes(c)))return 'help';
 if(codes.every(c=>c==='3'))return 'alone';
 return 'unobserved';
}
export function summarize(participants){return domains.map(d=>{
 const qs=content.questions.filter(q=>d.questions.includes(q.id));
 return {...d,gamesToReview:participants.filter(p=>games.filter(g=>g.domain===d.label).some(g=>{const r=gameResult(g,p.answers);return r.status==='NSP'||r.correct<r.answered;})).length,gamesIncomplete:participants.filter(p=>games.filter(g=>g.domain===d.label).some(g=>['NR','partial'].includes(gameResult(g,p.answers).status))).length,alone:participants.filter(p=>observedStatus(p,d)==='alone').length,help:participants.filter(p=>observedStatus(p,d)==='help').length,unobserved:participants.filter(p=>observedStatus(p,d)==='unobserved').length,
 knowledge:participants.filter(p=>qs.some(q=>['NSP','E'].includes(questionResult(q,p.answers[q.id])))).length,
 incomplete:participants.filter(p=>qs.some(q=>questionResult(q,p.answers[q.id])==='NR')).length,
 requested:participants.filter(p=>p.answers.interests?.includes(d.interest)).length};});}
export function exportParticipants(session,participants){
 const header=['seance','participant_id','prenom','termine','derniere_reception',...content.questions.flatMap(q=>[q.id+'_reponse',q.id+'_resultat']),...content.challenges.flatMap(c=>[c.id+'_declaration',c.id+'_observation_globale_ancienne',c.id+'_remarque']),...gestures.map(g=>g.id+'_observation'),...content.situations.flatMap(s=>[s.id,s.id+'_evaluation_animateur']), 'appareils','internet','aisance_ordinateur','aisance_mobile','deja_autonome','besoin_aide','sujets','autre_sujet','reussite','objectif','observation_generale','recherche_commune','recherche_horaire','recherche_source',...games.flatMap(g=>[...g.items.map((_,i)=>g.id+'_'+i+'_reponse'),g.id+'_statut',g.id+'_corrects',g.id+'_renseignes',g.id+'_confiance',g.id+'_aide'])];
 const rows=participants.map(p=>[session.code,p.id,p.name,p.finished?'oui':'non',p.updated_at,...content.questions.flatMap(q=>[p.answers[q.id]??'',questionResult(q,p.answers[q.id])]),...content.challenges.flatMap(c=>[p.answers[c.id]??'',p.observations?.[c.id]??'',p.answers[c.id+'_note']??'']),...gestures.map(g=>p.observations?.[g.id]??'NO'),...content.situations.flatMap(s=>[p.answers[s.id]??'',p.observations?.[s.id]??'NO']),(p.answers.devices||[]).join(' / '),p.answers.internet,p.answers.computer_ease,p.answers.mobile_ease,p.answers.already,p.answers.help,(p.answers.interests||[]).join(' / '),p.answers.other_interest,p.answers.success,p.answers.goal,p.observations?.note,p.answers.D4_commune,p.answers.D4_horaire,p.answers.D4_source,...games.flatMap(g=>{const r=gameResult(g,p.answers);return [...g.items.map((it,i)=>it.options[p.answers[g.id+'_'+i]]??''),r.status,r.correct,r.answered,p.answers[g.id+'_confidence'],p.answers[g.id+'_help']];})]);
 return csv([header,...rows]);
}
export function exportSummary(participants){return csv([['domaine','sans_aide_observe','avec_aide_observe','observation_incomplete','connaissances_a_consolider','questions_sans_reponse','demandes','mini_jeux_a_reprendre','mini_jeux_incomplets'],...summarize(participants).map(d=>[d.label,d.challenges.length?d.alone:'non_mesure',d.challenges.length?d.help:'non_mesure',d.challenges.length?d.unobserved:'non_mesure',d.knowledge,d.incomplete,d.requested,d.gamesToReview,d.gamesIncomplete])]);}
