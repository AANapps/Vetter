import { BiTable } from './powerbiApp';

/**
 * A Tableau Desktop-style worksheet, hand-built for Praxa's Data Analyst tests: a modern copy of how Tableau looks and
 * works, under another name, with only what the tasks need. The Data pane (dimensions in blue, measures in green, and
 * calculated fields), the Columns and Rows shelves, the Filters card (filter dialog with a value list), the Marks card
 * (mark type, Color, Label), pill menus (aggregation, Quick Table Calculation: Running Total, Percent of Total, Rank;
 * Remove), sort ascending / descending, and Create Calculated Field with a small Tableau formula engine (SUM, AVG, MIN,
 * MAX, COUNT, COUNTD, MEDIAN, ZN, ROUND, ABS, IIF, ISNULL, UPPER, LOWER, YEAR, IF/THEN/ELSEIF/ELSE/END, AND/OR/NOT,
 * { FIXED [dim]: aggregate } and references to other calculated fields). The view is drawn from the shelves.
 *
 * State, as Praxa marks it: { shelves: { columns: [pill], rows: [pill], filters: { field: [kept values] }, color, label,
 * mark, sort }, tableCalc: { pill: name }, calcs: { name: { formula, kind, type, value, counts, max, min, error } },
 * view: { order: [category], values: { category: value }, top } }. Pills read as Tableau shows them: Region,
 * SUM(Sales), AGG(Profit Ratio).
 */

export interface TableauConfig {
  product: string;
  workbook: string;
  table: BiTable;
  // Which columns are dimensions; the rest are measures
  dimensions: string[];
}

const json = (v: unknown) => JSON.stringify(v).replace(/</g, '\\u003c');

const CSS = String.raw`
:root{--ink:#2b2b2b;--ink-2:#5f6368;--muted:#8a8f98;--line:#d4d7dc;--line-2:#e8eaed;--bg:#f5f6f7;--panel:#fff;--dim:#4e79a7;--dim-bg:#dfe9f5;--mea:#59a14f;--mea-bg:#e1f0dd;--blue:#1f77b4;--orange:#e8762b;--red:#c62828;--r:4px}
*{box-sizing:border-box}html,body{height:100%}
body{margin:0;font:12px/1.45 'Inter',system-ui,-apple-system,'Segoe UI',sans-serif;color:var(--ink);background:var(--bg);-webkit-font-smoothing:antialiased}
button,input,select,textarea{font:inherit;color:inherit}button{cursor:pointer;border:0;background:none;padding:0}button:disabled{opacity:.4;cursor:not-allowed}
:focus-visible{outline:2px solid var(--blue);outline-offset:1px}
::-webkit-scrollbar{width:10px;height:10px}::-webkit-scrollbar-thumb{background:#c9ccd1;border-radius:10px;border:3px solid transparent;background-clip:content-box}
svg.i{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;flex:none}
.app{display:flex;flex-direction:column;height:100vh;min-height:540px}
.menubar{height:28px;background:#fff;border-bottom:1px solid var(--line-2);display:flex;align-items:center;gap:2px;padding:0 6px}
.menubar .logo{width:18px;height:18px;margin-right:6px;display:grid;place-items:center}
.menubar>button{padding:3px 8px;border-radius:3px}.menubar>button:hover{background:var(--bg)}
.menubar .file{margin-left:auto;color:var(--muted)}
.tool{height:36px;background:#fafbfc;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:2px;padding:0 8px}
.tool button{height:28px;min-width:28px;padding:0 7px;border-radius:3px;display:inline-flex;align-items:center;gap:5px;color:var(--ink-2)}.tool button:hover:not(:disabled){background:#e9ecef;color:var(--ink)}
.tool .sep{width:1px;height:20px;background:var(--line);margin:0 6px}
.body{flex:1;min-height:0;display:grid;grid-template-columns:230px 170px minmax(0,1fr)}
.data{background:#fff;border-right:1px solid var(--line);display:flex;flex-direction:column;min-height:0}
.data h3,.cardh{margin:0;padding:8px 10px;font-size:12px;font-weight:600;color:var(--ink);display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line-2)}
.src{padding:6px 10px;border-bottom:1px solid var(--line-2);display:flex;align-items:center;gap:6px;color:var(--ink-2)}
.fl{overflow:auto;flex:1;padding:4px 0 10px}
.sect{padding:8px 10px 3px;font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.05em}
.f{display:flex;align-items:center;gap:6px;padding:3px 10px;cursor:grab;user-select:none;position:relative}
.f:hover{background:#f1f3f5}.f .t{font-size:10px;font-weight:700;width:14px;text-align:center}
.f.d .t{color:var(--dim)}.f.m .t{color:var(--mea)}.f span.n{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.f .add{opacity:0;width:20px;height:20px;border-radius:3px;display:grid;place-items:center;color:var(--ink-2)}.f:hover .add,.f .add:focus{opacity:1}.f .add:hover{background:#e2e6ea}
.f.c span.n:after{content:' =';color:var(--muted);font-size:10px}
.cards{background:#fafbfc;border-right:1px solid var(--line);overflow:auto;padding:8px}
.card{background:#fff;border:1px solid var(--line);border-radius:4px;margin-bottom:10px}
.card .cardh{font-size:11.5px;padding:6px 8px}
.card .cb{padding:6px;display:flex;flex-direction:column;gap:4px;min-height:34px}
.card .cb.over,.shelf .drop.over{background:#eef5fc;outline:1px dashed var(--blue)}
.mk{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:6px}
.mk .tgt{height:44px;border:1px solid var(--line-2);border-radius:4px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;color:var(--ink-2);font-size:11px}
.mk .tgt.over{background:#eef5fc;border-color:var(--blue)}
.mk select{grid-column:1/-1;height:28px;border:1px solid var(--line);border-radius:4px;background:#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%235f6368' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E") no-repeat right 8px center;padding:0 26px 0 8px;appearance:none;-webkit-appearance:none;cursor:pointer}.mk select:hover{border-color:#b9bec5}.mk select:focus{outline:none;border-color:var(--blue);box-shadow:0 0 0 2px rgba(31,119,180,.15)}
.right{display:flex;flex-direction:column;min-width:0;min-height:0;background:#fff}
.shelf{display:flex;align-items:center;border-bottom:1px solid var(--line-2);min-height:34px}
.shelf label{width:78px;flex:none;padding:0 10px;color:var(--ink-2);display:flex;gap:5px;align-items:center}
.shelf .drop{flex:1;display:flex;flex-wrap:wrap;gap:4px;padding:4px;min-height:32px;align-items:center}
.pill{display:inline-flex;align-items:center;gap:4px;height:22px;padding:0 4px 0 9px;border-radius:11px;font-weight:600;font-size:11.5px;color:#fff;white-space:nowrap;cursor:pointer}
.pill.d{background:var(--dim)}.pill.m{background:var(--mea)}.pill .tc{font-size:10px;opacity:.9;margin-left:2px}
.pill .caret{width:16px;height:16px;display:grid;place-items:center;border-radius:8px}.pill:hover .caret{background:rgba(255,255,255,.2)}
.pill.flt{background:#fff;color:var(--ink);border:1px solid var(--line)}
.hint{color:var(--muted);padding:0 4px}
.view{flex:1;min-height:0;overflow:auto;padding:16px 22px}
.view h2{margin:0 0 10px;font-size:15px;font-weight:600}
.empty{display:grid;place-items:center;height:100%;color:var(--muted);text-align:center;border:1px dashed var(--line);border-radius:6px;min-height:280px}
.sheets{height:28px;border-top:1px solid var(--line);background:#fafbfc;display:flex;align-items:stretch}
.sheets span{display:flex;align-items:center;padding:0 14px;background:#fff;border-right:1px solid var(--line);font-weight:600;border-top:2px solid var(--orange)}
table.vt{border-collapse:collapse}.vt td{padding:4px 12px;border-bottom:1px solid var(--line-2)}.vt td.n{text-align:right;font-variant-numeric:tabular-nums}
.menu{position:fixed;background:#fff;border:1px solid var(--line);border-radius:5px;box-shadow:0 8px 24px rgba(0,0,0,.16);padding:4px;z-index:40;min-width:200px}
.menu button{display:flex;align-items:center;justify-content:space-between;width:100%;text-align:left;padding:6px 10px;border-radius:3px}.menu button:hover{background:#f1f3f5}.menu button.on{font-weight:600}.menu .sep{height:1px;background:var(--line-2);margin:4px 0}
.menu .lbl{padding:4px 10px;font-size:11px;color:var(--muted);font-weight:600}
.dlg-back{position:fixed;inset:0;background:rgba(0,0,0,.25);display:grid;place-items:center;z-index:50}
.dlg{background:#fff;border-radius:6px;box-shadow:0 20px 50px rgba(0,0,0,.25);width:min(560px,94vw);display:flex;flex-direction:column;max-height:90vh}
.dlg h2{margin:0;padding:12px 16px;font-size:14px;font-weight:600;border-bottom:1px solid var(--line-2)}
.dlg .db{padding:12px 16px;overflow:auto}
.dlg input.name{width:100%;height:30px;border:1px solid var(--line);border-radius:3px;padding:0 8px;margin-bottom:8px}
.dlg textarea{width:100%;min-height:130px;border:1px solid var(--line);border-radius:3px;padding:8px;font-family:'JetBrains Mono',Consolas,monospace;font-size:12.5px;resize:vertical}
.dlg input:focus,.dlg textarea:focus{outline:none;border-color:var(--blue);box-shadow:0 0 0 2px rgba(31,119,180,.15)}
.valid{margin-top:6px;font-size:12px}.valid.ok{color:var(--mea)}.valid.bad{color:var(--red)}
.dlg .ft{display:flex;justify-content:flex-end;gap:8px;padding:10px 16px;border-top:1px solid var(--line-2)}
.btn{height:28px;padding:0 14px;border-radius:3px;border:1px solid var(--line);background:#fff}.btn:hover{background:var(--bg)}.btn.pri{background:var(--blue);border-color:var(--blue);color:#fff}.btn.pri:hover{background:#196aa1}
.chk{max-height:260px;overflow:auto}.chk label{display:flex;gap:8px;align-items:center;padding:3px 0}
.chk input{accent-color:var(--blue)}
.toast{position:fixed;left:50%;bottom:40px;transform:translateX(-50%);background:#2b2b2b;color:#fff;padding:8px 14px;border-radius:6px;z-index:60}
`;

const CLIENT = String.raw`
(function(){
var C=CFG,TB=C.table;
var P={logo:'<path d="M12 3v6M9 6h6M12 15v6M9 18h6M5 9v6M2 12h6M19 9v6M16 12h6"/>',undo:'<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
 asc:'<path d="M4 18h4M4 13h8M4 8h12M18 6v12M15 15l3 3 3-3"/>',desc:'<path d="M4 6h12M4 11h8M4 16h4M18 6v12M15 9l3-3 3 3"/>',swap:'<path d="M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4"/>',
 db:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',down:'<path d="m6 9 6 6 6-6"/>',cols:'<path d="M4 4v16M10 4v16M16 4v16"/>',rows:'<path d="M4 4h16M4 10h16M4 16h16"/>',
 filter:'<path d="M4 5h16l-6 8v5l-4 2v-7z"/>',color:'<circle cx="8" cy="9" r="3"/><circle cx="16" cy="9" r="3"/><circle cx="12" cy="16" r="3"/>',label:'<path d="M4 7h16M4 12h10M4 17h13"/>',calc:'<path d="M4 6h16M12 3v18"/>',clear:'<path d="M18 6 6 18M6 6l12 12"/>'};
function ic(n){return '<svg class="i" viewBox="0 0 24 24">'+P[n]+'</svg>';}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function fmt(v,pct){if(v===null||v===undefined||v==='')return 'Null';if(typeof v!=='number')return String(v);if(pct)return (v*100).toFixed(1)+'%';var a=Math.abs(v);return a>=100?Math.round(v).toLocaleString('en-GB'):a>=1?v.toFixed(2):v.toFixed(4);}
function toast(m){var o=document.querySelector('.toast');if(o)o.remove();var d=document.createElement('div');d.className='toast';d.textContent=m;document.body.appendChild(d);setTimeout(function(){d.remove();},1800);}
var S=window.praxaSaved||{};S.shelves=S.shelves||{columns:[],rows:[],filters:{},color:'',label:'',mark:'Automatic',sort:''};S.tableCalc=S.tableCalc||{};S.calcs=S.calcs||{};
var ui={menu:null,dlg:null};
function save(){refreshCalcs();computeView();window.praxa.save(S);}

// ================= Formula engine =================
function tok(src){var t=[],i=0;var re=[[/^\s+/,0],[/^\/\/[^\n]*/,0],[/^\d+(\.\d+)?/,'num'],[/^'([^']*)'/,'str'],[/^"([^"]*)"/,'str'],[/^\[([^\]]+)\]/,'fld'],[/^(<=|>=|<>|!=|==)/,'op'],[/^[=<>+\-*\/(),{}:]/,'op'],[/^[A-Za-z_][A-Za-z0-9_]*/,'id']];
 while(i<src.length){var s=src.slice(i),hit=false;for(var k=0;k<re.length;k++){var m=s.match(re[k][0]);if(m){hit=true;var ty=re[k][1];if(ty==='num')t.push({t:'num',v:Number(m[0])});else if(ty==='str')t.push({t:'str',v:m[1]});else if(ty==='fld')t.push({t:'fld',v:m[1]});else if(ty==='op')t.push({t:'op',v:m[0]});else if(ty==='id')t.push({t:'id',v:m[0].toUpperCase(),raw:m[0]});i+=m[0].length;break;}}if(!hit)throw new Error('Unexpected character \''+s[0]+'\'.');}
 return t;}
var AGG=['SUM','AVG','MIN','MAX','COUNT','COUNTD','MEDIAN','ATTR'];var FN=AGG.concat(['ZN','ROUND','ABS','IIF','ISNULL','UPPER','LOWER','YEAR','LEFT']);
function parse(src){var t=tok(src),p=0;function pk(){return t[p];}function isK(v){return pk()&&pk().t==='id'&&pk().v===v;}function isO(v){return pk()&&pk().t==='op'&&pk().v===v;}
 function need(v,kw){if(kw?isK(v):isO(v)){p++;return;}throw new Error('Expected '+v+(pk()?' before \''+(pk().raw||pk().v)+'\'':' at the end')+'.');}
 function or(){var a=and();while(isK('OR')){p++;a={k:'bin',op:'OR',a:a,b:and()};}return a;}
 function and(){var a=not();while(isK('AND')){p++;a={k:'bin',op:'AND',a:a,b:not()};}return a;}
 function not(){if(isK('NOT')){p++;return {k:'not',a:not()};}return cmp();}
 function cmp(){var a=add();var x=pk();if(x&&x.t==='op'&&['=','==','<>','!=','<','>','<=','>='].indexOf(x.v)>=0){p++;a={k:'bin',op:x.v,a:a,b:add()};}return a;}
 function add(){var a=mul();while(isO('+')||isO('-')){var op=t[p++].v;a={k:'bin',op:op,a:a,b:mul()};}return a;}
 function mul(){var a=un();while(isO('*')||isO('/')){var op=t[p++].v;a={k:'bin',op:op,a:a,b:un()};}return a;}
 function un(){if(isO('-')){p++;return {k:'neg',a:un()};}return prim();}
 function prim(){var x=t[p++];if(!x)throw new Error('The calculation is incomplete.');
  if(x.t==='num')return {k:'num',v:x.v};if(x.t==='str')return {k:'str',v:x.v};if(x.t==='fld')return {k:'fld',v:x.v};
  if(x.t==='op'&&x.v==='('){var e=or();need(')');return e;}
  if(x.t==='op'&&x.v==='{'){if(!(isK('FIXED')||isK('INCLUDE')||isK('EXCLUDE')))throw new Error('Expected FIXED, INCLUDE or EXCLUDE after {.');var lk=t[p++].v;if(lk!=='FIXED')throw new Error(lk+' isn\'t available in this test; use FIXED.');var dims=[];
   while(pk()&&pk().t==='fld'){dims.push(t[p++].v);if(isO(','))p++;}need(':');var inner=or();need('}');return {k:'lod',dims:dims,a:inner};}
  if(x.t==='id'&&x.v==='IF'){var br=[];var c=or();need('THEN',1);br.push([c,or()]);var el=null;while(isK('ELSEIF')){p++;var c2=or();need('THEN',1);br.push([c2,or()]);}if(isK('ELSE')){p++;el=or();}need('END',1);return {k:'if',br:br,el:el};}
  if(x.t==='id'&&(x.v==='TRUE'||x.v==='FALSE'))return {k:'num',v:x.v==='TRUE'?1:0};
  if(x.t==='id'){if(FN.indexOf(x.v)<0)throw new Error('Unknown function \''+x.raw+'\'.');need('(');var args=[];if(!isO(')')){args.push(or());while(isO(',')){p++;args.push(or());}}need(')');return {k:'fn',f:x.v,args:args};}
  throw new Error('Unexpected \''+(x.raw||x.v)+'\'.');}
 var e=or();if(p<t.length)throw new Error('Unexpected \''+(t[p].raw||t[p].v)+'\'.');return e;}
var AST={};
function resolve(name,stack){if(TB.columns.indexOf(name)>=0)return null;var c=S.calcs[name];if(!c)throw new Error('The field \''+name+'\' doesn\'t exist.');if(stack.indexOf(name)>=0)throw new Error('The calculation refers to itself.');return parse(c.formula);}
function kind(n,stack){stack=stack||[];switch(n.k){case 'num':case 'str':return 'const';case 'lod':return 'row';
 case 'fld':var r=resolve(n.v,stack);return r?kind(r,stack.concat([n.v])):'row';
 case 'fn':if(AGG.indexOf(n.f)>=0){n.args.forEach(function(a){if(kind(a,stack)==='agg')throw new Error('Argument to '+n.f+' is already an aggregation, and cannot be further aggregated.');});return 'agg';}return mix(n.args.map(function(a){return kind(a,stack);}));
 case 'neg':case 'not':return kind(n.a,stack);
 case 'bin':return mix([kind(n.a,stack),kind(n.b,stack)]);
 case 'if':var ks=[];n.br.forEach(function(b){ks.push(kind(b[0],stack),kind(b[1],stack));});if(n.el)ks.push(kind(n.el,stack));return mix(ks);}
 return 'const';}
function mix(ks){var a=ks.indexOf('agg')>=0,r=ks.indexOf('row')>=0;if(a&&r)throw new Error('Cannot mix aggregate and non-aggregate arguments with this function.');return a?'agg':r?'row':'const';}
function nv(v){return v===null||v===undefined||v===''?null:typeof v==='number'?v:isNaN(Number(v))?v:Number(v);}
function truthy(v){return v!==null&&v!==0&&v!==false&&v!=='';}
function lodMap(n,stack){var key=JSON.stringify(n);if(!lodCache[key]){var groups={};TB.rows.forEach(function(r){var k=n.dims.map(function(d){return r[d];}).join('\u0001');(groups[k]=groups[k]||[]).push(r);});var out={};for(var k in groups)out[k]=evA(n.a,groups[k],stack);lodCache[key]=out;}return lodCache[key];}
var lodCache={};
function evR(n,row,stack){stack=stack||[];switch(n.k){case 'num':return n.v;case 'str':return n.v;
 case 'fld':var r=resolve(n.v,stack);return r?evR(r,row,stack.concat([n.v])):nv(row[n.v]);
 case 'lod':n.dims.forEach(function(d){if(TB.columns.indexOf(d)<0)throw new Error('The field \''+d+'\' doesn\'t exist.');});return lodMap(n,stack)[n.dims.map(function(d){return row[d];}).join('\u0001')];
 case 'neg':var a=evR(n.a,row,stack);return a===null?null:-a;case 'not':return truthy(evR(n.a,row,stack))?0:1;
 case 'bin':return bin(n.op,evR(n.a,row,stack),evR(n.b,row,stack));
 case 'if':for(var i=0;i<n.br.length;i++)if(truthy(evR(n.br[i][0],row,stack)))return evR(n.br[i][1],row,stack);return n.el?evR(n.el,row,stack):null;
 case 'fn':return scalar(n.f,n.args.map(function(a){return evR(a,row,stack);}));}}
function evA(n,rows,stack){stack=stack||[];switch(n.k){case 'num':return n.v;case 'str':return n.v;
 case 'fld':var r=resolve(n.v,stack);if(r)return evA(r,rows,stack.concat([n.v]));throw new Error('Cannot mix aggregate and non-aggregate arguments with this function.');
 case 'fn':if(AGG.indexOf(n.f)>=0){var vals=rows.map(function(x){return evR(n.args[0],x,stack);}).filter(function(v){return v!==null&&v!==undefined;});return aggr(n.f,vals);}return scalar(n.f,n.args.map(function(a){return evA(a,rows,stack);}));
 case 'neg':var a=evA(n.a,rows,stack);return a===null?null:-a;case 'not':return truthy(evA(n.a,rows,stack))?0:1;
 case 'bin':return bin(n.op,evA(n.a,rows,stack),evA(n.b,rows,stack));
 case 'if':for(var i=0;i<n.br.length;i++)if(truthy(evA(n.br[i][0],rows,stack)))return evA(n.br[i][1],rows,stack);return n.el?evA(n.el,rows,stack):null;}
 throw new Error('Cannot mix aggregate and non-aggregate arguments with this function.');}
function aggr(f,vals){if(f==='COUNT')return vals.length;if(f==='COUNTD'){var u={};vals.forEach(function(v){u[v]=1;});return Object.keys(u).length;}if(f==='ATTR'){var u2={};vals.forEach(function(v){u2[v]=1;});var k=Object.keys(u2);return k.length===1?vals[0]:'*';}
 var ns=vals.map(Number).filter(function(v){return !isNaN(v);});if(!ns.length)return null;var s=ns.reduce(function(a,b){return a+b;},0);
 if(f==='SUM')return s;if(f==='AVG')return s/ns.length;if(f==='MIN')return Math.min.apply(null,ns);if(f==='MAX')return Math.max.apply(null,ns);if(f==='MEDIAN'){ns.sort(function(a,b){return a-b;});var m=ns.length>>1;return ns.length%2?ns[m]:(ns[m-1]+ns[m])/2;}}
function bin(op,x,y){switch(op){case '+':if(typeof x==='string'||typeof y==='string')return String(x==null?'':x)+String(y==null?'':y);return x===null||y===null?null:x+y;case '-':return x===null||y===null?null:x-y;case '*':return x===null||y===null?null:x*y;
 case '/':return x===null||y===null||y===0?null:x/y;case '=':case '==':return eq(x,y)?1:0;case '<>':case '!=':return eq(x,y)?0:1;case '<':return x<y?1:0;case '>':return x>y?1:0;case '<=':return x<=y?1:0;case '>=':return x>=y?1:0;
 case 'AND':return truthy(x)&&truthy(y)?1:0;case 'OR':return truthy(x)||truthy(y)?1:0;}}
function eq(x,y){if(typeof x==='string'||typeof y==='string')return String(x)===String(y);return x===y;}
function scalar(f,a){switch(f){case 'ZN':return a[0]===null?0:a[0];case 'ROUND':return a[0]===null?null:Math.round(a[0]*Math.pow(10,a[1]||0))/Math.pow(10,a[1]||0);case 'ABS':return a[0]===null?null:Math.abs(a[0]);
 case 'IIF':return truthy(a[0])?a[1]:a[2]===undefined?null:a[2];case 'ISNULL':return a[0]===null?1:0;case 'UPPER':return a[0]===null?null:String(a[0]).toUpperCase();case 'LOWER':return a[0]===null?null:String(a[0]).toLowerCase();
 case 'YEAR':return a[0]===null?null:Number(String(a[0]).slice(0,4));case 'LEFT':return a[0]===null?null:String(a[0]).slice(0,a[1]);}return null;}
function refreshCalcs(){lodCache={};Object.keys(S.calcs).forEach(function(name){var c=S.calcs[name];try{var ast=parse(c.formula);var k=kind(ast,[name]);c.kind=k==='agg'?'aggregate':'row';c.error='';c.counts=null;c.max=null;c.min=null;
  if(k==='agg'){var v=evA(ast,TB.rows,[name]);c.value=typeof v==='number'?Math.round(v*1e6)/1e6:v;c.type=typeof v==='string'?'string':'number';}
  else{var vals=TB.rows.map(function(r){return evR(ast,r,[name]);});var isStr=vals.some(function(v){return typeof v==='string';});c.type=isStr?'string':'number';
   if(isStr){var cn={};vals.forEach(function(v){var key=v===null?'Null':String(v);cn[key]=(cn[key]||0)+1;});c.counts=cn;c.value=null;}
   else{var ns=vals.filter(function(v){return typeof v==='number';});c.value=Math.round(ns.reduce(function(a,b){return a+b;},0)*1e6)/1e6;c.max=ns.length?Math.round(Math.max.apply(null,ns)*1e6)/1e6:null;c.min=ns.length?Math.round(Math.min.apply(null,ns)*1e6)/1e6:null;}}
 }catch(e){c.error=e.message;c.kind='';c.value=null;}});}

// ================= Fields and pills =================
function isDim(f){if(C.dimensions.indexOf(f)>=0)return true;var c=S.calcs[f];return !!(c&&!c.error&&c.kind==='row'&&c.type==='string');}
function fields(){var dims=C.dimensions.slice(),meas=TB.columns.filter(function(c){return C.dimensions.indexOf(c)<0;});Object.keys(S.calcs).forEach(function(n){if(isDim(n))dims.push(n);else meas.push(n);});return {dims:dims,meas:meas};}
function pillFor(f){if(isDim(f))return f;var c=S.calcs[f];if(c&&c.kind==='aggregate')return 'AGG('+f+')';return 'SUM('+f+')';}
function pillField(p){var m=p.match(/^(SUM|AVG|MIN|MAX|COUNT|COUNTD|MEDIAN|AGG)\((.+)\)$/);return m?{agg:m[1],f:m[2]}:{agg:null,f:p};}
function isMeasurePill(p){return !!pillField(p).agg;}
function addTo(shelf,f){var sh=S.shelves;var p=pillFor(f);
 if(shelf==='filters'){if(!isDim(f)){toast('In this test, filter on a dimension');return;}ui.dlg={kind:'filter',f:f,keep:sh.filters[f]||null};render();return;}
 if(shelf==='color'||shelf==='label'){sh[shelf]=p;save();render();return;}
 ['columns','rows'].forEach(function(s){sh[s]=sh[s].filter(function(x){return x!==p;});});sh[shelf].push(p);save();render();}
function measureValue(p,rows){var pf=pillField(p);if(!pf.agg)return null;if(pf.agg==='AGG'){var c=S.calcs[pf.f];if(!c||c.error)return null;return evA(parse(c.formula),rows,[pf.f]);}
 var col=TB.columns.indexOf(pf.f)>=0;var vals=rows.map(function(r){return col?nv(r[pf.f]):evR(parse(S.calcs[pf.f].formula),r,[pf.f]);}).filter(function(v){return v!==null&&v!==undefined;});return aggr(pf.agg,vals);}
function filtered(){var fl=S.shelves.filters;return TB.rows.filter(function(r){for(var f in fl){var v=TB.columns.indexOf(f)>=0?r[f]:evR(parse(S.calcs[f].formula),r,[f]);if(fl[f].indexOf(v===null?'Null':String(v))<0)return false;}return true;});}
function dimValue(f,r){return TB.columns.indexOf(f)>=0?r[f]:evR(parse(S.calcs[f].formula),r,[f]);}
function computeView(){var sh=S.shelves;var all=sh.columns.concat(sh.rows);var dim=all.filter(function(p){return !isMeasurePill(p);})[0];var mea=all.filter(isMeasurePill)[0];
 var v={order:[],values:{},top:null,dim:dim||null,measure:mea||null};
 try{var rows=filtered();
  if(dim&&mea){var g={};rows.forEach(function(r){var k=String(dimValue(dim,r));(g[k]=g[k]||[]).push(r);});var cats=Object.keys(g);var vals={};cats.forEach(function(k){vals[k]=measureValue(mea,g[k]);});
   var tc=S.tableCalc[mea];
   cats.sort(function(a,b){return sh.sort==='asc'?vals[a]-vals[b]:sh.sort==='desc'?vals[b]-vals[a]:a<b?-1:1;});
   if(tc==='Percent of Total'){var tot=cats.reduce(function(s,k){return s+(vals[k]||0);},0);cats.forEach(function(k){vals[k]=tot?vals[k]/tot:null;});}
   else if(tc==='Running Total'){var run=0;cats.forEach(function(k){run+=vals[k]||0;vals[k]=run;});}
   else if(tc==='Rank'){var byv=cats.slice().sort(function(a,b){return vals[b]-vals[a];});var rk={};byv.forEach(function(k,i){rk[k]=i+1;});cats.forEach(function(k){vals[k]=rk[k];});}
   cats.forEach(function(k){v.values[k]=typeof vals[k]==='number'?Math.round(vals[k]*1e6)/1e6:vals[k];});v.order=cats;
   var best=null;cats.forEach(function(k){if(best===null||vals[k]>vals[best])best=k;});v.top=best;}
  else if(mea){v.values.All=measureValue(mea,rows);}
 }catch(e){v.error=e.message;}
 S.view=v;return v;}

// ================= Rendering =================
function pill(p,where){var m=isMeasurePill(p);var tc=S.tableCalc[p];return '<span class="pill '+(m?'m':'d')+'" data-pill="'+esc(p)+'" data-where="'+where+'" tabindex="0" role="button" aria-label="'+esc(p)+' menu">'+esc(p)+(tc?'<span class="tc" title="Table calculation: '+esc(tc)+'">△</span>':'')+'<span class="caret">'+ic('down')+'</span></span>';}
function dataPane(){var fs=fields();function row(f,d){var calc=!!S.calcs[f];var err=calc&&S.calcs[f].error;return '<div class="f '+(d?'d':'m')+(calc?' c':'')+'" draggable="true" data-drag="'+esc(f)+'"'+(err?' title="'+esc(err)+'"':'')+'><span class="t">'+(d?'Abc':'#')+'</span><span class="n"'+(err?' style="color:var(--red)"':'')+'>'+esc(f)+'</span>'+(calc?'<button class="add" data-editcalc="'+esc(f)+'" title="Edit calculation" aria-label="Edit '+esc(f)+'">'+ic('calc')+'</button>':'')+'<button class="add" data-addmenu="'+esc(f)+'" title="Add to the view" aria-label="Add '+esc(f)+' to the view">'+ic('plus')+'</button></div>';}
 return '<aside class="data" data-ref="data-pane"><h3>Data</h3><div class="src">'+ic('db')+esc(TB.name)+'</div><div class="fl"><div class="sect" style="color:var(--dim)">Dimensions</div>'+fs.dims.map(function(f){return row(f,true);}).join('')+'<div class="sect" style="color:var(--mea)">Measures</div>'+fs.meas.map(function(f){return row(f,false);}).join('')+'</div></aside>';}
function cards(){var sh=S.shelves;var fl=Object.keys(sh.filters);
 return '<div class="cards"><div class="card"><div class="cardh">Filters</div><div class="cb" data-drop="filters" data-ref="filters-card">'+(fl.length?fl.map(function(f){return '<span class="pill flt" data-filterpill="'+esc(f)+'" role="button" tabindex="0">'+esc(f)+' ('+sh.filters[f].length+')<span class="caret">'+ic('down')+'</span></span>';}).join(''):'<span class="hint">Drop a dimension</span>')+'</div></div>'+
 '<div class="card" data-ref="marks-card"><div class="cardh">Marks</div><div class="mk"><select id="mark" aria-label="Mark type">'+['Automatic','Bar','Line','Circle','Text'].map(function(m){return '<option'+(sh.mark===m?' selected':'')+'>'+m+'</option>';}).join('')+'</select>'+
 '<div class="tgt" data-drop="color">'+ic('color')+'Color</div><div class="tgt" data-drop="label">'+ic('label')+'Label</div></div><div class="cb">'+(sh.color?'<div>'+ic('color')+' '+pill(sh.color,'color')+'</div>':'')+(sh.label?'<div>'+ic('label')+' '+pill(sh.label,'label')+'</div>':'')+'</div></div></div>';}
function shelves(){var sh=S.shelves;function one(k,label,icon){return '<div class="shelf"><label>'+ic(icon)+label+'</label><div class="drop" data-drop="'+k+'" data-ref="shelf-'+k+'">'+(sh[k].length?sh[k].map(function(p){return pill(p,k);}).join(''):'<span class="hint">Drop field here</span>')+'</div></div>';}
 return one('columns','Columns','cols')+one('rows','Rows','rows');}
function chart(){var v=S.view||computeView();var sh=S.shelves;if(v.error)return '<div class="empty" style="color:var(--red)">'+esc(v.error)+'</div>';
 if(!v.dim&&!v.measure)return '<div class="empty"><div>'+ic('cols')+'<p>Drag fields to Columns and Rows to build a view.</p></div></div>';
 var pct=S.tableCalc[v.measure]==='Percent of Total';
 if(!v.dim)return '<div style="font-size:30px;font-weight:600;padding:20px">'+esc(fmt(v.values.All,pct))+'</div>';
 if(!v.measure){return '<table class="vt">'+filtered().reduce(function(acc,r){var k=String(dimValue(v.dim,r));if(acc.indexOf(k)<0)acc.push(k);return acc;},[]).sort().map(function(k){return '<tr><td>'+esc(k)+'</td><td class="n">Abc</td></tr>';}).join('')+'</table>';}
 var horiz=sh.rows.indexOf(v.dim)>=0;var cats=v.order;var vals=cats.map(function(k){return v.values[k]||0;});var max=Math.max.apply(null,vals.map(Math.abs))||1;
 var colorBy=sh.color&&isMeasurePill(sh.color)?sh.color:null;var cvals={};if(colorBy){var g={};filtered().forEach(function(r){var k=String(dimValue(v.dim,r));(g[k]=g[k]||[]).push(r);});cats.forEach(function(k){cvals[k]=measureValue(colorBy,g[k]||[]);});}
 var cmin=Math.min.apply(null,Object.keys(cvals).map(function(k){return cvals[k];})),cmax=Math.max.apply(null,Object.keys(cvals).map(function(k){return cvals[k];}));
 function colr(k){if(!colorBy)return '#4e79a7';var t=cmax===cmin?1:(cvals[k]-cmin)/(cmax-cmin);var l=Math.round(78-t*42);return 'hsl(210,52%,'+l+'%)';}
 var showLbl=sh.label&&sh.label===v.measure;var text=sh.mark==='Text';
 if(text)return '<table class="vt">'+cats.map(function(k){return '<tr><td>'+esc(k)+'</td><td class="n">'+esc(fmt(v.values[k],pct))+'</td></tr>';}).join('')+'</table>';
 var W=720,s;
 if(horiz){var bh=26,H=cats.length*(bh+8)+30;s='<svg viewBox="0 0 '+W+' '+H+'" width="100%" style="max-width:'+W+'px" role="img" aria-label="Bar chart of '+esc(v.measure)+' by '+esc(v.dim)+'">';cats.forEach(function(k,i){var y=6+i*(bh+8),w=(W-220)*Math.abs(vals[i])/max;s+='<text x="120" y="'+(y+bh/2+4)+'" text-anchor="end" font-size="12" fill="#5f6368">'+esc(k)+'</text><rect x="130" y="'+y+'" width="'+Math.max(1,w)+'" height="'+bh+'" fill="'+colr(k)+'"/>'+(showLbl?'<text x="'+(136+w)+'" y="'+(y+bh/2+4)+'" font-size="11.5">'+esc(fmt(vals[i],pct))+'</text>':'');});
  s+='<line x1="130" y1="'+(H-20)+'" x2="'+(W-60)+'" y2="'+(H-20)+'" stroke="#d4d7dc"/><text x="'+((W+70)/2)+'" y="'+(H-4)+'" text-anchor="middle" font-size="11" fill="#5f6368">'+esc(v.measure)+(pct?' (% of total)':'')+'</text></svg>';return s;}
 var H2=300,bw=Math.min(56,(W-80)/cats.length-10);s='<svg viewBox="0 0 '+W+' '+H2+'" width="100%" style="max-width:'+W+'px" role="img" aria-label="Column chart of '+esc(v.measure)+' by '+esc(v.dim)+'"><line x1="40" y1="'+(H2-34)+'" x2="'+W+'" y2="'+(H2-34)+'" stroke="#d4d7dc"/>';
 cats.forEach(function(k,i){var x=50+i*(bw+10),hh=(H2-80)*Math.abs(vals[i])/max;s+='<rect x="'+x+'" y="'+(H2-34-hh)+'" width="'+bw+'" height="'+hh+'" fill="'+colr(k)+'"/>'+(showLbl?'<text x="'+(x+bw/2)+'" y="'+(H2-40-hh)+'" text-anchor="middle" font-size="11">'+esc(fmt(vals[i],pct))+'</text>':'')+'<text x="'+(x+bw/2)+'" y="'+(H2-16)+'" text-anchor="middle" font-size="11.5" fill="#5f6368">'+esc(k)+'</text>';});return s+'</svg>';}
function pillMenu(){var p=ui.menu.pill,where=ui.menu.where;var pf=pillField(p);var h='<div class="menu" style="left:'+ui.menu.x+'px;top:'+ui.menu.y+'px" data-ref="pill-menu">';
 if(pf.agg&&pf.agg!=='AGG'){h+='<div class="lbl">Measure</div>'+['SUM','AVG','COUNT','MIN','MAX','MEDIAN'].map(function(a){return '<button class="'+(pf.agg===a?'on':'')+'" data-setagg="'+a+'">'+{SUM:'Sum',AVG:'Average',COUNT:'Count',MIN:'Minimum',MAX:'Maximum',MEDIAN:'Median'}[a]+(pf.agg===a?' ✓':'')+'</button>';}).join('')+'<div class="sep"></div>';}
 if(pf.agg&&(where==='columns'||where==='rows')){h+='<div class="lbl">Quick Table Calculation</div>'+['Running Total','Percent of Total','Rank'].map(function(t){return '<button class="'+(S.tableCalc[p]===t?'on':'')+'" data-tc="'+t+'">'+t+(S.tableCalc[p]===t?' ✓':'')+'</button>';}).join('')+(S.tableCalc[p]?'<button data-tc="">Clear Table Calculation</button>':'')+'<div class="sep"></div>';}
 return h+'<button data-removepill>Remove</button></div>';}
function addMenu(){var f=ui.menu.f;return '<div class="menu" style="left:'+ui.menu.x+'px;top:'+ui.menu.y+'px"><div class="lbl">Add '+esc(f)+' to</div>'+[['columns','Columns'],['rows','Rows'],['filters','Filters'],['color','Color'],['label','Label']].map(function(o){return '<button data-addto="'+o[0]+'">'+o[1]+'</button>';}).join('')+'</div>';}
function filterDlg(){var f=ui.dlg.f;var u={};TB.rows.forEach(function(r){var v=dimValue(f,r);u[v===null?'Null':String(v)]=1;});var ks=Object.keys(u).sort();var keep=ui.dlg.keep;
 return '<div class="dlg-back"><div class="dlg" role="dialog" aria-label="Filter '+esc(f)+'"><h2>Filter [' +esc(f)+']</h2><div class="db"><p style="margin:0 0 8px;color:var(--ink-2)">Select the values to keep.</p><div class="chk">'+ks.map(function(k){return '<label><input type="checkbox" data-fv="'+esc(k)+'" '+(!keep||keep.indexOf(k)>=0?'checked':'')+'> '+esc(k)+'</label>';}).join('')+'</div></div><div class="ft"><button class="btn" data-dlgclose>Cancel</button><button class="btn pri" data-savefilter>OK</button></div></div></div>';}
function calcDlg(){var d=ui.dlg;return '<div class="dlg-back"><div class="dlg" role="dialog" aria-label="Calculated field"><h2>'+(d.orig?'Edit':'Create')+' Calculated Field</h2><div class="db"><input class="name" id="cname" value="'+esc(d.name)+'" aria-label="Name" placeholder="Calculation1"><textarea id="cform" spellcheck="false" aria-label="Formula" placeholder="SUM([Profit]) / SUM([Sales])">'+esc(d.formula)+'</textarea>'+validity(d.formula)+'<p style="margin:8px 0 0;color:var(--muted)">Refer to fields in [brackets]. Functions: SUM, AVG, MIN, MAX, COUNT, COUNTD, MEDIAN, ZN, ROUND, ABS, IIF, IF … THEN … ELSEIF … ELSE … END, { FIXED [field] : … }</p></div><div class="ft"><button class="btn" data-dlgclose>Cancel</button><button class="btn pri" data-savecalc>OK</button></div></div></div>';}
function validity(f){if(!f.trim())return '<div class="valid"></div>';try{var a=parse(f);kind(a,[]);(function walk(n){if(n.k==='fld'&&TB.columns.indexOf(n.v)<0&&!S.calcs[n.v])throw new Error('The field \''+n.v+'\' doesn\'t exist.');['a','b','el'].forEach(function(k){if(n[k])walk(n[k]);});(n.args||[]).forEach(walk);(n.br||[]).forEach(function(b){walk(b[0]);walk(b[1]);});})(a);return '<div class="valid ok" id="valid">The calculation is valid.</div>';}catch(e){return '<div class="valid bad" id="valid">'+esc(e.message)+'</div>';}}
function render(){var app=document.getElementById('app');var f=document.activeElement&&document.activeElement.id;var pos=f&&document.activeElement.selectionStart;var v=computeView();var sh=S.shelves;
 var title=v.dim&&v.measure?(v.measure+' by '+v.dim):'Sheet 1';
 app.innerHTML='<div class="app"><div class="menubar"><span class="logo" style="color:#e8762b">'+ic('logo')+'</span><button disabled>File</button><button disabled>Data</button><button disabled>Worksheet</button><button data-newcalc data-ref="analysis-menu">Analysis</button><button disabled>Map</button><button disabled>Format</button><span class="file">'+esc(C.workbook)+' · '+esc(C.product)+'</span></div>'+
 '<div class="tool" data-ref="toolbar"><button data-act="undo" title="Clear the sheet" aria-label="Clear the sheet">'+ic('clear')+'</button><span class="sep"></span><button data-act="swap" title="Swap rows and columns" aria-label="Swap rows and columns">'+ic('swap')+'</button><button data-act="asc" title="Sort ascending" aria-label="Sort ascending" data-ref="sort-asc">'+ic('asc')+'</button><button data-act="desc" title="Sort descending" aria-label="Sort descending" data-ref="sort-desc">'+ic('desc')+'</button><span class="sep"></span><button data-newcalc title="Create Calculated Field" data-ref="new-calc">'+ic('calc')+'Create Calculated Field</button></div>'+
 '<div class="body">'+dataPane()+cards()+'<section class="right">'+shelves()+'<div class="view" data-ref="view"><h2>'+esc(title)+'</h2>'+chart()+'</div><div class="sheets"><span>Sheet 1</span></div></section></div></div>'+
 (ui.menu?ui.menu.kind==='pill'?pillMenu():addMenu():'')+(ui.dlg?ui.dlg.kind==='filter'?filterDlg():calcDlg():'');
 if(f){var el=document.getElementById(f);if(el){el.focus();if(pos!=null&&el.setSelectionRange)el.setSelectionRange(pos,pos);}}}
function at(el){var r=el.getBoundingClientRect();return {x:Math.min(r.left,window.innerWidth-220),y:Math.min(r.bottom+3,window.innerHeight-260)};}
document.addEventListener('click',function(e){var b=e.target.closest('button,[data-pill],[data-filterpill]');if(!b||b.disabled){if(ui.menu){ui.menu=null;render();}return;}var d=b.dataset;
 if(d.pill){var a=at(b);ui.menu={kind:'pill',pill:d.pill,where:d.where,x:a.x,y:a.y};render();return;}
 if(d.filterpill){var f0=d.filterpill;ui.dlg={kind:'filter',f:f0,keep:S.shelves.filters[f0]};render();return;}
 if(d.addmenu){var a2=at(b);ui.menu={kind:'add',f:d.addmenu,x:a2.x,y:a2.y};render();return;}
 if(d.addto){var f1=ui.menu.f;ui.menu=null;addTo(d.addto,f1);return;}
 if(d.setagg){var p=ui.menu.pill,np=d.setagg+'('+pillField(p).f+')';var sh=S.shelves;['columns','rows'].forEach(function(k){sh[k]=sh[k].map(function(x){return x===p?np:x;});});if(sh.color===p)sh.color=np;if(sh.label===p)sh.label=np;if(S.tableCalc[p]){S.tableCalc[np]=S.tableCalc[p];delete S.tableCalc[p];}ui.menu=null;save();render();return;}
 if(d.tc!==undefined){var p2=ui.menu.pill;if(d.tc)S.tableCalc[p2]=d.tc;else delete S.tableCalc[p2];ui.menu=null;save();render();return;}
 if(d.removepill!==undefined){var p3=ui.menu.pill,w=ui.menu.where,sh2=S.shelves;if(w==='columns'||w==='rows')sh2[w]=sh2[w].filter(function(x){return x!==p3;});else sh2[w]='';delete S.tableCalc[p3];ui.menu=null;save();render();return;}
 if(d.act==='asc'||d.act==='desc'){S.shelves.sort=S.shelves.sort===d.act?'':d.act;save();render();return;}
 if(d.act==='swap'){var t=S.shelves.columns;S.shelves.columns=S.shelves.rows;S.shelves.rows=t;save();render();return;}
 if(d.act==='undo'){S.shelves={columns:[],rows:[],filters:{},color:'',label:'',mark:'Automatic',sort:''};S.tableCalc={};save();render();return;}
 if(d.newcalc!==undefined){var n=1;while(S.calcs['Calculation'+n])n++;ui.dlg={kind:'calc',name:'Calculation'+n,formula:'',orig:null};render();var ta=document.getElementById('cform');if(ta)ta.focus();return;}
 if(d.editcalc){ui.dlg={kind:'calc',name:d.editcalc,formula:S.calcs[d.editcalc].formula,orig:d.editcalc};render();return;}
 if(d.dlgclose!==undefined){ui.dlg=null;render();return;}
 if(d.savefilter!==undefined){var keep=[].slice.call(document.querySelectorAll('[data-fv]')).filter(function(x){return x.checked;}).map(function(x){return x.dataset.fv;});S.shelves.filters[ui.dlg.f]=keep;ui.dlg=null;save();render();return;}
 if(d.savecalc!==undefined){var dl=ui.dlg;var name=dl.name.trim();if(!name){toast('Give the calculation a name');return;}if(TB.columns.indexOf(name)>=0){toast('That name is already a field');return;}
  if(dl.orig&&dl.orig!==name){delete S.calcs[dl.orig];}S.calcs[name]={formula:dl.formula};ui.dlg=null;save();render();var c=S.calcs[name];toast(c.error?'Saved with an error: '+c.error:'Calculated field \''+name+'\' saved');return;}
 if(ui.menu){ui.menu=null;render();}
});
document.addEventListener('keydown',function(e){var t=e.target;if((e.key==='Enter'||e.key===' ')&&t.dataset&&(t.dataset.pill||t.dataset.filterpill)){e.preventDefault();t.click();}if(e.key==='Escape'&&(ui.menu||ui.dlg)){ui.menu=null;ui.dlg=null;render();}});
document.addEventListener('change',function(e){if(e.target.id==='mark'){S.shelves.mark=e.target.value;save();render();}});
document.addEventListener('input',function(e){if(e.target.id==='cname')ui.dlg.name=e.target.value;if(e.target.id==='cform'){ui.dlg.formula=e.target.value;var v=document.getElementById('valid');var tmp=document.createElement('div');tmp.innerHTML=validity(ui.dlg.formula);if(v)v.replaceWith(tmp.firstChild);else{var ta=e.target;ta.insertAdjacentHTML('afterend',tmp.innerHTML);}}});
document.addEventListener('dragstart',function(e){var f=e.target.closest&&e.target.closest('[data-drag]');if(f)e.dataTransfer.setData('text/plain',f.dataset.drag);});
document.addEventListener('dragover',function(e){var z=e.target.closest&&e.target.closest('[data-drop]');if(z){e.preventDefault();z.classList.add('over');}});
document.addEventListener('dragleave',function(e){var z=e.target.closest&&e.target.closest('[data-drop]');if(z)z.classList.remove('over');});
document.addEventListener('drop',function(e){var z=e.target.closest&&e.target.closest('[data-drop]');if(!z)return;e.preventDefault();z.classList.remove('over');addTo(z.dataset.drop,e.dataTransfer.getData('text/plain'));});
refreshCalcs();render();save();
})();`;

export function tableauApp(cfg: TableauConfig): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${cfg.product}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${CSS}</style></head><body><div id="app"></div><script>var CFG=${json(cfg)};${CLIENT}</script></body></html>`;
}
