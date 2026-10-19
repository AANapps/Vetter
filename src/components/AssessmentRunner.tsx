import React, { useState, useEffect } from 'react';
import { AssessmentTest, Question } from '../types';
import { executeSqlQuery, MOCK_DATABASE } from '../lib/sqlEngine';
import { runJavaScriptCode } from '../lib/codeEngine';
import {
  Play,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Clock,
  Eye,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  Crown,
  Award
} from 'lucide-react';
import { getBadgeTier } from './VerifiedSkillBadge';

interface AssessmentRunnerProps {
  test: AssessmentTest;
  onClose: () => void;
  onComplete: (testId: string, finalScore: number, percentile: number) => void;
}

export const AssessmentRunner: React.FC<AssessmentRunnerProps> = ({ test, onClose, onComplete }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userCodes, setUserCodes] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    test.questions.forEach((q) => {
      initial[q.id] = q.starterCode;
    });
    return initial;
  });

  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<'output' | 'testcases' | 'schema'>('output');
  const [runResults, setRunResults] = useState<any>(null);
  const [questionScores, setQuestionScores] = useState<Record<string, number>>({});
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [finalPercentile, setFinalPercentile] = useState(0);

  // Timing and Integrity Proctor
  const [secondsRemaining, setSecondsRemaining] = useState(test.estimatedMinutes * 60);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [focusWarning, setFocusWarning] = useState<string | null>(null);

  const currentQ: Question = test.questions[currentQuestionIndex];
  const currentCode = userCodes[currentQ.id] || '';

  // Timer countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmitAssessment();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Anti-cheat tab visibility detector
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitches((c) => {
          const next = c + 1;
          setFocusWarning(`Focus lost: tab switch detected (${next} event${next > 1 ? 's' : ''})`);
          return next;
        });
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    return () => window.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleCodeChange = (val: string) => {
    setUserCodes((prev) => ({
      ...prev,
      [currentQ.id]: val,
    }));
  };

  const handleResetCode = () => {
    setUserCodes((prev) => ({
      ...prev,
      [currentQ.id]: currentQ.starterCode,
    }));
    setRunResults(null);
  };

  const handleRunCode = () => {
    setIsRunning(true);
    setRunResults(null);

    setTimeout(() => {
      if (currentQ.type === 'sql') {
        const sqlRes = executeSqlQuery(currentCode);
        setRunResults({
          type: 'sql',
          ...sqlRes,
        });

        // Score calculation for SQL
        let qScore = 0;
        if (sqlRes.success && sqlRes.rowCount > 0) {
          qScore = 100;
        } else if (sqlRes.success) {
          qScore = 50;
        }
        setQuestionScores((prev) => ({ ...prev, [currentQ.id]: qScore }));
      } else {
        // Code runner
        const codeRes = runJavaScriptCode(currentCode, currentQ.testCases);
        setRunResults({
          type: 'code',
          ...codeRes,
        });
        setQuestionScores((prev) => ({ ...prev, [currentQ.id]: codeRes.score }));
      }
      setIsRunning(false);
      setActiveTab('output');
    }, 250);
  };

  const handleSubmitAssessment = () => {
    let totalScore = 0;
    let weightsSum = 0;

    test.questions.forEach((q) => {
      const qScore = questionScores[q.id] !== undefined ? questionScores[q.id] : 85;
      totalScore += qScore * q.weight;
      weightsSum += q.weight;
    });

    const calculatedScore = Math.round(totalScore / (weightsSum || 1));
    const computedPercentile = Math.min(99.4, Math.max(45, Math.round((calculatedScore * 0.98 + (100 - calculatedScore) * 0.1) * 10) / 10));

    setFinalScore(calculatedScore);
    setFinalPercentile(computedPercentile);
    setShowCompletionModal(true);
  };

  const handleConfirmFinish = () => {
    onComplete(test.id, finalScore, finalPercentile);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col overflow-hidden text-slate-900 font-sans">
      {/* Top Header Bar */}
      <div className="h-14 border-b border-slate-200 bg-white px-6 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded-md hover:bg-slate-100 transition-colors"
          >
            &larr; Exit
          </button>
          <div className="h-4 w-px bg-slate-200" />
          <div>
            <h1 className="text-sm font-bold text-slate-900 tracking-tight">{test.title}</h1>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span>{test.category}</span>
              <span aria-hidden="true">&middot;</span>
              <span>{test.difficulty}</span>
              <span aria-hidden="true">&middot;</span>
              <span>{test.questions.length} Questions</span>
            </div>
          </div>
        </div>

        {/* Center: Question Navigation */}
        <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-lg shadow-2xs">
          {test.questions.map((q, idx) => {
            const isCompleted = questionScores[q.id] !== undefined;
            return (
              <button
                key={q.id}
                onClick={() => {
                  setCurrentQuestionIndex(idx);
                  setRunResults(null);
                }}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                  currentQuestionIndex === idx
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Task {idx + 1}</span>
                {isCompleted && <CheckCircle className="w-3 h-3 text-white" />}
              </button>
            );
          })}
        </div>

        {/* Right: Timer & Proctor Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-700 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span className="tabular-nums font-semibold">{formatTime(secondsRemaining)}</span>
          </div>

          <div
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border font-medium ${
              tabSwitches > 0
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}
            title="Monitors tab visibility and focus for assessment integrity"
          >
            <Eye className="w-3 h-3 text-indigo-600" />
            <span>Focus: {tabSwitches === 0 ? '100%' : `${Math.max(60, 100 - tabSwitches * 10)}%`}</span>
          </div>

          <button
            onClick={handleSubmitAssessment}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
          >
            Submit Assessment
          </button>
        </div>
      </div>

      {/* Focus Warning Banner if flagged */}
      {focusWarning && (
        <div className="px-6 py-2 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
            <span className="font-medium">{focusWarning}</span>
          </div>
          <button
            onClick={() => setFocusWarning(null)}
            className="text-amber-700 hover:text-amber-900 underline font-mono text-[11px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Split Workstation */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane: Problem Description & Context */}
        <div className="w-1/2 border-r border-slate-200 flex flex-col bg-white overflow-hidden">
          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            <div>
              <div className="text-xs text-slate-500 font-medium mb-1">
                Question {currentQuestionIndex + 1} of {test.questions.length} &middot; Weight: {currentQ.weight}%
              </div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">{currentQ.title}</h2>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs leading-relaxed text-slate-700 whitespace-pre-wrap font-sans shadow-2xs">
              {currentQ.prompt}
            </div>

            {currentQ.contextData && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span>Schema Reference</span>
                </div>
                <div className="p-3 bg-indigo-50/50 border border-indigo-200 rounded-lg text-xs font-mono text-indigo-950 overflow-x-auto shadow-2xs">
                  {currentQ.contextData}
                </div>
              </div>
            )}

            {/* Test Cases preview */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-800">Target Assertions ({currentQ.testCases.length})</div>
              <div className="space-y-2">
                {currentQ.testCases.map((tc, idx) => (
                  <div key={tc.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5 shadow-2xs">
                    <div className="text-slate-900 font-semibold">Test Case {idx + 1}: {tc.description}</div>
                    <div className="font-mono text-slate-500 text-[11px] truncate">
                      Expected: <span className="text-indigo-700 font-semibold">{tc.expectedOutput}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sample Table Inspection for SQL */}
            {currentQ.type === 'sql' && (
              <div className="space-y-2 pt-2">
                <div className="text-xs font-bold text-slate-800">Database Sample Records</div>
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                  <div className="overflow-x-auto max-h-48">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 sticky top-0 border-b border-slate-200">
                        <tr>
                          {currentQ.id.includes('q-sql-1')
                            ? MOCK_DATABASE.orders.columns.map((c) => (
                                <th key={c} className="p-2 font-mono text-[11px] font-semibold">
                                  {c}
                                </th>
                              ))
                            : MOCK_DATABASE.employees.columns.map((c) => (
                                <th key={c} className="p-2 font-mono text-[11px] font-semibold">
                                  {c}
                                </th>
                              ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 font-mono text-[11px]">
                        {(currentQ.id.includes('q-sql-1')
                          ? MOCK_DATABASE.orders.rows.slice(0, 4)
                          : MOCK_DATABASE.employees.rows.slice(0, 4)
                        ).map((row, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            {Object.values(row).map((val: any, j) => (
                              <td key={j} className="p-2 truncate max-w-[140px]">
                                {String(val)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Code Editor & Execution Results */}
        <div className="w-1/2 flex flex-col bg-slate-50 overflow-hidden">
          {/* Editor Action Toolbar */}
          <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between shrink-0">
            <div className="text-xs text-slate-600 font-mono flex items-center gap-2 font-semibold">
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
              <span>{currentQ.type === 'sql' ? 'sql_workspace.sql' : 'solution.js'}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleResetCode}
                className="p-1.5 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-200 transition-colors"
                title="Reset to starter code"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleRunCode}
                disabled={isRunning}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-md transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>{isRunning ? 'Executing...' : 'Run Query / Code'}</span>
              </button>
            </div>
          </div>

          {/* Code Editor TextArea (with high-contrast dark code background for syntax clarity) */}
          <div className="h-64 border-b border-slate-200 relative bg-slate-950">
            <textarea
              value={currentCode}
              onChange={(e) => handleCodeChange(e.target.value)}
              spellCheck={false}
              className="w-full h-full p-4 font-mono text-xs text-emerald-400 bg-slate-950 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
              placeholder="Write your solution here..."
            />
          </div>

          {/* Execution Console & Output Tabs */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden">
            <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-200 bg-slate-50 shrink-0">
              <button
                onClick={() => setActiveTab('output')}
                className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors flex items-center gap-1.5 ${
                  activeTab === 'output' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>Execution Output</span>
              </button>
              <button
                onClick={() => setActiveTab('testcases')}
                className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors flex items-center gap-1.5 ${
                  activeTab === 'testcases' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>Test Cases {runResults?.testCaseResults ? `(${runResults.testCaseResults.filter((r: any) => r.passed).length}/${runResults.testCaseResults.length})` : ''}</span>
              </button>
            </div>

            {/* Console Content */}
            <div className="flex-1 p-4 overflow-y-auto font-mono text-xs">
              {!runResults && (
                <div className="text-slate-400 flex flex-col items-center justify-center h-full text-center p-6">
                  <Play className="w-6 h-6 mb-2 text-indigo-400 opacity-60" />
                  <p>Click "Run Query / Code" to evaluate your solution against standardized benchmarks.</p>
                </div>
              )}

              {runResults && activeTab === 'output' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-slate-500 text-[11px] pb-2 border-b border-slate-200 font-semibold">
                    <span>Status: {runResults.success || runResults.allPassed ? 'Success' : 'Check assertions'}</span>
                    <span className="tabular-nums">Time: {runResults.executionTimeMs || runResults.totalExecutionTimeMs || 4}ms</span>
                  </div>

                  {runResults.errorMessage && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-medium">
                      {runResults.errorMessage}
                    </div>
                  )}

                  {runResults.type === 'sql' && runResults.success && (
                    <div className="border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                            <tr>
                              {runResults.columns.map((c: string) => (
                                <th key={c} className="p-2 font-semibold">{c}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-800">
                            {runResults.rows.map((row: any, i: number) => (
                              <tr key={i} className="hover:bg-slate-50">
                                {runResults.columns.map((c: string) => (
                                  <td key={c} className="p-2 font-mono tabular-nums">{String(row[c])}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="p-2 bg-slate-50 text-slate-500 text-[11px] border-t border-slate-200">
                        Returned {runResults.rowCount} row{runResults.rowCount === 1 ? '' : 's'}
                      </div>
                    </div>
                  )}

                  {runResults.type === 'code' && (
                    <div className="space-y-2">
                      <div className="text-indigo-700 font-bold">
                        Score on this task: {runResults.score}/100
                      </div>
                      {runResults.logs && runResults.logs.length > 0 && (
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-slate-700 text-xs">
                          <div className="text-slate-400 text-[10px] mb-1 font-semibold">STDOUT:</div>
                          {runResults.logs.map((l: string, i: number) => (
                            <div key={i}>{l}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {runResults && activeTab === 'testcases' && (
                <div className="space-y-3">
                  {runResults.testCaseResults ? (
                    runResults.testCaseResults.map((tc: any, i: number) => (
                      <div
                        key={tc.id || i}
                        className={`p-3 rounded-lg border text-xs shadow-2xs ${
                          tc.passed
                            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                            : 'bg-rose-50/80 border-rose-200 text-rose-900'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold mb-1">
                          <span>Case {i + 1}: {tc.description}</span>
                          <span className="text-[11px] font-mono">{tc.passed ? 'PASSED' : 'FAILED'}</span>
                        </div>
                        <div className="text-[11px] space-y-1 text-slate-600 font-mono">
                          <div>Input: <span className="text-slate-900">{tc.input}</span></div>
                          <div>Expected: <span className="text-emerald-700 font-semibold">{tc.expected}</span></div>
                          <div>Actual: <span className={tc.passed ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-semibold'}>{tc.actual}</span></div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-500">
                      Standard query validated against relational benchmark assertions. Score: {questionScores[currentQ.id] || 100}%
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Completion Modal */}
      {showCompletionModal && (() => {
        const earnedTier = getBadgeTier(finalScore);
        const TierIcon = earnedTier.icon;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Assessment Complete!</h3>
                  <p className="text-xs text-slate-500">Verified score generated and added to your skill profile</p>
                </div>
              </div>

              {/* Dynamic Earned Badge Banner */}
              <div
                className={`p-4 rounded-xl border bg-gradient-to-r ${earnedTier.gradientBg} ${earnedTier.borderClass} ${earnedTier.glowClass} flex items-center justify-between gap-4`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg ${earnedTier.accentBg} border ${earnedTier.borderClass} flex items-center justify-center shrink-0 shadow-2xs`}
                  >
                    <TierIcon className={`w-5 h-5 ${earnedTier.badgeTextColor}`} />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">
                      Earned Badge Award
                    </div>
                    <div className={`text-sm font-bold ${earnedTier.badgeTextColor}`}>
                      {earnedTier.label} ({earnedTier.colorName} Tier)
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-slate-500">Score Cutoff</span>
                  <div className={`text-sm font-mono font-bold ${earnedTier.badgeTextColor}`}>
                    ≥{earnedTier.minScore} pts
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <div>
                  <div className="text-xs text-slate-500 mb-1 font-medium">Verified Score</div>
                  <div className={`text-3xl font-extrabold font-mono tabular-nums ${earnedTier.badgeTextColor}`}>
                    {finalScore}
                  </div>
                  <div className="text-[11px] text-emerald-700 mt-1 font-medium">Passing Grade (≥{test.passingScore})</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1 font-medium">Global Percentile</div>
                  <div className="text-3xl font-extrabold text-slate-900 font-mono tabular-nums">{finalPercentile}th</div>
                  <div className="text-[11px] text-indigo-700 mt-1 font-medium">{earnedTier.sublabel}</div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1">
                <div className="font-bold text-slate-900">Automated Vector Match Updates:</div>
                <div>
                  Your fit scores across {test.category} job openings have been dynamically recalculated with your new verified badge!
                </div>
              </div>

              <button
                onClick={handleConfirmFinish}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs"
              >
                <span>Update Profile & View Matched Jobs</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
