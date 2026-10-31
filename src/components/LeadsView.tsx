import React, { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  Bookmark,
  CalendarDays,
  Columns3,
  Download,
  ExternalLink,
  Filter,
  List,
  Search,
  Star,
  StickyNote,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { ArchiveReason, JobPosting, Lead, LeadStage } from '../types';
import {
  ARCHIVE_REASONS,
  LEAD_STAGES,
  LeadFilters,
  LeadRow,
  LeadSort,
  LeadSource,
  LeadTestStatus,
  SORT_LABELS,
  SOURCE_LABELS,
  TEST_STATUS_LABELS,
  activeFilterCount,
  emptyLeadFilters,
  leadsCsv,
  matchesLeadFilters,
  sortLeads,
  stageInfo,
} from '../lib/leads';
import { CANDIDATE_LEVELS, CAREER_STAGES } from '../lib/audience';

export type LeadChange = Partial<Pick<Lead, 'stage' | 'rating' | 'note' | 'archiveReason' | 'dueDate' | 'tags'>>;

interface LeadsViewProps {
  rows: LeadRow[];
  // The company's jobs, to filter by
  jobs: JobPosting[];
  // Set on a job's own page: only its leads, and no job filter
  fixedJob?: JobPosting;
  onUpdateLead: (row: LeadRow, change: LeadChange) => void;
  onOpenPerson: (personId: string) => void;
  // From the overall view, open a job's own leads
  onOpenJobLeads?: (jobId: string) => void;
}

const TIERS = ['Top Match', 'Strong Fit', 'Borderline', 'Needs Upskilling'];
const WORK_PREFS = ['Remote', 'Hybrid', 'On-site'] as const;
const SOURCES = Object.keys(SOURCE_LABELS) as LeadSource[];
const TEST_STATUSES = Object.keys(TEST_STATUS_LABELS) as LeadTestStatus[];

// Ready-made views for the questions recruiters ask most
const PRESETS: { id: string; label: string; filters: Partial<LeadFilters>; sort?: LeadSort }[] = [
  { id: 'review', label: 'To review', filters: { stages: ['applied'], testStatuses: ['passed'] }, sort: 'score' },
  { id: 'interviews', label: 'Interviews', filters: { stages: ['interview'] }, sort: 'due' },
  { id: 'offers', label: 'Offers out', filters: { stages: ['offer'] }, sort: 'due' },
  { id: 'top', label: 'Top matches', filters: { tiers: ['Top Match'] }, sort: 'fit' },
  { id: 'starred', label: '4+ stars', filters: { minRating: 4 }, sort: 'rating' },
  { id: 'quiet', label: 'Gone quiet', filters: { idleFor: 14, stages: ['invited', 'applied', 'screening', 'interview', 'offer'] }, sort: 'activity' },
  { id: 'archived', label: 'Archived', filters: { stages: ['archived'] }, sort: 'activity' },
];

const SAVED_KEY = 'vetter-lead-views';
type SavedView = { name: string; filters: LeadFilters; sort: LeadSort };
const readSaved = (): SavedView[] => {
  try {
    return JSON.parse(localStorage.getItem(SAVED_KEY) ?? '[]') as SavedView[];
  } catch {
    return [];
  }
};

const formatDay = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

const Stars: React.FC<{ value?: number; onChange?: (v: number | undefined) => void; size?: string }> = ({ value = 0, onChange, size = 'w-3.5 h-3.5' }) => (
  <span className="inline-flex items-center">
    {[1, 2, 3, 4, 5].map((n) =>
      onChange ? (
        <button
          key={n}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChange(value === n ? undefined : n);
          }}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          className="p-0.5"
        >
          <Star className={`${size} ${n <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
        </button>
      ) : (
        <Star key={n} className={`${size} ${n <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
      )
    )}
  </span>
);

const StageChip: React.FC<{ stage: LeadStage }> = ({ stage }) => {
  const s = stageInfo(stage);
  return <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${s.chip}`}>{s.label}</span>;
};

const ScoreText: React.FC<{ row: LeadRow }> = ({ row }) =>
  row.progress.score !== undefined ? (
    <span className={`font-mono tabular-nums font-bold ${row.progress.score >= row.job.testPassingScore ? 'text-emerald-700' : 'text-rose-700'}`}>{row.progress.score}</span>
  ) : row.testStatus === 'no-tests' ? (
    <span className="text-slate-300">–</span>
  ) : (
    <span className="text-slate-400">
      {row.progress.done}/{row.progress.total}
    </span>
  );

const Chips = <T extends string>({ options, selected, onChange, label }: { options: readonly T[]; selected: T[]; onChange: (v: T[]) => void; label?: (v: T) => string }) => (
  <div className="flex flex-wrap gap-1.5">
    {options.map((o) => (
      <button
        key={o}
        type="button"
        onClick={() => onChange(toggle(selected, o))}
        aria-pressed={selected.includes(o)}
        className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
          selected.includes(o) ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
        }`}
      >
        {label ? label(o) : o}
      </button>
    ))}
  </div>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="space-y-1.5">
    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
    {children}
  </div>
);

// A company's hiring pipeline: every candidate for its jobs by stage, as a board or a table, with filters for almost
// everything Vetter knows about them. On a job's page it shows only that job's
export const LeadsView: React.FC<LeadsViewProps> = ({ rows, jobs, fixedJob, onUpdateLead, onOpenPerson, onOpenJobLeads }) => {
  const [filters, setFilters] = useState<LeadFilters>(emptyLeadFilters);
  const [sort, setSort] = useState<LeadSort>('activity');
  const [view, setView] = useState<'board' | 'table'>('board');
  const [showFilters, setShowFilters] = useState(false);
  const [preset, setPreset] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedView[]>(readSaved);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropStage, setDropStage] = useState<LeadStage | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
    } catch {
      // Saved views then last for the visit
    }
  }, [saved]);

  const set = (change: Partial<LeadFilters>) => {
    setFilters((f) => ({ ...f, ...change }));
    setPreset(null);
  };
  const applyPreset = (p: (typeof PRESETS)[number]) => {
    if (preset === p.id) {
      setFilters(emptyLeadFilters());
      setPreset(null);
      return;
    }
    setFilters({ ...emptyLeadFilters(), ...p.filters });
    if (p.sort) setSort(p.sort);
    setPreset(p.id);
  };

  const shown = useMemo(() => sortLeads(rows.filter((r) => matchesLeadFilters(r, filters)), sort), [rows, filters, sort]);
  // Stage counts ignore the stage filter, so they say how many each stage would show
  const stageCounts = useMemo(() => {
    const f = { ...filters, stages: [], showArchived: true };
    const counts: Record<string, number> = {};
    for (const r of rows) if (matchesLeadFilters(r, f)) counts[r.stage] = (counts[r.stage] ?? 0) + 1;
    return counts;
  }, [rows, filters]);
  const filterCount = activeFilterCount(filters);
  const boardStages = LEAD_STAGES.filter((s) => (filters.stages.length ? filters.stages.includes(s.id) : s.id !== 'archived' || filters.showArchived));
  const departments = [...new Set(jobs.map((j) => j.department).filter(Boolean))];
  const tags = [...new Set(rows.flatMap((r) => r.lead?.tags ?? []))].sort();
  const openRow = rows.find((r) => r.id === openId);
  const selectedRows = shown.filter((r) => selected.has(r.id));

  const moveTo = (row: LeadRow, stage: LeadStage) => {
    if (row.stage !== stage) onUpdateLead(row, { stage, ...(stage === 'archived' && !row.lead?.archiveReason ? { archiveReason: 'Other' } : {}) });
  };
  const bulkMove = (stage: LeadStage, archiveReason?: ArchiveReason) => {
    selectedRows.forEach((r) => onUpdateLead(r, { stage, ...(stage === 'archived' ? { archiveReason: archiveReason ?? 'Other' } : {}) }));
    setSelected(new Set());
  };
  const downloadCsv = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([leadsCsv(shown)], { type: 'text/csv' }));
    a.download = `${fixedJob ? fixedJob.title.replace(/[^\w]+/g, '-').toLowerCase() + '-' : ''}leads.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const saveView = () => {
    const name = window.prompt('Name this view', '')?.trim();
    if (name) setSaved((prev) => [...prev.filter((v) => v.name !== name), { name, filters, sort }]);
  };

  const card = (r: LeadRow) => (
    <div
      key={r.id}
      draggable
      onDragStart={(e) => {
        setDragId(r.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDragEnd={() => {
        setDragId(null);
        setDropStage(null);
      }}
      onClick={() => setOpenId(r.id)}
      className={`rounded-lg bg-white border p-3 space-y-2 cursor-pointer hover:border-indigo-300 hover:shadow-sm transition ${
        dragId === r.id ? 'opacity-40' : ''
      } ${openId === r.id ? 'border-indigo-400 ring-1 ring-indigo-400' : 'border-slate-200'}`}
    >
      <div className="flex items-center gap-2">
        <img src={r.candidate.avatarUrl} alt="" referrerPolicy="no-referrer" className="w-7 h-7 rounded-full object-cover bg-slate-100 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-slate-900 truncate">{r.candidate.name}</div>
          <div className="text-[11px] text-slate-500 truncate">{fixedJob ? r.candidate.title : r.job.title}</div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="text-slate-500">
          Tests <ScoreText row={r} />
        </span>
        <span className="text-slate-500">
          Fit <span className="font-mono font-semibold text-slate-800">{r.fit}%</span>
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <Stars value={r.lead?.rating} size="w-3 h-3" />
        <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
          {r.lead?.note && <StickyNote className="w-3 h-3" />}
          {r.lead?.dueDate && (
            <span className="inline-flex items-center gap-0.5 text-amber-700">
              <CalendarDays className="w-3 h-3" />
              {formatDay(r.lead.dueDate)}
            </span>
          )}
        </span>
      </div>
      {(r.lead?.tags?.length || r.lead?.archiveReason) && (
        <div className="flex flex-wrap gap-1">
          {r.lead?.archiveReason && <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 text-[10px] font-medium">{r.lead.archiveReason}</span>}
          {r.lead?.tags?.map((t) => (
            <span key={t} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium">
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Each stage with how many are in it; click one to show only that stage */}
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
        {LEAD_STAGES.map((s) => {
          const on = filters.stages.includes(s.id);
          return (
            <button
              key={s.id}
              onClick={() => set({ stages: toggle(filters.stages, s.id) })}
              aria-pressed={on}
              className={`rounded-xl border p-3 text-left transition ${on ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white hover:border-slate-400'}`}
            >
              <span className="flex items-center gap-1.5 text-[11px] font-semibold">
                <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                {s.label}
              </span>
              <span className="block mt-1 text-xl font-extrabold tabular-nums">{stageCounts[s.id] ?? 0}</span>
            </button>
          );
        })}
      </div>

      {/* Quick views and saved views */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => applyPreset(p)}
            aria-pressed={preset === p.id}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold ${
              preset === p.id ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
            }`}
          >
            {p.label}
          </button>
        ))}
        {saved.map((v) => (
          <span key={v.name} className="shrink-0 inline-flex items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
            <button
              onClick={() => {
                setFilters({ ...emptyLeadFilters(), ...v.filters });
                setSort(v.sort);
                setPreset(null);
              }}
              className="pl-3 pr-1 py-1.5 inline-flex items-center gap-1"
            >
              <Bookmark className="w-3 h-3" />
              {v.name}
            </button>
            <button onClick={() => setSaved((prev) => prev.filter((x) => x.name !== v.name))} aria-label={`Delete view ${v.name}`} className="pr-2 pl-0.5 py-1.5 text-slate-400 hover:text-rose-600">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>

      {/* Search, filters, sort and view */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative flex-1 min-w-[12rem]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={filters.query}
            onChange={(e) => set({ query: e.target.value })}
            placeholder={fixedJob ? 'Search name, title, notes, tags' : 'Search name, job, notes, tags'}
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-indigo-400"
          />
        </label>
        <button
          onClick={() => setShowFilters((s) => !s)}
          aria-expanded={showFilters}
          className={`h-9 px-3 rounded-lg border text-sm font-semibold inline-flex items-center gap-1.5 ${
            filterCount ? 'border-indigo-300 bg-indigo-50 text-indigo-800' : 'border-slate-200 text-slate-700 hover:border-slate-400'
          }`}
        >
          <Filter className="w-4 h-4" /> Filters{filterCount ? ` (${filterCount})` : ''}
        </button>
        <select value={sort} onChange={(e) => setSort(e.target.value as LeadSort)} aria-label="Sort" className="h-9 px-2 rounded-lg border border-slate-200 text-sm text-slate-700 bg-white">
          {(Object.keys(SORT_LABELS) as LeadSort[]).map((s) => (
            <option key={s} value={s}>
              {SORT_LABELS[s]}
            </option>
          ))}
        </select>
        <label className="h-9 px-3 rounded-lg border border-slate-200 text-sm text-slate-700 inline-flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={filters.showArchived} onChange={(e) => set({ showArchived: e.target.checked })} className="accent-indigo-600" />
          Archived
        </label>
        <div className="h-9 inline-flex rounded-lg border border-slate-200 overflow-hidden">
          {(['board', 'table'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              aria-pressed={view === v}
              aria-label={v === 'board' ? 'Board view' : 'Table view'}
              className={`px-3 inline-flex items-center gap-1.5 text-sm font-semibold ${view === v ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {v === 'board' ? <Columns3 className="w-4 h-4" /> : <List className="w-4 h-4" />}
              <span className="hidden sm:inline capitalize">{v}</span>
            </button>
          ))}
        </div>
      </div>

      {showFilters && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {!fixedJob && jobs.length > 1 && (
              <Field label="Job">
                <Chips options={jobs.map((j) => j.id)} selected={filters.jobIds} onChange={(jobIds) => set({ jobIds })} label={(id) => jobs.find((j) => j.id === id)?.title ?? id} />
              </Field>
            )}
            {!fixedJob && departments.length > 1 && (
              <Field label="Department">
                <Chips options={departments} selected={filters.departments} onChange={(d) => set({ departments: d })} />
              </Field>
            )}
            <Field label="Stage">
              <Chips options={LEAD_STAGES.map((s) => s.id)} selected={filters.stages} onChange={(stages) => set({ stages })} label={(s) => stageInfo(s).label} />
            </Field>
            <Field label="How they came in">
              <Chips options={SOURCES} selected={filters.sources} onChange={(sources) => set({ sources })} label={(s) => SOURCE_LABELS[s]} />
            </Field>
            <Field label="Job tests">
              <Chips options={TEST_STATUSES} selected={filters.testStatuses} onChange={(testStatuses) => set({ testStatuses })} label={(s) => TEST_STATUS_LABELS[s]} />
            </Field>
            <Field label="Match">
              <Chips options={TIERS} selected={filters.tiers} onChange={(tiers) => set({ tiers })} />
            </Field>
            <Field label="Wants to work">
              <Chips options={WORK_PREFS} selected={filters.workPrefs} onChange={(workPrefs) => set({ workPrefs })} />
            </Field>
            <Field label="Career stage">
              <Chips options={CAREER_STAGES} selected={filters.careerStages} onChange={(careerStages) => set({ careerStages })} />
            </Field>
            <Field label="Level">
              <Chips options={CANDIDATE_LEVELS} selected={filters.levels} onChange={(levels) => set({ levels })} />
            </Field>
            <Field label={`Fit at least ${filters.minFit}%`}>
              <input type="range" min={0} max={100} step={5} value={filters.minFit} onChange={(e) => set({ minFit: Number(e.target.value) })} className="w-full accent-indigo-600" />
            </Field>
            <Field label={`Test score at least ${filters.minScore}`}>
              <input type="range" min={0} max={100} step={5} value={filters.minScore} onChange={(e) => set({ minScore: Number(e.target.value) })} className="w-full accent-indigo-600" />
            </Field>
            <Field label={`Experience ${filters.minYears}+ years`}>
              <input type="range" min={0} max={15} value={filters.minYears} onChange={(e) => set({ minYears: Number(e.target.value) })} className="w-full accent-indigo-600" />
            </Field>
            <Field label="Rating at least">
              <Stars value={filters.minRating} onChange={(v) => set({ minRating: v ?? 0 })} size="w-4 h-4" />
            </Field>
            <Field label="Added">
              <select value={filters.addedWithin} onChange={(e) => set({ addedWithin: Number(e.target.value) })} className="w-full h-9 px-2 rounded-lg border border-slate-200 text-sm bg-white">
                <option value={0}>Any time</option>
                <option value={7}>In the last 7 days</option>
                <option value={30}>In the last 30 days</option>
                <option value={90}>In the last 90 days</option>
              </select>
            </Field>
            <Field label="No activity for">
              <select value={filters.idleFor} onChange={(e) => set({ idleFor: Number(e.target.value) })} className="w-full h-9 px-2 rounded-lg border border-slate-200 text-sm bg-white">
                <option value={0}>Any</option>
                <option value={7}>7+ days</option>
                <option value={14}>14+ days</option>
                <option value={30}>30+ days</option>
              </select>
            </Field>
            <Field label="City">
              <input value={filters.city} onChange={(e) => set({ city: e.target.value })} placeholder="e.g. London" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white" />
            </Field>
            <Field label="Tag">
              {tags.length ? (
                <select value={filters.tag} onChange={(e) => set({ tag: e.target.value })} className="w-full h-9 px-2 rounded-lg border border-slate-200 text-sm bg-white">
                  <option value="">Any</option>
                  {tags.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-slate-500">Tag leads from their panel to filter by tag.</p>
              )}
            </Field>
            <Field label="Archive reason">
              <Chips options={ARCHIVE_REASONS} selected={filters.archiveReasons} onChange={(archiveReasons) => set({ archiveReasons })} />
            </Field>
            <Field label="Has">
              <div className="flex flex-wrap gap-4 text-sm text-slate-700">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={filters.hasNote} onChange={(e) => set({ hasNote: e.target.checked })} className="accent-indigo-600" /> A note
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={filters.hasDueDate} onChange={(e) => set({ hasDueDate: e.target.checked })} className="accent-indigo-600" /> A date set
                </label>
              </div>
            </Field>
          </div>
          <div className="flex items-center gap-4 pt-1">
            <button onClick={() => set(emptyLeadFilters())} className="text-xs font-semibold text-slate-600 hover:text-slate-900">
              Clear all
            </button>
            <button onClick={saveView} className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 inline-flex items-center gap-1">
              <Bookmark className="w-3.5 h-3.5" /> Save this view
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
        <span>
          Showing <span className="font-semibold text-slate-900">{shown.length}</span> of {rows.length} leads
        </span>
        {shown.length > 0 && (
          <button onClick={downloadCsv} className="font-semibold text-slate-600 hover:text-indigo-700 inline-flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" /> Download CSV
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 px-5 py-10 text-sm text-slate-500 text-center">
          No leads yet. Everyone you send {fixedJob ? "this job's" : "a job's"} tests to, and everyone who applies, shows up here.
        </p>
      ) : view === 'board' ? (
        // Drag a card to another column to move it to that stage
        <div className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 sm:mx-0 sm:px-0">
          {boardStages.map((s) => {
            const inStage = shown.filter((r) => r.stage === s.id);
            return (
              <div
                key={s.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDropStage(s.id);
                }}
                onDragLeave={() => setDropStage((d) => (d === s.id ? null : d))}
                onDrop={(e) => {
                  e.preventDefault();
                  const row = rows.find((r) => r.id === dragId);
                  if (row) moveTo(row, s.id);
                  setDragId(null);
                  setDropStage(null);
                }}
                className={`w-64 shrink-0 rounded-xl p-2 space-y-2 transition-colors ${dropStage === s.id && dragId ? 'bg-indigo-50 ring-2 ring-indigo-300' : 'bg-slate-100/70'}`}
              >
                <div className="flex items-center justify-between px-1.5 pt-1">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                    {s.label}
                  </span>
                  <span className="text-xs font-semibold text-slate-500 tabular-nums">{inStage.length}</span>
                </div>
                <div className="space-y-2 min-h-[4rem]">{inStage.map(card)}</div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          {selectedRows.length > 0 && (
            <div className="px-4 py-2.5 bg-indigo-50 border-b border-indigo-100 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-indigo-900">{selectedRows.length} selected</span>
              <span className="text-indigo-300">·</span>
              <span className="text-indigo-900">Move to</span>
              {LEAD_STAGES.filter((s) => s.id !== 'archived').map((s) => (
                <button key={s.id} onClick={() => bulkMove(s.id)} className="px-2 py-1 rounded-full bg-white border border-indigo-200 font-semibold text-indigo-800 hover:bg-indigo-100">
                  {s.label}
                </button>
              ))}
              <select
                value=""
                onChange={(e) => e.target.value && bulkMove('archived', e.target.value as ArchiveReason)}
                aria-label="Archive selected with a reason"
                className="px-2 py-1 rounded-full bg-white border border-rose-200 font-semibold text-rose-700"
              >
                <option value="">Archive…</option>
                {ARCHIVE_REASONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
              <button onClick={() => setSelected(new Set())} className="ml-auto font-semibold text-slate-500 hover:text-slate-900">
                Clear
              </button>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100 bg-white">
                  <th className="pl-4 pr-1 py-2.5">
                    <input
                      type="checkbox"
                      aria-label="Select all shown"
                      checked={shown.length > 0 && selectedRows.length === shown.length}
                      onChange={(e) => setSelected(e.target.checked ? new Set(shown.map((r) => r.id)) : new Set())}
                      className="accent-indigo-600"
                    />
                  </th>
                  <th className="px-2 py-2.5 font-medium">Candidate</th>
                  {!fixedJob && <th className="px-2 py-2.5 font-medium">Job</th>}
                  <th className="px-2 py-2.5 font-medium">Stage</th>
                  <th className="px-2 py-2.5 font-medium text-right">Tests</th>
                  <th className="px-2 py-2.5 font-medium text-right">Fit</th>
                  <th className="px-2 py-2.5 font-medium">Rating</th>
                  <th className="px-2 py-2.5 font-medium">Source</th>
                  <th className="px-2 py-2.5 font-medium whitespace-nowrap">Date</th>
                  <th className="px-2 py-2.5 font-medium">Added</th>
                  <th className="pl-2 pr-4 py-2.5 font-medium whitespace-nowrap">Last activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {shown.map((r) => (
                  <tr key={r.id} onClick={() => setOpenId(r.id)} className={`cursor-pointer hover:bg-slate-50 ${openId === r.id ? 'bg-indigo-50/50' : ''}`}>
                    <td className="pl-4 pr-1 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`Select ${r.candidate.name}`}
                        checked={selected.has(r.id)}
                        onChange={() =>
                          setSelected((prev) => {
                            const next = new Set(prev);
                            if (next.has(r.id)) next.delete(r.id);
                            else next.add(r.id);
                            return next;
                          })
                        }
                        className="accent-indigo-600"
                      />
                    </td>
                    <td className="px-2 py-2.5">
                      <span className="flex items-center gap-2">
                        <img src={r.candidate.avatarUrl} alt="" referrerPolicy="no-referrer" className="w-7 h-7 rounded-full object-cover bg-slate-100 shrink-0" />
                        <span className="min-w-0">
                          <span className="block font-semibold text-slate-900 whitespace-nowrap">{r.candidate.name}</span>
                          <span className="block text-slate-500 whitespace-nowrap">{r.candidate.location}</span>
                        </span>
                      </span>
                    </td>
                    {!fixedJob && <td className="px-2 py-2.5 text-slate-700 whitespace-nowrap">{r.job.title}</td>}
                    <td className="px-2 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={r.stage}
                        onChange={(e) => moveTo(r, e.target.value as LeadStage)}
                        aria-label={`Stage for ${r.candidate.name}`}
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold border-0 ${stageInfo(r.stage).chip}`}
                      >
                        {LEAD_STAGES.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      <ScoreText row={r} />
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono tabular-nums text-slate-800">{r.fit}%</td>
                    <td className="px-2 py-2.5">
                      <Stars value={r.lead?.rating} size="w-3 h-3" />
                    </td>
                    <td className="px-2 py-2.5 text-slate-600 whitespace-nowrap">{SOURCE_LABELS[r.source]}</td>
                    <td className="px-2 py-2.5 text-amber-700 whitespace-nowrap">{r.lead?.dueDate ? formatDay(r.lead.dueDate) : ''}</td>
                    <td className="px-2 py-2.5 text-slate-500 whitespace-nowrap">{formatDay(r.addedAt)}</td>
                    <td className="pl-2 pr-4 py-2.5 text-slate-500 whitespace-nowrap">{formatDay(r.lastActivity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {shown.length === 0 && <p className="px-5 py-8 text-sm text-slate-500 text-center">No leads match these filters.</p>}
          </div>
        </div>
      )}

      {openRow && (
        <LeadPanel
          row={openRow}
          showJob={!fixedJob}
          onChange={(change) => onUpdateLead(openRow, change)}
          onOpenPerson={() => onOpenPerson(openRow.candidate.id)}
          onOpenJobLeads={onOpenJobLeads ? () => onOpenJobLeads(openRow.job.id) : undefined}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
};

const DATE_LABELS: Partial<Record<LeadStage, string>> = { interview: 'Interview date', offer: 'Offer expires', screening: 'Call date' };

// One lead: move it on, rate it, add a date, tags and a note, and see its history
const LeadPanel: React.FC<{
  row: LeadRow;
  showJob: boolean;
  onChange: (change: LeadChange) => void;
  onOpenPerson: () => void;
  onOpenJobLeads?: () => void;
  onClose: () => void;
}> = ({ row, showJob, onChange, onOpenPerson, onOpenJobLeads, onClose }) => {
  const [note, setNote] = useState(row.lead?.note ?? '');
  const [tagText, setTagText] = useState('');
  useEffect(() => setNote(row.lead?.note ?? ''), [row.id]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const c = row.candidate;
  const tags = row.lead?.tags ?? [];
  const addTag = () => {
    const t = tagText.trim();
    if (t && !tags.includes(t)) onChange({ tags: [...tags, t] });
    setTagText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={`${c.name}, lead`}>
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-slate-900/20" />
      <aside className="relative w-full max-w-md h-full bg-white shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-start gap-3">
          <img src={c.avatarUrl} alt="" referrerPolicy="no-referrer" className="w-12 h-12 rounded-full object-cover bg-slate-100 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="font-bold text-slate-900">{c.name}</div>
            <div className="text-xs text-slate-500">{c.title}</div>
            <div className="text-xs text-slate-500">
              {c.location} · {c.yearsExperience} yrs · wants {c.workPreference.toLowerCase()}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1 text-slate-400 hover:text-slate-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-6">
          <div className="flex flex-wrap gap-3 text-xs">
            <button onClick={onOpenPerson} className="font-semibold text-indigo-700 hover:text-indigo-900 inline-flex items-center gap-1">
              <ExternalLink className="w-3.5 h-3.5" /> View profile
            </button>
            {showJob && onOpenJobLeads && (
              <button onClick={onOpenJobLeads} className="font-semibold text-indigo-700 hover:text-indigo-900">
                {row.job.title} leads &rarr;
              </button>
            )}
          </div>

          <Field label="Stage">
            <div className="flex flex-wrap gap-1.5">
              {LEAD_STAGES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onChange({ stage: s.id, ...(s.id === 'archived' && !row.lead?.archiveReason ? { archiveReason: 'Other' } : {}) })}
                  aria-pressed={row.stage === s.id}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold border inline-flex items-center gap-1.5 ${
                    row.stage === s.id ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                  {s.label}
                </button>
              ))}
            </div>
            {row.stage === 'archived' && (
              <select
                value={row.lead?.archiveReason ?? 'Other'}
                onChange={(e) => onChange({ archiveReason: e.target.value as ArchiveReason })}
                aria-label="Archive reason"
                className="mt-2 w-full h-9 px-2 rounded-lg border border-slate-200 text-sm bg-white"
              >
                {ARCHIVE_REASONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            )}
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Your rating">
              <Stars value={row.lead?.rating} onChange={(rating) => onChange({ rating })} size="w-5 h-5" />
            </Field>
            <Field label={DATE_LABELS[row.stage] ?? 'Date'}>
              <input
                type="date"
                value={row.lead?.dueDate ?? ''}
                onChange={(e) => onChange({ dueDate: e.target.value || undefined })}
                className="w-full h-9 px-2 rounded-lg border border-slate-200 text-sm"
              />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-[11px] text-slate-500">Job tests</div>
              <div className="mt-0.5 text-lg">
                <ScoreText row={row} />
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-[11px] text-slate-500">Fit</div>
              <div className="mt-0.5 text-lg font-mono font-bold text-slate-900">{row.fit}%</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-[11px] text-slate-500">Match</div>
              <div className="mt-1 text-xs font-semibold text-slate-900">{row.tier}</div>
            </div>
          </div>
          <p className="text-xs text-slate-500 -mt-3">
            {TEST_STATUS_LABELS[row.testStatus]} · came in by {SOURCE_LABELS[row.source].toLowerCase()} · added {formatDay(row.addedAt)}
            {showJob && <> · for {row.job.title}</>}
          </p>

          <Field label="Tags">
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-xs text-slate-700">
                  <Tag className="w-3 h-3" />
                  {t}
                  <button onClick={() => onChange({ tags: tags.filter((x) => x !== t) })} aria-label={`Remove tag ${t}`} className="text-slate-400 hover:text-rose-600">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <input
                value={tagText}
                onChange={(e) => setTagText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTag()}
                onBlur={addTag}
                placeholder="Add a tag"
                className="w-28 h-6 px-2 rounded-full border border-dashed border-slate-300 text-xs focus:outline-none focus:border-indigo-400"
              />
            </div>
          </Field>

          <Field label="Note">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={() => note !== (row.lead?.note ?? '') && onChange({ note })}
              rows={4}
              placeholder="Only your company sees this"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-indigo-400"
            />
          </Field>

          <Field label="History">
            <ol className="space-y-2">
              {(row.lead?.history ?? [{ stage: row.stage, at: row.addedAt }])
                .slice()
                .reverse()
                .map((h, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs">
                    <StageChip stage={h.stage} />
                    <span className="text-slate-500">{new Date(h.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </li>
                ))}
            </ol>
          </Field>

          {row.stage !== 'archived' && (
            <button onClick={() => onChange({ stage: 'archived', archiveReason: 'Not a fit' })} className="w-full py-2 rounded-lg border border-rose-200 text-sm font-semibold text-rose-700 hover:bg-rose-50 inline-flex items-center justify-center gap-1.5">
              <Archive className="w-4 h-4" /> Archive
            </button>
          )}
          {row.lead && (
            <button
              onClick={() => onChange({ stage: row.applied ? 'applied' : 'invited', rating: undefined, note: '', tags: [], dueDate: undefined })}
              className="w-full text-xs font-semibold text-slate-500 hover:text-slate-900 inline-flex items-center justify-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> Reset to start
            </button>
          )}
        </div>
      </aside>
    </div>
  );
};
