import { AssessmentTest } from '../types';
import { simTask } from './modules/simKit';

/**
 * Vetter's skills games: short, ready-made games that measure general abilities any job can need (attention to detail,
 * verbal, numerical and logical reasoning, memory, multitasking). They're the same for every candidate and every
 * company, in every sector, so a score means the same thing everywhere, and adding one costs no AI. Each is one app
 * task (see lib/appSimulation.ts): the page keeps its state in one object, saves it with vetter.save, and is marked on
 * that state. Every item and answer is fixed here.
 */

const json = (v: unknown) => JSON.stringify(v).replace(/</g, '\\u003c');

const CSS = `*{box-sizing:border-box}html,body{margin:0}body{font:14px/1.5 'Inter',system-ui,-apple-system,'Segoe UI',sans-serif;color:#0f172a;background:#f4f6fb}
header{display:flex;align-items:center;gap:12px;padding:10px 16px;background:#1e1b4b;color:#fff;flex-wrap:wrap}
header b{font-size:14px}header span{font-size:12px;color:#c7d2fe}
.how{padding:8px 16px;background:#eef2ff;color:#3730a3;font-size:13px;border-bottom:1px solid #e0e7ff}
nav{display:flex;gap:6px;padding:10px 16px;flex-wrap:wrap}
nav button{font:inherit;font-size:13px;font-weight:600;padding:6px 12px;border-radius:999px;border:1px solid #c7d2fe;background:#fff;color:#3730a3;cursor:pointer}
nav button.on{background:#4f46e5;border-color:#4f46e5;color:#fff}nav button .tick{margin-left:6px}
main{padding:0 16px 24px;max-width:1000px}
.card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;margin-bottom:12px}
.card h2{margin:0 0 4px;font-size:15px}.muted{color:#64748b;font-size:13px}
table{border-collapse:collapse;width:100%;font-size:13px}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #eef0f4}
th{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#64748b}
.mono{font-family:'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}@media(max-width:700px){.grid2{grid-template-columns:1fr}}
tr.pick{cursor:pointer}tr.pick:hover td{background:#f5f3ff}tr.pick.on td{background:#fde68a}
.btn{font:inherit;font-weight:600;font-size:13px;padding:6px 12px;border-radius:8px;border:1px solid #cbd5e1;background:#fff;color:#0f172a;cursor:pointer}
.btn:hover{border-color:#6366f1}.btn.on{background:#4f46e5;border-color:#4f46e5;color:#fff}.btn:disabled{opacity:.45;cursor:not-allowed}
.btn.go{background:#4f46e5;color:#fff;border-color:#4f46e5}
.row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:8px 0;border-bottom:1px solid #f1f5f9}
.row .q{flex:1;min-width:220px}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chip{font:inherit;font-size:14px;padding:8px 12px;border-radius:8px;border:1px solid #cbd5e1;background:#fff;cursor:pointer}
.chip.on{background:#fde68a;border-color:#f59e0b}
input.num{font:inherit;width:120px;padding:6px 8px;border:1px solid #cbd5e1;border-radius:8px}
.done{color:#059669;font-weight:700}`;

// A game page: a header, a one-line "How to play", round tabs and one section per round. The script runs inside one
// function, starts from window.vetterSaved and saves after every change
const page = (title: string, sub: string, how: string, rounds: string[], body: string, script: string) => `<!doctype html><html><head><meta charset="utf-8">
<title>${title}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono&display=swap" rel="stylesheet">
<style>${CSS}</style></head><body>
<header><b>${title}</b><span>${sub}</span></header>
<div class="how"><b>How to play:</b> ${how}</div>
${rounds.length > 1 ? `<nav id="tabs">${rounds.map((r, i) => `<button data-r="${i}" data-ref="round-${i + 1}">Round ${i + 1}: ${r}<span class="tick" id="tick${i}"></span></button>`).join('')}</nav>` : ''}
<main>${body}</main>
<script>(function(){
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function $(id){return document.getElementById(id)}
function tabs(n,show){var b=document.querySelectorAll('#tabs button');Array.prototype.forEach.call(b,function(x){x.onclick=function(){show(Number(x.getAttribute('data-r')))}});
  return function(cur){Array.prototype.forEach.call(b,function(x){x.className=Number(x.getAttribute('data-r'))===cur?'on':''});for(var i=0;i<n;i++){var s=$('r'+i);if(s)s.style.display=i===cur?'':'none'}}}
${script}
})();</script></body></html>`;

// ---------- Attention to detail ----------

const ORIGINAL = [
  ['1', 'PK-2041', 'Steel hinges', '24', '3.85'],
  ['2', 'PK-2187', 'Brass handles', '12', '7.40'],
  ['3', 'PK-3302', 'Wood screws 4x40', '200', '0.06'],
  ['4', 'PK-3318', 'Wall plugs 6mm', '150', '0.04'],
  ['5', 'PK-4120', 'Drawer runners 450mm', '8', '11.95'],
  ['6', 'PK-4176', 'Cabinet feet', '16', '2.10'],
  ['7', 'PK-5009', 'Shelf pins 5mm', '100', '0.12'],
  ['8', 'PK-5044', 'Door stops', '10', '1.65'],
  ['9', 'PK-6210', 'Soft-close dampers', '20', '2.95'],
  ['10', 'PK-6283', 'Magnetic catches', '30', '0.89'],
];
// The copy keyed in from it, with four mistakes: rows 2 (price), 5 (code), 8 (item) and 9 (quantity)
const COPY = ORIGINAL.map((r) => [...r]);
COPY[1][4] = '7.04';
COPY[4][1] = 'PK-4210';
COPY[7][2] = 'Door stop';
COPY[8][3] = '200';

const PAIRS = [
  ['1', '14 Harcourt Road, Leeds LS6 2QF', '14 Harcourt Road, Leeds LS6 2QF'],
  ['2', '07700 900461', '07700 900416'],
  ['3', 'Invoice INV-30982', 'Invoice INV-30982'],
  ['4', 'j.mcallister@northfield.co.uk', 'j.mcalister@northfield.co.uk'],
  ['5', 'Sort code 20-45-77', 'Sort code 20-45-77'],
  ['6', "Flat 3B, 220 Queen's Drive", "Flat 3B, 202 Queen's Drive"],
  ['7', 'Batch L2291-C, exp 03/2027', 'Batch L2291-C, exp 03/2027'],
  ['8', 'Dr Priya Ramanathan', 'Dr Priya Ramanthan'],
  ['9', 'Order 55-1180-K', 'Order 55-1180-K'],
  ['10', 'Postcode BS8 4TN', 'Postcode BS8 4NT'],
];

const TARGET_CODE = 'KX-4471-B9Q';
const CODES = ['KX-4471-B9Q', 'KX-4417-B9Q', 'KX-4471-89Q', 'KX-4471-B9Q', 'XK-4471-B9Q', 'KX-4471-B9O', 'KX-4471-B9Q', 'KX-447I-B9Q', 'KX-4471-BQ9', 'KX-4471-B9Q', 'KX-4771-B9Q', 'KX-4471-B90'];

const attentionHtml = page(
  'Attention to Detail',
  'Skills game · 3 rounds',
  'work through each round from the tabs. Click to mark, click again to unmark. Take care: one wrong character counts.',
  ['Check the copy', 'Same or different', 'Exact matches'],
  `<section id="r0"><div class="card"><h2>Check the copy</h2><p class="muted">The delivery note on the left was typed up as the copy on the right. Click every row in the copy that doesn't match the original exactly.</p>
<div class="grid2"><div><b>Original</b><table><thead><tr><th>#</th><th>Code</th><th>Item</th><th>Qty</th><th>£ each</th></tr></thead><tbody id="orig"></tbody></table></div>
<div><b>Copy</b><table><thead><tr><th>#</th><th>Code</th><th>Item</th><th>Qty</th><th>£ each</th></tr></thead><tbody id="copy" data-ref="copy-rows"></tbody></table></div></div></div></section>
<section id="r1"><div class="card"><h2>Same or different</h2><p class="muted">Is each pair exactly the same? Answer every pair.</p><div id="pairs"></div></div></section>
<section id="r2"><div class="card"><h2>Exact matches</h2><p class="muted">Click every code that is exactly <b class="mono" style="font-size:16px">${TARGET_CODE}</b>. Leave the rest.</p><div class="chips mono" id="codes" data-ref="codes"></div></div></section>`,
  `var ORIG=${json(ORIGINAL)},COPY=${json(COPY)},PAIRS=${json(PAIRS)},CODES=${json(CODES)};
var S=window.vetterSaved||{};S.flagged=S.flagged||[];S.pairs=S.pairs||{};S.picked=S.picked||[];S.rounds=S.rounds||{};
function toggle(list,v){var i=list.indexOf(v);if(i<0)list.push(v);else list.splice(i,1)}
function within(list,lo,hi){return list.filter(function(x){var n=Number(x);return n>=lo&&n<=hi}).sort(function(a,b){return a-b})}
function half(lo,hi){for(var i=lo;i<=hi;i++)if(!S.pairs[String(i)])return 'incomplete';return Object.keys(S.pairs).filter(function(k){var n=Number(k);return n>=lo&&n<=hi&&S.pairs[k]==='different'}).sort(function(a,b){return a-b})}
function save(){S.rounds.copyA=within(S.flagged,1,5);S.rounds.copyB=within(S.flagged,6,10);S.rounds.pairsA=half(1,5);S.rounds.pairsB=half(6,10);
  S.rounds.codes=S.picked.slice().sort();window.vetter.save(S);draw()}
function cells(r){return '<td>'+r[0]+'</td><td class="mono">'+esc(r[1])+'</td><td>'+esc(r[2])+'</td><td class="mono">'+r[3]+'</td><td class="mono">'+r[4]+'</td>'}
function draw(){
  $('orig').innerHTML=ORIG.map(function(r){return '<tr>'+cells(r)+'</tr>'}).join('');
  $('copy').innerHTML=COPY.map(function(r){return '<tr class="pick'+(S.flagged.indexOf(r[0])>=0?' on':'')+'" data-id="'+r[0]+'">'+cells(r)+'</tr>'}).join('');
  Array.prototype.forEach.call(document.querySelectorAll('#copy tr'),function(tr){tr.onclick=function(){toggle(S.flagged,tr.getAttribute('data-id'));save()}});
  $('pairs').innerHTML=PAIRS.map(function(p){var a=S.pairs[p[0]];return '<div class="row"><span class="q mono">'+esc(p[1])+'<br>'+esc(p[2])+'</span><button class="btn'+(a==='same'?' on':'')+'" data-p="'+p[0]+'" data-v="same">Same</button><button class="btn'+(a==='different'?' on':'')+'" data-p="'+p[0]+'" data-v="different">Different</button></div>'}).join('');
  Array.prototype.forEach.call(document.querySelectorAll('#pairs button'),function(b){b.onclick=function(){S.pairs[b.getAttribute('data-p')]=b.getAttribute('data-v');save()}});
  $('codes').innerHTML=CODES.map(function(c,i){var id='c'+(i+1);return '<button class="chip'+(S.picked.indexOf(id)>=0?' on':'')+'" data-c="'+id+'">'+esc(c)+'</button>'}).join('');
  Array.prototype.forEach.call(document.querySelectorAll('#codes button'),function(b){b.onclick=function(){toggle(S.picked,b.getAttribute('data-c'));save()}});
  $('tick0').textContent=S.flagged.length?' ✓':'';$('tick1').textContent=Object.keys(S.pairs).length===PAIRS.length?' ✓':'';$('tick2').textContent=S.picked.length?' ✓':'';
}
var show=tabs(3,function(i){show(i)});show(0);save();`
);

// ---------- Verbal reasoning ----------

const PASSAGES: { title: string; text: string; statements: [string, 'True' | 'False' | "Can't say"][] }[] = [
  {
    title: 'Breaks at work',
    text: 'Staff who work more than six hours in a shift are entitled to an unpaid 30-minute break. Breaks should be taken before the end of the fifth hour where possible. Staff under 18 are entitled to a 30-minute break after four and a half hours. Managers may agree to split a break into two 15-minute parts, but only if the staff member asks for this in writing.',
    statements: [
      ['Someone working a seven-hour shift is entitled to a paid 30-minute break.', 'False'],
      ['A 17-year-old working a five-hour shift is entitled to a break.', 'True'],
      ['Most staff prefer to take their break in two parts.', "Can't say"],
      ['A manager can split a break in two without a written request from the staff member.', 'False'],
    ],
  },
  {
    title: 'Food-waste collections',
    text: 'Since the council introduced weekly food-waste collections in March, the amount of general waste collected has fallen by 18%. Over the same period, the number of households in the borough rose by 2%. The council had expected general waste to fall by 10%. Food-waste caddies were given free to every household, and replacement caddies cost £5.',
    statements: [
      ['General waste fell by more than the council expected.', 'True'],
      ['The fall in general waste was caused only by the food-waste collections.', "Can't say"],
      ['Every household was given a food-waste caddy free of charge.', 'True'],
      ['The number of households in the borough fell after March.', 'False'],
    ],
  },
  {
    title: 'Car seat recall',
    text: "A batch of children's car seats made between 1 and 14 June has been recalled because a buckle may fail in cold weather. Seats made outside these dates are not affected. Owners can find the date the seat was made on a label under the seat. Affected owners will be sent a free replacement buckle, which can be fitted at home in about ten minutes. No injuries have been reported.",
    statements: [
      ['A seat made on 20 June is affected by the recall.', 'False'],
      ['The buckle may fail in cold weather.', 'True'],
      ['Affected owners will be charged for the replacement buckle.', 'False'],
      ['The manufacturer has recalled other products this year.', "Can't say"],
    ],
  },
];

const verbalHtml = page(
  'Verbal Reasoning',
  'Skills game · 3 passages',
  'read each passage, then mark every statement True (the passage says so), False (the passage says otherwise) or Can\'t say (the passage doesn\'t tell you). Use only what the passage says.',
  PASSAGES.map((p) => p.title),
  PASSAGES.map((p, i) => `<section id="r${i}"><div class="card"><h2>${p.title}</h2><p>${p.text}</p></div><div class="card" id="st${i}"></div></section>`).join(''),
  `var P=${json(PASSAGES.map((p) => p.statements.map((s) => s[0])))};
var S=window.vetterSaved||{};S.answers=S.answers||{};
function save(){window.vetter.save(S);draw()}
function draw(){P.forEach(function(list,pi){
  $('st'+pi).innerHTML=list.map(function(s,si){var k='p'+(pi+1)+'s'+(si+1),a=S.answers[k];return '<div class="row"><span class="q">'+(si+1)+'. '+esc(s)+'</span>'+['True','False',"Can't say"].map(function(v){return '<button class="btn'+(a===v?' on':'')+'" data-k="'+k+'" data-v="'+esc(v)+'">'+esc(v)+'</button>'}).join('')+'</div>'}).join('');
  $('tick'+pi).textContent=list.every(function(_,si){return S.answers['p'+(pi+1)+'s'+(si+1)]})?' ✓':'';});
  Array.prototype.forEach.call(document.querySelectorAll('.row button'),function(b){b.onclick=function(){S.answers[b.getAttribute('data-k')]=b.getAttribute('data-v');save()}});}
var show=tabs(3,function(i){show(i)});show(0);save();`
);

// ---------- Numerical reasoning ----------

const PARCELS = [
  ['North', 1200, 1350, 1500],
  ['South', 900, 1080, 990],
  ['East', 640, 600, 720],
  ['West', 1100, 1045, 1210],
] as const;
const NUMERICAL_QS: [string, string][] = [
  ['How many parcels were delivered in February, across all four regions?', '4075'],
  ["By what percentage did North's parcels rise from January to March? (As a %, e.g. 12.5)", '25'],
  ["What was South's average number of parcels a month over the three months?", '990'],
  ['Each parcel costs £3.20 to deliver. What did West\'s March deliveries cost, in £?', '3872'],
  ["What share of March's parcels were East's? (As a %, to 1 decimal place)", '16.3|16.29'],
  ["By what percentage did West's parcels fall from January to February? (As a %)", '5'],
];

const numericalHtml = page(
  'Numerical Reasoning',
  'Skills game · 6 questions',
  'use the table and chart to answer each question. Type numbers only (no £ or % signs). A calculator is fine.',
  [],
  `<div class="card"><h2>Parcels delivered by region, January to March</h2>
<table data-ref="parcel-table"><thead><tr><th>Region</th><th>January</th><th>February</th><th>March</th></tr></thead><tbody>${PARCELS.map((r) => `<tr><td>${r[0]}</td>${r.slice(1).map((n) => `<td class="mono">${Number(n).toLocaleString('en-GB')}</td>`).join('')}</tr>`).join('')}</tbody></table>
<svg viewBox="0 0 520 170" width="100%" role="img" aria-label="Bar chart of parcels by region and month" style="margin-top:10px">
${PARCELS.map((r, i) => r.slice(1).map((n, m) => `<rect x="${30 + i * 125 + m * 30}" y="${150 - (Number(n) / 1500) * 130}" width="26" height="${(Number(n) / 1500) * 130}" fill="${['#a5b4fc', '#6366f1', '#3730a3'][m]}"/>`).join('') + `<text x="${30 + i * 125 + 40}" y="166" font-size="12" text-anchor="middle" fill="#475569">${r[0]}</text>`).join('')}
<g font-size="11" fill="#475569"><rect x="400" y="6" width="10" height="10" fill="#a5b4fc"/><text x="414" y="15">Jan</text><rect x="440" y="6" width="10" height="10" fill="#6366f1"/><text x="454" y="15">Feb</text><rect x="480" y="6" width="10" height="10" fill="#3730a3"/><text x="494" y="15">Mar</text></g></svg></div>
<div class="card" id="qs" data-ref="answers"></div>`,
  `var Q=${json(NUMERICAL_QS.map((q) => q[0]))};
var S=window.vetterSaved||{};S.answers=S.answers||{};
$('qs').innerHTML=Q.map(function(q,i){return '<div class="row"><label class="q" for="a'+(i+1)+'">'+(i+1)+'. '+esc(q)+'</label><input class="num mono" id="a'+(i+1)+'" inputmode="decimal" autocomplete="off"></div>'}).join('');
Q.forEach(function(_,i){var k='q'+(i+1),inp=$('a'+(i+1));if(S.answers[k]!=null)inp.value=S.answers[k];
  inp.addEventListener('input',function(){var v=inp.value.replace(/[£%,\\s]/g,'');S.answers[k]=v;window.vetter.save(S)})});
window.vetter.save(S);`
);

// ---------- Logical reasoning ----------

const arrow = (deg: number) => `<svg width="40" height="40" viewBox="0 0 40 40"><g transform="rotate(${deg} 20 20)"><path d="M20 6 L30 18 H24 V34 H16 V18 H10 Z" fill="#4f46e5"/></g></svg>`;
const dots = (n: number) => `<svg width="56" height="40" viewBox="0 0 56 40">${Array.from({ length: n }, (_, i) => `<circle cx="${8 + (i % 5) * 10}" cy="${12 + Math.floor(i / 5) * 14}" r="4" fill="#4f46e5"/>`).join('')}</svg>`;
const LOGIC: { series: string[]; options: string[]; answer: number }[] = [
  { series: ['2', '6', '12', '20', '30'], options: ['40', '42', '44', '36'], answer: 1 },
  { series: ['3', '9', '27', '81'], options: ['162', '243', '324', '108'], answer: 1 },
  { series: ['A', 'C', 'F', 'J', 'O'], options: ['S', 'T', 'U', 'V'], answer: 2 },
  { series: ['1', '1', '2', '3', '5', '8'], options: ['11', '12', '13', '15'], answer: 2 },
  { series: ['64', '32', '16', '8'], options: ['2', '4', '6', '0'], answer: 1 },
  { series: ['Z', 'X', 'U', 'Q'], options: ['M', 'L', 'K', 'N'], answer: 1 },
  { series: [arrow(0), arrow(90), arrow(180)], options: [arrow(0), arrow(90), arrow(180), arrow(270)], answer: 3 },
  { series: [dots(1), dots(3), dots(5)], options: [dots(6), dots(7), dots(8), dots(9)], answer: 1 },
];
const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

const logicHtml = page(
  'Logical Reasoning',
  'Skills game · 8 patterns',
  'each row follows a rule. Work out the rule and pick what comes next.',
  [],
  `<div class="card" id="items" data-ref="patterns"></div>`,
  `var L=${json(LOGIC.map((l) => ({ series: l.series, options: l.options })))},LET=${json(OPTION_LETTERS)};
var S=window.vetterSaved||{};S.answers=S.answers||{};
function save(){window.vetter.save(S);draw()}
function draw(){$('items').innerHTML=L.map(function(it,i){var k='q'+(i+1);return '<div class="row"><span class="q"><b>'+(i+1)+'.</b> <span class="mono" style="display:inline-flex;gap:10px;align-items:center;font-size:16px">'+it.series.join('<span class="muted">,</span>')+'<span class="muted">, ?</span></span></span><span class="chips">'+it.options.map(function(o,j){return '<button class="chip mono'+(S.answers[k]===LET[j]?' on':'')+'" data-k="'+k+'" data-v="'+LET[j]+'" aria-label="Option '+LET[j]+'"><span class="muted">'+LET[j]+'</span> '+o+'</button>'}).join('')+'</span></div>'}).join('');
  Array.prototype.forEach.call(document.querySelectorAll('#items button'),function(b){b.onclick=function(){S.answers[b.getAttribute('data-k')]=b.getAttribute('data-v');save()}});}
save();`
);

// ---------- Memory ----------

const SEQUENCES = [
  [5, 10, 2],
  [0, 6, 9, 15],
  [12, 3, 7, 1, 14],
  [8, 2, 13, 4, 11, 6],
  [15, 0, 9, 5, 12, 3, 10],
];

const memoryHtml = page(
  'Memory',
  'Skills game · 5 levels',
  'press Show to watch squares light up one at a time (you see each sequence once), then click the squares in the same order and press Submit.',
  SEQUENCES.map((s) => `${s.length} squares`),
  SEQUENCES.map((_, i) => `<section id="r${i}"><div class="card"><h2>Level ${i + 1}: ${SEQUENCES[i].length} squares</h2>
<div style="display:grid;grid-template-columns:repeat(4,64px);gap:8px;margin:12px 0" id="g${i}" data-ref="${i === 0 ? 'memory-grid' : `grid-${i + 1}`}"></div>
<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><button class="btn go" id="show${i}">Show</button><button class="btn" id="clear${i}">Clear</button><button class="btn go" id="sub${i}">Submit</button><span class="muted" id="msg${i}"></span></div></div></section>`).join(''),
  `var SEQ=${json(SEQUENCES)};
var S=window.vetterSaved||{};S.played=S.played||{};S.recall=S.recall||{};S.levels=S.levels||{};
var picking={},lit={};
function save(){window.vetter.save(S);draw()}
function draw(){SEQ.forEach(function(seq,i){var g=$('g'+i),cur=picking[i]||[];var html='';
  for(var c=0;c<16;c++){var on=lit[i]===c,n=cur.indexOf(c);html+='<button aria-label="Square '+(c+1)+'" data-l="'+i+'" data-c="'+c+'" style="width:64px;height:64px;border-radius:10px;border:2px solid '+(on?'#f59e0b':'#c7d2fe')+';background:'+(on?'#fbbf24':n>=0?'#e0e7ff':'#fff')+';font:600 14px Inter,sans-serif;color:#3730a3;cursor:pointer">'+(n>=0?(n+1):'')+'</button>'}
  g.innerHTML=html;var done=S.levels['L'+(i+1)]!=null;
  $('show'+i).disabled=!!S.played[i];$('sub'+i).disabled=done||!S.played[i]||lit[i]!=null;$('clear'+i).disabled=done||!cur.length;
  $('msg'+i).textContent=done?'Submitted.':S.played[i]?(lit[i]!=null?'Watch…':'Now click the squares in order ('+cur.length+' of '+seq.length+').'):'Press Show when you are ready.';
  $('tick'+i).textContent=done?' ✓':'';});
  Array.prototype.forEach.call(document.querySelectorAll('main button[data-c]'),function(b){b.onclick=function(){var i=Number(b.getAttribute('data-l')),c=Number(b.getAttribute('data-c'));
    if(!S.played[i]||lit[i]!=null||S.levels['L'+(i+1)]!=null)return;var cur=picking[i]=picking[i]||[];if(cur.length<SEQ[i].length)cur.push(c);draw()}});}
SEQ.forEach(function(seq,i){
  $('show'+i).onclick=function(){if(S.played[i])return;S.played[i]=true;window.vetter.save(S);var k=0;
    (function step(){if(k>=seq.length){delete lit[i];draw();return}lit[i]=seq[k++];draw();setTimeout(function(){delete lit[i];draw();setTimeout(step,250)},700)})()};
  $('clear'+i).onclick=function(){picking[i]=[];draw()};
  $('sub'+i).onclick=function(){var cur=picking[i]||[];S.recall['L'+(i+1)]=cur.slice();S.levels['L'+(i+1)]=cur.map(function(c){return c}).join('-');save()};});
var show=tabs(SEQ.length,function(i){show(i)});show(0);save();`
);

// ---------- Multitasking ----------

const multitaskHtml = page(
  'Multitasking',
  'Skills game · 3 minutes · three jobs at once',
  'press Start. For three minutes, keep all three going: send each item at the front of the queue to the right tray, keep the pressure between 40 and 60 with Pump and Vent, and answer each sum before it disappears (type, then Enter). You can only play once.',
  [],
  `<div class="card" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap"><button class="btn go" id="start" data-ref="start">Start</button><b id="clock" class="mono" style="font-size:18px">3:00</b><span class="muted" id="status">Ready when you are.</span></div>
<div class="grid2">
<div class="card" data-ref="sorting"><h2>1. Sort the queue</h2><p class="muted">Invoices to Finance, complaints to Customer care, orders to Warehouse. Anything marked URGENT goes to Urgent, whatever it is. If five items are waiting, the oldest is lost.</p>
<div id="queue" style="min-height:120px"></div><div class="chips" style="margin-top:8px">${['Finance', 'Customer care', 'Warehouse', 'Urgent'].map((t) => `<button class="btn" data-tray="${t}">${t}</button>`).join('')}</div></div>
<div>
<div class="card" data-ref="pressure"><h2>2. Keep the pressure steady</h2><p class="muted">Keep it in the green band (40 to 60).</p>
<svg viewBox="0 0 300 40" width="100%"><rect x="0" y="12" width="300" height="16" rx="8" fill="#f1f5f9"/><rect x="120" y="12" width="60" height="16" fill="#bbf7d0"/><rect id="needle" x="148" y="4" width="4" height="32" fill="#1e1b4b"/></svg>
<div style="display:flex;gap:8px;align-items:center"><button class="btn" id="vent">Vent −</button><b class="mono" id="pval">50</b><button class="btn" id="pump">Pump +</button></div></div>
<div class="card" data-ref="sums"><h2>3. Quick sums</h2><p class="muted">A new sum appears every 15 seconds and disappears after 12.</p>
<div style="display:flex;gap:8px;align-items:center"><b class="mono" id="sum" style="font-size:18px;min-width:110px">–</b><input class="num mono" id="sumin" inputmode="numeric" autocomplete="off" aria-label="Your answer" disabled></div></div>
</div></div>`,
  `var DUR=180;
function rng(seed){var h=seed>>>0;return function(){h=(Math.imul(h,1664525)+1013904223)>>>0;return h/4294967296}}
var r=rng(4242),KINDS=[['Invoice','Finance'],['Complaint','Customer care'],['Order','Warehouse']],ITEMS=[];
for(var i=0;i<45;i++){var k=KINDS[Math.floor(r()*3)],urgent=r()<0.2;ITEMS.push({at:i*4,label:k[0]+' #'+(1040+i),urgent:urgent,tray:urgent?'Urgent':k[1]})}
var SUMS=[['37 + 48',85],['9 × 7',63],['120 − 65',55],['14 × 3',42],['250 ÷ 5',50],['86 − 29',57],['6 × 12',72],['145 + 78',223],['81 ÷ 9',9],['300 − 172',128],['15 × 4',60],['64 + 59',123]];
var DRIFT=[];var dr=rng(99),d=0;for(var t=0;t<DUR*5;t++){if(t%15===0)d=(dr()-0.5)*2.4;DRIFT.push(d)}
var S=window.vetterSaved||{};S.results=S.results||{sorting60:false,sorting85:false,gauge60:false,gauge85:false,sums60:false,sums85:false};
var queue=[],next=0,sorted=0,ticks=0,inBand=0,p=50,sumIdx=-1,sumShown=-1,sumsRight=0,timer=null,t0=0;
function score(){var s=sorted/ITEMS.length,g=inBand/(DUR*5),m=sumsRight/SUMS.length;
  S.score={sorting:Math.round(s*100),gauge:Math.round(g*100),sums:Math.round(m*100)};
  S.results={sorting60:s>=0.6,sorting85:s>=0.85,gauge60:g>=0.6,gauge85:g>=0.85,sums60:m>=0.6,sums85:m>=0.85};window.vetter.save(S)}
function drawQueue(){$('queue').innerHTML=queue.length?queue.map(function(it,i){return '<div class="row" style="'+(i===0?'font-weight:700':'opacity:.7')+'">'+(i===0?'▶ ':'')+esc(it.label)+(it.urgent?' <span style="color:#dc2626;font-weight:700">URGENT</span>':'')+'</div>'}).join(''):'<p class="muted">Nothing waiting.</p>'}
function drawP(){$('needle').setAttribute('x',String(Math.max(0,Math.min(296,p*3-2))));$('pval').textContent=Math.round(p)}
function tick(){var el=(performance.now()-t0)/1000;if(el>=DUR){end();return}
  var left=Math.ceil(DUR-el);$('clock').textContent=Math.floor(left/60)+':'+('0'+left%60).slice(-2);
  while(next<ITEMS.length&&ITEMS[next].at<=el){queue.push(ITEMS[next++]);if(queue.length>5)queue.shift()}
  var ti=Math.floor(el*5);while(ticks<=ti&&ticks<DRIFT.length){p+=DRIFT[ticks];p=Math.max(0,Math.min(100,p));if(p>=40&&p<=60)inBand++;ticks++}
  var si=Math.floor(el/15);if(si!==sumIdx&&si<SUMS.length){sumIdx=si;sumShown=el;$('sum').textContent=SUMS[si][0]+' =';$('sumin').value='';$('sumin').disabled=false}
  if(sumIdx>=0&&sumShown>=0&&el-sumShown>12){$('sum').textContent='–';$('sumin').disabled=true;sumShown=-1}
  drawQueue();drawP();}
function end(){clearInterval(timer);timer=null;S.finished=true;score();$('clock').textContent='0:00';$('status').textContent='Finished. Your results are saved.';
  Array.prototype.forEach.call(document.querySelectorAll('button,input'),function(b){b.disabled=true})}
$('start').onclick=function(){if(S.started)return;S.started=true;score();$('start').disabled=true;$('status').textContent='Go!';t0=performance.now();timer=setInterval(tick,100);tick()};
Array.prototype.forEach.call(document.querySelectorAll('[data-tray]'),function(b){b.onclick=function(){if(!timer||!queue.length)return;var it=queue.shift();if(it.tray===b.getAttribute('data-tray'))sorted++;score();drawQueue()}});
$('pump').onclick=function(){if(timer){p=Math.min(100,p+8);drawP()}};$('vent').onclick=function(){if(timer){p=Math.max(0,p-8);drawP()}};
$('sumin').addEventListener('keydown',function(e){if(e.key!=='Enter'||!timer||sumShown<0)return;if(Number($('sumin').value)===SUMS[sumIdx][1])sumsRight++;$('sumin').value='';$('sumin').disabled=true;$('sum').textContent='–';sumShown=-1;score()});
if(S.started){$('start').disabled=true;$('status').textContent=S.finished?'Finished. Your results are saved.':'This game has already been played.';Array.prototype.forEach.call(document.querySelectorAll('button,input'),function(b){b.disabled=true})}
drawQueue();drawP();window.vetter.save(S);`
);

// ---------- The tests ----------

const game = (
  id: string,
  title: string,
  ability: string,
  description: string,
  minutes: number,
  prompt: string,
  html: string,
  checks: [string, string, string][]
): AssessmentTest => ({
  id,
  title: `Skills Game: ${title}`,
  category: 'Aptitude',
  difficulty: 'Junior',
  type: 'standard',
  description,
  estimatedMinutes: minutes,
  passingScore: 60,
  totalQuestions: 1,
  skillsTested: [ability],
  roles: ['Any role'],
  questions: [simTask(`${id}-q1`, title, prompt, title, html, checks, { minutes, weight: 100 })],
});

const pathList = (xs: string[]) => JSON.stringify(xs);

export const SKILLS_GAMES: AssessmentTest[] = [
  game(
    'test-skills-attention',
    'Attention to Detail',
    'Attention to Detail',
    'A three-round game: find the mistakes in a typed-up delivery note, judge whether pairs of addresses, numbers and names are exactly the same, and pick out every exact match of a product code. Any role where small slips cost money or safety.',
    8,
    'Work through all three rounds. Accuracy matters more than speed.',
    attentionHtml,
    [
      ['Copy, rows 1 to 5: every mistake found and nothing else', 'rounds.copyA', pathList(['2', '5'])],
      ['Copy, rows 6 to 10: every mistake found and nothing else', 'rounds.copyB', pathList(['8', '9'])],
      ['Pairs 1 to 5 judged right', 'rounds.pairsA', pathList(['2', '4'])],
      ['Pairs 6 to 10 judged right', 'rounds.pairsB', pathList(['6', '8', '10'])],
      ['Every exact code match picked, and no near-miss', 'rounds.codes', pathList(['c1', 'c4', 'c7', 'c10'])],
    ]
  ),
  game(
    'test-skills-verbal',
    'Verbal Reasoning',
    'Verbal Reasoning',
    'Three short passages, each with four statements to judge True, False or Can\'t say from the passage alone. Reading carefully and not assuming what isn\'t written.',
    10,
    'Read each passage and judge every statement on what the passage says, not on what you know.',
    verbalHtml,
    PASSAGES.flatMap((p, pi) => p.statements.map(([s, a], si): [string, string, string] => [`${p.title}, statement ${si + 1}`, `answers.p${pi + 1}s${si + 1}`, a])).map(([d, path, a]) => [d, path, a]),
  ),
  game(
    'test-skills-numerical',
    'Numerical Reasoning',
    'Numerical Reasoning',
    'Six questions on a table and chart of parcel deliveries: totals, averages, percentage changes, shares and costs.',
    10,
    'Answer all six questions from the table and chart.',
    numericalHtml,
    NUMERICAL_QS.map(([q, a], i): [string, string, string] => [`Question ${i + 1}`, `answers.q${i + 1}`, a]),
  ),
  game(
    'test-skills-logic',
    'Logical Reasoning',
    'Logical Reasoning',
    'Eight patterns of numbers, letters and shapes: work out each rule and pick what comes next.',
    8,
    'Pick what comes next in each of the eight patterns.',
    logicHtml,
    LOGIC.map((l, i): [string, string, string] => [`Pattern ${i + 1}`, `answers.q${i + 1}`, OPTION_LETTERS[l.answer]]),
  ),
  game(
    'test-skills-memory',
    'Memory',
    'Working Memory',
    'Five levels of a sequence-memory game: watch squares light up in order, then repeat the sequence, from 3 squares up to 7.',
    6,
    'Do all five levels. Each sequence is shown once.',
    memoryHtml,
    SEQUENCES.map((s, i): [string, string, string] => [`Level ${i + 1}: ${s.length} squares in order`, `levels.L${i + 1}`, s.join('-')]),
  ),
  game(
    'test-skills-multitask',
    'Multitasking',
    'Multitasking',
    'Three minutes, three jobs at once: sort a queue of work into the right trays, keep a pressure gauge in its band, and answer quick sums before they vanish. Any busy role juggling several things at once.',
    5,
    'Press Start when you are ready: the game runs for three minutes and can be played once.',
    multitaskHtml,
    [
      ['Sorting: at least 60% of the work sorted right', 'results.sorting60', 'true'],
      ['Sorting: at least 85% sorted right', 'results.sorting85', 'true'],
      ['Pressure: in the band at least 60% of the time', 'results.gauge60', 'true'],
      ['Pressure: in the band at least 85% of the time', 'results.gauge85', 'true'],
      ['Sums: at least 60% answered right', 'results.sums60', 'true'],
      ['Sums: at least 85% answered right', 'results.sums85', 'true'],
    ]
  ),
];
