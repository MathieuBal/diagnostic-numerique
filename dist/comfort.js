import {localRead,localWrite} from './core.js';
export function installComfort(){
 let settings=localRead('diagnostic-confort')||{};
 function apply(){document.documentElement.classList.toggle('large-text',!!settings.large);document.documentElement.classList.toggle('high-contrast',!!settings.contrast);}
 apply();const header=document.querySelector('header');const div=document.createElement('div');div.className='comfort';
 div.innerHTML='<button class="small secondary" id="font-size" aria-pressed="false" type="button">Texte agrandi</button><button class="small secondary" id="contrast" aria-pressed="false" type="button">Contraste renforcé</button>';
 header.append(div);
 for(const [id,key] of [['font-size','large'],['contrast','contrast']]){const b=div.querySelector('#'+id);b.setAttribute('aria-pressed',String(!!settings[key]));b.onclick=()=>{settings[key]=!settings[key];apply();b.setAttribute('aria-pressed',String(settings[key]));localWrite('diagnostic-confort',settings);};}
}
