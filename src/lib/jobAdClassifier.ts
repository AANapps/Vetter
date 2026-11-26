/**
 * Reads a pasted job ad, with no AI (free and instant): which launch role it is, its title, and the Corprax tests that
 * prove it. Data Analyst and Customer Support get Corprax's ready-made tests and job simulation; anything else goes to
 * the AI chat. Next roles: Sales and Customer Success (no library tests yet, so they go to the chat too).
 */
import { TestRole } from '../types';

type Rule = { role: TestRole | 'Sales' | 'Customer Success'; title: RegExp; words: RegExp[] };

const RULES: Rule[] = [
  {
    role: 'Data Analyst',
    title: /\b(data|business intelligence|bi|reporting|insights?|marketing|commercial|product|sales)\s+analyst\b|\banalytics\b/i,
    words: [/\bsql\b/i, /\bexcel\b/i, /power ?bi/i, /\btableau\b/i, /\bdashboards?\b/i, /\bkpis?\b/i, /\bpivot/i, /\bpython\b|\bpandas\b/i, /\bdata (cleaning|quality|visuali[sz]ation)/i, /\breporting\b/i, /\bstatistic/i],
  },
  {
    role: 'Customer Support Agent',
    title: /\b(customer (support|service|care)|help ?desk|service desk|support (agent|advisor|specialist|representative|associate)|contact cent(re|er))\b/i,
    words: [/\btickets?\b/i, /\bzendesk\b|\bfreshdesk\b|\bintercom\b|\bgorgias\b/i, /\bsla\b/i, /\bcsat\b/i, /\brefunds?\b/i, /\bcomplaints?\b/i, /\blive chat\b/i, /\bescalat/i, /\btroubleshoot/i, /\bfirst (contact|response)/i],
  },
  {
    role: 'Customer Success',
    title: /\bcustomer success\b|\baccount manager\b|\bonboarding (manager|specialist)\b/i,
    words: [/\bchurn\b/i, /\brenewals?\b/i, /\bupsell/i, /\bqbrs?\b/i, /\bnrr\b|\bnet revenue retention\b/i, /\bhealth scores?\b/i, /\bgainsight\b/i],
  },
  {
    role: 'Sales',
    title: /\b(sales|business development|account executive|sdr|bdr)\b/i,
    words: [/\bquota\b/i, /\bpipeline\b/i, /\bcold (call|email)/i, /\bprospect/i, /\bclose (deals|business)/i, /\bsalesforce\b|\bhubspot\b/i, /\bcommission\b/i, /\bote\b/i],
  },
];

export interface JobAdReading {
  title: string;
  // A launch role Corprax has ready-made tests for; undefined: send to the AI chat
  role?: TestRole;
  // What it looks like even when Corprax has no tests yet (Sales, Customer Success)
  guess?: string;
  testIds: string[];
}

// The ad's title: a "Job title:" line, else its first short line
function titleOf(ad: string): string {
  const labelled = ad.match(/^\s*(?:job\s*)?title\s*[:\-]\s*(.+)$/im)?.[1];
  if (labelled) return labelled.trim().slice(0, 80);
  const first = ad.split('\n').map((l) => l.trim()).find((l) => l && l.length <= 80 && !/[.!?]$/.test(l));
  return (first ?? '').replace(/^(we('re| are) hiring( an?)?|hiring( an?)?|role)\s*[:\-]?\s*/i, '').slice(0, 80);
}

export function readJobAd(ad: string): JobAdReading {
  const title = titleOf(ad);
  const scored = RULES.map((r) => ({ r, score: (r.title.test(title) ? 5 : r.title.test(ad) ? 2 : 0) + r.words.filter((w) => w.test(ad)).length }))
    .filter((x) => x.score >= 3)
    .sort((a, b) => b.score - a.score);
  const best = scored[0]?.r;
  const has = (re: RegExp) => re.test(ad);
  if (best?.role === 'Data Analyst') {
    // The tools the ad names; Excel and SQL when it names none
    const tools = [
      has(/\bexcel\b|spreadsheet/i) && 'test-da-excel',
      has(/\bsql\b/i) && 'test-da-sql',
      has(/power ?bi/i) && 'test-da-powerbi',
      has(/\btableau\b/i) && 'test-da-tableau',
      has(/\bpython\b|\bpandas\b/i) && 'test-da-python',
    ].filter((x): x is string => !!x);
    return { title: title || 'Data Analyst', role: 'Data Analyst', testIds: ['test-da-sim', ...(tools.length ? tools.slice(0, 3) : ['test-da-excel', 'test-da-sql'])] };
  }
  if (best?.role === 'Customer Support Agent') {
    const extra = [has(/\brefunds?\b|returns?\b/i) && 'test-cs-refunds-01', has(/troubleshoot|technical|login|bug/i) && 'test-cs-troubleshoot-01'].filter((x): x is string => !!x);
    return { title: title || 'Customer Support Agent', role: 'Customer Support Agent', testIds: ['test-sim-support-01', 'test-support-triage-01', 'test-cs-comms-01', ...extra.slice(0, 1)] };
  }
  return { title, guess: best?.role, testIds: [] };
}
