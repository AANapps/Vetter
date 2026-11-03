import React from 'react';
import { AssessmentTest, Business, User } from '../types';
import { getLeaderboard } from '../lib/leaderboard';
import { CheckCircle2, ChevronRight, Lock, Trash2, XCircle } from 'lucide-react';
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
  // The person's own list: takes a test off their record. Results already sent to a company stay, so a poor score
  // can't be hidden from an employer
  onDelete?: (testId: string) => void;
  // Companies and the Vetter team see the integrity label on each test; candidates don't
  showIntegrity?: boolean;
}

const formatDay = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

// Every test someone has taken, best score first: Vetter's tests with their rank, and company tests where the viewer may see them
export const TestHistory: React.FC<TestHistoryProps> = ({ person, tests, candidates, businesses, companyResultsFor, onOpenTest, emptyText, onDelete, showIntegrity }) => {
  const rows = [...new Set(person.testResults.map((r) => r.testId))]
    .flatMap((testId) => {
      const test = tests.find((t) => t.id === testId);
      if (!test) return [];
      const attempts = person.testResults.filter((r) => r.testId === testId);
      // Vetter's tests are public; a company's own test is seen only by that company. Which company a result
      // was sent to is seen only by that company too.
      const sentTo = [...new Set(attempts.map((r) => r.referredBy ?? (test.type === 'custom' ? test.businessId : undefined)))].filter(
        (id): id is string => !!id
      );
      const sharedWith = companyResultsFor === 'all' ? sentTo : sentTo.filter((id) => id === companyResultsFor);
      const visible = companyResultsFor === 'all' || test.type === 'standard' || sharedWith.length > 0;
      if (!visible) return [];
      const best = Math.max(...attempts.map((r) => r.score));
      const last = attempts.map((r) => r.completedTime ?? r.completedAt).sort().at(-1)!;
      const board = test.type === 'standard' ? getLeaderboard(testId, candidates) : [];
      const entry = board.find((e) => e.candidate.id === person.id);
      const monitored = attempts.filter((r) => r.integrity).sort((a, b) => (a.completedTime ?? a.completedAt).localeCompare(b.completedTime ?? b.completedAt)).at(-1);
      const sittings = monitored?.integrity ? [{ testTitle: test.title, completedAt: monitored.completedTime ?? monitored.completedAt, report: monitored.integrity }] : [];
      return [{ test, best, attempts: attempts.length, last, rank: entry?.rank, of: board.length, sharedWith, sittings }];
    })
    .sort((a, b) => b.last.localeCompare(a.last));

  if (rows.length === 0) return <p className="text-xs text-slate-500">{emptyText ?? 'No tests taken yet.'}</p>;

  return (
    <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white">
      {rows.map(({ test, best, attempts, last, rank, of, sharedWith, sittings }) => {
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
                  {test.type === 'standard' ? test.difficulty : `${test.companyName}'s test`} &middot; {formatDay(last)}
                  {attempts > 1 && ` · ${attempts} attempts`}
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
                <span className={`block text-base font-bold font-mono tabular-nums ${passed ? 'text-slate-900' : 'text-rose-700'}`}>{best}</span>
                <span className="block text-[10px] text-slate-400">pass {test.passingScore}</span>
              </span>
              {onOpenTest && <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />}
            </Row>
            {showIntegrity && (
              <span className="pr-3 shrink-0">
                <IntegrityBadge sittings={sittings} />
              </span>
            )}
            {onDelete &&
              (sharedWith.length > 0 ? (
                <span
                  className="p-2 mr-2 text-slate-300"
                  title={`Sent to ${sharedWith.map((id) => businesses.find((b) => b.id === id)?.name ?? 'a company').join(', ')}, so it stays on your record`}
                  aria-label="Can't be deleted: sent to a company"
                >
                  <Lock className="w-4 h-4" />
                </span>
              ) : (
                <button
                  onClick={() => {
                    if (window.confirm(`Delete ${test.title} from your tests? Your ${attempts === 1 ? 'score' : `${attempts} attempts`}, rank and verified skill from it will be removed. This can't be undone.`))
                      onDelete(test.id);
                  }}
                  className="p-2 mr-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                  aria-label={`Delete ${test.title}`}
                  title="Delete from your tests"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              ))}
          </li>
        );
      })}
    </ul>
  );
};
