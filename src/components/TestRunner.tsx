import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AnswerRecord, answerRecords } from '../lib/submissions';
import { BackButton } from './BackButton';
import { AssessmentTest, Question, ResultBreakdown, timerOf, isPublic, levelName } from '../types';
import { breakdownFor } from '../lib/modules';
import { ResultBreakdownPanel } from './ResultBreakdownPanel';
import { MOCK_DATABASE } from '../lib/sqlEngine';
import { runQuestion, gradeTest, QuestionRunResult, weightedScore } from '../lib/grading';
import { AiMark, aiMarks } from '../lib/aiMarking';
import { Pulse } from './Pulse';
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
  Award,
} from 'lucide-react';
import { getBadgeTier } from './VerifiedSkillBadge';
import { ChartPreview, parseChartSpec } from './ChartPreview';
import { AnswerInput } from './AnswerInputs';
import { groupQuestions, hasAnswer, isAnswerType, isWorkspaceType } from '../lib/questionTypes';
import { SpreadsheetWindow } from './SpreadsheetWindow';
import { DatabaseWindow } from './DatabaseWindow';
import { AppWindow } from './AppWindow';
import { CaseBrief } from './CaseBrief';
import { CheatingWarning, TestIntro } from './TestIntro';
import { IntegrityReport, countScreens, startIntegrityMonitor } from '../lib/integrity';

// The question column can be dragged wider or narrower; the width is remembered in this browser
function useResizable(key: string, initial: number) {
  const [size, setSize] = useState(() => {
    try {
      const saved = Number(localStorage.getItem(key));
      return saved > 0 ? saved : initial;
    } catch {
      return initial;
    }
  });
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  // measure: the new size from the pointer's position in the container
  const start = (measure: (x: number, rect: DOMRect) => number) => (e: React.PointerEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDragging(true);
    let latest = size;
    const move = (ev: PointerEvent) => {
      latest = measure(ev.clientX, rect);
      setSize(latest);
    };
    const up = () => {
      setDragging(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      try {
        localStorage.setItem(key, String(Math.round(latest)));
      } catch {
        /* not remembered */
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return { size, setSize, dragging, containerRef, start };
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

// The bar between the question and the work, dragged sideways (or nudged with the arrow keys) to resize
const ResizeHandle: React.FC<{ onPointerDown: (e: React.PointerEvent) => void; onNudge: (by: number) => void; dragging: boolean }> = ({ onPointerDown, onNudge, dragging }) => (
  <div
    role="separator"
    aria-orientation="vertical"
    aria-label="Drag to resize the question column"
    tabIndex={0}
    onPointerDown={onPointerDown}
    onKeyDown={(e) => {
      if (e.key === 'ArrowLeft') onNudge(-1);
      if (e.key === 'ArrowRight') onNudge(1);
    }}
    className={`group relative w-2 shrink-0 cursor-col-resize flex items-center justify-center focus:outline-none ${dragging ? 'bg-indigo-100' : 'bg-slate-100 hover:bg-indigo-50 focus-visible:bg-indigo-50'}`}
  >
    <span className={`h-10 w-1 rounded-full transition-colors ${dragging ? 'bg-indigo-500' : 'bg-slate-300 group-hover:bg-indigo-400 group-focus-visible:bg-indigo-400'}`} />
  </div>
);

interface TestRunnerProps {
  test: AssessmentTest;
  onClose: () => void;
  // answers: what the candidate wrote and how each was marked, kept for the company the test was taken for
  onComplete: (testId: string, finalScore: number, durationSeconds: number, integrity?: IntegrityReport, breakdown?: ResultBreakdown, answers?: AnswerRecord[]) => void;
  getPercentileFor: (score: number) => number;
  // Tried out from the test builder: nothing is saved
  preview?: boolean;
  // Where the score goes, when it isn't the candidate's profile: e.g. a company trying its own test
  savedNote?: string;
  // Taken for a job: called once the candidate signs and presses Begin, so the try is recorded even if never submitted
  onBegin?: () => void;
  // Which try at the job's test this is, and how many the job allows
  attempt?: { number: number; limit?: number };
}

export const TestRunner: React.FC<TestRunnerProps> = ({ test, onClose, onComplete, getPercentileFor, preview, savedNote, onBegin, attempt }) => {
  // Each hands-on task is shown with the questions about it; every other question on its own
  const groups = useMemo(() => groupQuestions(test.questions), [test.questions]);
  const ordered = useMemo(() => groups.flatMap((g) => g.questions), [groups]);
  const [groupIndex, setGroupIndex] = useState(0);
  // The question column's width: a share of the screen beside code, pixels beside a task's window
  const codeSplit = useResizable('vetter-split-code', 50);
  const taskSplit = useResizable('vetter-split-task', 420);
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
  // Module tests: the score by level and by area, and the level reached
  const [breakdown, setBreakdown] = useState<ResultBreakdown | undefined>();
  const [finalDuration, setFinalDuration] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // After the automatic checks, Vetter's AI takes a second look at code and written answers that fell short
  const [isAiMarking, setIsAiMarking] = useState(false);
  const [aiMarked, setAiMarked] = useState<Record<string, AiMark>>({});
  const answersRef = useRef<AnswerRecord[] | undefined>(undefined);
  // The intro screen shows first; the clock and proctoring only begin once the candidate starts
  const [hasStarted, setHasStarted] = useState(false);

  // The timer's auto-submit runs inside a long-lived interval, so it reads the latest code from a ref
  const userCodesRef = useRef(userCodes);
  userCodesRef.current = userCodes;
  const startedAtRef = useRef(Date.now());
  const submittedRef = useRef(false);

  // Timing and Integrity Proctor
  // No time limit: the clock counts up and never ends the test
  const limitMinutes = timerOf(test);
  const [secondsRemaining, setSecondsRemaining] = useState((limitMinutes ?? 0) * 60);
  // Everything the integrity monitor has seen so far, and the finished report once submitted
  const [flags, setFlags] = useState({ away: 0, pastes: 0, total: 0 });
  const [focusWarning, setFocusWarning] = useState<string | null>(null);
  const monitorRef = useRef<ReturnType<typeof startIntegrityMonitor> | null>(null);
  const integrityRef = useRef<IntegrityReport | undefined>(undefined);
  // Screens counted with the candidate's permission when they pressed Begin
  const screensRef = useRef<Awaited<ReturnType<typeof countScreens>> | null>(null);
  const currentQuestionRef = useRef<string | undefined>(undefined);
  // Shown when the candidate comes back after leaving the tab, and before they exit
  const [leftTab, setLeftTab] = useState(false);
  const [confirmingExit, setConfirmingExit] = useState(false);

  const currentGroup = groups[groupIndex];
  // The task, or the question on its own
  const currentQ: Question = currentGroup.questions[0];
  currentQuestionRef.current = currentQ.id;
  const followUps = currentGroup.task ? currentGroup.questions.slice(1) : [];
  // Cases are read, not answered, so only questions are numbered
  const numberOf = (q: Question) => ordered.filter((x) => x.type !== 'case').indexOf(q) + 1;
  const isDone = (q: Question) =>
    q.type === 'case' ||
    questionScores[q.id] !== undefined ||
    (isAnswerType(q.type) && hasAnswer(q, userCodes[q.id] ?? '')) ||
    (isWorkspaceType(q.type) && (userCodes[q.id] ?? q.starterCode) !== q.starterCode);
  const setAnswer = (id: string, val: string) => setUserCodes((prev) => ({ ...prev, [id]: val }));
  // What a step is called: Task 2, Case 1, or the question's number
  const groupLabel = (idx: number) => {
    const g = groups[idx];
    if (!g.task) return `Question ${numberOf(g.questions[0])}`;
    const isCase = g.task.type === 'case';
    const n = groups.slice(0, idx + 1).filter((x) => x.task && (x.task.type === 'case') === isCase).length;
    return `${isCase ? 'Case' : 'Task'} ${n}`;
  };
  const goToGroup = (idx: number) => {
    setGroupIndex(idx);
    setRunResults(null);
  };
  const answeredCount = ordered.filter((q) => q.type !== 'case' && isDone(q)).length;
  const questionCount = ordered.filter((q) => q.type !== 'case').length;
  const isLastGroup = groupIndex === groups.length - 1;
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
        if (limitMinutes === null) return prev + 1;
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

  // The integrity monitor: tabs, windows, resizing, copy and paste, screens. Leaving the test brings up a warning
  useEffect(() => {
    if (!hasStarted) return;
    const monitor = startIntegrityMonitor(
      () => currentQuestionRef.current,
      (e, r) => {
        setFlags({
          away: r.tabSwitches + r.windowSwitches,
          pastes: r.externalPastes,
          total: r.tabSwitches + r.windowSwitches + r.externalPastes + r.resizes + r.copies + r.cuts + r.screenshotKeys,
        });
        if (e.type === 'tab-hidden' || e.type === 'window-blur') {
          const away = r.tabSwitches + r.windowSwitches;
          setFocusWarning(`You left the test: recorded (${away} ${away === 1 ? 'time' : 'times'})`);
          if (!preview) setLeftTab(true);
        }
        if (e.type === 'paste-external') setFocusWarning('Pasted text from outside the test: recorded');
        if (e.type === 'screens-changed' && (r.screens ?? 1) > 1) setFocusWarning('A second screen was connected: recorded');
      }
    );
    if (screensRef.current) monitor.setScreens(screensRef.current);
    monitorRef.current = monitor;
    // Closing or reloading the tab mid-test: the browser asks first, as the answers would be lost
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (preview) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (monitorRef.current === monitor) integrityRef.current ??= monitor.stop();
    };
  }, [hasStarted, preview]);

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
    integrityRef.current = monitorRef.current?.stop() ?? integrityRef.current;
    monitorRef.current = null;

    const graded = await gradeTest(test, userCodesRef.current);
    setIsAiMarking(true);
    const marks = await aiMarks(test, userCodesRef.current, graded.perQuestion, graded.runs);
    setIsAiMarking(false);
    const perQuestion = { ...graded.perQuestion };
    const feedback = { ...graded.feedback };
    for (const [id, mark] of Object.entries(marks)) {
      perQuestion[id] = mark.score;
      feedback[id] = mark.feedback ? [mark.feedback] : feedback[id];
    }
    const score = weightedScore(test, perQuestion);
    setAiMarked(marks);
    answersRef.current = answerRecords(test, userCodesRef.current, perQuestion, feedback, graded.runs, marks);
    setQuestionScores(perQuestion);
    setQuestionFeedback(feedback);
    setFinalScore(score);
    setBreakdown(breakdownFor(test, perQuestion));
    setFinalPercentile(getPercentileFor(score));
    setFinalDuration(Math.round((Date.now() - startedAtRef.current) / 1000));
    setIsSubmitting(false);
    setShowCompletionModal(true);
  };

  const handleConfirmFinish = () => {
    onComplete(test.id, finalScore, finalDuration, integrityRef.current, breakdown, answersRef.current);
  };

  // Signed and Begin pressed: the try counts from here, so it's recorded once, before the countdown
  const committedRef = useRef(false);
  const handleCommit = () => {
    if (committedRef.current) return;
    committedRef.current = true;
    onBegin?.();
    // Counting screens needs the candidate's permission in Chrome and Edge, asked now while they've just clicked
    if (!preview) countScreens(true).then((s) => {
      screensRef.current = s;
      monitorRef.current?.setScreens(s);
    });
  };
  const handleBegin = () => {
    startedAtRef.current = Date.now();
    setHasStarted(true);
  };

  // What leaving costs: for a job, the try is already recorded and counts; otherwise only the answers are lost
  const attemptsLeftAfter = attempt?.limit !== undefined ? attempt.limit - attempt.number : undefined;
  const leavingCost = attempt ? (
    <>
      The company sees this attempt as <strong>started and not submitted</strong>
      {attempt.limit !== undefined && (
        <>
          , and it uses attempt {attempt.number} of {attempt.limit}
          {attemptsLeftAfter === 0 ? (
            <>
              . <strong>You won&rsquo;t be able to take this test again</strong>
            </>
          ) : (
            <>
              {' '}
              ({attemptsLeftAfter} left)
            </>
          )}
        </>
      )}
      .
    </>
  ) : (
    <>
      <strong>You&rsquo;ll have to retake the test</strong> from the start, with the full time.
    </>
  );
  if (!hasStarted) {
    return (
      <TestIntro test={test} onBegin={handleBegin} onClose={onClose} onCommit={handleCommit} attempt={attempt} />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col overflow-hidden text-slate-900 font-sans">
      {/* Top Header Bar */}
      <div className="h-14 border-b border-slate-200 bg-white px-6 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-4 min-w-0">
          <BackButton onClick={() => (preview ? onClose() : setConfirmingExit(true))}>Exit</BackButton>
          <div className="h-4 w-px bg-slate-200" />
          <div>
            <h1 className="text-sm font-bold text-slate-900 tracking-tight truncate max-w-[22vw]">{test.title}</h1>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span>{test.category}</span>
              <span aria-hidden="true">&middot;</span>
              <span>{levelName(test.difficulty)}</span>
              <span aria-hidden="true">&middot;</span>
              <span>{test.questions.length} Questions</span>
            </div>
          </div>
        </div>

        {/* Center: Question Navigation */}
        <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-lg shadow-2xs min-w-0 overflow-x-auto mx-3">
          {groups.map((g, idx) => {
            // Answer-style questions count as done once answered; their result stays hidden until submit
            const isCompleted = g.questions.every(isDone);
            // Cases and tasks are numbered separately
            const isCase = g.task?.type === 'case';
            const taskNumber = groups.slice(0, idx + 1).filter((x) => x.task && (x.task.type === 'case') === isCase).length;
            return (
              <button
                key={g.questions[0].id}
                onClick={() => goToGroup(idx)}
                title={g.task ? `${g.task.title}: ${g.questions.length} ${g.questions.length === 1 ? 'part' : 'parts'}` : g.questions[0].title}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                  groupIndex === idx
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : g.task
                    ? 'text-indigo-700 hover:text-indigo-900'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="whitespace-nowrap">{g.task ? `${isCase ? 'Case' : 'Task'} ${taskNumber}` : numberOf(g.questions[0])}</span>
                {isCompleted && <CheckCircle className={`w-3 h-3 ${groupIndex === idx ? 'text-white' : 'text-emerald-600'}`} />}
              </button>
            );
          })}
        </div>

        {/* Right: Timer & Proctor Status */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-700 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span className="tabular-nums font-semibold" title={limitMinutes === null ? 'Time taken so far: this test has no time limit' : 'Time left'}>
              {formatTime(secondsRemaining)}
            </span>
            {limitMinutes === null && <span className="font-sans text-slate-500">no limit</span>}
          </div>

          <div
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border font-medium ${
              flags.total > 0
                ? 'bg-indigo-50 border-slate-200 text-slate-800'
                : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}
            title="Monitored: tab and window switches, resizing, copy and paste, and screens connected"
          >
            <Eye className="w-3 h-3 text-indigo-600" />
            <span>{flags.total === 0 ? 'Monitored' : `Monitored · ${flags.total} recorded`}</span>
          </div>

          <button
            onClick={handleSubmitTest}
            disabled={isSubmitting}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-xs transition-colors"
          >
            {isSubmitting ? 'Marking…' : 'Submit test'}
          </button>
        </div>
      </div>

      {/* Focus Warning Banner if flagged */}
      {focusWarning && (
        <div className="px-6 py-2 bg-indigo-50 border-b border-slate-200 text-slate-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-indigo-600" />
            <span className="font-medium">{focusWarning}</span>
          </div>
          <button
            onClick={() => setFocusWarning(null)}
            className="text-indigo-700 hover:text-indigo-900 underline font-mono text-[11px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Split Workstation */}
      <div ref={currentGroup.task ? taskSplit.containerRef : codeSplit.containerRef} className="flex-1 flex overflow-hidden">
        {/* While resizing, a cover keeps the drag from being caught by the work window (an app runs in a frame) */}
        {(codeSplit.dragging || taskSplit.dragging) && <div className="fixed inset-0 z-40 cursor-col-resize" />}
        {/* A hands-on task: its window on the left, the brief and the questions about it on the right */}
        {currentGroup.task ? (
          <>
            <div className="flex-1 min-w-0 p-3 bg-slate-100">
              {currentQ.type === 'case' ? (
                <CaseMaterial key={currentQ.id} question={currentQ} />
              ) : currentQ.type === 'sheet' ? (
                <SpreadsheetWindow
                  key={currentQ.id}
                  value={currentCode || currentQ.starterCode}
                  onChange={handleCodeChange}
                  fileName={currentQ.contextData || `${currentQ.title}.xlsx`}
                  files={test.scenario?.files}
                />
              ) : currentQ.type === 'database' ? (
                <DatabaseWindow
                  key={currentQ.id}
                  value={currentCode || currentQ.starterCode}
                  onChange={handleCodeChange}
                  tables={currentQ.tables ?? []}
                  databaseName={currentQ.contextData || 'Database'}
                  files={test.scenario?.files}
                />
              ) : (
                <AppWindow key={currentQ.id} value={currentCode} onChange={handleCodeChange} html={currentQ.appHtml ?? ''} appName={currentQ.contextData || currentQ.title} />
              )}
            </div>
            <ResizeHandle
              dragging={taskSplit.dragging}
              onPointerDown={taskSplit.start((x, rect) => clamp(rect.right - x, 320, rect.width * 0.65))}
              onNudge={(by) => taskSplit.setSize((w) => clamp(w - by * 24, 320, 900))}
            />
            <aside style={{ width: taskSplit.size }} className="shrink-0 bg-white overflow-y-auto p-6 space-y-5">
              {test.scenario && <CaseBrief scenario={test.scenario} />}
              <div>
                <div className="text-xs text-slate-500 font-medium mb-1">
                  {currentQ.type === 'case' ? 'Case study' : 'Task'} &middot; {currentQ.type === 'case' ? followUps.length : currentGroup.questions.length}{' '}
                  {(currentQ.type === 'case' ? followUps.length : currentGroup.questions.length) === 1 ? 'part' : 'parts'} &middot; Weight: {currentGroup.questions.reduce((n, q) => n + q.weight, 0)}%
                </div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  {currentQ.type === 'case' ? currentQ.title : `${numberOf(currentQ)}. ${currentQ.title}`}
                </h2>
              </div>
              {currentQ.type === 'case' ? (
                <p className="text-sm text-slate-500">Read the material on the left, then answer each question. You can go back to it as often as you like.</p>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">{currentQ.prompt}</div>
              )}
              {currentQ.testCases.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-800">What&rsquo;s marked ({currentQ.testCases.length} checks)</div>
                  <ul className="space-y-1.5">
                    {currentQ.testCases.map((tc) => (
                      <li key={tc.id} className="flex items-start gap-2 text-xs text-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 mt-px shrink-0 text-slate-300" />
                        <span>{tc.description}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-slate-500">
                    Marked when you submit, on the {currentQ.type === 'sheet' ? 'workbook' : currentQ.type === 'app' ? 'simulation' : 'database'} as you leave it. Your work is kept if you move to another task.
                  </p>
                </div>
              )}
              {followUps.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-slate-200">
                  <div className="text-xs font-bold text-slate-800">Questions about this task</div>
                  {followUps.map((q) => (
                    <section key={q.id} className="space-y-2" aria-label={`Question ${numberOf(q)}`}>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base font-bold text-slate-900">
                          {numberOf(q)}. {q.title}
                        </h3>
                        {isDone(q) && <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-600" />}
                      </div>
                      <p className="text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">{q.prompt}</p>
                      <AnswerInput question={q} answer={userCodes[q.id] ?? ''} onChange={(val) => setAnswer(q.id, val)} />
                    </section>
                  ))}
                </div>
              )}
            </aside>
          </>
        ) : isAnswerType(currentQ.type) ? (
          // A question to answer on its own: one column, the question first and large, the answers under it
          <div className="flex-1 overflow-y-auto bg-slate-50">
            <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
              {test.scenario && <CaseBrief scenario={test.scenario} />}
              <div className="space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
                  Question {numberOf(currentQ)} of {questionCount}
                  <span className="text-slate-400 font-medium normal-case tracking-normal"> &middot; {currentQ.weight}% of the score</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{currentQ.title}</h2>
                <p className="text-lg leading-relaxed text-slate-800 whitespace-pre-wrap">{currentQ.prompt}</p>
                {currentQ.contextData && (
                  <div className="p-3 bg-indigo-50/50 border border-indigo-200 rounded-lg text-sm font-mono text-indigo-950 overflow-x-auto whitespace-pre-wrap">
                    {currentQ.contextData}
                  </div>
                )}
              </div>
              <div className="pt-2">
                <AnswerInput key={currentQ.id} question={currentQ} answer={currentCode} onChange={handleCodeChange} />
              </div>
            </div>
          </div>
        ) : (
        <>
        {/* Left Pane: Problem Description & Context */}
        <div style={{ width: `${codeSplit.size}%` }} className="shrink-0 flex flex-col bg-white overflow-hidden">
          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            {test.scenario && <CaseBrief scenario={test.scenario} />}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-indigo-700 mb-1.5">
                Question {numberOf(currentQ)} of {questionCount}
                <span className="text-slate-400 font-medium normal-case tracking-normal"> &middot; {currentQ.weight}% of the score</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">{currentQ.title}</h2>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-[15px] leading-relaxed text-slate-800 whitespace-pre-wrap font-sans shadow-2xs">
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

        {/* Right Pane: picking, typing or arranging for answer-style questions, otherwise the code editor & execution results */}
        <ResizeHandle
          dragging={codeSplit.dragging}
          onPointerDown={codeSplit.start((x, rect) => clamp(((x - rect.left) / rect.width) * 100, 25, 75))}
          onNudge={(by) => codeSplit.setSize((w) => clamp(w + by * 3, 25, 75))}
        />
        <div className="flex-1 min-w-0 flex flex-col bg-slate-50 overflow-hidden">
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
                    <div className="p-3 bg-indigo-50 border border-slate-200 text-slate-800 rounded-lg text-xs font-medium">
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
        </>
        )}
      </div>

      {/* Moving through the test: back, where you are and how much is answered, then next (or submit on the last) */}
      <footer className="shrink-0 border-t border-slate-200 bg-white px-4 sm:px-6 py-3 flex items-center gap-4">
        {groupIndex > 0 ? (
          <BackButton onClick={() => goToGroup(groupIndex - 1)} className="py-2.5">
            Previous
          </BackButton>
        ) : (
          <span className="w-[7.5rem]" aria-hidden="true" />
        )}
        <div className="flex-1 min-w-0 max-w-md mx-auto text-center space-y-1.5">
          <div className="text-sm font-semibold text-slate-900">
            {groupLabel(groupIndex)}
            <span className="font-normal text-slate-500">
              {' '}
              &middot; {answeredCount} of {questionCount} answered
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden" aria-hidden="true">
            <div className="h-full bg-indigo-600 rounded-full transition-all" style={{ width: `${questionCount ? (answeredCount / questionCount) * 100 : 0}%` }} />
          </div>
        </div>
        {isLastGroup ? (
          <button
            onClick={handleSubmitTest}
            disabled={isSubmitting}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg flex items-center gap-1.5 shadow-xs"
          >
            {isSubmitting ? 'Marking…' : answeredCount < questionCount ? `Submit (${questionCount - answeredCount} unanswered)` : 'Submit test'}
            <CheckCircle2 className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => goToGroup(groupIndex + 1)}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1.5 shadow-xs"
          >
            Next: {groupLabel(groupIndex + 1)}
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </footer>

      {/* Back after leaving the tab: it's recorded, and leaving the test itself means starting again */}
      {leftTab && !confirmingExit && !isSubmitting && !showCompletionModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" role="alertdialog" aria-modal="true" aria-labelledby="left-tab-title">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-50 border border-slate-200 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="space-y-1">
                <h3 id="left-tab-title" className="text-base font-bold text-slate-900">You left the test</h3>
                <p className="text-xs text-slate-500">
                  Leaving the test has been recorded ({flags.away} {flags.away === 1 ? 'time' : 'times'}), with how long you were away. The company
                  sees it with your result.
                </p>
              </div>
            </div>
            <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-5">
              <li>Stay on this tab until you submit. The clock kept running while you were away.</li>
              <li>If you close this tab, reload the page or exit the test, your answers are lost. {leavingCost}</li>
            </ul>
            <CheatingWarning compact />
            <button
              onClick={() => setLeftTab(false)}
              autoFocus
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow-xs"
            >
              I understand, back to the test
            </button>
          </div>
        </div>
      )}

      {/* Exiting mid-test */}
      {confirmingExit && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" role="alertdialog" aria-modal="true" aria-labelledby="exit-title">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-50 border border-slate-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="space-y-1">
                <h3 id="exit-title" className="text-base font-bold text-slate-900">Leave the test?</h3>
                <p className="text-xs text-slate-600">Your answers so far will be lost and nothing is submitted. {leavingCost}</p>
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-2">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 px-4 text-xs font-semibold text-slate-800 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg"
              >
                Leave and lose my answers
              </button>
              <button
                onClick={() => setConfirmingExit(false)}
                autoFocus
                className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow-xs"
              >
                Stay in the test
              </button>
            </div>
          </div>
        </div>
      )}

      {/* While answers are marked */}
      {isSubmitting && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm text-center px-6">
          <Pulse label="Marking your answers" />
          <p className="text-sm font-semibold text-slate-900" aria-live="polite">
            {isAiMarking ? 'Taking a closer look at your answers…' : 'Marking your answers…'}
          </p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">Answers that are nearly right get credit, so a typo or a small slip doesn't cost you everything.</p>
        </div>
      )}

      {/* Completion Modal */}
      {showCompletionModal && (() => {
        const earnedTier = getBadgeTier(finalScore);

        return (
          // The result can be taller than the screen (the breakdown, every task's feedback): it scrolls within the screen
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain p-6 space-y-5 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{preview ? 'Preview finished' : 'Test complete!'}</h3>
                  <p className="text-xs text-slate-500">
                    {preview
                      ? 'This is how candidates are scored. Nothing is saved.'
                      : savedNote
                      ? savedNote
                      : isPublic(test)
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

              {breakdown && <ResultBreakdownPanel breakdown={breakdown} testLevel={test.difficulty} />}

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1.5 max-h-64 overflow-y-auto">
                <div className="font-bold text-slate-900">Score and feedback by task</div>
                {ordered.filter((q) => q.type !== 'case').map((q, idx) => {
                  const missed = questionFeedback[q.id] ?? [];
                  const byAi = aiMarked[q.id];
                  return (
                    <div key={q.id}>
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate">
                          {idx + 1}. {q.title} <span className="text-slate-400">({q.weight}%)</span>
                          {byAi && (
                            <span className="ml-1.5 px-1.5 py-px rounded bg-indigo-50 text-indigo-700 text-[10px] font-semibold" title="Marked again by Vetter's AI, which gives credit for answers that are nearly right">
                              AI-marked
                            </span>
                          )}
                        </span>
                        <span className="font-mono font-semibold tabular-nums text-slate-900">{questionScores[q.id] ?? 0}/100</span>
                      </div>
                      {missed.length > 0 && (
                        <ul
                          className={`mt-0.5 pl-4 text-[11px] list-disc ${
                            (questionScores[q.id] ?? 0) === 100 ? 'text-emerald-700' : byAi && (questionScores[q.id] ?? 0) > 0 ? 'text-amber-800' : 'text-rose-700'
                          }`}
                        >
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

              {Object.keys(aiMarked).length > 0 && (
                <p className="text-[11px] text-slate-500">
                  Code and written answers that weren't fully right were marked again by Vetter's AI, which gives credit for answers that are nearly there.
                </p>
              )}

              <button
                onClick={handleConfirmFinish}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs"
              >
                <span>{preview ? 'Back to the builder' : 'Save Result'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
};


// A case study's material, laid out like a document to read
export const CaseMaterial: React.FC<{ question: Question }> = ({ question: q }) => (
  <div className="h-full overflow-y-auto bg-white border border-slate-300 rounded-lg shadow-sm">
    <div className="px-6 py-3 border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
      {q.contextData || 'Case material'}
    </div>
    <article className="px-6 py-5 max-w-3xl">
      <h2 className="text-lg font-bold text-slate-900 mb-3">{q.title}</h2>
      <div className="text-sm leading-[1.7] text-slate-800 whitespace-pre-wrap font-sans">{q.prompt}</div>
    </article>
  </div>
);
