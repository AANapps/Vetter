import React from 'react';
import { AssessmentTest, Business, TestDifficulty, User, isPublic } from '../types';
import { tierIndex } from '../lib/modules';
import { getLeaderboard } from '../lib/leaderboard';
import { CheckCircle2, ChevronRight, Eye, EyeOff, XCircle } from 'lucide-react';
import { unfinishedStarts } from '../lib/results';
import { IntegrityBadge } from './IntegrityBadge';

interface TestHistoryProps {
  person: User;
  tests: AssessmentTest[];
  // Everyone, to rank them on Vetter's tests
  candidates: User[];
  businesses: Business[];
  // Which company results the viewer may see: 'all' (the person themselves and the Vetter team), one company's, or none
  companyResultsFor: 'all' | string | null;
  onOpenTest?: (testId: string) => void;
  emptyText?: string;
  // The person's own list: hides a test from their public profile, or shows it again. Nothing is ever deleted, and
  // companies always see every attempt
  onToggleHidden?: (testId: string) => void;
  // Companies and the Vetter team see the integrity label on each test; candidates don't
  showIntegrity?: boolean;
}

const formatDay = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

// Every test someone has taken, best score first: Vetter's tests with their rank, and company tests where the viewer may see them
export const TestHistory: React.FC<TestHistoryProps> = ({ person, tests, candidates, businesses, companyResultsFor, onOpenTest, emptyText, onToggleHidden, showIntegrity }) => {
  const hiddenIds = person.hiddenTestIds ?? [];
  // Everyone but the public sees every attempt and every start left unfinished
  const fullRecord = companyResultsFor !== null;
  const rows = [...new Set([...person.testResults.map((r) => r.testId), ...(fullRecord ? (person.testStarts ?? []).map((s) => s.testId) : [])])]
    .flatMap((testId) => {
      const test = tests.find((t) => t.id === testId);
      if (!test) return [];
      const hidden = hiddenIds.includes(testId);
      // Hidden from the public profile: other candidates and visitors don't see it
      if (hidden && !fullRecord) return [];
      const unfinished = fullRecord ? unfinishedStarts(person, testId) : 0;
      const attempts = person.testResults.filter((r) => r.testId === testId);
      // Vetter's tests are public; a company's own test is seen only by that company. Which company a result
      // was sent to is seen only by that company too.
      const sentTo = [...new Set(attempts.map((r) => r.referredBy ?? (test.type === 'custom' ? test.businessId : undefined)))].filter(
        (id): id is string => !!id
      );
      const sharedWith = companyResultsFor === 'all' ? sentTo : sentTo.filter((id) => id === companyResultsFor);
      const visible = companyResultsFor === 'all' || isPublic(test) || sharedWith.length > 0;
      if (!visible) return [];
      // Started but never finished: shown to companies, with no score
      if (attempts.length === 0 && unfinished === 0) return [];
      const best = attempts.length ? Math.max(...attempts.map((r) => r.score)) : 0;
      const last = [...attempts.map((r) => r.completedTime ?? r.completedAt), ...(person.testStarts ?? []).filter((s) => s.testId === testId).map((s) => s.startedAt)].sort().at(-1)!;
      // Every score, oldest first, so a company sees the whole run of attempts
      const scores = [...attempts].sort((a, b) => (a.completedTime ?? a.completedAt).localeCompare(b.completedTime ?? b.completedAt)).map((r) => r.score);
      const board = isPublic(test) ? getLeaderboard(testId, candidates) : [];
      const entry = board.find((e) => e.candidate.id === person.id);
      const monitored = attempts.filter((r) => r.integrity).sort((a, b) => (a.completedTime ?? a.completedAt).localeCompare(b.completedTime ?? b.completedAt)).at(-1);
      const sittings = monitored?.integrity ? [{ testTitle: test.title, completedAt: monitored.completedTime ?? monitored.completedAt, report: monitored.integrity }] : [];
      // Module tests: the highest level reached on any attempt
      const reached = attempts
        .map((r) => r.breakdown?.levelReached)
        .filter((l): l is TestDifficulty => !!l)
        .sort((a, b) => tierIndex(b) - tierIndex(a))[0];
      return [{ test, best, attempts: attempts.length, last, rank: entry?.rank, of: board.length, sharedWith, sittings, reached, hidden, unfinished, scores }];
    })
    .sort((a, b) => b.last.localeCompare(a.last));

  if (rows.length === 0) return <p className="text-xs text-slate-500">{emptyText ?? 'No tests taken yet.'}</p>;

  return (
    <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white">
      {rows.map(({ test, best, attempts, last, rank, of, sharedWith, sittings, reached, hidden, unfinished, scores }) => {
        const passed = best >= test.passingScore;
        const Row = onOpenTest ? 'button' : 'div';
        return (
          <li key={test.id} className="flex items-center">
            <Row
              {...(onOpenTest ? { onClick: () => onOpenTest(test.id) } : {})}
              className={`flex-1 min-w-0 text-left px-4 py-3 flex items-center gap-3 ${onOpenTest ? 'hover:bg-slate-50 group' : ''}`}
            >
              {passed ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <XCircle className="w-5 h-5 text-slate-300 shrink-0" />}
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-900 group-hover:text-indigo-700 truncate">{test.title}</span>
                <span className="block text-xs text-slate-500">
                  {test.type === 'standard' ? test.difficulty : `${test.companyName}'s test`}
                  {reached && reached !== test.difficulty && ` (reached ${reached})`} &middot; {formatDay(last)}
                  {attempts > 1 && (fullRecord ? ` · attempts: ${scores.join(', ')}` : ` · ${attempts} attempts`)}
                  {unfinished > 0 && <span className="text-amber-700"> · {unfinished} left unfinished</span>}
                  {hidden && fullRecord && <span className="text-slate-400"> · hidden from public profile</span>}
                  {sharedWith.length > 0 &&
                    ` · sent to ${sharedWith.map((id) => businesses.find((b) => b.id === id)?.name ?? 'a company').join(', ')}`}
                </span>
              </span>
              {rank !== undefined && (
                <span className="hidden sm:block text-xs text-slate-500 tabular-nums shrink-0">
                  #{rank} of {of}
                </span>
              )}
              <span className="text-right shrink-0 w-14">
                <span className={`block text-base font-bold font-mono tabular-nums ${attempts === 0 ? 'text-slate-400' : passed ? 'text-slate-900' : 'text-rose-700'}`}>{attempts === 0 ? '—' : best}</span>
                <span className="block text-[10px] text-slate-400">pass {test.passingScore}</span>
              </span>
              {onOpenTest && <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />}
            </Row>
            {showIntegrity && (
              <span className="pr-3 shrink-0">
                <IntegrityBadge sittings={sittings} />
              </span>
            )}
            {onToggleHidden && (
              <button
                onClick={() => onToggleHidden(test.id)}
                className="p-2 mr-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                aria-label={hidden ? `Show ${test.title} on your public profile` : `Hide ${test.title} from your public profile`}
                title={hidden ? 'Hidden from your public profile (companies still see it). Show it again' : 'Hide from your public profile. Companies still see it'}
              >
                {hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
};
