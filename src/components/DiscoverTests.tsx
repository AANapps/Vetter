import React from 'react';
import { ChevronRight, Clock } from 'lucide-react';
import { AssessmentTest, User } from '../types';
import { familyIdOf, isMainVersion } from '../lib/testLevels';
import { getBestTestScore } from '../lib/matchingAlgorithm';

const SHOWN = 6;

interface DiscoverTestsProps {
  tests: AssessmentTest[];
  allCandidates: User[];
  viewer: User;
  onOpenTest: (testId: string) => void;
  onBrowseTests: () => void;
}

// Vetter tests, busiest today first, so the order shifts as people take them
export const DiscoverTests: React.FC<DiscoverTestsProps> = ({ tests, allCandidates, viewer, onOpenTest, onBrowseTests }) => {
  const today = new Date().toISOString().split('T')[0];
  const results = allCandidates.flatMap((c) => c.testResults);
  const ranked = tests
    .filter((t) => t.type === 'standard' && isMainVersion(t))
    .map((test) => {
      // Every level of a test counts toward it
      const ids = new Set(tests.filter((t) => familyIdOf(t) === test.id).map((t) => t.id));
      const family = results.filter((r) => ids.has(r.testId));
      return { test, today: family.filter((r) => r.completedAt === today).length, total: family.length };
    })
    .sort((a, b) => b.today - a.today || b.total - a.total)
    .slice(0, SHOWN);

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-bold text-slate-900">Tests</h2>
        <button onClick={onBrowseTests} className="flex items-center gap-0.5 text-xs font-semibold text-indigo-700 hover:text-indigo-800">
          All tests <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {ranked.map(({ test, today: takenToday }) => {
          const best = getBestTestScore(viewer, test.id);
          return (
            <button
              key={test.id}
              onClick={() => onOpenTest(test.id)}
              className="text-left p-4 bg-white hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-200 rounded-xl transition-colors space-y-2 shadow-xs"
            >
              <div className="text-[11px] font-mono uppercase tracking-wider text-indigo-700 font-bold truncate">{test.category}</div>
              <div className="text-sm font-semibold text-slate-900 line-clamp-2">{test.title}</div>
              <div className="flex items-center gap-3 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {test.estimatedMinutes}m
                </span>
                <span className="tabular-nums">{takenToday} taken today</span>
                <span className={`ml-auto font-semibold ${best !== undefined ? 'text-slate-900 font-mono' : 'text-indigo-700'}`}>
                  {best !== undefined ? `Best ${best}` : 'Take it'}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
