/**
 * A Power BI Desktop-style workspace, hand-built for Corprax's Data Analyst tests: a modern copy of how Power BI Desktop
 * looks and works, under another name, with only what the tasks need. Two kinds of task:
 *
 * - query: the Power Query editor (a table's preview with column type icons, Data type, Filter rows, Remove blank rows,
 *   Trim, Capitalize Each Word, Replace values, the Applied steps list with delete), and the Model view (tables as cards,
 *   Manage relationships: from / to column, cardinality, cross-filter direction).
 * - report: Report view with the Data pane (tables, columns, measures), New measure and the formula bar, a small DAX
 *   engine (SUM, AVERAGE, MIN, MAX, COUNT, COUNTROWS, DISTINCTCOUNT, DIVIDE, CALCULATE with column filters, FILTER, ALL,
 *   SUMX, AVERAGEX, IF, ROUND, ABS, measure references), the Visualizations pane (bar, column, line, card, table) with
 *   its field wells, and the visual drawn on the canvas. Table view shows the data.
 *
 * State, as Corprax marks it:
 * query:  { query: { steps: [...], types: { col: type }, rows, distinct: { col: n }, values: { col: [..] }, sum: { col } },
 *           model: { rel: { 'A[x]>B[y]': 'Many to one, Single' } } }
 * report: { measures: { name: { expr, value, error, live, calc } }, visual: { type, axis, values: [], legend } }
 */

export interface BiTable {
  name: string;
  columns: string[];
  rows: Record<string, string | number | null>[];
}

export interface PowerBiConfig {
  product: string;
  file: string;
  kind: 'query' | 'report';
  // query: the table being shaped in Power Query, with its columns' starting types
  query?: BiTable & { types: Record<string, string> };
  // query: the tables in the model, for relationships (the shaped table is one of them)
  model?: { name: string; columns: string[] }[];
  // report: the model's main table, already loaded
  table?: BiTable;
  // report: measures already in the model
  measures?: { name: string; expr: string }[];
}

const json = (v: unknown) => JSON.stringify(v).replace(/</g, '\\u003c');

const CSS = String.raw`
:root{--ink:#252423;--ink-2:#605e5c;--muted:#8a8886;--line:#e1dfdd;--line-2:#edebe9;--bg:#f3f2f1;--panel:#fff;--brand:#f2c811;--accent:#117865;--blue:#0f6cbd;--blue-2:#ebf3fc;--red:#c50f1f;--r:4px}
*{box-sizing:border-box}html,body{height:100%}
body{margin:0;font:12px/1.45 'Segoe UI','Inter',system-ui,-apple-system,sans-serif;color:var(--ink);background:var(--bg);-webkit-font-smoothing:antialiased}
button,input,select,textarea{font:inherit;color:inherit}
button{cursor:pointer;border:0;background:none;padding:0}
button:disabled{opacity:.4;cursor:not-allowed}
:focus-visible{outline:2px solid var(--blue);outline-offset:1px}
::-webkit-scrollbar{width:10px;height:10px}::-webkit-scrollbar-thumb{background:#c8c6c4;border-radius:10px;border:3px solid transparent;background-clip:content-box}
.app{display:flex;flex-direction:column;height:100vh;min-height:540px}
.title{height:32px;background:#fff;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:10px;padding:0 10px}
.logo{width:18px;height:18px;border-radius:3px;background:var(--brand);display:flex;align-items:flex-end;justify-content:center;gap:1.5px;padding:3px 0}
.logo i{display:block;width:3px;background:#252423;border-radius:1px}
.title b{font-weight:600}.title span{color:var(--muted)}
.ribbon{background:#fff;border-bottom:1px solid var(--line);padding:6px 8px;display:flex;align-items:stretch;gap:2px;min-height:64px;overflow-x:auto}
.rg{display:flex;flex-direction:column;justify-content:space-between;padding:0 8px;border-right:1px solid var(--line-2)}
.rg:last-child{border-right:0}.rg .btns{display:flex;gap:2px;align-items:flex-start}
.rg small{display:block;text-align:center;color:var(--muted);font-size:10.5px;margin-top:2px}
.rb{display:flex;flex-direction:column;align-items:center;gap:2px;padding:4px 7px;border-radius:var(--r);min-width:52px;color:var(--ink)}
.rb:hover:not(:disabled){background:var(--bg)}.rb svg{width:20px;height:20px}
.rb.sm{flex-direction:row;min-width:0;gap:5px;padding:3px 7px}.rb.sm svg{width:15px;height:15px}
.rb .lb{font-size:11px;white-space:nowrap}
.rsel{display:flex;align-items:center;gap:6px;padding:3px 4px}.rsel select{height:24px;border:1px solid var(--line);border-radius:var(--r);background:#fff;padding:0 6px}
.body{flex:1;min-height:0;display:flex}
.rail{width:44px;background:#fff;border-right:1px solid var(--line);display:flex;flex-direction:column;align-items:center;padding-top:6px;gap:2px}
.rail button{width:36px;height:36px;border-radius:var(--r);display:grid;place-items:center;color:var(--ink-2);position:relative}
.rail button:hover:not(:disabled){background:var(--bg)}.rail button.on{color:var(--ink)}.rail button.on:before{content:'';position:absolute;left:-4px;top:8px;bottom:8px;width:3px;border-radius:2px;background:var(--brand)}
.rail svg{width:20px;height:20px}
svg.i{width:16px;height:16px;flex:none;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
th svg.i{width:13px;height:13px}
.main{flex:1;min-width:0;display:flex;flex-direction:column;min-height:0}
.fbar{display:flex;align-items:center;gap:6px;background:#fff;border-bottom:1px solid var(--line);padding:4px 8px}
.fbar .x,.fbar .ok{width:24px;height:24px;border-radius:var(--r);display:grid;place-items:center;color:var(--ink-2)}.fbar .x:hover,.fbar .ok:hover{background:var(--bg)}
.fbar input{flex:1;height:28px;border:1px solid var(--line);border-radius:var(--r);padding:0 8px;font-family:'Cascadia Mono',Consolas,'JetBrains Mono',monospace;font-size:12.5px}
.fbar input:focus{outline:none;border-color:var(--blue);box-shadow:0 0 0 2px rgba(15,108,189,.18)}
.ferr{padding:4px 10px 6px 40px;background:#fdf3f4;color:var(--red);border-bottom:1px solid #f1d1d4;font-size:12px}
.fok{padding:4px 10px 6px 40px;background:#f1faf6;color:var(--accent);border-bottom:1px solid #cfe8dd;font-size:12px}
.canvas{flex:1;min-height:0;overflow:auto;padding:22px;background:#eaeaea}
.page{background:#fff;width:100%;max-width:860px;min-height:420px;margin:0 auto;box-shadow:0 1px 3px rgba(0,0,0,.12);position:relative;padding:18px}
.vis{border:1px solid transparent;border-radius:2px;padding:10px;min-height:300px}.vis.sel{border-color:#c8c6c4}
.vis h4{margin:0 0 8px;font-size:14px;font-weight:600;color:var(--ink)}
.ph{display:grid;place-items:center;min-height:280px;color:var(--muted);text-align:center;border:1px dashed var(--line);border-radius:4px}
.tabs{height:30px;background:#fff;border-top:1px solid var(--line);display:flex;align-items:stretch;padding-left:8px}.tabs span{display:flex;align-items:center;padding:0 14px;border-bottom:3px solid var(--brand);font-weight:600}
.side{width:236px;flex:none;background:#fff;border-left:1px solid var(--line);display:flex;flex-direction:column;min-height:0}
.side h3{margin:0;padding:10px 12px 6px;font-size:13px;font-weight:600;display:flex;justify-content:space-between;align-items:center}
.sc{overflow:auto;flex:1;padding:0 8px 10px}
.vgrid{display:grid;grid-template-columns:repeat(5,1fr);gap:3px;padding:2px 4px 8px}
.vgrid button{height:34px;border-radius:var(--r);display:grid;place-items:center;color:var(--ink-2);border:1px solid transparent}
.vgrid button:hover{background:var(--bg)}.vgrid button.on{background:#fff7d1;border-color:#e6c200;color:var(--ink)}
.vgrid svg{width:20px;height:20px}
.well{margin:6px 4px 10px}.well label{display:block;font-size:11.5px;color:var(--ink-2);margin-bottom:3px}
.drop{min-height:30px;border:1px dashed #c8c6c4;border-radius:var(--r);padding:3px;display:flex;flex-direction:column;gap:3px}
.drop.over{border-color:var(--blue);background:var(--blue-2)}
.drop .empty{color:var(--muted);padding:4px 6px;font-size:11.5px}
.fpill{display:flex;align-items:center;justify-content:space-between;gap:4px;height:24px;padding:0 4px 0 8px;background:var(--bg);border-radius:3px}
.fpill button{width:18px;height:18px;border-radius:3px;display:grid;place-items:center;color:var(--ink-2)}.fpill button:hover{background:#e1dfdd}
.search{display:flex;align-items:center;gap:6px;height:28px;border:1px solid var(--line);border-radius:var(--r);padding:0 8px;margin:2px 4px 8px}.search input{border:0;outline:0;flex:1;min-width:0;background:transparent}
.tbl{margin:2px 0}.tbl>button{display:flex;align-items:center;gap:5px;width:100%;padding:4px 4px;border-radius:3px;font-weight:600}.tbl>button:hover{background:var(--bg)}
.fld{display:flex;align-items:center;gap:6px;padding:3px 4px 3px 22px;border-radius:3px;cursor:grab;user-select:none}
.fld:hover{background:var(--bg)}.fld input{margin:0;accent-color:var(--ink)}.fld svg{width:14px;height:14px;flex:none;color:var(--ink-2)}
.fld.m span{flex:1}.fld .ed{opacity:0;color:var(--ink-2);width:18px;height:18px;border-radius:3px;display:grid;place-items:center}.fld:hover .ed{opacity:1}.fld .ed:hover{background:#e1dfdd}
.grid{flex:1;min-height:0;overflow:auto;background:#fff}
table{border-collapse:collapse;font-variant-numeric:tabular-nums}
th{position:sticky;top:0;background:#faf9f8;border-bottom:1px solid var(--line);border-right:1px solid var(--line-2);padding:0;text-align:left;font-weight:600;white-space:nowrap;z-index:1}
th button{display:flex;align-items:center;gap:6px;padding:6px 10px;width:100%;text-align:left}th button:hover{background:#f3f2f1}th.on button{background:#e6f2ea;box-shadow:inset 0 -2px 0 var(--accent)}
th .ty{font-size:10px;font-weight:700;color:var(--ink-2);background:#fff;border:1px solid var(--line);border-radius:3px;padding:0 4px;font-family:Consolas,monospace}
td{border-bottom:1px solid var(--line-2);border-right:1px solid var(--line-2);padding:4px 10px;white-space:nowrap;max-width:220px;overflow:hidden;text-overflow:ellipsis}
td.n{text-align:right}td.err{color:var(--red);font-weight:600}td.null{color:var(--muted);font-style:italic}
tr.rn td:first-child{color:var(--muted);background:#faf9f8;text-align:right}
.steps{width:250px;flex:none;background:#fff;border-left:1px solid var(--line);display:flex;flex-direction:column}
.steps h3{margin:0;padding:10px 12px 4px;font-size:13px;font-weight:600}.steps .props{padding:0 12px 10px;border-bottom:1px solid var(--line-2);color:var(--ink-2)}
.steps ol{list-style:none;margin:0;padding:6px 6px;overflow:auto}
.steps li{display:flex;align-items:center;gap:6px;padding:4px 6px;border-radius:3px}.steps li:hover{background:var(--bg)}.steps li span{flex:1}
.steps li button{width:18px;height:18px;border-radius:3px;display:grid;place-items:center;color:var(--red);opacity:0}.steps li:hover button{opacity:1}
.qbar{display:flex;align-items:center;gap:8px;padding:6px 10px;background:#fff;border-bottom:1px solid var(--line);color:var(--ink-2)}
.qbar b{color:var(--ink)}
.menu{position:absolute;background:#fff;border:1px solid var(--line);border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,.16);padding:4px;z-index:40;min-width:200px}
.menu button{display:block;width:100%;text-align:left;padding:6px 10px;border-radius:4px}.menu button:hover{background:var(--bg)}
.menu .chk{max-height:220px;overflow:auto;padding:4px 6px}.menu .chk label{display:flex;gap:6px;align-items:center;padding:3px 2px}
.menu .ft{display:flex;justify-content:flex-end;gap:6px;padding:6px;border-top:1px solid var(--line-2);margin-top:4px}
.btn{height:28px;padding:0 12px;border-radius:var(--r);border:1px solid #8a8886;background:#fff}.btn:hover{background:var(--bg)}
.btn.pri{background:var(--blue);border-color:var(--blue);color:#fff}.btn.pri:hover{background:#0c5aa0}
.dlg-back{position:fixed;inset:0;background:rgba(0,0,0,.28);display:grid;place-items:center;z-index:50}
.dlg{background:#fff;border-radius:8px;box-shadow:0 20px 50px rgba(0,0,0,.25);width:min(620px,94vw);padding:18px 20px}
.dlg h2{margin:0 0 12px;font-size:16px;font-weight:600}
.dlg label{display:block;font-size:12px;color:var(--ink-2);margin:10px 0 4px}
.dlg select,.dlg input{width:100%;height:30px;border:1px solid #8a8886;border-radius:var(--r);padding:0 8px;background:#fff}
.dlg .row2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.dlg .ft{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}
.model{flex:1;min-height:0;overflow:auto;background:#f8f8f8;background-image:radial-gradient(#dcdcdc 1px,transparent 1px);background-size:16px 16px;position:relative}
.mt{position:absolute;width:190px;background:#fff;border:1px solid #c8c6c4;border-radius:6px;box-shadow:0 2px 6px rgba(0,0,0,.08)}
.mt h4{margin:0;padding:7px 10px;border-bottom:1px solid var(--line);font-size:12.5px;font-weight:600;background:#faf9f8;border-radius:6px 6px 0 0}
.mt div{padding:3px 10px;color:var(--ink-2)}
.rels{position:absolute;right:16px;top:14px;width:290px;background:#fff;border:1px solid var(--line);border-radius:6px;padding:10px 12px;box-shadow:0 2px 6px rgba(0,0,0,.06)}
.rels h4{margin:0 0 6px;font-size:12.5px}.rels li{margin:4px 0;color:var(--ink-2);display:flex;gap:6px;align-items:center}.rels ul{list-style:none;margin:0;padding:0}
.rels li button{margin-left:auto;color:var(--red)}
.card{display:grid;place-items:center;min-height:260px;text-align:center}.card b{font-size:44px;font-weight:600;letter-spacing:-.02em}.card span{color:var(--ink-2);font-size:13px}
.toast{position:fixed;left:50%;bottom:44px;transform:translateX(-50%);background:#252423;color:#fff;padding:8px 14px;border-radius:6px;z-index:60}
`;

const CLIENT = String.raw`
(function(){
var C=CFG;
var P={
 report:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 16v-4M11 16V8M15 16v-6M19 16v-2"/>',
 table:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16"/>',
 model:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><path d="M10 6.5h4a2 2 0 0 1 2 2V14"/>',
 query:'<path d="M4 5h16l-6 8v5l-4 2v-7z"/>',
 measure:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2M12 11h2M8 15h2M12 15h4"/>',
 bar:'<path d="M4 6h10M4 12h15M4 18h7"/>',
 column:'<path d="M6 20V10M12 20V4M18 20v-7"/>',
 line:'<path d="m3 17 6-6 4 4 8-8"/>',
 cardv:'<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M8 12h8"/>',
 tablev:'<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 9h18M3 14h18M10 4v16"/>',
 x:'<path d="M18 6 6 18M6 6l12 12"/>',
 ok:'<path d="M20 6 9 17l-5-5"/>',
 chev:'<path d="m9 6 6 6-6 6"/>',
 down:'<path d="m6 9 6 6 6-6"/>',
 sigma:'<path d="M18 5H6l6 7-6 7h12"/>',
 abc:'<path d="M4 17 7 7l3 10M5 14h4M13 7v10h3a2.5 2.5 0 0 0 0-5h-3 2.5a2.5 2.5 0 0 0 0-5H13"/>',
 cal:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
 filter:'<path d="M4 5h16l-6 8v5l-4 2v-7z"/>',
 type:'<path d="M4 7V5h16v2M9 19h6M12 5v14"/>',
 trim:'<path d="M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4"/>',
 caps:'<path d="M3 18 7 6l4 12M4.5 14h5M14 12a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM17 12v6"/>',
 replace:'<path d="M4 7h11l-3-3M20 17H9l3 3"/>',
 rows:'<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 10h18M3 15h18"/><path d="m15 12 4 4M19 12l-4 4"/>',
 rel:'<circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M8.5 8.5l7 7"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
 apply:'<path d="M5 12l4 4 10-10"/><path d="M3 20h18"/>'
};
function ic(n,c){return '<svg class="i'+(c?' '+c:'')+'" viewBox="0 0 24 24">'+P[n]+'</svg>';}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function fmt(v){if(v===null||v===undefined||v==='')return '';if(typeof v==='number'){var a=Math.abs(v);return a>=1000?v.toLocaleString('en-GB',{maximumFractionDigits:2}):String(Math.round(v*10000)/10000);}return String(v);}
// What's saved always carries the shaped table's summary and every measure's current value
function save(){if(C.kind==='query')qSummary();else refresh();window.praxa.save(S);}
function toast(m){var o=document.querySelector('.toast');if(o)o.remove();var d=document.createElement('div');d.className='toast';d.textContent=m;document.body.appendChild(d);setTimeout(function(){d.remove();},1800);}
var S=window.praxaSaved||{};var ui={view:C.kind==='query'?'query':'report',col:null,menu:null,dlg:null,formula:null,msg:null,q:'',open:{}};

// ================= Power Query =================
var TYPES=['Text','Whole number','Decimal number','Date','True/False'];
var TY={'Text':'ABC','Whole number':'123','Decimal number':'1.2','Date':'📅','True/False':'✓✗'};
function qInit(){if(!S.query)S.query={steps:[]};if(!S.model)S.model={rel:{}};}
function conv(v,t){if(v===null||v===undefined||v==='')return null;if(t==='Text')return String(v);if(t==='Whole number'||t==='Decimal number'){var s=String(v).trim();if(!/^-?\d+(\.\d+)?$/.test(s))return {err:true};var n=Number(s);return t==='Whole number'?Math.round(n):n;}if(t==='Date'){var s2=String(v).trim();return /^\d{4}-\d{2}-\d{2}$/.test(s2)?s2:{err:true};}if(t==='True/False'){var b=String(v).toLowerCase();return b==='true'?true:b==='false'?false:{err:true};}return v;}
function cap(s){return String(s).toLowerCase().replace(/(^|\s)(\S)/g,function(m,a,b){return a+b.toUpperCase();});}
function applySteps(){var q=C.query;var types={};q.columns.forEach(function(c){types[c]=q.types[c]||'Text';});
 var rows=q.rows.map(function(r){var o={};q.columns.forEach(function(c){o[c]=r[c]===undefined?null:r[c];});return o;});
 S.query.steps.forEach(function(st){
  if(st.op==='type'){types[st.col]=st.to;rows.forEach(function(r){r[st.col]=conv(r[st.col],st.to);});}
  else if(st.op==='filter'){rows=rows.filter(function(r){return st.keep.indexOf(r[st.col]===null?'(null)':(r[st.col]&&r[st.col].err?'Error':String(r[st.col])))>=0;});}
  else if(st.op==='blank'){rows=rows.filter(function(r){return q.columns.some(function(c){return r[c]!==null&&r[c]!=='';});});}
  else if(st.op==='trim'){rows.forEach(function(r){if(typeof r[st.col]==='string')r[st.col]=r[st.col].trim();});}
  else if(st.op==='cap'){rows.forEach(function(r){if(typeof r[st.col]==='string')r[st.col]=cap(r[st.col]);});}
  else if(st.op==='upper'){rows.forEach(function(r){if(typeof r[st.col]==='string')r[st.col]=r[st.col].toUpperCase();});}
  else if(st.op==='lower'){rows.forEach(function(r){if(typeof r[st.col]==='string')r[st.col]=r[st.col].toLowerCase();});}
  else if(st.op==='replace'){rows.forEach(function(r){if(r[st.col]!==null&&String(r[st.col])===st.find)r[st.col]=types[st.col]==='Text'?st.with:conv(st.with,types[st.col]);});}
  else if(st.op==='errors'){rows=rows.filter(function(r){return !q.columns.some(function(c){return r[c]&&r[c].err;});});}
 });
 return {rows:rows,types:types};}
function stepName(st){return st.op==='type'?'Changed Type ('+st.col+')':st.op==='filter'?'Filtered Rows ('+st.col+')':st.op==='blank'?'Removed Blank Rows':st.op==='trim'?'Trimmed Text ('+st.col+')':st.op==='cap'?'Capitalized Each Word ('+st.col+')':st.op==='upper'?'Uppercased Text ('+st.col+')':st.op==='lower'?'Lowercased Text ('+st.col+')':st.op==='replace'?'Replaced Value ('+st.col+')':st.op==='errors'?'Removed Errors':'Step';}
function qSummary(){var r=applySteps();var q=S.query;q.types=r.types;q.rows=r.rows.length;q.distinct={};q.values={};q.sum={};q.errors=0;
 C.query.columns.forEach(function(c){var vals={};r.rows.forEach(function(x){var v=x[c];if(v&&v.err){q.errors++;return;}vals[v===null?'(null)':String(v)]=1;});var ks=Object.keys(vals);q.distinct[c]=ks.length;if(ks.length<=12)q.values[c]=ks.sort();
  if(r.types[c]==='Decimal number'||r.types[c]==='Whole number'){var s=0,ok=true;r.rows.forEach(function(x){if(x[c]&&x[c].err)ok=false;else if(typeof x[c]==='number')s+=x[c];});if(ok)q.sum[c]=Math.round(s*100)/100;}});
 return r;}
function addStep(st){S.query.steps.push(st);ui.menu=null;save();render();}
function queryView(){var r=qSummary();var q=C.query;var cols=q.columns;
 var h='<div class="qbar">'+ic('query')+'<b>'+esc(q.name)+'</b><span>'+cols.length+' columns, '+r.rows.length+' rows</span>'+(S.query.errors?'<span style="color:var(--red)">· '+S.query.errors+' errors</span>':'')+'<span style="margin-left:auto">'+(ui.col?'Selected column: <b>'+esc(ui.col)+'</b>':'Click a column header to select it')+'</span></div>';
 h+='<div style="flex:1;min-height:0;display:flex"><div class="grid" data-ref="query-preview"><table><thead><tr><th style="width:36px"></th>';
 cols.forEach(function(c){h+='<th class="'+(ui.col===c?'on':'')+'"><button data-col="'+esc(c)+'"><span class="ty">'+TY[r.types[c]]+'</span>'+esc(c)+'<span style="margin-left:auto" data-colmenu="'+esc(c)+'" title="Filter '+esc(c)+'">'+ic('down')+'</span></button></th>';});
 h+='</tr></thead><tbody>';r.rows.slice(0,200).forEach(function(x,i){h+='<tr class="rn"><td>'+(i+1)+'</td>';cols.forEach(function(c){var v=x[c];var t=r.types[c];h+=v&&v.err?'<td class="err">Error</td>':v===null?'<td class="null">null</td>':'<td class="'+(t==='Text'?'':'n')+'">'+esc(fmt(v))+'</td>';});h+='</tr>';});
 h+='</tbody></table></div><aside class="steps" data-ref="applied-steps"><h3>Query settings</h3><div class="props">Name<br><b style="color:var(--ink)">'+esc(q.name)+'</b></div><h3>Applied steps</h3><ol><li><span>Source</span></li>';
 S.query.steps.forEach(function(st,i){h+='<li><span>'+esc(stepName(st))+'</span><button data-delstep="'+i+'" title="Delete step" aria-label="Delete step '+esc(stepName(st))+'">'+ic('x')+'</button></li>';});
 return h+'</ol></aside></div>';}
function filterMenu(c){var r=applySteps();var vals={};r.rows.forEach(function(x){var v=x[c];vals[v===null?'(null)':v&&v.err?'Error':String(v)]=1;});var ks=Object.keys(vals).sort();
 return '<div class="menu" style="left:'+ui.menu.x+'px;top:'+ui.menu.y+'px" data-ref="filter-menu"><div style="padding:4px 8px;font-weight:600">Filter '+esc(c)+'</div><div class="chk">'+ks.map(function(k){return '<label><input type="checkbox" data-fv="'+esc(k)+'" checked> '+esc(k)+'</label>';}).join('')+'</div><div class="ft"><button class="btn" data-menuclose>Cancel</button><button class="btn pri" data-applyfilter="'+esc(c)+'">OK</button></div></div>';}
function modelView(){var tabs=C.model||[];var h='<div class="model" data-ref="model-view">';tabs.forEach(function(t,i){h+='<div class="mt" style="left:'+(40+i*240)+'px;top:'+(60+(i%2)*40)+'px"><h4>'+esc(t.name)+'</h4>'+t.columns.map(function(c){return '<div>'+esc(c)+'</div>';}).join('')+'</div>';});
 var keys=Object.keys(S.model.rel);h+='<div class="rels"><h4>Relationships</h4>'+(keys.length?'<ul>'+keys.map(function(k){return '<li>'+ic('rel')+'<span>'+esc(k.replace('>',' → '))+'<br><small style="color:var(--muted)">'+esc(S.model.rel[k])+'</small></span><button data-delrel="'+esc(k)+'" aria-label="Delete relationship">'+ic('x')+'</button></li>';}).join('')+'</ul>':'<p style="color:var(--muted);margin:0">None yet. Use Manage relationships.</p>')+'<div style="margin-top:8px"><button class="btn" data-dlg="rel" data-ref="new-relationship">New relationship…</button></div></div>';
 return h+'</div>';}
function relDialog(){var tabs=C.model||[];var d=ui.dlg;function opts(list,v){return list.map(function(x){return '<option'+(x===v?' selected':'')+'>'+esc(x)+'</option>';}).join('');}
 var t1=tabs.filter(function(t){return t.name===d.t1;})[0]||tabs[0],t2=tabs.filter(function(t){return t.name===d.t2;})[0]||tabs[1]||tabs[0];
 return '<div class="dlg-back"><div class="dlg" role="dialog" aria-label="Create relationship"><h2>New relationship</h2><div class="row2"><div><label>From table</label><select data-d="t1">'+opts(tabs.map(function(t){return t.name;}),t1.name)+'</select><label>Column</label><select data-d="c1">'+opts(t1.columns,d.c1)+'</select></div><div><label>To table</label><select data-d="t2">'+opts(tabs.map(function(t){return t.name;}),t2.name)+'</select><label>Column</label><select data-d="c2">'+opts(t2.columns,d.c2)+'</select></div></div>'+
 '<div class="row2"><div><label>Cardinality</label><select data-d="card">'+opts(['Many to one (*:1)','One to one (1:1)','One to many (1:*)','Many to many (*:*)'],d.card)+'</select></div><div><label>Cross-filter direction</label><select data-d="dir">'+opts(['Single','Both'],d.dir)+'</select></div></div>'+
 '<div class="ft"><button class="btn" data-dlgclose>Cancel</button><button class="btn pri" data-saverel>Save</button></div></div></div>';}

// ================= DAX =================
var M={};
function mInit(){if(!S.measures){S.measures={};(C.measures||[]).forEach(function(m){S.measures[m.name]={expr:m.expr};});}if(!S.visual)S.visual={type:'',axis:'',values:[],legend:''};}
function tok(src){var t=[],i=0,m;var re=[[/^\s+/,null],[/^\d+(\.\d+)?/,'num'],[/^"([^"]*)"/,'str'],[/^'([^']+)'\[([^\]]+)\]/,'qcol'],[/^([A-Za-z_][A-Za-z0-9_]*)\[([^\]]+)\]/,'col'],[/^\[([^\]]+)\]/,'mref'],[/^(<=|>=|<>|&&|\|\||==)/,'op'],[/^[=<>+\-*\/(),&]/,'op'],[/^([A-Za-z_][A-Za-z0-9_.]*)/,'id']];
 while(i<src.length){var s=src.slice(i),hit=false;for(var k=0;k<re.length;k++){m=s.match(re[k][0]);if(m){hit=true;if(re[k][1]){var ty=re[k][1];if(ty==='qcol')t.push({t:'col',tb:m[1],c:m[2]});else if(ty==='col')t.push({t:'col',tb:m[1],c:m[2]});else if(ty==='mref')t.push({t:'mref',v:m[1]});else if(ty==='num')t.push({t:'num',v:Number(m[0])});else if(ty==='str')t.push({t:'str',v:m[1]});else if(ty==='id')t.push({t:'id',v:m[1]});else t.push({t:'op',v:m[0]});}i+=m[0].length;break;}}if(!hit)throw new Error('The syntax for \''+s[0]+'\' is incorrect.');}
 return t;}
function parse(src){var t=tok(src),p=0;function pk(){return t[p];}function eat(v){var x=t[p];if(!x||x.v!==v)throw new Error('The syntax is incorrect: expected '+v+(x?' near '+(x.v!==undefined?x.v:x.c):' at the end')+'.');p++;}
 var LV=[['||'],['&&'],['=','==','<>','<','>','<=','>='],['&'],['+','-'],['*','/']];
 function bin(l){if(l===LV.length)return un();var a=bin(l+1);while(pk()&&pk().t==='op'&&LV[l].indexOf(pk().v)>=0){var op=t[p++].v;a={k:'bin',op:op,a:a,b:bin(l+1)};}return a;}
 function un(){var x=pk();if(x&&x.t==='op'&&x.v==='-'){p++;return {k:'neg',a:un()};}return prim();}
 function prim(){var x=t[p++];if(!x)throw new Error('The expression is incomplete.');
  if(x.t==='num')return {k:'num',v:x.v};if(x.t==='str')return {k:'str',v:x.v};if(x.t==='col')return {k:'col',tb:x.tb,c:x.c};if(x.t==='mref')return {k:'mref',v:x.v};
  if(x.t==='op'&&x.v==='('){var e=bin(0);eat(')');return e;}
  if(x.t==='id'){var nm=x.v.toUpperCase();if(pk()&&pk().v==='('){p++;var args=[];if(!(pk()&&pk().v===')')){args.push(bin(0));while(pk()&&pk().v===','){p++;args.push(bin(0));}}eat(')');return {k:'fn',f:nm,args:args};}
   if(nm==='TRUE'||nm==='FALSE')return {k:'num',v:nm==='TRUE'?1:0};return {k:'tab',v:x.v};}
  throw new Error('The syntax for \''+(x.v||'')+'\' is incorrect.');}
 var e=bin(0);if(p<t.length)throw new Error('The syntax for \''+(t[p].v!==undefined?t[p].v:t[p].c)+'\' is incorrect.');return e;}
var TB=C.table;
function checkCol(n){if(n.tb!==TB.name)throw new Error('Cannot find table \''+n.tb+'\'.');if(TB.columns.indexOf(n.c)<0)throw new Error('Column \''+n.c+'\' in table \''+n.tb+'\' cannot be found or may not be used in this expression.');}
function rowsOf(ctx){return TB.rows.filter(function(r){for(var k in ctx.f){if(!ctx.f[k](r))return false;}return true;});}
function num(v){return v===null||v===undefined||v===''?null:typeof v==='number'?v:Number(v);}
function tableOf(n,ctx){if(n.k==='tab'){if(n.v!==TB.name)throw new Error('Cannot find table \''+n.v+'\'.');return rowsOf(ctx);}
 if(n.k==='fn'&&n.f==='ALL'){return TB.rows.slice();}
 if(n.k==='fn'&&n.f==='FILTER'){var base=tableOf(n.args[0],ctx);return base.filter(function(r){return truthy(ev(n.args[1],{f:ctx.f,row:r,stack:ctx.stack}));});}
 throw new Error('A table expression was expected.');}
function truthy(v){return v!==null&&v!==0&&v!==false&&v!=='';}
function colOf(n){if(n.k!=='col')throw new Error('The function expects a column reference as its argument.');checkCol(n);return n.c;}
function agg(f,n,ctx){var c=colOf(n);var vals=rowsOf(ctx).map(function(r){return r[c];}).filter(function(v){return v!==null&&v!=='';});
 if(f==='COUNT')return vals.length;if(f==='DISTINCTCOUNT'){var u={};vals.forEach(function(v){u[v]=1;});return Object.keys(u).length;}
 var ns=vals.map(num).filter(function(v){return !isNaN(v);});if(!ns.length)return null;
 if(f==='SUM')return ns.reduce(function(a,b){return a+b;},0);if(f==='AVERAGE')return ns.reduce(function(a,b){return a+b;},0)/ns.length;if(f==='MIN')return Math.min.apply(null,ns);if(f==='MAX')return Math.max.apply(null,ns);}
function ev(n,ctx){switch(n.k){
 case 'num':return n.v;case 'str':return n.v;case 'neg':var a=ev(n.a,ctx);return a===null?null:-a;
 case 'col':checkCol(n);if(!ctx.row)throw new Error('A single value for column \''+n.c+'\' in table \''+n.tb+'\' cannot be determined. Use an aggregation such as SUM.');return ctx.row[n.c];
 case 'mref':var m=S.measures[n.v];if(!m)throw new Error('The measure \''+n.v+'\' cannot be found.');if((ctx.stack||[]).indexOf(n.v)>=0)throw new Error('A circular dependency was detected: '+n.v+'.');
  return ev(parse(m.expr),{f:ctx.row?rowFilter(ctx):ctx.f,stack:(ctx.stack||[]).concat([n.v])});
 case 'tab':throw new Error('The expression refers to a table where a single value is needed.');
 case 'bin':var x=ev(n.a,ctx),y=ev(n.b,ctx);switch(n.op){
  case '+':return (num(x)||0)+(num(y)||0);case '-':return (num(x)||0)-(num(y)||0);case '*':return x===null||y===null?null:num(x)*num(y);
  case '/':if(y===0||y===null)throw new Error('Division by zero. Use DIVIDE to handle it.');return x===null?null:num(x)/num(y);
  case '&':return String(x==null?'':x)+String(y==null?'':y);
  case '=':case '==':return eq(x,y)?1:0;case '<>':return eq(x,y)?0:1;case '<':return num(x)<num(y)?1:0;case '>':return num(x)>num(y)?1:0;case '<=':return num(x)<=num(y)?1:0;case '>=':return num(x)>=num(y)?1:0;
  case '&&':return truthy(x)&&truthy(y)?1:0;case '||':return truthy(x)||truthy(y)?1:0;}
 case 'fn':return fn(n,ctx);}
 throw new Error('Unknown expression.');}
function eq(x,y){if(typeof x==='string'||typeof y==='string')return String(x).toLowerCase()===String(y).toLowerCase();return num(x)===num(y);}
function rowFilter(ctx){var f={};for(var k in ctx.f)f[k]=ctx.f[k];var r=ctx.row;TB.columns.forEach(function(c){f[c]=function(x){return x[c]===r[c];};});return f;}
function colsIn(n,out){if(!n)return out;if(n.k==='col')out.push(n.c);['a','b'].forEach(function(k){if(n[k])colsIn(n[k],out);});(n.args||[]).forEach(function(x){colsIn(x,out);});return out;}
function fn(n,ctx){var A=n.args,f=n.f;function need(k){if(A.length<k)throw new Error('Too few arguments were passed to the '+f+' function.');}
 if(['SUM','AVERAGE','MIN','MAX','COUNT','DISTINCTCOUNT'].indexOf(f)>=0){need(1);if(A.length>1)throw new Error('Too many arguments were passed to the '+f+' function.');return agg(f,A[0],ctx);}
 if(f==='COUNTROWS'){need(1);return tableOf(A[0],ctx).length;}
 if(f==='DIVIDE'){need(2);var a=ev(A[0],ctx),b=ev(A[1],ctx);if(!b)return A[2]?ev(A[2],ctx):null;return a===null?null:num(a)/num(b);}
 if(f==='IF'){need(2);return truthy(ev(A[0],ctx))?ev(A[1],ctx):A[2]?ev(A[2],ctx):null;}
 if(f==='ROUND'){need(2);var v=ev(A[0],ctx),d=ev(A[1],ctx);return v===null?null:Math.round(v*Math.pow(10,d))/Math.pow(10,d);}
 if(f==='ABS'){need(1);var w=ev(A[0],ctx);return w===null?null:Math.abs(w);}
 if(f==='BLANK')return null;
 if(f==='SUMX'||f==='AVERAGEX'){need(2);var rs=tableOf(A[0],ctx);var vs=rs.map(function(r){return num(ev(A[1],{f:ctx.f,row:r,stack:ctx.stack}));}).filter(function(v){return v!==null&&!isNaN(v);});if(!vs.length)return null;var s=vs.reduce(function(p,q){return p+q;},0);return f==='SUMX'?s:s/vs.length;}
 if(f==='CALCULATE'){need(1);var nf={};for(var k in ctx.f)nf[k]=ctx.f[k];
  A.slice(1).forEach(function(fa){
   if(fa.k==='fn'&&(fa.f==='ALL'||fa.f==='REMOVEFILTERS')){if(!fa.args.length||fa.args[0].k==='tab')nf={};else fa.args.forEach(function(c){delete nf[colOf(c)];});return;}
   if(fa.k==='fn'&&fa.f==='FILTER'){var keep=tableOf(fa,{f:nf,stack:ctx.stack});var set=keep;nf['__filter'+Math.random()]=function(r){return set.indexOf(r)>=0;};return;}
   var cs=colsIn(fa,[]);if(!cs.length)throw new Error('CALCULATE needs a filter on a column, such as '+TB.name+'[Column] = "value".');
   cs.forEach(function(c){delete nf[c];});nf[cs.join('|')]=function(r){return truthy(ev(fa,{f:{},row:r,stack:ctx.stack}));};});
  return ev(A[0],{f:nf,stack:ctx.stack});}
 if(f==='ALL'||f==='FILTER')throw new Error('The '+f+' function returns a table; use it inside CALCULATE, COUNTROWS or SUMX.');
 throw new Error('The function \''+f+'\' is not available in this test.');}
function evalMeasure(name,filters){var m=S.measures[name];return ev(parse(m.expr),{f:filters||{},stack:[name]});}
function usesFn(n,names){if(!n)return false;if(n.k==='fn'&&names.indexOf(n.f)>=0)return true;return ['a','b'].some(function(k){return n[k]&&usesFn(n[k],names);})||(n.args||[]).some(function(x){return usesFn(x,names);});}
function live(n){if(!n)return false;if(n.k==='col'||n.k==='mref'||n.k==='tab')return true;return ['a','b'].some(function(k){return n[k]&&live(n[k]);})||(n.args||[]).some(live);}
function refresh(){Object.keys(S.measures).forEach(function(k){var m=S.measures[k];try{var ast=parse(m.expr);var v=ev(ast,{f:{},stack:[k]});m.value=v===null?null:typeof v==='number'?Math.round(v*1e6)/1e6:v;m.error='';m.live=live(ast);m.calc=usesFn(ast,['CALCULATE','FILTER']);}catch(e){m.value=null;m.error=e.message;m.live=false;m.calc=false;}});}
function commitFormula(){var src=(ui.formula||'').trim();var m=src.match(/^([^=]+?)\s*=\s*([\s\S]+)$/);if(!m){ui.msg={err:'Write the measure as Name = expression, for example Total Sales = SUM('+TB.name+'['+TB.columns[TB.columns.length-1]+'])'};render();return;}
 var name=m[1].trim().replace(/^\[|\]$/g,''),expr=m[2].trim();if(TB.columns.indexOf(name)>=0){ui.msg={err:'The name \''+name+'\' is already used by a column.'};render();return;}
 var old=ui.editing;if(old&&old!==name&&S.measures[old]){delete S.measures[old];S.visual.values=S.visual.values.map(function(v){return v===old?name:v;});}
 S.measures[name]={expr:expr};refresh();ui.editing=name;var mm=S.measures[name];ui.msg=mm.error?{err:mm.error}:{ok:'Measure \''+name+'\' saved. Total: '+fmt(mm.value)};save();render();}

// ================= Report =================
var VTYPES=[['Clustered bar chart','bar'],['Clustered column chart','column'],['Line chart','line'],['Card','cardv'],['Table','tablev']];
function isNum(c){return TB.rows.every(function(r){return r[c]===null||typeof r[c]==='number';});}
function addField(f){var v=S.visual;if(S.measures[f]||isNum(f)){if(v.values.indexOf(f)<0)v.values.push(f);}else{if(!v.axis)v.axis=f;else if(!v.legend&&v.type!=='Card')v.legend=f;}if(!v.type)v.type=S.measures[f]||isNum(f)?(v.axis?'Clustered bar chart':'Card'):'Table';save();render();}
function valueOf(f,filters){if(S.measures[f]){try{return evalMeasure(f,filters);}catch(e){return null;}}var rs=rowsOf({f:filters});return rs.reduce(function(a,r){return a+(num(r[f])||0);},0);}
function visual(){var v=S.visual;if(!v.type||(!v.axis&&!v.values.length))return '<div class="ph"><div>'+ic('report')+'<p>Build a visual: pick a type in Visualizations,<br>then tick fields in the Data pane or drag them into the wells.</p></div></div>';
 var title=(v.values.join(', ')||'Count')+(v.axis?' by '+v.axis:'');var h='<h4>'+esc(title)+'</h4>';
 if(v.type==='Card'){var val=v.values[0]?valueOf(v.values[0],{}):null;return h+'<div class="card"><div><b>'+esc(fmt(val))+'</b><br><span>'+esc(v.values[0]||'')+'</span></div></div>';}
 var cats=[];if(v.axis){var u={};TB.rows.forEach(function(r){u[r[v.axis]]=1;});cats=Object.keys(u);}
 var series=v.values.length?v.values:[];
 if(v.type==='Table'){var cols=(v.axis?[v.axis]:[]).concat(series);var rows=v.axis?cats.map(function(c){var f={};f[v.axis]=function(r){return String(r[v.axis])===c;};return [c].concat(series.map(function(s){return valueOf(s,f);}));}):[series.map(function(s){return valueOf(s,{});})];
  return h+'<table style="width:100%"><thead><tr>'+cols.map(function(c){return '<th style="padding:6px 10px">'+esc(c)+'</th>';}).join('')+'</tr></thead><tbody>'+rows.map(function(r){return '<tr>'+r.map(function(x){return '<td class="'+(typeof x==='number'?'n':'')+'">'+esc(fmt(x))+'</td>';}).join('')+'</tr>';}).join('')+'</tbody></table>';}
 if(!v.axis||!series.length)return h+'<div class="ph">Add '+(v.axis?'a value':'an axis')+' to draw the chart.</div>';
 var data=cats.map(function(c){var f={};f[v.axis]=function(r){return String(r[v.axis])===c;};return {c:c,v:valueOf(series[0],f)||0};});
 data.sort(function(a,b){return b.v-a.v;});var max=Math.max.apply(null,data.map(function(d){return Math.abs(d.v);}))||1;
 var W=760,H=290,col=['#118dff','#12239e','#e66c37','#6b007b','#e044a7'];
 if(v.type==='Clustered bar chart'){var bh=Math.min(34,(H-20)/data.length-6);var s='<svg viewBox="0 0 '+W+' '+H+'" width="100%" role="img" aria-label="'+esc(title)+'">';data.forEach(function(d,i){var y=10+i*(bh+6),w=(W-260)*Math.abs(d.v)/max;s+='<text x="130" y="'+(y+bh/2+4)+'" text-anchor="end" font-size="12" fill="#605e5c">'+esc(d.c)+'</text><rect x="140" y="'+y+'" width="'+w+'" height="'+bh+'" fill="'+col[0]+'" rx="1"/><text x="'+(146+w)+'" y="'+(y+bh/2+4)+'" font-size="12" fill="#252423">'+esc(fmt(d.v))+'</text>';});return h+s+'</svg>';}
 var bw=Math.min(60,(W-80)/data.length-12);var s2='<svg viewBox="0 0 '+W+' '+H+'" width="100%" role="img" aria-label="'+esc(title)+'"><line x1="40" y1="'+(H-30)+'" x2="'+W+'" y2="'+(H-30)+'" stroke="#e1dfdd"/>';
 if(v.type==='Line chart'){var pts=data.map(function(d,i){return [60+i*((W-100)/Math.max(1,data.length-1)),H-30-(H-60)*d.v/max];});s2+='<polyline fill="none" stroke="'+col[0]+'" stroke-width="2.5" points="'+pts.map(function(p){return p.join(',');}).join(' ')+'"/>';pts.forEach(function(p,i){s2+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="4" fill="'+col[0]+'"/><text x="'+p[0]+'" y="'+(H-12)+'" text-anchor="middle" font-size="12" fill="#605e5c">'+esc(data[i].c)+'</text>';});return h+s2+'</svg>';}
 data.forEach(function(d,i){var x=60+i*(bw+12),hh=(H-70)*Math.abs(d.v)/max;s2+='<rect x="'+x+'" y="'+(H-30-hh)+'" width="'+bw+'" height="'+hh+'" fill="'+col[0]+'"/><text x="'+(x+bw/2)+'" y="'+(H-36-hh)+'" text-anchor="middle" font-size="11.5">'+esc(fmt(d.v))+'</text><text x="'+(x+bw/2)+'" y="'+(H-12)+'" text-anchor="middle" font-size="12" fill="#605e5c">'+esc(d.c)+'</text>';});return h+s2+'</svg>';}
function well(key,label){var v=S.visual;var items=key==='values'?v.values:v[key]?[v[key]]:[];return '<div class="well"><label>'+label+'</label><div class="drop" data-drop="'+key+'" data-ref="well-'+key+'">'+(items.length?items.map(function(f){return '<div class="fpill"><span>'+esc(f)+'</span><button data-unwell="'+key+'" data-f="'+esc(f)+'" aria-label="Remove '+esc(f)+'">'+ic('x')+'</button></div>';}).join(''):'<div class="empty">Add data fields here</div>')+'</div></div>';}
function vizPane(){var v=S.visual;var axisLabel=v.type==='Clustered bar chart'?'Y-axis':v.type==='Table'?'Columns':'X-axis';var valLabel=v.type==='Clustered bar chart'?'X-axis':v.type==='Card'?'Fields':'Y-axis';
 var h='<aside class="side" data-ref="visualizations"><h3>Visualizations</h3><div class="vgrid">'+VTYPES.map(function(t){return '<button class="'+(v.type===t[0]?'on':'')+'" data-vtype="'+t[0]+'" title="'+t[0]+'" aria-label="'+t[0]+'">'+ic(t[1])+'</button>';}).join('')+'</div>';
 if(v.type==='Card')h+=well('values','Fields');else{h+=well('axis',axisLabel)+well('values',valLabel);if(v.type!=='Table'&&v.type!=='Card')h+=well('legend','Legend');}
 return h+'</aside>';}
function dataPane(){var q=ui.q.toLowerCase();var used={};var v=S.visual;used[v.axis]=1;used[v.legend]=1;v.values.forEach(function(x){used[x]=1;});
 var fields=TB.columns.filter(function(c){return !q||c.toLowerCase().indexOf(q)>=0;});var ms=Object.keys(S.measures).filter(function(m){return !q||m.toLowerCase().indexOf(q)>=0;});
 var h='<aside class="side" data-ref="data-pane"><h3>Data</h3><div class="search">'+ic('search')+'<input id="dq" placeholder="Search" value="'+esc(ui.q)+'"></div><div class="sc"><div class="tbl"><button data-tbl>'+ic(ui.open.closed?'chev':'down')+'<span>'+esc(TB.name)+'</span></button>';
 if(!ui.open.closed){ms.forEach(function(m){var err=S.measures[m].error;h+='<div class="fld m" draggable="true" data-drag="'+esc(m)+'"><input type="checkbox" '+(used[m]?'checked':'')+' data-tick="'+esc(m)+'" aria-label="'+esc(m)+'">'+ic('measure')+'<span'+(err?' style="color:var(--red)" title="'+esc(err)+'"':'')+'>'+esc(m)+'</span><button class="ed" data-editm="'+esc(m)+'" title="Edit measure" aria-label="Edit '+esc(m)+'">'+ic('type')+'</button></div>';});
  fields.forEach(function(c){h+='<div class="fld" draggable="true" data-drag="'+esc(c)+'"><input type="checkbox" '+(used[c]?'checked':'')+' data-tick="'+esc(c)+'" aria-label="'+esc(c)+'">'+(isNum(c)?ic('sigma'):'<span style="width:14px"></span>')+'<span>'+esc(c)+'</span></div>';});}
 return h+'</div></div></aside>';}
function fbar(){if(ui.formula===null)return '';return '<div class="fbar" data-ref="formula-bar"><button class="x" data-fcancel title="Cancel" aria-label="Cancel">'+ic('x')+'</button><button class="ok" data-fcommit title="Commit" aria-label="Commit">'+ic('ok')+'</button><input id="fx" spellcheck="false" autocomplete="off" value="'+esc(ui.formula)+'" aria-label="Formula"></div>'+(ui.msg?ui.msg.err?'<div class="ferr">'+esc(ui.msg.err)+'</div>':'<div class="fok">'+esc(ui.msg.ok)+'</div>':'');}
function tableView(){var h='<div class="grid"><table><thead><tr>'+TB.columns.map(function(c){return '<th><button>'+(isNum(c)?'<span class="ty">1.2</span>':'<span class="ty">ABC</span>')+esc(c)+'</button></th>';}).join('')+'</tr></thead><tbody>';TB.rows.forEach(function(r){h+='<tr>'+TB.columns.map(function(c){return '<td class="'+(typeof r[c]==='number'?'n':'')+'">'+esc(fmt(r[c]))+'</td>';}).join('')+'</tr>';});return h+'</tbody></table></div>';}

// ================= Shell =================
function ribbon(){if(ui.view==='query'){var dis=ui.col?'':'disabled';var ty=ui.col?S.query.types&&S.query.types[ui.col]:'';
  return '<div class="ribbon" data-ref="ribbon"><div class="rg"><div class="btns"><button class="rb" data-act="apply" title="Close & Apply">'+ic('apply')+'<span class="lb">Close &amp;<br>Apply</span></button></div><small>Close</small></div>'+
  '<div class="rg"><div class="btns"><button class="rb" data-act="blank">'+ic('rows')+'<span class="lb">Remove<br>blank rows</span></button><button class="rb" data-act="errors">'+ic('rows')+'<span class="lb">Remove<br>errors</span></button></div><small>Reduce rows</small></div>'+
  '<div class="rg"><div class="btns" style="flex-direction:column;gap:0"><label class="rsel">'+ic('type')+'Data type <select id="dtype" '+dis+' data-ref="data-type"><option value="">'+(ui.col?'':'Select a column')+'</option>'+TYPES.map(function(t){return '<option'+(t===ty?' selected':'')+'>'+t+'</option>';}).join('')+'</select></label><button class="rb sm" data-act="replace" '+dis+'>'+ic('replace')+'<span class="lb">Replace values</span></button></div><small>Any column</small></div>'+
  '<div class="rg"><div class="btns"><button class="rb" data-act="format" '+dis+' data-ref="format">'+ic('caps')+'<span class="lb">Format '+'▾</span></button><button class="rb" data-act="filtercol" '+dis+'>'+ic('filter')+'<span class="lb">Filter<br>rows</span></button></div><small>Text column</small></div></div>';}
 if(ui.view==='model')return '<div class="ribbon"><div class="rg"><div class="btns"><button class="rb" data-dlg="rel" data-ref="manage-relationships">'+ic('rel')+'<span class="lb">Manage<br>relationships</span></button></div><small>Relationships</small></div></div>';
 return '<div class="ribbon" data-ref="ribbon"><div class="rg"><div class="btns"><button class="rb" data-act="newm" data-ref="new-measure">'+ic('measure')+'<span class="lb">New<br>measure</span></button></div><small>Calculations</small></div><div class="rg"><div class="btns"><button class="rb" data-act="clearvis">'+ic('report')+'<span class="lb">Clear<br>visual</span></button></div><small>Visual</small></div></div>';}
function rail(){var items=C.kind==='query'?[['query','query','Power Query'],['model','model','Model view']]:[['report','report','Report view'],['table','table','Table view']];
 return '<nav class="rail" aria-label="Views">'+items.map(function(it){return '<button class="'+(ui.view===it[0]?'on':'')+'" data-view="'+it[0]+'" title="'+it[2]+'" aria-label="'+it[2]+'">'+ic(it[1])+'</button>';}).join('')+'</nav>';}
function render(){var app=document.getElementById('app');var f=document.activeElement&&document.activeElement.id;var pos=f&&document.activeElement.selectionStart;
 var main;if(ui.view==='query')main='<div class="main">'+queryView()+'</div>';else if(ui.view==='model')main='<div class="main">'+modelView()+'</div>';else if(ui.view==='table')main='<div class="main">'+fbar()+tableView()+'</div>'+dataPane();
 else main='<div class="main">'+fbar()+'<div class="canvas"><div class="page"><div class="vis sel" data-ref="visual">'+visual()+'</div></div></div><div class="tabs"><span>Page 1</span></div></div>'+vizPane()+dataPane();
 app.innerHTML='<div class="app"><div class="title"><div class="logo" aria-hidden="true"><i style="height:6px"></i><i style="height:10px"></i><i style="height:14px"></i></div><b>'+esc(C.file)+'</b><span>· '+esc(C.product)+(ui.view==='query'?' · Power Query Editor':'')+'</span></div>'+ribbon()+'<div class="body">'+rail()+main+'</div></div>'+(ui.menu&&ui.menu.kind==='filter'?filterMenu(ui.menu.col):ui.menu&&ui.menu.kind==='format'?formatMenu():'')+(ui.dlg?ui.dlg.kind==='rel'?relDialog():replaceDialog():'');
 if(f){var el=document.getElementById(f);if(el){el.focus();if(pos!=null&&el.setSelectionRange)el.setSelectionRange(pos,pos);}}}
function formatMenu(){return '<div class="menu" style="left:'+ui.menu.x+'px;top:'+ui.menu.y+'px">'+[['trim','Trim'],['cap','Capitalize Each Word'],['upper','UPPERCASE'],['lower','lowercase']].map(function(o){return '<button data-fmt="'+o[0]+'">'+o[1]+'</button>';}).join('')+'</div>';}
function replaceDialog(){return '<div class="dlg-back"><div class="dlg" role="dialog" aria-label="Replace values"><h2>Replace values</h2><p style="margin:0;color:var(--ink-2)">Replace one value with another in the selected column ('+esc(ui.col)+').</p><label>Value to find</label><input id="rf" value="'+esc(ui.dlg.find||'')+'"><label>Replace with</label><input id="rw" value="'+esc(ui.dlg.with||'')+'"><div class="ft"><button class="btn" data-dlgclose>Cancel</button><button class="btn pri" data-doreplace>OK</button></div></div></div>';}

document.addEventListener('click',function(e){var b=e.target.closest('button,[data-colmenu]');if(!b||b.disabled)return;var d=b.dataset;
 if(d.colmenu){e.stopPropagation();ui.col=d.colmenu;var r=b.getBoundingClientRect();ui.menu={kind:'filter',col:d.colmenu,x:Math.min(r.left,window.innerWidth-230),y:r.bottom+4};render();return;}
 if(d.view){ui.view=d.view;ui.menu=null;render();return;}
 if(d.col){ui.col=d.col;ui.menu=null;render();return;}
 if(d.menuclose!==undefined){ui.menu=null;render();return;}
 if(d.applyfilter){var keep=[].slice.call(document.querySelectorAll('[data-fv]')).filter(function(x){return x.checked;}).map(function(x){return x.dataset.fv;});addStep({op:'filter',col:d.applyfilter,keep:keep});return;}
 if(d.delstep){S.query.steps.splice(+d.delstep,1);save();render();return;}
 if(d.act==='blank'){addStep({op:'blank'});return;}
 if(d.act==='errors'){addStep({op:'errors'});return;}
 if(d.act==='format'){var r2=b.getBoundingClientRect();ui.menu={kind:'format',x:r2.left,y:r2.bottom+2};render();return;}
 if(d.fmt){addStep({op:d.fmt,col:ui.col});return;}
 if(d.act==='filtercol'){var r3=b.getBoundingClientRect();ui.menu={kind:'filter',col:ui.col,x:r3.left,y:r3.bottom+2};render();return;}
 if(d.act==='replace'){ui.dlg={kind:'replace'};render();return;}
 if(d.doreplace!==undefined){var fi=document.getElementById('rf').value,wi=document.getElementById('rw').value;ui.dlg=null;addStep({op:'replace',col:ui.col,find:fi,with:wi});return;}
 if(d.act==='apply'){toast('Changes applied to the model');return;}
 if(d.dlg==='rel'){var t=C.model;ui.dlg={kind:'rel',t1:t[0].name,c1:t[0].columns[0],t2:t[1].name,c2:t[1].columns[0],card:'Many to one (*:1)',dir:'Single'};render();return;}
 if(d.dlgclose!==undefined){ui.dlg=null;render();return;}
 if(d.saverel!==undefined){var g=ui.dlg;var card=g.card.split(' (')[0];var a=g.t1+'['+g.c1+']',z=g.t2+'['+g.c2+']';
  if(card==='One to many'){var tmp=a;a=z;z=tmp;card='Many to one';}
  if(g.t1===g.t2){toast('Pick two different tables');return;}
  S.model.rel[a+'>'+z]=card+', '+g.dir;ui.dlg=null;save();render();toast('Relationship created');return;}
 if(d.delrel){delete S.model.rel[d.delrel];save();render();return;}
 if(d.act==='newm'){ui.formula='Measure = ';ui.editing=null;ui.msg=null;render();var fx=document.getElementById('fx');if(fx){fx.focus();fx.setSelectionRange(fx.value.length,fx.value.length);}return;}
 if(d.editm){ui.formula=d.editm+' = '+S.measures[d.editm].expr;ui.editing=d.editm;ui.msg=S.measures[d.editm].error?{err:S.measures[d.editm].error}:null;render();return;}
 if(d.fcommit!==undefined){commitFormula();return;}
 if(d.fcancel!==undefined){ui.formula=null;ui.msg=null;render();return;}
 if(d.act==='clearvis'){S.visual={type:'',axis:'',values:[],legend:''};save();render();return;}
 if(d.vtype){S.visual.type=d.vtype;if(d.vtype==='Card')S.visual.axis='';save();render();return;}
 if(d.unwell){var v=S.visual;if(d.unwell==='values')v.values=v.values.filter(function(x){return x!==d.f;});else v[d.unwell]='';save();render();return;}
 if(d.tbl!==undefined){ui.open.closed=!ui.open.closed;render();return;}
 if(ui.menu){ui.menu=null;render();}
});
document.addEventListener('change',function(e){var t=e.target;if(t.id==='dtype'&&t.value&&ui.col){addStep({op:'type',col:ui.col,to:t.value});return;}
 if(t.dataset.tick){var f=t.dataset.tick,v=S.visual;if(t.checked)addField(f);else{v.values=v.values.filter(function(x){return x!==f;});if(v.axis===f)v.axis='';if(v.legend===f)v.legend='';save();render();}return;}
 if(t.dataset.d){ui.dlg[t.dataset.d]=t.value;if(t.dataset.d==='t1'){var tt=C.model.filter(function(x){return x.name===t.value;})[0];ui.dlg.c1=tt.columns[0];}if(t.dataset.d==='t2'){var t2=C.model.filter(function(x){return x.name===t.value;})[0];ui.dlg.c2=t2.columns[0];}render();}});
document.addEventListener('input',function(e){if(e.target.id==='fx')ui.formula=e.target.value;if(e.target.id==='dq'){ui.q=e.target.value;render();}if(e.target.id==='rf')ui.dlg.find=e.target.value;if(e.target.id==='rw')ui.dlg.with=e.target.value;});
document.addEventListener('keydown',function(e){if(e.target.id==='fx'&&e.key==='Enter'){e.preventDefault();commitFormula();}if(e.key==='Escape'){if(ui.menu||ui.dlg){ui.menu=null;ui.dlg=null;render();}}});
document.addEventListener('dragstart',function(e){var f=e.target.closest&&e.target.closest('[data-drag]');if(f){e.dataTransfer.setData('text/plain',f.dataset.drag);}});
document.addEventListener('dragover',function(e){var z=e.target.closest&&e.target.closest('[data-drop]');if(z){e.preventDefault();z.classList.add('over');}});
document.addEventListener('dragleave',function(e){var z=e.target.closest&&e.target.closest('[data-drop]');if(z)z.classList.remove('over');});
document.addEventListener('drop',function(e){var z=e.target.closest&&e.target.closest('[data-drop]');if(!z)return;e.preventDefault();var f=e.dataTransfer.getData('text/plain');var v=S.visual,k=z.dataset.drop;if(!v.type)v.type='Clustered bar chart';if(k==='values'){if(v.values.indexOf(f)<0)v.values.push(f);}else v[k]=f;save();render();});
if(C.kind==='query'){qInit();qSummary();}else{mInit();refresh();}
render();save();
})();`;

export function powerBiApp(cfg: PowerBiConfig): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${cfg.product}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${CSS}</style></head><body><div id="app"></div><script>var CFG=${json(cfg)};${CLIENT}</script></body></html>`;
}
