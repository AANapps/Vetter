import React, { useState, useEffect, useRef } from 'react';
import { AssessmentTest, Question } from '../types';
import { MOCK_DATABASE } from '../lib/sqlEngine';
import { runQuestion, gradeTest, QuestionRunResult } from '../lib/grading';
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
import { QUESTION_TYPE_LABELS, describeChecks } from '../lib/testRoles';
import { ChartPreview, parseChartSpec } from './ChartPreview';

interface TestRunnerProps {
  test: AssessmentTest;
  onClose: () => void;
  onComplete: (testId: string, finalScore: number, durationSeconds: number) => void;
  getPercentileFor: (score: number) => number;
}

export const TestRunner: React.FC<TestRunnerProps> = ({ test, onClose, onComplete, getPercentileFor }) => {
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
  const [runResults, setRunResults] = useState<QuestionRunResult | null>(null);
  const [questionScores, setQuestionScores] = useState<Record<string, number>>({});
  const [questionFeedback, setQuestionFeedback] = useState<Record<string, string[]>>({});
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [finalPercentile, setFinalPercentile] = useState(0);
  const [finalDuration, setFinalDuration] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // The intro screen shows first; the clock and proctoring only begin once the candidate starts
  const [hasStarted, setHasStarted] = useState(false);
  const [acceptedRules, setAcceptedRules] = useState(false);

  // The timer's auto-submit runs inside a long-lived interval, so it reads the latest code from a ref
  const userCodesRef = useRef(userCodes);
  userCodesRef.current = userCodes;
  const startedAtRef = useRef(Date.now());
  const submittedRef = useRef(false);

  // Timing and Integrity Proctor
  const [secondsRemaining, setSecondsRemaining] = useState(test.estimatedMinutes * 60);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [focusWarning, setFocusWarning] = useState<string | null>(null);

  const currentQ: Question = test.questions[currentQuestionIndex];
  const currentCode = userCodes[currentQ.id] || '';
  // Every sample table the task's schema reference names
  const sampleTables = Array.from(currentQ.contextData?.matchAll(/Table:\s*(\w+)/g) ?? [])
    .map((m) => MOCK_DATABASE[m[1]])
    .filter(Boolean);
  const chartSpec =
    currentQ.preview === 'chart' && runResults?.type === 'code' ? parseChartSpec(runResults.testCaseResults[0]?.actual) : null;

  // Timer countdown
  useEffect(() => {
    if (!hasStarted) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmitTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [hasStarted]);

  // Anti-cheat tab visibility detector
  useEffect(() => {
    if (!hasStarted) return;
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
  }, [hasStarted]);

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

  const handleRunCode = async () => {
    setIsRunning(true);
    setRunResults(null);
    const result = await runQuestion(currentQ, currentCode);
    setRunResults(result);
    setQuestionScores((prev) => ({ ...prev, [currentQ.id]: result.score }));
    setIsRunning(false);
    setActiveTab('output');
  };

  // Grade every task from the candidate's latest code, whether or not they pressed Run
  const handleSubmitTest = async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setIsSubmitting(true);

    const { score, perQuestion, feedback } = await gradeTest(test, userCodesRef.current);
    setQuestionScores(perQuestion);
    setQuestionFeedback(feedback);
    setFinalScore(score);
    setFinalPercentile(getPercentileFor(score));
    setFinalDuration(Math.round((Date.now() - startedAtRef.current) / 1000));
    setIsSubmitting(false);
    setShowCompletionModal(true);
  };

  const handleConfirmFinish = () => {
    onComplete(test.id, finalScore, finalDuration);
  };

  const handleBegin = () => {
    startedAtRef.current = Date.now();
    setHasStarted(true);
  };

  if (!hasStarted) {
    return (
      <TestIntro
        test={test}
        acceptedRules={acceptedRules}
        onAcceptedRulesChange={setAcceptedRules}
        onBegin={handleBegin}
        onClose={onClose}
      />
    );
  }

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
            // Multiple choice counts as done once answered; its result stays hidden until submit
            const isCompleted =
              questionScores[q.id] !== undefined || (q.type === 'choice' && (userCodes[q.id] ?? '') !== '');
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
            title="Monitors tab visibility and focus for test integrity"
          >
            <Eye className="w-3 h-3 text-indigo-600" />
            <span>Focus: {tabSwitches === 0 ? '100%' : `${Math.max(60, 100 - tabSwitches * 10)}%`}</span>
          </div>

          <button
            onClick={handleSubmitTest}
            disabled={isSubmitting}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-xs transition-colors"
          >
            {isSubmitting ? 'Grading...' : 'Submit test'}
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
            {currentQ.testCases.length > 0 && (
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
            )}

            {/* Sample Table Inspection for SQL */}
            {currentQ.type === 'sql' && sampleTables.map((sampleTable) => (
              <div key={sampleTable.name} className="space-y-2 pt-2">
                <div className="text-xs font-bold text-slate-800">
                  Sample records: <span className="font-mono">{sampleTable.name}</span>
                </div>
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                  <div className="overflow-x-auto max-h-48">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 sticky top-0 border-b border-slate-200">
                        <tr>
                          {sampleTable.columns.map((c) => (
                            <th key={c} className="p-2 font-mono text-[11px] font-semibold">
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 font-mono text-[11px]">
                        {sampleTable.rows.slice(0, 4).map((row, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            {sampleTable.columns.map((c) => (
                              <td key={c} className="p-2 truncate max-w-[140px] whitespace-pre">
                                {row[c] === null ? 'NULL' : JSON.stringify(row[c]).replace(/^"|"$/g, '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {sampleTable.rows.length > 4 && (
                    <div className="p-2 bg-slate-50 text-slate-500 text-[11px] border-t border-slate-200">
                      Showing 4 of {sampleTable.rows.length} rows. Query the table to see them all.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Pane: answer options for multiple choice, otherwise the code editor & execution results */}
        {currentQ.type === 'choice' ? (
          <div className="w-1/2 flex flex-col bg-slate-50 overflow-y-auto p-6">
            <fieldset className="space-y-3">
              <legend className="text-xs font-bold text-slate-800 mb-3">Choose one answer</legend>
              {(currentQ.options ?? []).map((option, i) => {
                const selected = currentCode === String(i);
                return (
                  <label
                    key={i}
                    className={`flex items-start gap-3 p-4 rounded-lg bg-white cursor-pointer text-sm transition-colors ${
                      selected ? 'ring-2 ring-indigo-500 text-slate-900' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`answer-${currentQ.id}`}
                      checked={selected}
                      onChange={() => handleCodeChange(String(i))}
                      className="mt-0.5 accent-indigo-600"
                    />
                    <span>
                      <span className="font-mono text-xs text-slate-400 mr-2">{String.fromCharCode(65 + i)}</span>
                      {option}
                    </span>
                  </label>
                );
              })}
            </fieldset>
            <p className="text-[11px] text-slate-500 mt-4">
              You can change your answer until you submit. Answers are marked when you submit the test.
            </p>
          </div>
        ) : (
        <div className="w-1/2 flex flex-col bg-slate-50 overflow-hidden">
          {/* Editor Action Toolbar */}
          <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between shrink-0">
            <div className="text-xs text-slate-600 font-mono flex items-center gap-2 font-semibold">
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
              <span>{currentQ.type === 'sql' ? 'sql_workspace.sql' : currentQ.type === 'schema' ? 'schema.sql' : 'solution.js'}</span>
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
                    <span>Status: {runResults.score === 100 ? 'All checks passed' : 'Check assertions'}</span>
                    <span className="tabular-nums">
                      Time: {runResults.type === 'sql' ? runResults.executionTimeMs : runResults.totalExecutionTimeMs}ms
                    </span>
                  </div>

                  {runResults.type === 'sql' && runResults.errorMessage && (
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

                  <div className="text-indigo-700 font-bold">Score on this task: {runResults.score}/100</div>

                  {chartSpec && (
                    <div className="p-3 border border-slate-200 rounded-lg space-y-2">
                      <div className="text-[10px] text-slate-400 font-semibold">YOUR CHART (first test case)</div>
                      <ChartPreview spec={chartSpec} />
                    </div>
                  )}

                  {runResults.type === 'code' && (
                    <div className="space-y-2">
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
                  {runResults.testCaseResults.map((tc, i) => (
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
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Completion Modal */}
      {showCompletionModal && (() => {
        const earnedTier = getBadgeTier(finalScore);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Test complete!</h3>
                  <p className="text-xs text-slate-500">
                    {test.type === 'standard'
                      ? 'Your score is saved to your profile and this test’s leaderboard'
                      : `Your score is saved and shared with ${test.companyName}`}
                  </p>
                </div>
              </div>

              {/* The badge this score earns */}
              <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4">
                <span className={`absolute inset-x-0 top-0 h-1 ${earnedTier.barClass}`} aria-hidden="true" />
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    {earnedTier.tierKey === 'developing'
                      ? 'No badge this time'
                      : `${earnedTier.label} badge${test.type === 'standard' ? ` · ${test.skillsTested[0] ?? test.title}` : ''}`}
                  </div>
                  <div className="text-xs text-slate-600">
                    {earnedTier.tierKey === 'developing' ? 'Score 75 or more to earn a verified badge.' : earnedTier.sublabel}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <div>
                  <div className="text-xs text-slate-500 mb-1 font-medium">Verified Score</div>
                  <div className={`text-3xl font-extrabold font-mono tabular-nums ${earnedTier.badgeTextColor}`}>
                    {finalScore}
                  </div>
                  {finalScore >= test.passingScore ? (
                    <div className="text-[11px] text-emerald-700 mt-1 font-medium">Passed (pass mark {test.passingScore})</div>
                  ) : (
                    <div className="text-[11px] text-rose-700 mt-1 font-medium">Below pass mark of {test.passingScore}</div>
                  )}
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1 font-medium">Percentile on this test</div>
                  <div className="text-3xl font-extrabold text-slate-900 font-mono tabular-nums">{finalPercentile}th</div>
                  <div className="text-[11px] text-indigo-700 mt-1 font-medium">{earnedTier.sublabel}</div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1.5 max-h-64 overflow-y-auto">
                <div className="font-bold text-slate-900">Score and feedback by task</div>
                {test.questions.map((q, idx) => {
                  const missed = questionFeedback[q.id] ?? [];
                  return (
                    <div key={q.id}>
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate">
                          {idx + 1}. {q.title} <span className="text-slate-400">({q.weight}%)</span>
                        </span>
                        <span className="font-mono font-semibold tabular-nums text-slate-900">{questionScores[q.id] ?? 0}/100</span>
                      </div>
                      {missed.length > 0 && (
                        <ul className="mt-0.5 pl-4 text-[11px] text-rose-700 list-disc">
                          {missed.slice(0, 3).map((m) => (
                            <li key={m}>{m}</li>
                          ))}
                          {missed.length > 3 && <li className="list-none text-slate-500">and {missed.length - 3} more</li>}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleConfirmFinish}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs"
              >
                <span>Save Result</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
};


const INTEGRITY_RULES = [
  'Stay on this tab for the whole test. Switching tabs, windows or apps is recorded and lowers your focus score.',
  'Work alone. No help from other people, and no AI assistants or code generators.',
  'Don’t search the web or look up solutions. Write your answers yourself.',
  'Don’t copy, screenshot or share the questions, during or after the test.',
  'One attempt at a time, on your own account. Breaking these rules can void your score.',
];

interface TestIntroProps {
  test: AssessmentTest;
  acceptedRules: boolean;
  onAcceptedRulesChange: (accepted: boolean) => void;
  onBegin: () => void;
  onClose: () => void;
}

const TestIntro: React.FC<TestIntroProps> = ({ test, acceptedRules, onAcceptedRulesChange, onBegin, onClose }) => (
  <div className="fixed inset-0 z-50 bg-slate-50 overflow-y-auto text-slate-900 font-sans">
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      <button
        onClick={onClose}
        className="text-xs font-semibold text-slate-500 hover:text-indigo-700 transition-colors"
      >
        &larr; Back
      </button>

      {/* Intro */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-wider">
          <span className="text-indigo-700 font-bold">{test.category}</span>
          <span className="text-slate-300">&middot;</span>
          <span className="text-slate-500">{test.difficulty}</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">{test.title}</h1>
        <p className="text-sm text-slate-600 leading-relaxed">{test.description}</p>
        <p className="text-sm text-slate-600 leading-relaxed">
          Read this page before you start. Once you press <span className="font-semibold text-slate-900">Start test</span>, the clock
          begins and can&rsquo;t be paused.
        </p>
      </div>

      {/* Rundown */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-xs">
        <h2 className="text-base font-bold text-slate-900">What&rsquo;s in the test</h2>
        <ol className="divide-y divide-slate-100">
          {test.questions.map((q, i) => (
            <li key={q.id} className="py-3 flex items-center justify-between gap-4 text-xs">
              <div className="min-w-0">
                <div className="font-semibold text-slate-900">
                  {i + 1}. {q.title}
                </div>
                <div className="text-slate-500 font-mono text-[11px] mt-0.5">
                  {QUESTION_TYPE_LABELS[q.type]} &middot; {describeChecks(q)}
                </div>
              </div>
              <div className="text-right font-mono text-[11px] text-slate-500 shrink-0">
                <div>{q.weight}% of score</div>
                <div>~{q.timeLimitMinutes} min</div>
              </div>
            </li>
          ))}
        </ol>
        <ul className="text-xs text-slate-600 leading-relaxed space-y-1.5 list-disc pl-4">
          <li>Move between tasks freely using the tabs at the top. Do them in any order.</li>
          {test.questions.some((q) => q.type !== 'choice') && (
            <>
              <li>Press Run to check your answer against the test cases as often as you like.</li>
              <li>Every task is graded on your latest code when you submit, whether or not you pressed Run.</li>
            </>
          )}
          {test.questions.some((q) => q.type === 'choice') && (
            <li>Multiple choice questions have one right answer. You can change it until you submit, and it&rsquo;s marked then.</li>
          )}
          <li>
            You need <span className="font-semibold text-slate-900">{test.passingScore}/100</span> to pass.
          </li>
        </ul>
      </div>

      {/* Timing */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3 shadow-xs">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-base font-bold text-slate-900">This test is timed</h2>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-700 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span className="tabular-nums font-semibold">{test.estimatedMinutes} min</span>
          </div>
        </div>
        <ul className="text-xs text-slate-600 leading-relaxed space-y-1.5 list-disc pl-4">
          <li>You have {test.estimatedMinutes} minutes for all {test.questions.length} tasks. The countdown shows at the top of the screen.</li>
          <li>The per-task times above are a guide, not a limit. Spend your time how you like.</li>
          <li>When the clock reaches zero, your test is submitted automatically with whatever you&rsquo;ve written.</li>
          <li>Your finishing time is recorded and breaks ties on the leaderboard.</li>
          <li>Leaving the test before you submit throws away your progress.</li>
        </ul>
      </div>

      {/* Anti-cheating */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3 shadow-xs">
        <h2 className="text-base font-bold text-slate-900">Anti-cheating rules</h2>
        <ul className="text-xs text-slate-600 leading-relaxed space-y-1.5 list-disc pl-4">
          {INTEGRITY_RULES.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
        <label className="flex items-start gap-2.5 pt-3 border-t border-slate-200 text-xs text-slate-800 cursor-pointer">
          <input
            type="checkbox"
            checked={acceptedRules}
            onChange={(e) => onAcceptedRulesChange(e.target.checked)}
            className="mt-0.5 accent-indigo-600"
          />
          <span>I&rsquo;ve read the rules and will take this test on my own, without outside help.</span>
        </label>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
        >
          Not now
        </button>
        <button
          onClick={onBegin}
          disabled={!acceptedRules}
          className="px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2 shadow-xs"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Start test</span>
        </button>
      </div>
    </div>
  </div>
);
