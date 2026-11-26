import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, CheckCircle2, Clock, GraduationCap, MapPin, Search, Users, Video, X } from 'lucide-react';
import { Business, TeamMember } from '../types';
import { TRAINING, TRAINING_FIELDS, TRAINING_LEVELS, TrainingItem, TrainingKind, TrainingLevel, bootcampPath, pathPrice, searchTraining } from '../data/trainingCatalogue';
import { TrainingBooking, saveBooking, updateBooking, useTrainingBookings } from '../lib/trainingBookings';
import { useCurrency } from '../lib/currency';
import { STANDARD_ASSESSMENTS } from '../data/mockData';

/**
 * The company's Training: live training taught by a Granyt tutor, to book for the team. Mini modules (one skill in a few
 * hours) and job bootcamps (a role at Junior, Mid-level and Advanced). Search and filter the catalogue, open an item for
 * its sessions, outcomes and the bootcamp path, and book it for team members, online or at the office. Bookings are
 * listed with their status; the Granyt team confirms the dates and the tutor.
 */

const STATUS: Record<TrainingBooking['status'], { label: string; tone: string }> = {
  requested: { label: 'Requested', tone: 'bg-amber-50 text-amber-800 border-amber-200' },
  confirmed: { label: 'Confirmed', tone: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  completed: { label: 'Completed', tone: 'bg-slate-100 text-slate-700 border-slate-200' },
  cancelled: { label: 'Cancelled', tone: 'bg-slate-50 text-slate-400 border-slate-200' },
};

const KindBadge: React.FC<{ item: TrainingItem }> = ({ item }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${item.kind === 'Bootcamp' ? 'bg-indigo-50 text-indigo-700' : 'bg-teal-50 text-teal-700'}`}>
    {item.kind === 'Bootcamp' ? <GraduationCap className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
    {item.kind}
  </span>
);

export const TrainingCatalogue: React.FC<{
  business: Business;
  team: TeamMember[];
  nameOf: (m: TeamMember) => string;
  // An item to open straight away (from the AI chat)
  focusId?: string | null;
  onFocusUsed?: () => void;
  // Shown inside a page that has its own title (the Team tab): just the tabs, no heading
  embedded?: boolean;
}> = ({ business, team, nameOf, focusId, onFocusUsed, embedded }) => {
  const { money } = useCurrency();
  const bookings = useTrainingBookings(business.id);
  const [tab, setTab] = useState<'browse' | 'bookings'>('browse');
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<TrainingKind | ''>('');
  const [field, setField] = useState('');
  const [level, setLevel] = useState<TrainingLevel | ''>('');
  const [open, setOpen] = useState<TrainingItem | null>(null);
  const [booking, setBooking] = useState<{ item: TrainingItem; path: boolean } | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    if (!focusId) return;
    const item = TRAINING.find((t) => t.id === focusId);
    if (item) (setTab('browse'), setOpen(item));
    onFocusUsed?.();
  }, [focusId]);

  const results = useMemo(() => {
    const base = q.trim() ? searchTraining(q, 60) : TRAINING;
    return base.filter((t) => (!kind || t.kind === kind) && (!field || t.field === field) && (!level || t.level === level));
  }, [q, kind, field, level]);
  const active = bookings.filter((b) => b.status === 'requested' || b.status === 'confirmed').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        {!embedded && (
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Training</h1>
            <p className="text-sm text-slate-600 max-w-2xl">Live training for your team, taught by a Granyt tutor: short mini modules on one skill, and job bootcamps from junior to advanced. Online or at your office.</p>
          </div>
        )}
        <div role="tablist" className="flex gap-1 p-1 bg-slate-100 rounded-lg">
          {(['browse', 'bookings'] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-md text-sm font-semibold ${tab === t ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>
              {t === 'browse' ? 'Browse training' : `Your bookings${active ? ` (${active})` : ''}`}
            </button>
          ))}
        </div>
      </div>

      {done && (
        <div role="status" className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-900 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{done}</span>
          <button onClick={() => setDone(null)} className="ml-auto text-emerald-700" aria-label="Dismiss">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {tab === 'browse' ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex-1 min-w-[14rem] flex items-center gap-2 h-10 px-3 bg-white border border-slate-200 rounded-lg focus-within:border-indigo-400">
              <Search className="w-4 h-4 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search: Excel, angry customers, data analyst bootcamp…" className="flex-1 min-w-0 text-sm outline-none bg-transparent" aria-label="Search training" />
            </label>
            <div className="flex gap-1 p-1 bg-slate-100 rounded-lg" role="group" aria-label="Kind">
              {(['', 'Mini module', 'Bootcamp'] as const).map((k) => (
                <button key={k || 'all'} onClick={() => setKind(k)} aria-pressed={kind === k} className={`px-3 py-1.5 rounded-md text-xs font-semibold ${kind === k ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}>
                  {k === '' ? 'All' : k === 'Mini module' ? 'Mini modules' : 'Bootcamps'}
                </button>
              ))}
            </div>
            <select value={field} onChange={(e) => setField(e.target.value)} className="h-10 px-2 bg-white border border-slate-200 rounded-lg text-sm" aria-label="Field">
              <option value="">Every field</option>
              {TRAINING_FIELDS.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
            <select value={level} onChange={(e) => setLevel(e.target.value as TrainingLevel | '')} className="h-10 px-2 bg-white border border-slate-200 rounded-lg text-sm" aria-label="Level">
              <option value="">Every level</option>
              {TRAINING_LEVELS.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>
          <p className="text-xs text-slate-500">
            {results.length} {results.length === 1 ? 'result' : 'results'} · prices per person, excluding VAT
          </p>
          <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {results.map((t) => (
              <li key={t.id}>
                <button onClick={() => setOpen(t)} className="w-full h-full text-left bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-sm transition flex flex-col gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <KindBadge item={t} />
                    <span className="text-[11px] font-semibold text-slate-500">{t.level}</span>
                    <span className="ml-auto text-[11px] text-slate-400">{t.field}</span>
                  </div>
                  <h3 className="text-[15px] font-semibold text-slate-900 leading-snug">{t.title}</h3>
                  <p className="text-xs text-slate-600 line-clamp-2">{t.summary}</p>
                  <div className="mt-auto pt-2 flex items-center gap-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {t.duration}
                    </span>
                    <span className="ml-auto text-sm font-semibold text-slate-900">{money(t.price)}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
          {results.length === 0 && <p className="p-6 text-center text-sm text-slate-500 bg-white border border-dashed border-slate-300 rounded-xl">No training matches. Try another word, or ask us for something tailored.</p>}
        </>
      ) : (
        <Bookings bookings={bookings} team={team} nameOf={nameOf} />
      )}

      {open && !booking && <Detail item={open} onClose={() => setOpen(null)} onOpen={setOpen} onBook={(path) => setBooking({ item: open, path })} />}
      {booking && (
        <BookDialog
          business={business}
          item={booking.item}
          path={booking.path}
          team={team}
          nameOf={nameOf}
          onClose={() => setBooking(null)}
          onBooked={(b) => {
            setBooking(null);
            setOpen(null);
            setTab('bookings');
            setDone(`Requested “${b.title}” for ${b.people} ${b.people === 1 ? 'person' : 'people'}. The Granyt team will confirm the dates and your tutor within two working days.`);
          }}
        />
      )}
    </div>
  );
};

// ---------- One item ----------

const Detail: React.FC<{ item: TrainingItem; onClose: () => void; onOpen: (t: TrainingItem) => void; onBook: (path: boolean) => void }> = ({ item, onClose, onOpen, onBook }) => {
  const { money } = useCurrency();
  const path = bootcampPath(item);
  const tests = (item.testIds ?? []).map((id) => STANDARD_ASSESSMENTS.find((t) => t.id === id)).filter(Boolean);
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto" role="dialog" aria-modal="true" aria-label={item.title} onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-100 flex items-start gap-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <KindBadge item={item} />
              <span className="text-xs font-semibold text-slate-500">
                {item.level} · {item.field}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">{item.title}</h2>
            <p className="text-sm text-slate-600">{item.summary}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {[
              [Clock, 'Length', item.duration],
              [Video, 'How', 'Live with a Granyt tutor'],
              [MapPin, 'Where', 'Online or at your office'],
              [Users, 'Group', `Up to ${item.maxGroup} people`],
            ].map(([Icon, label, value]) => (
              <div key={label as string} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                {React.createElement(Icon as React.ComponentType<{ className?: string }>, { className: 'w-4 h-4 text-indigo-600 mb-1' })}
                <div className="text-slate-500">{label as string}</div>
                <div className="font-semibold text-slate-900">{value as string}</div>
              </div>
            ))}
          </div>
          <section>
            <h3 className="text-sm font-bold text-slate-900 mb-2">{item.kind === 'Bootcamp' ? 'Sessions' : 'What’s covered'}</h3>
            <ol className="space-y-2">
              {item.sessions.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-6 h-6 shrink-0 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold grid place-items-center">{i + 1}</span>
                  <span className="text-sm">
                    <span className="font-semibold text-slate-900">{s.title}</span> <span className="text-slate-600">· {s.summary}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
          <div className="grid sm:grid-cols-2 gap-6">
            <section>
              <h3 className="text-sm font-bold text-slate-900 mb-2">Your team will be able to</h3>
              <ul className="space-y-1.5">
                {item.outcomes.map((o) => (
                  <li key={o} className="flex gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
                    {o}
                  </li>
                ))}
              </ul>
            </section>
            <section className="space-y-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">Who it’s for</h3>
                <p className="text-sm text-slate-700">{item.forWho}</p>
              </div>
              {tests.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-1">Checked afterwards with</h3>
                  <p className="text-sm text-slate-700">{tests.map((t) => t!.title).join(', ')}</p>
                </div>
              )}
            </section>
          </div>
          {path.length > 1 && (
            <section>
              <h3 className="text-sm font-bold text-slate-900 mb-2">The {item.role} path</h3>
              <div className="flex flex-col sm:flex-row items-stretch gap-2">
                {path.map((p, i) => (
                  <React.Fragment key={p.id}>
                    {i > 0 && <ArrowRight className="hidden sm:block w-4 h-4 self-center text-slate-300 shrink-0" />}
                    <button onClick={() => onOpen(p)} className={`flex-1 text-left p-3 rounded-lg border ${p.id === item.id ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300'}`}>
                      <div className="text-xs font-semibold text-slate-900">{p.level}</div>
                      <div className="text-[11px] text-slate-500">{p.duration.split(' · ')[0]}</div>
                      <div className="text-xs font-semibold text-slate-900 mt-1">{money(p.price)}</div>
                    </button>
                  </React.Fragment>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">The whole path, Junior to Advanced: {money(pathPrice(item))} per person (15% less than each level on its own).</p>
            </section>
          )}
        </div>
        <div className="p-4 sm:px-6 border-t border-slate-100 flex flex-wrap items-center gap-3 sticky bottom-0 bg-white">
          <span className="text-lg font-bold text-slate-900">
            {money(item.price)} <span className="text-xs font-normal text-slate-500">per person, excl. VAT</span>
          </span>
          <span className="ml-auto flex gap-2">
            {path.length > 1 && (
              <button onClick={() => onBook(true)} className="h-10 px-4 rounded-lg border border-indigo-200 text-indigo-700 text-sm font-semibold hover:bg-indigo-50">
                Book the whole path
              </button>
            )}
            <button onClick={() => onBook(false)} className="h-10 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold" data-ref="training-book">
              Book this {item.kind === 'Bootcamp' ? 'level' : 'module'}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
};

// ---------- Booking ----------

const BookDialog: React.FC<{
  business: Business;
  item: TrainingItem;
  path: boolean;
  team: TeamMember[];
  nameOf: (m: TeamMember) => string;
  onClose: () => void;
  onBooked: (b: TrainingBooking) => void;
}> = ({ business, item, path, team, nameOf, onClose, onBooked }) => {
  const { money } = useCurrency();
  const [picked, setPicked] = useState<string[]>([]);
  const [others, setOthers] = useState(0);
  const soonest = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  const [start, setStart] = useState(soonest);
  const [delivery, setDelivery] = useState<TrainingBooking['delivery']>('Live online');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const each = path ? pathPrice(item) : item.price;
  const people = picked.length + others;
  const title = path ? `${item.role} Bootcamp: Junior to Advanced` : item.title;

  const submit = async () => {
    if (people < 1) return setError('Choose who’s coming, or add a number of people.');
    if (people > item.maxGroup) return setError(`A group can have up to ${item.maxGroup} people. For more, book a second group or tell us in the notes.`);
    setBusy(true);
    setError('');
    const b: TrainingBooking = {
      id: `tb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      businessId: business.id,
      companyName: business.name,
      itemId: item.id,
      title,
      ...(path && { path: true }),
      people,
      memberIds: picked,
      start,
      delivery,
      ...(notes.trim() && { notes: notes.trim() }),
      pricePerPerson: each,
      total: each * people,
      status: 'requested',
      createdAt: new Date().toISOString(),
    };
    try {
      await saveBooking(b);
      onBooked(b);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t send the request. Try again.');
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto" role="dialog" aria-modal="true" aria-label={`Book ${title}`}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl">
        <div className="p-5 border-b border-slate-100 flex items-start gap-3">
          <div className="flex-1">
            <div className="text-xs font-semibold text-indigo-700">Book live training</div>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4 text-sm">
          <section>
            <h3 className="font-semibold text-slate-900 mb-1.5">Who’s coming</h3>
            {team.length > 0 ? (
              <ul className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                {team.map((m) => (
                  <li key={m.id}>
                    <label className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50">
                      <input type="checkbox" className="accent-indigo-600" checked={picked.includes(m.id)} onChange={(e) => setPicked((p) => (e.target.checked ? [...p, m.id] : p.filter((x) => x !== m.id)))} />
                      {nameOf(m)}
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500">Nobody has joined your team on Granyt yet; add the number of people below.</p>
            )}
            <label className="mt-2 flex items-center gap-2 text-slate-700">
              <span>{team.length ? 'Plus people not on Granyt' : 'Number of people'}</span>
              <input type="number" min={0} max={item.maxGroup} value={others} onChange={(e) => setOthers(Math.max(0, Number(e.target.value) || 0))} className="w-20 h-8 px-2 border border-slate-200 rounded-md" />
            </label>
          </section>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-slate-400" />
                Start from
              </span>
              <input type="date" min={soonest} value={start} onChange={(e) => setStart(e.target.value)} className="w-full h-9 px-2 border border-slate-200 rounded-md" />
            </label>
            <fieldset className="space-y-1">
              <legend className="font-semibold text-slate-900 mb-1">Where</legend>
              {(['Live online', 'At your office'] as const).map((d) => (
                <label key={d} className="flex items-center gap-2">
                  <input type="radio" name="delivery" className="accent-indigo-600" checked={delivery === d} onChange={() => setDelivery(d)} />
                  {d}
                </label>
              ))}
            </fieldset>
          </div>
          <label className="block space-y-1">
            <span className="font-semibold text-slate-900">Anything the tutor should know</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Your tools and data, what the team finds hardest, preferred days and times…" className="w-full px-3 py-2 border border-slate-200 rounded-md" />
          </label>
          <div className="p-3 rounded-lg bg-slate-50 flex items-center justify-between">
            <span className="text-slate-600">
              {people} {people === 1 ? 'person' : 'people'} × {money(each)}
            </span>
            <span className="text-lg font-bold text-slate-900">{money(each * people)}</span>
          </div>
          <p className="text-xs text-slate-500">Nothing is charged now. The Granyt team confirms the dates and your tutor, then invoices you. Prices exclude VAT.</p>
          {error && <p className="text-xs text-rose-600">{error}</p>}
        </div>
        <div className="p-4 border-t border-slate-100 flex justify-end gap-2">
          <button onClick={onClose} className="h-10 px-4 rounded-lg border border-slate-200 text-sm font-semibold">
            Cancel
          </button>
          <button onClick={submit} disabled={busy} className="h-10 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold" data-ref="training-request">
            {busy ? 'Sending…' : 'Request booking'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------- Bookings ----------

const Bookings: React.FC<{ bookings: TrainingBooking[]; team: TeamMember[]; nameOf: (m: TeamMember) => string }> = ({ bookings, team, nameOf }) => {
  const { money } = useCurrency();
  if (!bookings.length) return <p className="p-6 text-center text-sm text-slate-500 bg-white border border-dashed border-slate-300 rounded-xl">No training booked yet. Browse the catalogue and book a mini module or a bootcamp for your team.</p>;
  return (
    <ul className="space-y-3">
      {bookings.map((b) => {
        const names = b.memberIds.map((id) => team.find((m) => m.id === id)).filter(Boolean).map((m) => nameOf(m!));
        return (
          <li key={b.id} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-slate-900">{b.title}</span>
                <span className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${STATUS[b.status].tone}`}>{STATUS[b.status].label}</span>
              </div>
              <div className="text-xs text-slate-500">
                {b.people} {b.people === 1 ? 'person' : 'people'}
                {names.length ? ` (${names.join(', ')}${b.people > names.length ? ` and ${b.people - names.length} more` : ''})` : ''} · from {new Date(b.start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · {b.delivery}
              </div>
              {(b.tutor || b.schedule) && (
                <div className="text-xs text-slate-700">
                  {b.tutor && <>Tutor: {b.tutor}</>}
                  {b.tutor && b.schedule && ' · '}
                  {b.schedule}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-900">{money(b.total)}</span>
              {b.status === 'requested' && (
                <button onClick={() => window.confirm(`Cancel your request for “${b.title}”?`) && updateBooking(b.id, { status: 'cancelled' })} className="text-xs font-semibold text-slate-500 hover:text-rose-600">
                  Cancel request
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
};
