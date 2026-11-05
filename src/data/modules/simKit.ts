import { Question } from '../../types';

/**
 * Low-level simulations for Vetter's own tests: small working windows the candidate operates, built from data rather
 * than written page by page. Each runs as an app task (see lib/appSimulation.ts): it keeps its state in one object,
 * saves it with vetter.save, and is marked on that state.
 *
 * - queueApp: a list of records (alerts, emails, sign-ins, use cases, claims) to open, read and act on, with an
 *   optional search over logs and a findings form. State: { records: { id: { field: value } }, answers: {…}, searches: [] }
 * - terminalApp: a command line over a small world (a Git repository, a Linux server) with its own commands, and a
 *   findings form. State: { world, history: [], answers: {…} }
 * - labApp: settings and a Run button that computes results from them (a RAG pipeline, a threshold, a cost model).
 *   State: { params: {…}, results: {…}, runs: n }
 */

export interface SimField {
  key: string;
  label: string;
  type: 'select' | 'text' | 'number' | 'textarea' | 'check';
  options?: string[];
  placeholder?: string;
}

export interface QueueRecord {
  id: string;
  cells: string[];
  detail: string;
}

const json = (v: unknown) => JSON.stringify(v).replace(/</g, '\\u003c');

// Shared look: Vetter's greys and navy, a crisp sans and a mono for data
const STYLE = `<style>
*{box-sizing:border-box}body{margin:0;font:13px/1.45 'Inter',system-ui,-apple-system,'Segoe UI',sans-serif;color:#0f172a;background:#f6f7f9}
header{display:flex;align-items:center;gap:10px;padding:10px 14px;background:#111833;color:#fff}
header b{font-size:13px}header span{font-size:12px;color:#a3afd1}
.wrap{display:grid;gap:10px;padding:10px;height:calc(100vh - 42px)}
.card{background:#fff;border:1px solid #dadfe7;border-radius:10px;overflow:auto;min-height:0}
.card h3{margin:0;padding:9px 12px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#5c6777;border-bottom:1px solid #eef0f4;position:sticky;top:0;background:#fff;z-index:1}
table{border-collapse:collapse;width:100%}th,td{text-align:left;padding:7px 10px;border-bottom:1px solid #eef0f4;vertical-align:top}
th{font-size:11px;color:#5c6777;font-weight:600;background:#fafbfc;position:sticky;top:33px}
tr.row{cursor:pointer}tr.row:hover td{background:#f3f5fa}tr.row.on td{background:#e4e8f3}
td.done:after{content:'✓';color:#2b3a6e;font-weight:700}
pre{margin:0;padding:12px;font:12px/1.5 'JetBrains Mono',ui-monospace,Menlo,monospace;white-space:pre-wrap;word-break:break-word}
.form{padding:10px 12px;display:grid;gap:9px}
label{display:grid;gap:3px;font-size:12px;font-weight:600;color:#334155}
label.ck{display:flex;align-items:center;gap:8px;font-weight:500}
select,input,textarea{font:inherit;font-weight:400;padding:6px 8px;border:1px solid #c2c9d3;border-radius:7px;background:#fff;color:#0f172a;width:100%}
textarea{min-height:70px;resize:vertical;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:12px}
input[type=checkbox]{width:auto}
select:focus,input:focus,textarea:focus{outline:2px solid #47578f33;border-color:#47578f}
button{font:inherit;font-weight:600;padding:7px 12px;border-radius:7px;border:0;background:#2b3a6e;color:#fff;cursor:pointer}
button.ghost{background:#fff;color:#2b3a6e;box-shadow:inset 0 0 0 1px #c2c9d3}
.muted{color:#5c6777;font-size:12px}.pad{padding:10px 12px}
.hit{background:#fff7d6}
.term{background:#0b1022;color:#dbe2f3;font:12.5px/1.5 'JetBrains Mono',ui-monospace,monospace;padding:12px;overflow:auto;min-height:0;border-radius:10px}
.term div{white-space:pre-wrap;word-break:break-word}.term .in{color:#9fb3ff}.term input{background:transparent;border:0;color:#fff;outline:none;padding:0;font:inherit;width:90%}
.kpi{display:flex;gap:10px;flex-wrap:wrap;padding:10px 12px}.kpi div{background:#f3f5fa;border-radius:8px;padding:8px 12px;min-width:110px}.kpi b{display:block;font-size:18px}
</style>`;

const page = (title: string, subtitle: string, body: string, script: string) => `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono&display=swap" rel="stylesheet">${STYLE}</head>
<body><header><b>${title}</b><span>${subtitle}</span></header>${body}<script>${script}</script></body></html>`;

// Renders a list of fields into a container, reading and writing values in obj, calling save after every change
const FIELDS_JS = `
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function fields(el, defs, obj, onChange){
  el.innerHTML='';
  defs.forEach(function(f){
    var w=document.createElement('label'); if(f.type==='check') w.className='ck';
    var inp;
    if(f.type==='select'){inp=document.createElement('select');inp.innerHTML='<option value="">Choose…</option>'+f.options.map(function(o){return '<option>'+esc(o)+'</option>'}).join('');}
    else if(f.type==='textarea'){inp=document.createElement('textarea');}
    else{inp=document.createElement('input');inp.type=f.type==='check'?'checkbox':f.type==='number'?'number':'text';}
    if(f.placeholder) inp.placeholder=f.placeholder;
    var v=obj[f.key];
    if(f.type==='check') inp.checked=!!v; else if(v!=null) inp.value=v;
    var upd=function(){obj[f.key]=f.type==='check'?inp.checked:f.type==='number'?(inp.value===''?null:Number(inp.value)):inp.value;onChange();};
    inp.addEventListener('input',upd);inp.addEventListener('change',upd);
    if(f.type==='check'){w.appendChild(inp);w.appendChild(document.createTextNode(f.label));}
    else{w.appendChild(document.createTextNode(f.label));w.appendChild(inp);}
    el.appendChild(w);
  });
}`;

// ---------- Work queue ----------
export function queueApp(cfg: {
  title: string;
  subtitle: string;
  columns: string[];
  records: QueueRecord[];
  recordFields: SimField[];
  answers?: SimField[];
  answersTitle?: string;
  search?: { label: string; lines: string[] };
}): string {
  const body = `<div class="wrap" style="grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);grid-template-rows:${cfg.search ? '1fr 1fr' : '1fr'}">
<div class="card"><h3>${cfg.columns.length ? 'Queue' : ''}</h3><table><thead><tr>${cfg.columns.map((c) => `<th>${c}</th>`).join('')}<th></th></tr></thead><tbody id="rows"></tbody></table></div>
<div class="card" style="${cfg.search ? '' : ''}"><h3 id="dt">Select an item</h3><pre id="detail" class="muted">Click an item in the list to open it.</pre><div class="form" id="rf"></div></div>
${
  cfg.search
    ? `<div class="card"><h3>${cfg.search.label}</h3><div class="pad" style="display:flex;gap:8px"><input id="q" placeholder="Search, e.g. an IP, user or word"><button id="go">Search</button></div><div class="muted pad" id="cnt" style="padding-top:0"></div><pre id="res"></pre></div>`
    : ''
}
${cfg.answers ? `<div class="card"><h3>${cfg.answersTitle ?? 'Findings'}</h3><div class="form" id="af"></div></div>` : ''}
</div>`;
  const script = `${FIELDS_JS}
var RECS=${json(cfg.records)},RF=${json(cfg.recordFields)},AF=${json(cfg.answers ?? [])},LINES=${json(cfg.search?.lines ?? [])};
var S=window.vetterSaved||{records:{},answers:{},searches:[]};S.records=S.records||{};S.answers=S.answers||{};S.searches=S.searches||[];
var cur=null;
function save(){window.vetter.save(S);rows();}
function done(id){var r=S.records[id];return r&&RF.every(function(f){return f.type==='check'||(r[f.key]!=null&&r[f.key]!=='')});}
function rows(){document.getElementById('rows').innerHTML=RECS.map(function(r){return '<tr class="row'+(r.id===cur?' on':'')+'" data-id="'+r.id+'">'+r.cells.map(function(c){return '<td>'+esc(c)+'</td>'}).join('')+'<td class="'+(done(r.id)?'done':'')+'"></td></tr>'}).join('');
  Array.prototype.forEach.call(document.querySelectorAll('tr.row'),function(tr){tr.onclick=function(){open(tr.getAttribute('data-id'))}});}
function open(id){cur=id;var r=RECS.filter(function(x){return x.id===id})[0];document.getElementById('dt').textContent=r.cells[0]+(r.cells[1]?' · '+r.cells[1]:'');
  var d=document.getElementById('detail');d.textContent=r.detail;d.className='';S.records[id]=S.records[id]||{};fields(document.getElementById('rf'),RF,S.records[id],save);rows();}
if(AF.length) fields(document.getElementById('af'),AF,S.answers,save);
var q=document.getElementById('q');
if(q){var run=function(){var t=q.value.trim().toLowerCase();var hits=t?LINES.filter(function(l){return l.toLowerCase().indexOf(t)>=0}):LINES;
  document.getElementById('cnt').textContent=hits.length+' of '+LINES.length+' lines';document.getElementById('res').textContent=hits.join('\\n');
  if(t&&S.searches.indexOf(t)<0){S.searches.push(t);window.vetter.save(S);}};
  document.getElementById('go').onclick=run;q.addEventListener('keydown',function(e){if(e.key==='Enter')run()});run();}
rows();window.vetter.save(S);`;
  return page(cfg.title, cfg.subtitle, body, script);
}

// ---------- Terminal ----------
// run is the body of function run(cmd, args, world) returning the text to print; it may change world
export function terminalApp(cfg: {
  title: string;
  subtitle: string;
  promptLabel: string;
  intro: string;
  world: unknown;
  run: string;
  answers?: SimField[];
  answersTitle?: string;
}): string {
  const body = `<div class="wrap" style="grid-template-columns:minmax(0,1.5fr) minmax(0,1fr)">
<div class="term" id="t"><div id="out"></div><div><span class="in" id="pl"></span> <input id="cmd" autocomplete="off" spellcheck="false" aria-label="Command"></div></div>
<div class="card"><h3>${cfg.answersTitle ?? 'Your findings'}</h3><div class="form" id="af"></div><div class="pad muted">Type <b>help</b> in the terminal to see the commands.</div></div></div>`;
  const script = `${FIELDS_JS}
var START=${json(cfg.world)},AF=${json(cfg.answers ?? [])},PL=${json(cfg.promptLabel)};
var S=window.vetterSaved||{world:JSON.parse(JSON.stringify(START)),history:[],answers:{}};S.answers=S.answers||{};S.history=S.history||[];
function run(cmd,args,world){${cfg.run}}
var out=document.getElementById('out'),inp=document.getElementById('cmd');
function line(t,cls){var d=document.createElement('div');if(cls)d.className=cls;d.textContent=t;out.appendChild(d);}
function prompt(){document.getElementById('pl').textContent=typeof PL==='function'?PL(S.world):PL.replace('{branch}',S.world&&S.world.head||'');}
line(${json(cfg.intro)});
S.history.forEach(function(h){line(PL.replace('{branch}',h.b||'')+' '+h.c,'in');if(h.o)line(h.o);});
prompt();
inp.addEventListener('keydown',function(e){if(e.key!=='Enter')return;var c=inp.value.trim();inp.value='';if(!c)return;
  var b=S.world&&S.world.head||'';line(PL.replace('{branch}',b)+' '+c,'in');
  var parts=c.match(/"[^"]*"|'[^']*'|\\S+/g)||[];parts=parts.map(function(p){return p.replace(/^["']|["']$/g,'')});
  var o;try{o=c==='clear'?(out.innerHTML='',''):run(parts[0],parts.slice(1),S.world);}catch(err){o='error: '+err.message;}
  if(o)line(o);S.history.push({c:c,o:o||'',b:b});window.vetter.save(S);prompt();document.getElementById('t').scrollTop=1e9;});
document.getElementById('t').onclick=function(){inp.focus()};
if(AF.length)fields(document.getElementById('af'),AF,S.answers,function(){window.vetter.save(S)});
window.vetter.save(S);`;
  return page(cfg.title, cfg.subtitle, body, script);
}

// ---------- Lab ----------
// compute is the body of function compute(p) returning { kpis: [[label, value]], table?: { head: [], rows: [[]] }, results: {} }
export function labApp(cfg: {
  title: string;
  subtitle: string;
  brief: string;
  params: SimField[];
  defaults: Record<string, unknown>;
  compute: string;
  runLabel?: string;
  answers?: SimField[];
}): string {
  const body = `<div class="wrap" style="grid-template-columns:minmax(0,0.9fr) minmax(0,1.3fr)">
<div class="card"><h3>Settings</h3><pre class="muted" style="padding-bottom:0">${cfg.brief.replace(/</g, '&lt;')}</pre><div class="form" id="pf"></div><div class="pad"><button id="run">${cfg.runLabel ?? 'Run'}</button></div>${cfg.answers ? '<h3>Your answers</h3><div class="form" id="af"></div>' : ''}</div>
<div class="card"><h3>Results</h3><div id="k" class="kpi"></div><div id="tb"></div><div class="pad muted" id="hint">Change the settings and press Run.</div></div></div>`;
  const script = `${FIELDS_JS}
var PF=${json(cfg.params)},AF=${json(cfg.answers ?? [])},DEF=${json(cfg.defaults)};
var S=window.vetterSaved||{params:JSON.parse(JSON.stringify(DEF)),results:{},runs:0,answers:{}};S.answers=S.answers||{};
function compute(p){${cfg.compute}}
function show(r){document.getElementById('k').innerHTML=(r.kpis||[]).map(function(k){return '<div><span class="muted">'+esc(k[0])+'</span><b>'+esc(k[1])+'</b></div>'}).join('');
  document.getElementById('tb').innerHTML=r.table?'<table><thead><tr>'+r.table.head.map(function(h){return '<th style="top:0">'+esc(h)+'</th>'}).join('')+'</tr></thead><tbody>'+r.table.rows.map(function(row){return '<tr>'+row.map(function(c){return '<td>'+esc(c)+'</td>'}).join('')+'</tr>'}).join('')+'</tbody></table>':'';
  document.getElementById('hint').textContent=r.note||'';}
fields(document.getElementById('pf'),PF,S.params,function(){window.vetter.save(S)});
if(AF.length)fields(document.getElementById('af'),AF,S.answers,function(){window.vetter.save(S)});
document.getElementById('run').onclick=function(){var r=compute(S.params);S.results=r.results||{};S.runs=(S.runs||0)+1;show(r);window.vetter.save(S);};
if(S.runs)show(compute(S.params));
window.vetter.save(S);`;
  return page(cfg.title, cfg.subtitle, body, script);
}

// An app task: the simulation, its brief, and checks on the state it's left in ([description, path, expected])
export const simTask = (
  id: string,
  title: string,
  prompt: string,
  appName: string,
  appHtml: string,
  checks: [description: string, path: string, expected: string][],
  opts: { minutes?: number; weight?: number } = {}
): Question => ({
  id,
  title,
  type: 'app',
  prompt,
  contextData: appName,
  appHtml,
  starterCode: '',
  testCases: checks.map(([description, input, expectedOutput], i) => ({ id: `tc-${id}-${i + 1}`, description, input, expectedOutput })),
  timeLimitMinutes: opts.minutes ?? 15,
  weight: opts.weight ?? 40,
});
