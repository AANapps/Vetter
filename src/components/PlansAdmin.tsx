import React, { useEffect, useState } from 'react';
import { Coins, Layers, RefreshCw, Save } from 'lucide-react';
import { collection, deleteField, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { aiFetch, pounds } from '../lib/aiRequest';
import {
  ALL_FEATURES,
  DEFAULT_PLANS,
  FEATURE_NAMES,
  PLANS,
  PlanId,
  PlanStatus,
  RANK,
  TierSettings,
  applyTiers,
  storedLimit,
} from '../../server/plans';

const TIERS: PlanId[] = RANK;
type Row = { key: 'monthly' | 'jobs' | 'applicantsPerJob' | 'seats' | 'aiAllowance'; label: string; pounds?: boolean; limit?: boolean };
const ROWS: Row[] = [
  { key: 'monthly', label: 'Price (£ a month; per job: £ a pass)' },
  { key: 'jobs', label: 'Open jobs', limit: true },
  { key: 'applicantsPerJob', label: 'Candidates shown per job', limit: true },
  { key: 'seats', label: 'Seats', limit: true },
  { key: 'aiAllowance', label: 'AI included (£ a month; free: once)', pounds: true },
];

// What each tier includes: price, limits, AI allowance and which features it unlocks, saved to settings/plans. The
// site and the server both read it (the server within a minute); changing a price makes a new Stripe price for new
// subscribers, and existing ones keep theirs until they change plan
export const PlanTiersAdmin: React.FC = () => {
  const [draft, setDraft] = useState<Record<PlanId, typeof PLANS.free> | null>(null);
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    getDoc(doc(db(), 'settings', 'plans'))
      .then((snap) => {
        applyTiers((snap.data()?.tiers as TierSettings | undefined) ?? null);
        setDraft(Object.fromEntries(TIERS.map((id) => [id, { ...PLANS[id], features: [...PLANS[id].features] }])) as Record<PlanId, typeof PLANS.free>);
      })
      .catch((err) => setError(String(err?.message ?? err)));
  }, []);
  if (!draft) return <section className="bg-white border border-slate-200 rounded-2xl p-5 text-sm text-slate-500">{error || 'Loading plans…'}</section>;

  const set = (id: PlanId, change: Partial<typeof PLANS.free>) => {
    setState('idle');
    setDraft({ ...draft, [id]: { ...draft[id], ...change } });
  };
  const save = async () => {
    setError('');
    setState('saving');
    const tiers: TierSettings = Object.fromEntries(
      TIERS.map((id) => {
        const t = draft[id];
        return [id, { monthly: t.monthly, jobs: storedLimit(t.jobs), applicantsPerJob: storedLimit(t.applicantsPerJob), seats: storedLimit(t.seats), aiAllowance: t.aiAllowance, features: t.features }];
      })
    );
    try {
      await setDoc(doc(db(), 'settings', 'plans'), { tiers });
      applyTiers(tiers);
      setState('saved');
    } catch (err) {
      setState('idle');
      setError(err instanceof Error ? err.message : 'Couldn’t save.');
    }
  };
  const reset = () => {
    setState('idle');
    setDraft(Object.fromEntries(TIERS.map((id) => [id, { ...DEFAULT_PLANS[id], features: [...DEFAULT_PLANS[id].features] }])) as Record<PlanId, typeof PLANS.free>);
  };

  const cell = (id: PlanId, row: Row) => {
    const v = draft[id][row.key];
    const unlimited = row.limit && !Number.isFinite(v);
    return (
      <span className="flex items-center gap-1 justify-center">
        <input
          type="number"
          min={0}
          disabled={unlimited}
          value={unlimited ? '' : row.pounds ? v / 100 : v}
          onChange={(e) => set(id, { [row.key]: Math.max(0, row.pounds ? Math.round(Number(e.target.value) * 100) : Number(e.target.value)) })}
          className="w-16 px-1.5 py-1 border border-slate-300 rounded text-right disabled:bg-slate-100"
          aria-label={`${PLANS[id].name}: ${row.label}`}
        />
        {row.limit && (
          <label className="flex items-center gap-0.5 text-[10px] text-slate-500" title="No limit">
            <input type="checkbox" checked={unlimited} onChange={(e) => set(id, { [row.key]: e.target.checked ? Infinity : DEFAULT_PLANS[id][row.key] === Infinity ? 1 : DEFAULT_PLANS[id][row.key] })} />∞
          </label>
        )}
      </span>
    );
  };

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
      <h3 className="font-bold flex items-center gap-2">
        <Layers className="w-4 h-4 text-indigo-600" /> Plan tiers
      </h3>
      <p className="text-xs text-slate-500">
        What each plan includes. Saved for everyone at once: the pricing page, every paywall and the server&rsquo;s AI allowance. A price change applies to new
        subscribers; existing ones keep their price until they change plan.
      </p>
      <div className="overflow-x-auto -mx-5 px-5">
        <table className="text-xs min-w-[760px] w-full">
          <thead>
            <tr className="text-slate-500">
              <th className="text-left py-2 font-semibold w-56"></th>
              {TIERS.map((id) => (
                <th key={id} className="py-2 font-bold text-slate-900">
                  {PLANS[id].name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.key} className="border-t border-slate-100">
                <td className="py-1.5 pr-2 text-slate-600">{row.label}</td>
                {TIERS.map((id) => (
                  <td key={id} className="py-1.5 px-1">
                    {cell(id, row)}
                  </td>
                ))}
              </tr>
            ))}
            {ALL_FEATURES.map((f) => (
              <tr key={f} className="border-t border-slate-100">
                <td className="py-1.5 pr-2 text-slate-600">{FEATURE_NAMES[f]}</td>
                {TIERS.map((id) => (
                  <td key={id} className="py-1.5 text-center">
                    <input
                      type="checkbox"
                      checked={draft[id].features.includes(f)}
                      onChange={(e) => set(id, { features: e.target.checked ? [...draft[id].features, f] : draft[id].features.filter((x) => x !== f) })}
                      aria-label={`${PLANS[id].name}: ${FEATURE_NAMES[f]}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error && <p className="text-xs text-red-700">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={state === 'saving'}
          className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-700 disabled:opacity-50 rounded-lg inline-flex items-center gap-1"
        >
          <Save className="w-3.5 h-3.5" /> {state === 'saving' ? 'Saving…' : state === 'saved' ? 'Saved' : 'Save plans'}
        </button>
        <button onClick={reset} className="text-xs font-semibold text-slate-600 hover:text-slate-900">
          Back to the defaults
        </button>
      </div>
    </section>
  );
};

type CompanyRow = { id: string; name: string; plan?: PlanId; status?: string };
type Status = PlanStatus & { error?: string };

async function admin(payload: Record<string, unknown>): Promise<Status> {
  try {
    const res = await aiFetch('/api/billing', payload);
    const body = await res.json().catch(() => ({}));
    return res.ok ? body : { ...body, error: body.error || 'Couldn’t reach billing.' };
  } catch {
    return { error: 'Couldn’t reach billing. Check your connection.' } as Status;
  }
}

// Any company: give it a plan (on top of anything it pays for), give it AI credit, and set how much of this month's
// AI it has used, to try it at different levels
export const CompanyPlansAdmin: React.FC = () => {
  const [companies, setCompanies] = useState<CompanyRow[] | null>(null);
  const [filter, setFilter] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const load = () =>
    getDocs(collection(db(), 'companies'))
      .then((snap) => setCompanies(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CompanyRow, 'id'>) })).sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))))
      .catch((err) => setError(String(err?.message ?? err)));
  useEffect(() => {
    load();
  }, []);

  const shown = (companies ?? []).filter((c) => !filter || `${c.name} ${c.id}`.toLowerCase().includes(filter.toLowerCase()));
  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-bold flex items-center gap-2">
          <Coins className="w-4 h-4 text-indigo-600" /> Companies: plans and credit
        </h3>
        <button onClick={load} className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>
      <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Find a company" className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg" />
      {error && <p className="text-xs text-red-700">{error}</p>}
      {!companies && !error && <p className="text-sm text-slate-500">Loading…</p>}
      <ul className="divide-y divide-slate-100 max-h-[32rem] overflow-y-auto">
        {shown.map((c) => (
          <li key={c.id} className="py-2">
            <button onClick={() => setOpenId(openId === c.id ? null : c.id)} className="w-full flex items-center justify-between gap-2 text-sm text-left">
              <span className="min-w-0">
                <span className="font-semibold">{c.name || c.id}</span> <span className="text-xs text-slate-500">{c.id}</span>
              </span>
              <span className="text-xs font-semibold text-slate-600 shrink-0">{c.plan ? `Given ${PLANS[c.plan]?.name ?? c.plan}` : ''}</span>
            </button>
            {openId === c.id && <CompanyBilling company={c} onPlanSaved={(plan) => setCompanies((list) => list && list.map((x) => (x.id === c.id ? { ...x, plan } : x)))} />}
          </li>
        ))}
      </ul>
    </section>
  );
};

const CompanyBilling: React.FC<{ company: CompanyRow; onPlanSaved: (plan?: PlanId) => void }> = ({ company, onPlanSaved }) => {
  const [status, setStatus] = useState<Status | null>(null);
  const [grant, setGrant] = useState('10');
  const [note, setNote] = useState('');
  const [used, setUsed] = useState('');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  const run = async (label: string, payload: Record<string, unknown>, done?: string) => {
    setBusy(label);
    setMessage('');
    const next = await admin({ ...payload, companyId: company.id });
    setBusy('');
    if (next.error) return setMessage(next.error);
    setStatus(next);
    setUsed(String((next.ai?.used ?? 0) / 100));
    if (done) setMessage(done);
  };
  useEffect(() => {
    run('load', { action: 'admin-status' });
  }, [company.id]);

  const givePlan = async (plan: PlanId | '') => {
    setBusy('plan');
    try {
      await updateDoc(doc(db(), 'companies', company.id), { plan: plan || deleteField() });
      onPlanSaved(plan || undefined);
      await run('load', { action: 'admin-status' }, plan ? `${company.name} now has ${PLANS[plan].name}, whatever it pays for.` : 'Plan taken away: it’s back to what it pays for.');
    } catch (err) {
      setBusy('');
      setMessage(err instanceof Error ? err.message : 'Couldn’t save the plan.');
    }
  };

  const ai = status?.ai;
  return (
    <div className="mt-2 p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
      {status && !status.error && (
        <p className="text-slate-600">
          On <b className="text-slate-900">{PLANS[status.plan]?.name ?? status.plan}</b>
          {status.renewsAt && ` (subscription, ${status.cancelsAtEnd ? 'ends' : 'renews'} ${new Date(status.renewsAt).toLocaleDateString()})`}
          {status.passes?.length ? ` · ${status.passes.length} job pass${status.passes.length === 1 ? '' : 'es'}` : ''}
          {ai && ` · AI ${pounds(ai.used)} of ${pounds(ai.allowance)} used · credit ${pounds(ai.credit)}`}
        </p>
      )}
      {busy === 'load' && <p className="text-slate-500">Reading Stripe…</p>}

      <label className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-slate-700 w-28">Give a plan</span>
        <select value={company.plan ?? ''} disabled={!!busy} onChange={(e) => givePlan(e.target.value as PlanId | '')} className="px-2 py-1 border border-slate-300 rounded bg-white">
          <option value="">None (what it pays for)</option>
          {RANK.filter((id) => id !== 'free').map((id) => (
            <option key={id} value={id}>
              {PLANS[id].name}
            </option>
          ))}
        </select>
        <span className="text-slate-500">Counts on top of any subscription: the higher wins.</span>
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-slate-700 w-28">Give AI credit</span>
        £<input type="number" min={0.01} step={1} value={grant} onChange={(e) => setGrant(e.target.value)} className="w-20 px-2 py-1 border border-slate-300 rounded" />
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="flex-1 min-w-32 px-2 py-1 border border-slate-300 rounded" />
        <button
          disabled={!!busy || !(Number(grant) > 0)}
          onClick={() => run('grant', { action: 'admin-grant', pence: Math.round(Number(grant) * 100), note }, `£${Number(grant).toFixed(2)} of AI credit given. It shows in their usage as credit from Granyt.`)}
          className="px-3 py-1 font-semibold text-white bg-slate-900 hover:bg-slate-700 disabled:opacity-50 rounded"
        >
          {busy === 'grant' ? 'Giving…' : 'Give'}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-slate-700 w-28">AI used this period</span>
        £<input type="number" min={0} step={0.5} value={used} onChange={(e) => setUsed(e.target.value)} className="w-20 px-2 py-1 border border-slate-300 rounded" />
        {ai && (
          <span className="flex gap-1">
            {[0, 0.5, 1].map((share) => (
              <button key={share} onClick={() => setUsed(String((ai.allowance * share) / 100))} className="px-2 py-1 rounded border border-slate-300 bg-white font-semibold text-slate-600">
                {share === 1 ? 'Used up' : share === 0 ? 'Reset' : '50%'}
              </button>
            ))}
          </span>
        )}
        <button
          disabled={!!busy || used === ''}
          onClick={() => run('usage', { action: 'admin-usage', used: Math.round(Number(used) * 100) }, 'Usage set. Their allowance left follows it straight away.')}
          className="px-3 py-1 font-semibold text-white bg-slate-900 hover:bg-slate-700 disabled:opacity-50 rounded"
        >
          {busy === 'usage' ? 'Setting…' : 'Set'}
        </button>
      </div>
      {message && <p className="text-slate-800">{message}</p>}
    </div>
  );
};
