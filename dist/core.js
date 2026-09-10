export const esc = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function csv(rows) { return '\uFEFF'+rows.map(row=>row.map(v=>{let s=String(v??'');if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}).join(';')).join('\r\n'); }
export function download(name,text,type='text/plain;charset=utf-8'){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function questionResult(q,value){return value===undefined?'NR':value==='NSP'?'NSP':value===q.answer?'J':'E';}
export function countAnswers(answers,items){return items.filter(i=>Object.hasOwn(answers,i.id)).length;}
export function localWrite(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
export function localRead(key){try{return JSON.parse(localStorage.getItem(key));}catch{return null;}}
export function normalizeAnswers(raw){
 const result={};if(!raw||typeof raw!=='object'||Array.isArray(raw))return result;
 for(const [key,value] of Object.entries(raw)){
  if(['devices','interests'].includes(key)){result[key]=Array.isArray(value)?value.filter(x=>typeof x==='string').slice(0,10):[];}
  else if(typeof value==='string'&&!key.startsWith('_'))result[key]=value.slice(0,4000);
 }
 return result;
}
