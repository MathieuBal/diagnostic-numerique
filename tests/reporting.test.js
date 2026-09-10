import test from 'node:test';
import assert from 'node:assert/strict';
import {pages,stages,missingItems,progressCounts,gestures,domains,observedStatus,summarize,exportParticipants,exportSummary} from '../dist/reporting.js';
import {content} from '../dist/content.js';

test('Relire le parcours distingue une réponse inconnue, un blanc et une situation vide',()=>{
 const answers={Q1:'NSP',Q2:'',S1:'   ',D1:'Non tenté'};
 const missing=missingItems(answers);
 assert.ok(!missing.some(q=>q.id==='Q1'));assert.ok(missing.some(q=>q.id==='Q2'));assert.ok(missing.some(q=>q.id==='S1'));
 assert.ok(!missing.some(q=>q.id==='D1'));
 for(const item of missing)assert.equal(pages[item.index].id,item.id);
 assert.deepEqual(progressCounts(answers),{questions:1,challenges:1,situations:0});
});
test('Le programme conserve les 90 minutes et les positions acceptées par le serveur',()=>{
 assert.equal(stages.reduce((sum,s)=>sum+parseInt(s.minutes),0),90);assert.equal(pages.length,24);assert.equal(pages.at(-1).type,'bilan');
});
test('Aucune autonomie déduite des seules déclarations ou anciennes notes globales',()=>{
 const p={answers:{D1:'Réalisé seul',D2:'Réalisé seul'},observations:{D1:'3',D2:'3'}};
 assert.equal(observedStatus(p,domains[0]),'unobserved');
 assert.equal(observedStatus(p,domains.find(d=>d.label==='Mobile')),null);
});
test('Des gestes partiellement observés ne donnent pas une autonomie complète',()=>{
 const d=domains[0],p={answers:{},observations:{D1_open:'3',D1_window:'3'}};
 assert.equal(observedStatus(p,d),'unobserved');p.observations.D2_text='3';assert.equal(observedStatus(p,d),'alone');
 p.observations.D2_text='0';assert.equal(observedStatus(p,d),'help');
});
test('La synthèse compte une personne par domaine et sépare absences et difficultés',()=>{
 const p={answers:{Q1:'A',Q2:'NSP',interests:['Clavier et souris']},observations:{D1_open:'2'}};
 const rows=summarize([p]);const row=rows[0];assert.equal(row.knowledge,1);assert.equal(row.help,1);assert.equal(row.requested,1);assert.equal(row.incomplete,0);
 assert.equal(rows[1].knowledge,0);assert.equal(rows[1].incomplete,1);
});
test('Le CSV détaillé conserve preuves de recherche, observations et phrases multilignes',()=>{
 const p={id:'p1',name:'=X',answers:{D4_commune:'Toulouse',D4_horaire:'9h',D4_source:'https://exemple.test',goal:'Écrire\n"Bonjour"',interests:[]},observations:{D3_save:'2',S1:'P'},finished:false};
 const out=exportParticipants({code:'EXEMPLE'},[p]);
 assert.ok(out.includes('D3_save_observation'));assert.ok(out.includes('S1_evaluation_animateur'));assert.ok(out.includes('recherche_source'));assert.ok(out.includes('https://exemple.test'));assert.ok(out.includes('"\'=X"'));assert.ok(out.includes('Écrire\n""Bonjour""'));
});
test('La synthèse exportée distingue non mesuré et zéro personne',()=>{
 const out=exportSummary([]);assert.ok(out.includes('"Mobile";"non_mesure"'));assert.ok(out.includes('"Appareil et clavier";"0";"0";"0"'));
});
test('Les réponses blanches ne gonflent pas les connaissances à consolider',()=>{
 const row=summarize([{answers:{Q1:' ',Q2:''},observations:{}}])[0];assert.equal(row.knowledge,0);assert.equal(row.incomplete,1);
});
