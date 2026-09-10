import {gestures} from './reporting.js';
import {esc} from './core.js';
document.querySelector('#gestures').innerHTML=gestures.map(g=>`<tr><td>${esc(g.challenge+' · '+g.label)}</td>${Array.from({length:5},()=>'<td>□</td>').join('')}</tr>`).join('');
document.querySelector('#print').onclick=()=>window.print();
