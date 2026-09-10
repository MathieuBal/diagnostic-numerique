import {config} from './config.js';
export const configured=()=>/^https:\/\/[a-z0-9.-]+$/.test(config.supabaseUrl)&&!!config.supabaseKey;
let auth=null;
export function setAuth(value){auth=value;}
export async function request(path,{method='GET',body,admin=false}={}){
 if(!configured())throw Error('La collecte n’est pas encore activée. Contactez votre animateur.');
 if(admin&&auth?.expires_at<Date.now()/1000+60){
  const fresh=await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:auth.refresh_token}});auth={...fresh,expires_at:Date.now()/1000+fresh.expires_in};
 }
 if(admin&&!auth)throw Error('Connectez-vous à votre espace animateur.');
 const headers={'apikey':config.supabaseKey,'Content-Type':'application/json'};
 if(admin)headers.Authorization='Bearer '+auth.access_token;
 // Legacy anon keys are JWTs. Publishable keys use the apikey header only.
 else if(config.supabaseKey.startsWith('eyJ'))headers.Authorization='Bearer '+config.supabaseKey;
 let res;try{res=await fetch(config.supabaseUrl+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});}catch{throw Error('Connexion interrompue. Réessayez quand Internet sera disponible.');}
 const data=await res.json().catch(()=>null);
 if(!res.ok)throw Error(data?.message||data?.msg||data?.error_description||'La demande a échoué. Réessayez.');
 return data;
}
export const rpc=(name,body,admin=false)=>request('/rest/v1/rpc/'+name,{method:'POST',body,admin});
export async function login(email,password){const r=await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}});setAuth({...r,expires_at:Date.now()/1000+r.expires_in});return r;}
export async function logout(){try{await request('/auth/v1/logout',{method:'POST',admin:true});}finally{setAuth(null);}}
