import {normalizeAnswers} from './core.js';
import {gestures} from './reporting.js';
export const LOCAL_TRAINER_KEY='diagnostic-formateur-local-v1';
export function sessionCode(value){const code=String(value||'').trim().toUpperCase();if(!/^[A-Z0-9-]{3,24}$/.test(code))throw Error('Le code doit contenir 3 à 24 lettres, chiffres ou tirets.');return code;}
function record(p,code,withObservations=false){
 if(!p||typeof p!=='object'||Array.isArray(p)||typeof p.id!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>60||!p.answers||typeof p.answers!=='object'||Array.isArray(p.answers))throw Error('Fichier participant incomplet ou invalide.');
 if(p.demo)throw Error('Les essais de démonstration ne sont pas importables dans une vraie séance.');
 if(p.code&&sessionCode(p.code)!==code)throw Error('Le fichier appartient à une autre séance.');
 const observations={};
 if(withObservations&&p.observations&&typeof p.observations==='object')for(const key of [...gestures.map(g=>g.id),'D1','D2','D3','D4','D5','D6','S1','S2','S3','note']){const v=p.observations[key];if(typeof v==='string'&&(key==='note'||['NO','0','1','2','3','P','C','R'].includes(v)))observations[key]=v.slice(0,4000);}
 return {id:p.id,name:p.name.trim(),code,answers:normalizeAnswers(p.answers),observations,finished:p.finished===true,revision:Number.isSafeInteger(p.revision)&&p.revision>=0?p.revision:0,updated_at:typeof p.updated_at==='string'&&!Number.isNaN(Date.parse(p.updated_at))?p.updated_at:new Date().toISOString()};
}
export function participantFile(state){return {format:'diagnostic-participant',version:1,code:sessionCode(state.code),participant:record({...state,updated_at:state.updatedAt},sessionCode(state.code))};}
export function sessionFile(session,participants){return {format:'diagnostic-seance',version:1,session:{id:session.id,title:session.title,code:session.code,is_open:true},participants};}
export function parseTransfer(text){
 if(text.length>20000000)throw Error('Fichier trop volumineux (20 Mo maximum).');
 let data;try{data=JSON.parse(text);}catch{throw Error('Ce fichier n’est pas un résultat JSON valide.');}
 if(data?.version!==1)throw Error('Version de fichier non reconnue.');
 if(data.format==='diagnostic-participant'){const code=sessionCode(data.code);return {code,participants:[record(data.participant,code)]};}
 if(data.format==='diagnostic-seance'&&Array.isArray(data.participants)&&data.participants.length<=250){const code=sessionCode(data.session?.code);return {code,title:String(data.session?.title||code).slice(0,100),participants:data.participants.map(p=>record(p,code,true))};}
 throw Error('Choisissez un fichier de résultat ou une sauvegarde de séance de cette plateforme.');
}
export function mergeParticipants(existing,incoming){
 const result=structuredClone(existing);let added=0,updated=0,ignored=0;
 for(const p of incoming){const index=result.findIndex(x=>x.id===p.id);if(index<0){if(result.length>=250)throw Error('Maximum 250 participants par séance.');result.push(structuredClone(p));added++;continue;}
 const old=result[index];if(p.revision<old.revision){ignored++;continue;}
 const observations={...p.observations,...old.observations};
 result[index]={...p,observations};updated++;
 }
 return {participants:result,added,updated,ignored};
}
