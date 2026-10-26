import React, { useState } from 'react';
import { AssessmentTest, Business, Exam, User } from '../types';
import { ExamTrackingRow, TRACKING_LABELS, TrackingStatus, VIA_LABELS, examFunnel, examLink, examTracking, totalMinutes } from '../lib/exams';
import { versionTitle } from '../lib/testLevels';
import { formatDuration } from './TestLeaderboard';
import { ArrowLeft, Check, CheckCircle2, ChevronRight, Copy, Download, Link2, Mail, Plus, Search, Send, UserPlus } from 'lucide-react';

interface AssessmentsProps {
  // The company signed in; without one, the Vetter team sees every company's assessments
  business?: Business;
  exams: Exam[];
  tests: AssessmentTest[];
  candidates: User[];
  // The assessment open, or null for the list
  selectedId: string | null;
  onSelect: (examId: string | null) => void;
  onNew: () => void;
  onEmail: (examId: string, emails: string[]) => void;
  onInvite: (examId: string, candidateIds: string[]) => void;
  onOpenPerson: (personId: string) => void;
  onOpenTest: (testId: string) => void;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STATUS_STYLES: Record<TrackingStatus, string> = {
  sent: 'bg-slate-100 text-slate-600',
  opened: 'bg-sky-50 text-sky-800',
  'in-progress': 'bg-amber-50 text-amber-800',
  passed: 'bg-emerald-50 text-emerald-800',
  failed: 'bg-rose-50 text-rose-800',
};

const formatDay = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

export const CopyLinkButton: React.FC<{ examId: string; label?: string; className?: string }> = ({ examId, label = 'Copy link', className = '' }) => {
  const [copied, setCopied] = useState(false);
  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(examLink(examId));
    } catch {
      // Clipboard blocked: the link is also shown in a selectable box on the assessment
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className={`flex items-center gap-1.5 font-semibold transition-colors ${className}`}>
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
      <span>{copied ? 'Copied' : label}</span>
    </button>
  );
};

// A company's home: the assessment links it has sent, and how everyone is getting on with them
export const Assessments: React.FC<AssessmentsProps> = (props) => {
  const { business, exams: allExams, selectedId } = props;
  const exams = business ? allExams.filter((e) => e.businessId === business.id) : allExams;
  const selected = selectedId ? exams.find((e) => e.id === selectedId) : undefined;
  return selected ? <AssessmentDetail {...props} exam={selected} /> : <AssessmentList {...props} exams={exams} />;
};

const AssessmentList: React.FC<AssessmentsProps> = ({ business, exams, tests, candidates, onSelect, onNew, onOpenPerson }) => {
  const tracked = exams.map((exam) => {
    const rows = examTracking(exam, candidates);
    return { exam, rows, funnel: examFunnel(exam, rows, candidates) };
  });
  const totals = tracked.reduce(
    (acc, t) => ({
      reached: acc.reached + t.funnel.reached,
      completed: acc.completed + t.funnel.completed,
      passed: acc.passed + t.funnel.passed,
    }),
    { reached: 0, completed: 0, passed: 0 }
  );
  // The latest finished tests across every assessment
  const activity = tracked
    .flatMap(({ exam, rows }) =>
      rows.flatMap((row) =>
        exam.testIds.flatMap((testId) =>
          row.candidate.testResults
            .filter((r) => r.testId === testId && r.completedAt >= row.invitation.invitedAt)
            .map((r) => ({ exam, row, testId, result: r }))
        )
      )
    )
    .sort((a, b) => (b.result.completedTime ?? b.result.completedAt).localeCompare(a.result.completedTime ?? a.result.completedAt))
    .slice(0, 8);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Assessments</h1>
          <p className="text-sm text-slate-500 max-w-xl">
            Send candidates a link. They take the tests, and every score lands here as it comes in.
          </p>
        </div>
        <button
          onClick={onNew}
          className="self-start px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-2 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          New assessment
        </button>
      </div>

      {exams.length === 0 ? (
        <HowItWorks onNew={onNew} />
      ) : (
        <>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-200 rounded-xl overflow-hidden border border-slate-200">
            {[
              { label: 'Assessments', value: exams.length },
              { label: 'Candidates reached', value: totals.reached },
              { label: 'Finished', value: totals.completed },
              { label: 'Passed', value: totals.passed },
            ].map((s) => (
              <div key={s.label} className="bg-white px-5 py-4">
                <dt className="text-xs text-slate-500">{s.label}</dt>
                <dd className="text-2xl font-bold text-slate-900 font-mono tabular-nums">{s.value}</dd>
              </div>
            ))}
          </dl>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-6 items-start">
            <ul className="space-y-3">
              {tracked.map(({ exam, funnel }) => (
                <li key={exam.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelect(exam.id)}
                    onKeyDown={(e) => e.key === 'Enter' && onSelect(exam.id)}
                    className="group bg-white border border-slate-200 hover:border-indigo-300 rounded-xl p-5 space-y-4 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        {!business && <div className="text-[11px] font-semibold text-indigo-700">{exam.companyName}</div>}
                        <div className="text-base font-bold text-slate-900 group-hover:text-indigo-700">{exam.title}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {exam.testIds.length} {exam.testIds.length === 1 ? 'test' : 'tests'} &middot; ~{totalMinutes(exam, tests)} min &middot; pass{' '}
                          {exam.passingScore} &middot; {exam.dueDate ? `due ${formatDay(exam.dueDate)}` : 'no deadline'}
                        </div>
                      </div>
                      <CopyLinkButton
                        examId={exam.id}
                        className="shrink-0 px-3 py-1.5 text-xs text-slate-700 bg-white border border-slate-300 hover:border-indigo-400 rounded-lg"
                      />
                    </div>
                    <FunnelBar funnel={funnel} compact />
                  </div>
                </li>
              ))}
            </ul>

            <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <h2 className="text-sm font-bold text-slate-900">Latest results</h2>
              {activity.length === 0 ? (
                <p className="text-xs text-slate-500">Nothing handed in yet.</p>
              ) : (
                <ul className="space-y-3">
                  {activity.map(({ exam, row, testId, result }) => {
                    const test = tests.find((t) => t.id === testId);
                    const pass = result.score >= (test?.passingScore ?? exam.passingScore);
                    return (
                      <li key={`${exam.id}-${row.candidate.id}-${testId}-${result.completedTime ?? result.completedAt}`} className="flex items-start gap-2.5 text-xs">
                        <img src={row.candidate.avatarUrl} alt="" referrerPolicy="no-referrer" className="w-7 h-7 rounded-full object-cover bg-slate-100 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <button onClick={() => onOpenPerson(row.candidate.id)} className="font-semibold text-slate-900 hover:text-indigo-700">
                            {row.candidate.name}
                          </button>
                          <div className="text-slate-500 truncate">
                            {test ? test.title : testId} &middot; {exam.title}
                          </div>
                        </div>
                        <span className={`font-mono font-bold tabular-nums ${pass ? 'text-emerald-700' : 'text-rose-700'}`}>{result.score}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
};

const HowItWorks: React.FC<{ onNew: () => void }> = ({ onNew }) => (
  <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 sm:p-12 text-center space-y-6">
    <ol className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left max-w-3xl mx-auto">
      {[
        { icon: Plus, title: 'Pick tests', text: "Choose from Vetter's tests or your own." },
        { icon: Link2, title: 'Send the link', text: 'Email it or paste it anywhere: job ads, careers pages, chats.' },
        { icon: CheckCircle2, title: 'See results', text: 'Track who opened it, who finished and who passed.' },
      ].map((s, i) => (
        <li key={s.title} className="space-y-2">
          <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center">
            <s.icon className="w-4 h-4" />
          </div>
          <div className="text-sm font-bold text-slate-900">
            {i + 1}. {s.title}
          </div>
          <p className="text-xs text-slate-500">{s.text}</p>
        </li>
      ))}
    </ol>
    <button onClick={onNew} className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg inline-flex items-center gap-2">
      <Plus className="w-4 h-4" />
      Create your first assessment
    </button>
  </div>
);

const FunnelBar: React.FC<{ funnel: ReturnType<typeof examFunnel>; compact?: boolean }> = ({ funnel, compact }) => {
  const stages = [
    { label: 'Sent', value: funnel.reached },
    { label: 'Opened', value: funnel.opened },
    { label: 'Started', value: funnel.started },
    { label: 'Finished', value: funnel.completed },
    { label: 'Passed', value: funnel.passed },
  ];
  const max = Math.max(1, funnel.reached);
  return (
    <div className={`grid grid-cols-5 ${compact ? 'gap-2' : 'gap-3'}`}>
      {stages.map((s, i) => (
        <div key={s.label} className="min-w-0">
          <div className={`${compact ? 'h-1.5' : 'h-2'} bg-slate-100 rounded-full overflow-hidden`}>
            <div
              className={`h-full rounded-full ${i === stages.length - 1 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
              style={{ width: `${(s.value / max) * 100}%` }}
            />
          </div>
          <div className={`mt-1.5 flex items-baseline gap-1 ${compact ? 'text-[11px]' : 'text-xs'}`}>
            <span className={`font-bold text-slate-900 tabular-nums ${compact ? '' : 'text-lg'}`}>{s.value}</span>
            <span className="text-slate-500 truncate">{s.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

const FILTERS: { id: TrackingStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'Everyone' },
  { id: 'sent', label: 'Not opened' },
  { id: 'opened', label: 'Opened' },
  { id: 'in-progress', label: 'In progress' },
  { id: 'passed', label: 'Passed' },
  { id: 'failed', label: 'Below pass mark' },
];

// Finished first, best score first; then by how far they've got
const rank = (a: ExamTrackingRow, b: ExamTrackingRow) => {
  if ((a.progress.score === undefined) !== (b.progress.score === undefined)) return a.progress.score === undefined ? 1 : -1;
  if (a.progress.score !== undefined && b.progress.score !== undefined) return b.progress.score - a.progress.score;
  return b.progress.done - a.progress.done;
};

const AssessmentDetail: React.FC<AssessmentsProps & { exam: Exam }> = ({
  exam,
  business,
  tests,
  candidates,
  onSelect,
  onEmail,
  onInvite,
  onOpenPerson,
  onOpenTest,
}) => {
  const [filter, setFilter] = useState<TrackingStatus | 'all'>('all');
  const rows = examTracking(exam, candidates).sort(rank);
  const funnel = examFunnel(exam, rows, candidates);
  const examTests = exam.testIds.map((id) => tests.find((t) => t.id === id)).filter((t): t is AssessmentTest => !!t);
  const shown = filter === 'all' ? rows : rows.filter((r) => r.status === filter);
  const accountEmails = new Set(candidates.map((c) => c.email.toLowerCase()));
  const pendingEmails = (exam.invitedEmails ?? []).filter((e) => !accountEmails.has(e));

  const downloadCsv = () => {
    const header = ['Name', 'Email', 'Got it by', 'Status', ...examTests.map((t) => versionTitle(t)), 'Overall', 'Minutes', 'Last activity'];
    const lines = rows.map((r) => [
      r.candidate.name,
      r.candidate.email,
      VIA_LABELS[r.invitation.via ?? 'invite'],
      TRACKING_LABELS[r.status],
      ...examTests.map((t) => r.progress.scores[t.id] ?? ''),
      r.progress.score ?? '',
      r.progress.seconds ? Math.round(r.progress.seconds / 60) : '',
      r.progress.lastActivity?.split('T')[0] ?? '',
    ]);
    const csv = [header, ...lines].map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `${exam.title.replace(/[^\w]+/g, '-').toLowerCase()}-results.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <button onClick={() => onSelect(null)} className="text-xs font-semibold text-slate-500 hover:text-indigo-700 flex items-center gap-1">
        <ArrowLeft className="w-3.5 h-3.5" />
        All assessments
      </button>

      <div className="space-y-2">
        {!business && <div className="text-xs font-semibold text-indigo-700">{exam.companyName}</div>}
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{exam.title}</h1>
        <p className="text-sm text-slate-600 max-w-2xl">{exam.description}</p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {examTests.map((t, i) => (
            <button
              key={t.id}
              onClick={() => onOpenTest(t.id)}
              className="text-xs px-2.5 py-1 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-full text-slate-700"
            >
              {i + 1}. {versionTitle(t)}
            </button>
          ))}
          <span className="text-xs text-slate-500">
            &middot; ~{totalMinutes(exam, tests)} min &middot; pass mark {exam.passingScore}
            {examTests.length > 1 ? ' average' : ''} &middot; {exam.dueDate ? `due ${formatDay(exam.dueDate)}` : 'no deadline'}
          </span>
        </div>
      </div>

      <SharePanel exam={exam} candidates={candidates} onEmail={onEmail} onInvite={onInvite} />

      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <FunnelBar funnel={funnel} />
      </section>

      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center gap-3">
          <h2 className="text-base font-bold text-slate-900">Candidates</h2>
          <div className="flex flex-wrap gap-1.5 sm:ml-4">
            {FILTERS.map((f) => {
              const count = f.id === 'all' ? rows.length : rows.filter((r) => r.status === f.id).length;
              return (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  aria-pressed={filter === f.id}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                    filter === f.id ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
                  }`}
                >
                  {f.label} <span className="tabular-nums opacity-70">{count}</span>
                </button>
              );
            })}
          </div>
          {rows.length > 0 && (
            <button onClick={downloadCsv} className="sm:ml-auto text-xs font-semibold text-slate-600 hover:text-indigo-700 flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" />
              Download CSV
            </button>
          )}
        </div>

        {shown.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-500 text-center">
            {rows.length === 0 ? 'Nobody has opened the link yet. Send it above.' : 'Nobody here.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="px-5 py-2.5 font-medium">#</th>
                  <th className="px-2 py-2.5 font-medium">Candidate</th>
                  <th className="px-2 py-2.5 font-medium">Status</th>
                  {examTests.map((t, i) => (
                    <th key={t.id} className="px-2 py-2.5 font-medium text-right whitespace-nowrap" title={versionTitle(t)}>
                      Test {i + 1}
                    </th>
                  ))}
                  {examTests.length > 1 && <th className="px-2 py-2.5 font-medium text-right">Overall</th>}
                  <th className="px-2 py-2.5 font-medium text-right">Time</th>
                  <th className="px-5 py-2.5 font-medium text-right whitespace-nowrap">Last activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shown.map((r) => {
                  const place = r.progress.score !== undefined ? rows.indexOf(r) + 1 : undefined;
                  return (
                    <tr key={r.candidate.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3 font-mono text-slate-400 tabular-nums">{place ?? '–'}</td>
                      <td className="px-2 py-3">
                        <button onClick={() => onOpenPerson(r.candidate.id)} className="flex items-center gap-2.5 text-left group">
                          <img src={r.candidate.avatarUrl} alt="" referrerPolicy="no-referrer" className="w-8 h-8 rounded-full object-cover bg-slate-100 shrink-0" />
                          <span className="min-w-0">
                            <span className="block font-semibold text-slate-900 group-hover:text-indigo-700 whitespace-nowrap">{r.candidate.name}</span>
                            <span className="block text-slate-500 whitespace-nowrap">
                              {VIA_LABELS[r.invitation.via ?? 'invite']} &middot; {formatDay(r.invitation.invitedAt)}
                            </span>
                          </span>
                        </button>
                      </td>
                      <td className="px-2 py-3">
                        <span className={`px-2 py-0.5 rounded-full font-semibold whitespace-nowrap ${STATUS_STYLES[r.status]}`}>{TRACKING_LABELS[r.status]}</span>
                      </td>
                      {examTests.map((t) => {
                        const s = r.progress.scores[t.id];
                        return (
                          <td key={t.id} className="px-2 py-3 text-right font-mono tabular-nums">
                            {s === undefined ? (
                              <span className="text-slate-300">–</span>
                            ) : (
                              <span className={s >= t.passingScore ? 'text-slate-900' : 'text-rose-700'}>{s}</span>
                            )}
                          </td>
                        );
                      })}
                      {examTests.length > 1 && (
                        <td className="px-2 py-3 text-right font-mono font-bold tabular-nums">
                          {r.progress.score === undefined ? (
                            <span className="text-slate-300 font-normal">–</span>
                          ) : (
                            <span className={r.progress.score >= exam.passingScore ? 'text-emerald-700' : 'text-rose-700'}>{r.progress.score}</span>
                          )}
                        </td>
                      )}
                      <td className="px-2 py-3 text-right font-mono text-slate-600 tabular-nums whitespace-nowrap">
                        {r.progress.seconds ? formatDuration(r.progress.seconds) : '–'}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-500 whitespace-nowrap">
                        {r.progress.lastActivity
                          ? formatDay(r.progress.lastActivity)
                          : r.invitation.openedAt
                          ? `Opened ${formatDay(r.invitation.openedAt)}`
                          : '–'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pendingEmails.length > 0 && (filter === 'all' || filter === 'sent') && (
          <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Emailed, no Vetter account yet ({pendingEmails.length}):</span> {pendingEmails.join(', ')}
          </div>
        )}
      </section>
    </div>
  );
};

// Sending the link: copy it, email it, or pick people already on Vetter
const SharePanel: React.FC<{
  exam: Exam;
  candidates: User[];
  onEmail: AssessmentsProps['onEmail'];
  onInvite: AssessmentsProps['onInvite'];
}> = ({ exam, candidates, onEmail, onInvite }) => {
  const [mode, setMode] = useState<'email' | 'vetter'>('email');
  const [emailsText, setEmailsText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [chosen, setChosen] = useState<string[]>([]);
  const link = examLink(exam.id);

  const flash = (message: string) => {
    setSent(message);
    setTimeout(() => setSent(null), 4000);
  };

  const sendEmails = () => {
    const emails = [...new Set(emailsText.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean))];
    const invalid = emails.filter((e) => !EMAIL.test(e));
    if (emails.length === 0 || invalid.length > 0) {
      setError(emails.length === 0 ? 'Enter at least one email address.' : `Not an email address: ${invalid.join(', ')}`);
      return;
    }
    setError(null);
    onEmail(exam.id, emails);
    const subject = `${exam.companyName}: ${exam.title}`;
    const body = `Hi,\n\n${exam.companyName} would like you to take ${exam.title} on Vetter (${exam.testIds.length} ${
      exam.testIds.length === 1 ? 'test' : 'tests'
    }). Your results go straight to ${exam.companyName}.\n\nStart here: ${link}\n`;
    window.location.href = `mailto:?bcc=${encodeURIComponent(emails.join(','))}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setEmailsText('');
    flash(`Sent to ${emails.length} ${emails.length === 1 ? 'person' : 'people'}. They're tracked below.`);
  };

  const invitedIds = new Set(exam.invitations.map((i) => i.candidateId));
  const q = query.trim().toLowerCase();
  const invitable = candidates
    .filter((c) => !invitedIds.has(c.id))
    .filter((c) => !q || `${c.name} ${c.title} ${c.location}`.toLowerCase().includes(q))
    .slice(0, 6);

  return (
    <section className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-5 space-y-4">
      <div className="space-y-2">
        <label htmlFor="exam-link" className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
          <Link2 className="w-4 h-4 text-indigo-600" />
          Assessment link
        </label>
        <div className="flex gap-2">
          <input
            id="exam-link"
            readOnly
            value={link}
            onFocus={(e) => e.target.select()}
            className="flex-1 min-w-0 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-700"
          />
          <CopyLinkButton examId={exam.id} className="px-4 py-2 text-xs text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shrink-0" />
        </div>
        <p className="text-xs text-slate-500">Anyone who opens it can take the tests, and their results come back to you.</p>
      </div>

      <div className="pt-4 border-t border-indigo-100 space-y-3">
        <div className="flex gap-1">
          {(
            [
              { id: 'email', label: 'Email it', icon: Mail },
              { id: 'vetter', label: 'Invite people on Vetter', icon: UserPlus },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              aria-pressed={mode === m.id}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                mode === m.id ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <m.icon className="w-3.5 h-3.5" />
              {m.label}
            </button>
          ))}
        </div>

        {sent && (
          <p className="text-xs text-emerald-800 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> {sent}
          </p>
        )}

        {mode === 'email' ? (
          <div className="space-y-2">
            <textarea
              rows={2}
              value={emailsText}
              onChange={(e) => {
                setEmailsText(e.target.value);
                setError(null);
              }}
              aria-label="Email addresses"
              placeholder="alex@uni.ac.uk, sam@uni.ac.uk"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-500"
            />
            {error && <p className="text-xs font-semibold text-rose-700">{error}</p>}
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={sendEmails} className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-700 rounded-lg flex items-center gap-2">
                <Send className="w-3.5 h-3.5" />
                Send
              </button>
              <span className="text-[11px] text-slate-500">Opens your email app with the link filled in. Everyone is BCC'd.</span>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, title or location"
                aria-label="Search candidates"
                className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
            <ul className="bg-white divide-y divide-slate-100 border border-slate-200 rounded-lg">
              {invitable.length === 0 && <li className="px-3 py-2.5 text-xs text-slate-500">No candidates match.</li>}
              {invitable.map((c) => (
                <li key={c.id}>
                  <label className="px-3 py-2 flex items-center gap-3 text-xs cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={chosen.includes(c.id)}
                      onChange={(e) => setChosen((prev) => (e.target.checked ? [...prev, c.id] : prev.filter((x) => x !== c.id)))}
                      className="accent-indigo-600"
                    />
                    <img src={c.avatarUrl} alt="" referrerPolicy="no-referrer" className="w-6 h-6 rounded-full object-cover bg-slate-100" />
                    <span className="font-semibold text-slate-900 whitespace-nowrap">{c.name}</span>
                    <span className="text-slate-500 truncate">
                      {c.title} &middot; {c.location}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <button
              onClick={() => {
                onInvite(exam.id, chosen);
                flash(`Invited ${chosen.length}. They've been notified.`);
                setChosen([]);
              }}
              disabled={chosen.length === 0}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-700 disabled:opacity-40 rounded-lg flex items-center gap-2"
            >
              <ChevronRight className="w-3.5 h-3.5" />
              Invite {chosen.length > 0 ? chosen.length : ''}
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
