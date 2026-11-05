import { Question } from '../../types';
import { short } from '../questionKit';
import { labApp, queueApp, simTask, terminalApp } from './simKit';

/**
 * Hands-on simulations for the data, software and AI engineering tests: one working task per test, asked from Junior
 * up, with a typed follow-up. Each is marked on the state the candidate leaves it in.
 */

export interface TestSim {
  aspect: { id: string; name: string; summary: string };
  questions: Question[];
}

const RAW_SALES = `Sales export - generated 02/05/2026
Exported by: system

order_id;order_date;customer;region;amount
5001;01/04/2026;"Patel; R";North;1.250,00
5002;02/04/2026;Café Nova;South;980,50
5003;13/04/2026;Lee Ltd;north;2.100,00
5004;;Smith & Co;East;450,00
TOTAL;;;;4.780,50`;

export const TECH_SIMS: Record<string, TestSim> = {
  // ---------- Data importing ----------
  'test-import-01': {
    aspect: { id: 'sim', name: 'Hands-on: Import Wizard', summary: 'Importing a messy export with the right settings and checking it.' },
    questions: [
      simTask(
        'm-sim-imp-1',
        'Import the Sales Export',
        `Use the import wizard to load sales.csv correctly. Change the settings, press Preview, and keep going until the preview is right: every order on its own row, amounts as proper numbers, dates read the right way round, nothing extra.

Then fill in what the import gives you.`,
        'Import wizard: sales.csv',
        labApp({
          title: 'Import wizard',
          subtitle: 'sales.csv · 9 lines',
          brief: RAW_SALES,
          runLabel: 'Preview',
          params: [
            { key: 'delimiter', label: 'Delimiter', type: 'select', options: ['Comma', 'Semicolon', 'Tab'] },
            { key: 'skip', label: 'Lines to skip before the header', type: 'number' },
            { key: 'decimal', label: 'Decimal separator', type: 'select', options: ['Full stop (1,250.00)', 'Comma (1.250,00)'] },
            { key: 'dates', label: 'Date order', type: 'select', options: ['Month first (US)', 'Day first (UK)'] },
            { key: 'encoding', label: 'Encoding', type: 'select', options: ['UTF-8', 'Windows-1252'] },
            { key: 'dropTotal', label: 'Remove rows whose order_id isn’t a number', type: 'check' },
          ],
          defaults: { delimiter: 'Comma', skip: 0, decimal: 'Full stop (1,250.00)', dates: 'Month first (US)', encoding: 'Windows-1252', dropTotal: false },
          answers: [
            { key: 'rows', label: 'Order rows imported', type: 'number' },
            { key: 'total', label: 'Total amount (a number, e.g. 1234.56)', type: 'number' },
            { key: 'blankDate', label: 'order_id with no date', type: 'text' },
          ],
          compute: String.raw`
var RAW=${JSON.stringify(RAW_SALES)};
var lines=RAW.split('\n').slice(Number(p.skip)||0);
var d=p.delimiter==='Semicolon'?';':p.delimiter==='Tab'?'\t':',';
function split(l){var out=[],cur='',q=false;for(var i=0;i<l.length;i++){var c=l[i];if(c==='"'){q=!q;continue;}if(c===d&&!q){out.push(cur);cur='';}else cur+=c;}out.push(cur);return out;}
var head=split(lines[0]||'');var rows=lines.slice(1).filter(function(l){return l.trim()!==''}).map(split);
if(p.dropTotal)rows=rows.filter(function(r){return /^\d+$/.test(r[0])});
function num(s){if(s==null||s==='')return null;var t=p.decimal.indexOf('Comma')===0?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'');var n=Number(t);return isNaN(n)?null:n;}
function date(s){if(!s)return '';var m=s.split('/');if(m.length!==3)return 'not a date';var dd=p.dates.indexOf('Day')===0?m[0]:m[1],mm=p.dates.indexOf('Day')===0?m[1]:m[0];if(Number(mm)>12)return 'not a date';return m[2]+'-'+mm+'-'+dd;}
function enc(s){return p.encoding==='UTF-8'?s:s.replace(/é/g,'Ã©');}
var ai=head.indexOf('amount'),di=head.indexOf('order_date');var total=0,bad=0;
var table=rows.map(function(r){var a=ai>=0?num(r[ai]):null;if(a==null)bad++;else total+=a;var dt=di>=0?date(r[di]):'';return r.map(function(c,i){return i===ai?(a==null?'?? '+c:a.toFixed(2)):i===di?(dt||'(blank)'):enc(c)})});
var ok=head.length===5&&rows.length===4&&bad===0&&Math.abs(total-4780.5)<0.001&&p.dates.indexOf('Day')===0&&p.encoding==='UTF-8';
return {kpis:[['Columns',head.length],['Rows',rows.length],['Amount total',bad?'can’t sum ('+bad+' bad)':total.toFixed(2)]],
table:{head:head.map(enc),rows:table.slice(0,8)},note:ok?'Looks right.':'Check the preview carefully.',
results:{columns:head.length,rows:rows.length,total:Math.round(total*100)/100,badAmounts:bad,firstDate:table[0]&&di>=0?table[0][di]:'',ok:ok}};`,
        }),
        [
          ['Splits on the right delimiter (5 columns)', 'results.columns', '5'],
          ['Leaves out the note lines and the TOTAL row (4 orders)', 'results.rows', '4'],
          ['Reads decimal commas (total 4,780.50)', 'results.total', '4780.5'],
          ['Reads dates day first', 'params.dates', 'Day first (UK)'],
          ['Uses the file’s encoding (UTF-8)', 'params.encoding', 'UTF-8'],
          ['Reports the total', 'answers.total', '4780.5'],
          ['Finds the order with no date', 'answers.blankDate', '5004'],
        ],
        { minutes: 12 }
      ),
      short(
        'm-sim-imp-2',
        'The Date Problem',
        'With dates read month first, what date does 13/04/2026 come out as? (Answer in a few words.)',
        ['not a date', 'it doesnt', 'invalid', 'an error', 'nothing', 'it fails', 'text', 'blank'],
        { taskId: 'm-sim-imp-1', minutes: 2 }
      ),
    ],
  },

  // ---------- Feature engineering ----------
  'test-feat-01': {
    aspect: { id: 'sim', name: 'Hands-on: Feature Pipeline', summary: 'Choosing features and a pipeline that gives an honest score.' },
    questions: [
      simTask(
        'm-sim-fe-1',
        'Build an Honest Pipeline',
        `The churn model's pipeline is set up badly. Pick the features, the imputation, what the transformers are fitted on and how to split, then press Run.

Your goal: a pipeline whose validation score is honest (close to what it will score live) and as high as it can honestly be. The settings start as a colleague left them.`,
        'Feature pipeline: churn model',
        labApp({
          title: 'Feature pipeline',
          subtitle: 'churn model · 48,000 customers · predict cancel within 30 days of snapshot',
          brief: 'Each customer has one row per monthly snapshot.\ndays_to_cancel and cancel_reason are filled in only after a customer cancels.',
          params: [
            { key: 'f_tenure', label: 'tenure_months', type: 'check' },
            { key: 'f_login', label: 'days_since_last_login', type: 'check' },
            { key: 'f_tickets', label: 'support_tickets_30d', type: 'check' },
            { key: 'f_plan', label: 'plan (one-hot)', type: 'check' },
            { key: 'f_spend', label: 'monthly_spend', type: 'check' },
            { key: 'f_id', label: 'customer_id', type: 'check' },
            { key: 'f_days', label: 'days_to_cancel', type: 'check' },
            { key: 'f_reason', label: 'cancel_reason', type: 'check' },
            { key: 'impute', label: 'Missing spend', type: 'select', options: ['Fill with 0', 'Mean of all rows', 'Mean of training rows, plus a missing flag'] },
            { key: 'fit', label: 'Fit scaler and encoders on', type: 'select', options: ['All rows', 'Training rows only'] },
            { key: 'split', label: 'Split', type: 'select', options: ['Random rows', 'By customer', 'By time (train on earlier months)'] },
          ],
          defaults: { f_tenure: true, f_login: false, f_tickets: false, f_plan: true, f_spend: true, f_id: true, f_days: true, f_reason: false, impute: 'Mean of all rows', fit: 'All rows', split: 'Random rows' },
          compute: String.raw`
var honest=0.58+(p.f_tenure?0.05:0)+(p.f_login?0.09:0)+(p.f_tickets?0.05:0)+(p.f_plan?0.02:0)+(p.f_spend?0.02:0)+(p.impute&&p.impute.indexOf('training')>0?0.01:0);
var leak=(p.f_days?0.25:0)+(p.f_reason?0.2:0)+(p.f_id?0.03:0)+(p.fit==='All rows'?0.02:0)+(p.impute==='Mean of all rows'?0.01:0)+(p.split==='Random rows'?0.04:p.split==='By customer'?0.01:0);
var val=Math.min(0.995,honest+leak),live=honest-(p.f_id?0.01:0);
var leaks=[];if(p.f_days)leaks.push('days_to_cancel');if(p.f_reason)leaks.push('cancel_reason');if(p.f_id)leaks.push('customer_id');if(p.fit==='All rows')leaks.push('fitted on all rows');if(p.impute==='Mean of all rows')leaks.push('mean of all rows');if(p.split==='Random rows')leaks.push('random split');
return {kpis:[['Validation AUC',val.toFixed(2)],['Live AUC (first month)',live.toFixed(2)],['Gap',(val-live).toFixed(2)]],
table:{head:['Feature','In model'],rows:[['tenure_months',p.f_tenure?'yes':'—'],['days_since_last_login',p.f_login?'yes':'—'],['support_tickets_30d',p.f_tickets?'yes':'—'],['plan',p.f_plan?'yes':'—'],['monthly_spend',p.f_spend?'yes':'—'],['customer_id',p.f_id?'yes':'—'],['days_to_cancel',p.f_days?'yes':'—'],['cancel_reason',p.f_reason?'yes':'—']]},
note:'Live AUC is what the model scored on next month’s customers.',
results:{validation:Math.round(val*100)/100,live:Math.round(live*100)/100,gap:Math.round((val-live)*100)/100,leaks:leaks.length,honest:leaks.length===0,best:leaks.length===0&&live>=0.815}};`,
        }),
        [
          ['Drops days_to_cancel', 'params.f_days', 'false'],
          ['Drops cancel_reason', 'params.f_reason', 'false'],
          ['Drops customer_id', 'params.f_id', 'false'],
          ['Fits transformers on training rows only', 'params.fit', 'Training rows only'],
          ['Splits by time', 'params.split', 'By time (train on earlier months)'],
          ['No leaks left in the pipeline', 'results.leaks', '0'],
          ['Keeps the useful features (live AUC 0.82 or more)', 'results.best', 'true'],
        ],
        { minutes: 10 }
      ),
      short(
        'm-sim-fe-2',
        'The Biggest Leak',
        'Which single feature inflated the validation score most?',
        ['days_to_cancel', 'days to cancel'],
        { taskId: 'm-sim-fe-1', minutes: 2 }
      ),
    ],
  },

  // ---------- Modelling ----------
  'test-ml-01': {
    aspect: { id: 'sim', name: 'Hands-on: Training Runs', summary: 'Training and tuning a fraud model to an honest bar.' },
    questions: [
      simTask(
        'm-sim-ml-1',
        'Train the Fraud Model',
        `Fraud is 1.5% of transactions. Use the training console to get a model that meets the bar:

- Validation PR-AUC of at least 0.60
- A gap between training and validation PR-AUC of 0.10 or less
- Judged on a metric that suits rare fraud, with a split that keeps fraud in both sets

Change the settings and press Train as often as you like. Then report your model.`,
        'Training console: fraud model',
        labApp({
          title: 'Training console',
          subtitle: 'fraud · 1.2m transactions · 1.5% fraud',
          brief: 'Each run trains on the training set and scores the validation set.',
          runLabel: 'Train',
          params: [
            { key: 'model', label: 'Model', type: 'select', options: ['Logistic regression', 'Decision tree', 'Random forest', 'Gradient boosting'] },
            { key: 'depth', label: 'Max depth (trees; 0 = no limit)', type: 'number' },
            { key: 'weights', label: 'Class weights (balanced)', type: 'check' },
            { key: 'split', label: 'Split', type: 'select', options: ['Random', 'Stratified by fraud'] },
            { key: 'metric', label: 'Report', type: 'select', options: ['Accuracy', 'PR-AUC'] },
          ],
          defaults: { model: 'Decision tree', depth: 0, weights: false, split: 'Random', metric: 'Accuracy' },
          answers: [
            { key: 'model', label: 'Model you’d take forward', type: 'select', options: ['Logistic regression', 'Decision tree', 'Random forest', 'Gradient boosting'] },
            { key: 'valPrAuc', label: 'Its validation PR-AUC', type: 'number' },
          ],
          compute: String.raw`
var d=Number(p.depth)||0,m=p.model,tr,va;
if(m==='Logistic regression'){tr=0.44;va=0.42;}
else if(m==='Decision tree'){if(!d||d>12){tr=1.0;va=0.31;}else if(d>6){tr=0.83;va=0.47;}else{tr=0.58;va=0.5;}}
else if(m==='Random forest'){if(!d||d>16){tr=0.97;va=0.58;}else if(d>8){tr=0.78;va=0.61;}else{tr=0.66;va=0.55;}}
else{if(!d||d>10){tr=0.93;va=0.6;}else if(d>=4){tr=0.71;va=0.66;}else{tr=0.6;va=0.56;}}
if(p.weights){va+=0.03;tr+=0.02;}
var strat=p.split==='Stratified by fraud';if(!strat){va-=0.04;}
var acc=0.985+(va*0.01);
var shown=p.metric==='PR-AUC'?['Train PR-AUC',tr.toFixed(2)]:['Train accuracy',(0.985+tr*0.0149).toFixed(3)];
var shownV=p.metric==='PR-AUC'?['Validation PR-AUC',va.toFixed(2)]:['Validation accuracy',acc.toFixed(3)];
var meets=va>=0.6&&tr-va<=0.1&&strat&&p.metric==='PR-AUC';
return {kpis:[shown,shownV,['Meets the bar',meets?'Yes':'No']],note:p.metric==='Accuracy'?'Predicting "not fraud" for everything scores 0.985 accuracy.':'',
results:{model:m,train:Math.round(tr*100)/100,validation:Math.round(va*100)/100,gap:Math.round((tr-va)*100)/100,meets:meets}};`,
        }),
        [
          ['Reports PR-AUC, not accuracy', 'params.metric', 'PR-AUC'],
          ['Stratifies the split', 'params.split', 'Stratified by fraud'],
          ['Uses class weights', 'params.weights', 'true'],
          ['The last run meets the bar', 'results.meets', 'true'],
          ['Reports gradient boosting as the model', 'answers.model', 'Gradient boosting'],
          ['Reports its validation PR-AUC', 'answers.valPrAuc', '0.69'],
        ],
        { minutes: 12 }
      ),
      short(
        'm-sim-ml-2',
        'Why Not the Tree?',
        'An unlimited decision tree scores 1.00 on training data. In two or three words, what is it doing?',
        ['overfitting', 'overfitting the training data', 'memorising', 'memorising the data', 'memorizing', 'overfit'],
        { taskId: 'm-sim-ml-1', minutes: 2 }
      ),
    ],
  },

  // ---------- Evaluation ----------
  'test-eval-01': {
    aspect: { id: 'sim', name: 'Hands-on: Threshold Tuner', summary: 'Picking a fraud threshold from the cost of each mistake.' },
    questions: [
      simTask(
        'm-sim-ev-1',
        'Set the Fraud Threshold',
        `A fraud model scores 10,000 transactions. Reviewing a flagged transaction costs £5; missing a fraud costs £200 on average. The review team can handle at most 800 flags a day.

Try thresholds and find the one with the lowest total cost that the team can handle. Then report its numbers.`,
        'Threshold tuner',
        labApp({
          title: 'Threshold tuner',
          subtitle: 'fraud model · 10,000 transactions · 130 fraud',
          brief: 'Transactions at or above the threshold are flagged for review.',
          params: [{ key: 'threshold', label: 'Threshold', type: 'select', options: ['0.2', '0.3', '0.4', '0.5', '0.6', '0.7', '0.8', '0.9'] }],
          defaults: { threshold: '0.5' },
          answers: [
            { key: 'precision', label: 'Precision at your threshold (%, one decimal)', type: 'number' },
            { key: 'recall', label: 'Recall at your threshold (%, one decimal)', type: 'number' },
            { key: 'cost', label: 'Total cost (£)', type: 'number' },
          ],
          compute: String.raw`
var B=[[0,5000,2],[0.1,2500,3],[0.2,1200,5],[0.3,600,8],[0.4,300,10],[0.5,150,14],[0.6,80,18],[0.7,40,20],[0.8,20,22],[0.9,10,28]];
var t=Number(p.threshold)||0.5,fp=0,tp=0,pos=0;B.forEach(function(b){pos+=b[2];if(b[0]>=t-1e-9){fp+=b[1];tp+=b[2];}});
var fn=pos-tp,cost=fp*5+fn*200,flags=fp+tp;
return {kpis:[['Flagged',flags],['Fraud caught',tp+' of '+pos],['False alarms',fp],['Total cost','£'+cost.toLocaleString('en-GB')]],
table:{head:['Score band','Not fraud','Fraud'],rows:B.map(function(b){return [b[0].toFixed(1)+'–'+(b[0]+0.1).toFixed(1),b[1],b[2]]})},
note:flags>800?'Over the team’s 800 a day.':'',results:{threshold:t,flags:flags,tp:tp,fp:fp,fn:fn,cost:cost,withinCapacity:flags<=800}};`,
        }),
        [
          ['Chooses the lowest-cost threshold within capacity (0.4)', 'params.threshold', '0.4'],
          ['Ran it', 'results.cost', '6600'],
          ['Reports precision (15.7%)', 'answers.precision', '15.7'],
          ['Reports recall (86.2%)', 'answers.recall', '86.2'],
          ['Reports the cost (£6,600)', 'answers.cost', '6600'],
        ],
        { minutes: 10 }
      ),
      short(
        'm-sim-ev-2',
        'Why Not 0.3?',
        'Threshold 0.3 catches more fraud. Give one reason it’s the wrong choice here. (A few words.)',
        ['over capacity', 'too many flags', 'more than 800 flags', 'costs more', 'higher cost', 'over 800', 'team cant handle it', 'exceeds capacity'],
        { taskId: 'm-sim-ev-1', minutes: 2 }
      ),
    ],
  },

  // ---------- Data science project ----------
  'test-sim-ds-01': {
    aspect: { id: 'sim', name: 'Hands-on: Retention Targeting', summary: 'Choosing who gets the offer, and proving it worked.' },
    questions: [
      simTask(
        'm-sim-dss-1',
        'Target the Retention Offer',
        `Brightstream's churn model ranks 20,000 subscribers. Choose how many of the riskiest to target and which offer to send, to get the best net value. Keep a way to measure the real effect.

Each kept subscriber is worth £120. Offers: a half-price month costs £6 and keeps 25% of would-be cancellers; a free month costs £12 and keeps 40%; an email costs £0.50 and keeps 5%.`,
        'Targeting console',
        labApp({
          title: 'Targeting console',
          subtitle: 'Brightstream · 20,000 subscribers · 1,600 cancel a quarter',
          brief: 'Churners captured by the model: top 5% → 352, top 10% → 700, top 20% → 1,000, top 30% → 1,200.',
          params: [
            { key: 'target', label: 'Target the riskiest', type: 'select', options: ['5%', '10%', '20%', '30%'] },
            { key: 'offer', label: 'Offer', type: 'select', options: ['Half-price month', 'Free month', 'Email only'] },
            { key: 'holdout', label: 'Keep a random 10% of the target group without the offer', type: 'check' },
          ],
          defaults: { target: '20%', offer: 'Half-price month', holdout: false },
          answers: [{ key: 'net', label: 'Net value of your plan (£)', type: 'number' }],
          compute: String.raw`
var C={'5%':[1000,352],'10%':[2000,700],'20%':[4000,1000],'30%':[6000,1200]},O={'Half-price month':[6,0.25],'Free month':[12,0.4],'Email only':[0.5,0.05]};
var c=C[p.target]||C['20%'],o=O[p.offer]||O['Half-price month'];var kept=c[1]*o[1],value=kept*120,cost=c[0]*o[0],net=Math.round(value-cost);
return {kpis:[['Offers sent',c[0].toLocaleString('en-GB')],['Cancellers kept',Math.round(kept)],['Net value','£'+net.toLocaleString('en-GB')],['Measurable',p.holdout?'Yes':'No']],
note:'',results:{net:net,measurable:!!p.holdout}};`,
        }),
        [
          ['Targets the top 10%', 'params.target', '10%'],
          ['Chooses the free month', 'params.offer', 'Free month'],
          ['Keeps a holdout to measure it', 'params.holdout', 'true'],
          ['Its plan nets £9,600', 'results.net', '9600'],
          ['Reports the net value', 'answers.net', '9600'],
        ],
        { minutes: 10 }
      ),
      short(
        'm-sim-dss-2',
        'Why the Holdout?',
        'In a few words: why keep 10% of the target group without the offer?',
        ['to measure the real effect', 'to measure the effect', 'to measure it', 'measure uplift', 'to see if it works', 'a control group', 'control group', 'to compare'],
        { taskId: 'm-sim-dss-1', minutes: 2 }
      ),
    ],
  },

  // ---------- Git ----------
  'test-git-01': {
    aspect: { id: 'sim', name: 'Hands-on: The Repository', summary: 'Fixing a real repository mistake at the command line.' },
    questions: [
      simTask(
        'm-sim-git-1',
        'Move the Commit',
        `You committed "Add VAT rounding to basket totals" to main by mistake. You haven't pushed it. It belongs on the existing branch feature/vat.

Use the terminal to:
1. Get the commit onto feature/vat
2. Put main back to match origin/main
3. Leave the shared main branch on the server untouched

Type help to see the commands.`,
        'Terminal: northwind-shop',
        terminalApp({
          title: 'Terminal',
          subtitle: 'northwind-shop',
          promptLabel: 'dev@laptop northwind-shop ({branch}) $',
          intro: 'northwind-shop — a Git repository. Type help for commands.',
          world: {
            head: 'main',
            commits: { a1f0: 'Add basket page', b2e1: 'Add checkout totals', c3a9: 'Add VAT rounding to basket totals' },
            branches: { main: ['a1f0', 'b2e1', 'c3a9'], 'feature/vat': ['a1f0', 'b2e1'] },
            remote: ['a1f0', 'b2e1'],
            forcePushes: 0,
            reflog: ['c3a9 commit: Add VAT rounding to basket totals', 'b2e1 pull: fast-forward'],
          },
          run: String.raw`
var W=world;var B=W.branches;
function cur(){return B[W.head];}
function sha(ref){if(!ref)return null;if(ref==='HEAD')return cur()[cur().length-1];var m=ref.match(/^(.+)~(\d+)$/);if(m){var l=ref.indexOf('HEAD')===0?cur():B[m[1]];return l?l[l.length-1-Number(m[2])]:null;}
 if(B[ref])return B[ref][B[ref].length-1];if(ref==='origin/main')return W.remote[W.remote.length-1];var k=Object.keys(W.commits).filter(function(s){return s.indexOf(ref)===0})[0];return k||null;}
function upTo(s){var src=[cur()].concat(Object.keys(B).map(function(k){return B[k]}),[W.remote]);for(var i=0;i<src.length;i++){var j=src[i].indexOf(s);if(j>=0)return src[i].slice(0,j+1);}return null;}
if(cmd==='help')return 'git status | git log [--oneline] | git branch [name] | git checkout <branch> | git switch <branch> | git cherry-pick <sha> | git reset --hard <ref> | git revert <sha> | git push [--force] | git reflog | clear\nRefs: a branch, origin/main, a commit sha, HEAD~1';
if(cmd!=='git')return cmd+': command not found';
var sub=args[0],a=args.slice(1);
if(sub==='status'){var l=cur(),ahead=W.head==='main'?l.length-W.remote.length:0;return 'On branch '+W.head+(W.head==='main'?(ahead>0&&l.slice(0,W.remote.length).join()===W.remote.join()?"\nYour branch is ahead of 'origin/main' by "+ahead+' commit'+(ahead>1?'s':'')+'.':l.join()===W.remote.join()?"\nYour branch is up to date with 'origin/main'.":"\nYour branch and 'origin/main' have diverged."):'')+'\nnothing to commit, working tree clean';}
if(sub==='log')return cur().slice().reverse().map(function(s){return s+' '+W.commits[s]}).join('\n');
if(sub==='branch'){if(!a.length||a[0]==='-a')return Object.keys(B).map(function(k){return (k===W.head?'* ':'  ')+k}).join('\n')+(a[0]==='-a'?'\n  remotes/origin/main':'');if(a[0]==='-f'&&a[1]){var s0=sha(a[2]||'HEAD');B[a[1]]=upTo(s0);return '';}if(B[a[0]])return "fatal: a branch named '"+a[0]+"' already exists";B[a[0]]=cur().slice();return '';}
if(sub==='checkout'||sub==='switch'){if(a[0]==='-b'||a[0]==='-c'){B[a[1]]=cur().slice();W.head=a[1];return "Switched to a new branch '"+a[1]+"'";}if(!B[a[0]])return "error: pathspec '"+a[0]+"' did not match any branch";W.head=a[0];W.reflog.unshift(cur()[cur().length-1]+' checkout: moving to '+a[0]);return "Switched to branch '"+a[0]+"'";}
if(sub==='cherry-pick'){var s=sha(a[0]);if(!s)return 'fatal: bad revision '+a[0];if(cur().indexOf(s)>=0)return 'The previous cherry-pick is now empty: that commit is already on '+W.head;cur().push(s);W.reflog.unshift(s+' cherry-pick: '+W.commits[s]);return '['+W.head+' '+s+'] '+W.commits[s];}
if(sub==='reset'){var ref=a.filter(function(x){return x.indexOf('--')!==0})[0]||'HEAD';var s2=sha(ref);var l2=s2&&upTo(s2);if(!l2)return 'fatal: ambiguous argument '+ref;B[W.head]=l2;W.reflog.unshift(s2+' reset: moving to '+ref);return 'HEAD is now at '+s2+' '+W.commits[s2];}
if(sub==='revert'){var s3=sha(a[0]);if(!s3)return 'fatal: bad revision';var n='r'+s3.slice(0,3);W.commits[n]='Revert "'+W.commits[s3]+'"';cur().push(n);return '['+W.head+' '+n+'] '+W.commits[n];}
if(sub==='push'){var force=a.indexOf('--force')>=0||a.indexOf('-f')>=0;if(W.head!=='main'){W.pushed=W.pushed||{};W.pushed[W.head]=cur().slice();return 'To origin\n * [new branch] '+W.head+' -> '+W.head;}
 var l3=cur(),ff=l3.slice(0,W.remote.length).join()===W.remote.join();if(!ff&&!force)return '! [rejected] main -> main (non-fast-forward)';if(l3.join()===W.remote.join())return 'Everything up-to-date';if(force)W.forcePushes++;W.remote=l3.slice();return 'To origin\n   main -> main'+(force?' (forced update)':'');}
if(sub==='reflog')return W.reflog.map(function(r,i){return r.split(' ')[0]+' HEAD@{'+i+'}: '+r.split(' ').slice(1).join(' ')}).join('\n');
if(sub==='commit')return 'nothing to commit, working tree clean';
return "git: '"+sub+"' is not a command here. Type help.";`,
        }),
        [
          ['The commit is on feature/vat', 'world.branches.feature/vat', 'a1f0,b2e1,c3a9'],
          ['main matches origin/main again', 'world.branches.main', 'a1f0,b2e1'],
          ['The server’s main is untouched', 'world.remote', 'a1f0,b2e1'],
          ['No force-push', 'world.forcePushes', '0'],
        ],
        { minutes: 10 }
      ),
      short(
        'm-sim-git-2',
        'Undo on a Shared Branch',
        'If the commit had already been pushed to main and teammates had pulled it, which git command would you use to undo it safely?',
        ['git revert', 'revert', 'git revert c3a9'],
        { taskId: 'm-sim-git-1', minutes: 2 }
      ),
    ],
  },

  // ---------- Code review ----------
  'test-review-01': {
    aspect: { id: 'sim', name: 'Hands-on: Review the Pull Request', summary: 'Reviewing an AI-written change line by line.' },
    questions: [
      simTask(
        'm-sim-rv-1',
        'Review the Password Reset',
        `An AI assistant wrote this password-reset feature and opened a pull request. Review it line by line: open each line, and mark whether it has an issue and what kind. Then give your decision.`,
        'Pull request #482: password reset',
        queueApp({
          title: 'Pull request #482',
          subtitle: 'Add password reset (written by AI assistant)',
          columns: ['Line', 'Code'],
          records: [
            ['1', "app.post('/reset', async (req, res) => {", 'Starts the reset endpoint.'],
            ['2', 'const user = await db.users.findOne({ email: req.body.email });', 'Looks the user up by the email posted.'],
            ['3', "if (!user) return res.status(404).json({ error: 'No account with that email' });", 'Tells the caller whether an email has an account.'],
            ['4', 'const token = Math.random().toString(36).slice(2, 8);', 'Makes the reset token: 6 characters from Math.random().'],
            ['5', 'await db.resets.insert({ userId: user.id, token });', 'Stores the token, with no expiry time.'],
            ['6', "await mailer.send(user.email, 'Reset your password', link(token));", 'Emails the link with the token to the account’s address.'],
            ['7', 'res.json({ ok: true, token });', 'Responds to the caller, including the token.'],
            ['8', "app.post('/reset/confirm', async (req, res) => {", 'Starts the confirm endpoint.'],
            ['9', 'const r = await db.resets.findOne({ token: req.body.token });', 'Finds the reset by token.'],
            ['10', 'await db.users.update(r.userId, { password: req.body.password });', 'Saves the new password as given; r may be null for a bad token. The reset row is never deleted.'],
          ].map(([id, code, detail]) => ({ id: `L${id}`, cells: [id, code], detail: `${code}\n\n${detail}` })),
          recordFields: [{ key: 'issue', label: 'Issue on this line', type: 'select', options: ['No issue', 'Security', 'Bug', 'Data exposure'] }],
          answers: [
            { key: 'decision', label: 'Your decision', type: 'select', options: ['Approve', 'Approve with comments', 'Request changes'] },
            { key: 'comment', label: 'Your main review comment', type: 'textarea' },
          ],
          answersTitle: 'Review',
        }),
        [
          ['Line 2 is fine', 'records.L2.issue', 'No issue'],
          ['Line 3 leaks which emails have accounts (security)', 'records.L3.issue', 'Security'],
          ['Line 4 uses a weak, guessable token (security)', 'records.L4.issue', 'Security'],
          ['Line 5 never expires the token (bug)', 'records.L5.issue', 'Bug'],
          ['Line 6 is fine', 'records.L6.issue', 'No issue'],
          ['Line 7 returns the token to the caller (data exposure)', 'records.L7.issue', 'Data exposure'],
          ['Line 10 stores the password unhashed (security)', 'records.L10.issue', 'Security'],
          ['Requests changes', 'answers.decision', 'Request changes'],
        ],
        { minutes: 12 }
      ),
      short(
        'm-sim-rv-2',
        'The Worst One',
        'Which line number lets anyone reset any account straight away, without access to the email?',
        ['7', 'line 7'],
        { taskId: 'm-sim-rv-1', minutes: 2 }
      ),
    ],
  },
};
