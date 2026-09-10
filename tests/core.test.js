import test from 'node:test';import assert from 'node:assert/strict';
import {csv,esc,questionResult,countAnswers} from '../dist/core.js';
import {content} from '../dist/content.js';
test('CSV Excel : accents, retours à la ligne, guillemets, formules neutralisées',()=>{
 const out=csv([['Prénom','Réponse'],['Élodie','Bonjour\n"oui"'],['=HYPERLINK("x")',' @SUM(A1)']]);
 assert.ok(out.startsWith('\uFEFF'));assert.ok(out.includes('"Bonjour\n""oui"""'));assert.ok(out.includes('"\'=HYPERLINK'));assert.ok(out.includes('"\' @SUM'));
});
test('Texte participant échappé avant affichage',()=>assert.equal(esc('<img onerror="x">'), '&lt;img onerror=&quot;x&quot;&gt;'));
test('Sans réponse et ne sait pas restent distincts des erreurs',()=>{
 const q=content.questions[0];assert.equal(questionResult(q,undefined),'NR');assert.equal(questionResult(q,'NSP'),'NSP');assert.equal(questionResult(q,'A'),'E');assert.equal(questionResult(q,'B'),'J');
});
test('Le compteur ne transforme pas une réponse absente en réponse donnée',()=>assert.equal(countAnswers({Q1:'NSP',goal:'a'},content.questions),1));
test('Contenu complet et durée des manipulations',()=>{assert.equal(content.questions.length,12);assert.equal(content.challenges.length,6);assert.equal(content.situations.length,3);assert.equal(content.challenges.reduce((s,q)=>s+q.time,0),40);});
test('Une réponse de type inattendu ne casse pas le tableau de bord',async()=>{const {normalizeAnswers}=await import('../dist/core.js');assert.deepEqual(normalizeAnswers({interests:{bad:true},devices:'PC',Q1:{bad:true},Q2:'B'}),{interests:[],devices:[],Q2:'B'});});
