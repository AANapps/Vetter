import { RichText, TaskPrompt, splitParts } from './RichText';
import { Desktop } from './Desktop';
import { firstWorkApp, taskDesktop, taskSlot } from '../lib/taskDesktop';
import type { DeskCtx } from './desk/shared';
import { Pic } from './Pic';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AnswerRecord, answerRecords } from '../lib/submissions';
import { BackButton } from './BackButton';
import { AssessmentTest, CaseFile, Question, ResultBreakdown, timerOf, isPublic, levelName } from '../types';
import { breakdownFor } from '../lib/modules';
import { ResultBreakdownPanel } from './ResultBreakdownPanel';
import { MOCK_DATABASE } from '../lib/sqlEngine';
import { runQuestion, gradeTest, QuestionRunResult, weightedScore } from '../lib/grading';
import { makeVariant, newVariantSeed } from '../lib/variants';
import { AiMark, aiMarks } from '../lib/aiMarking';
import { aiScoreOf, capabilityScores } from '../lib/capabilities';
import { AiScorePanel } from './AiScorePanel';
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
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Minus,
  FileText,
} from 'lucide-react';
import { ChartPreview, parseChartSpec } from './ChartPreview';
import { AnswerInput } from './AnswerInputs';
import { groupQuestions, hasAnswer, isAnswerType, isWorkspaceType } from '../lib/questionTypes';
import { SpreadsheetWindow } from './SpreadsheetWindow';
import { DatabaseWindow } from './DatabaseWindow';
import { AppWindow } from './AppWindow';
import { CodeField } from './CodeField';
import { ANY_LANGUAGE, LANGUAGES, answerLanguage, languageById, packAnswer, unpackAnswer } from '../lib/languages';
import { CaseBrief } from './CaseBrief';
import { AiPanel, AiTurn, FilesPanel, InboxItem, InboxPanel, WorkspaceTabs, WorkspaceView } from './Workspace';
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

// In training, the worked answer is shown for questions whose solutionCode is written for a person to read
const WORKED_ANSWER_TYPES: Question['type'][] = ['choice', 'multi', 'text', 'written', 'order', 'match', 'email', 'assistant', 'scenario'];

// The page numbers to show in the footer: all of them when there are few, else the first, the last and the ones around
// where you are, with gaps (null) between
const pageWindow = (count: number, at: number): (number | null)[] => {
  if (count <= 9) return Array.from({ length: count }, (_, i) => i);
  const keep = new Set([0, count - 1, at - 1, at, at + 1].filter((i) => i >= 0 && i < count));
  if (at <= 3) [1, 2, 3, 4].forEach((i) => keep.add(i));
  if (at >= count - 4) [count - 5, count - 4, count - 3, count - 2].forEach((i) => keep.add(i));
  const sorted = [...keep].sort((a, b) => a - b);
  return sorted.flatMap((i, k) => (k > 0 && i - sorted[k - 1] > 1 ? [null, i] : [i]));
};

interface TestRunnerProps {
  test: AssessmentTest;
  onClose: () => void;
  // answers: what the candidate wrote and how each was marked, kept for the company the test was taken for
  onComplete: (testId: string, finalScore: number, durationSeconds: number, integrity?: IntegrityReport, breakdown?: ResultBreakdown, answers?: AnswerRecord[]) => void;
  // Tried out from the test builder: nothing is saved
  preview?: boolean;
  // Where the score goes, when it isn't the candidate's profile: e.g. a company trying its own test
  savedNote?: string;
  // Taken for a job: called once the candidate signs and presses Begin, so the try is recorded even if never submitted
  onBegin?: () => void;
  // Which try at the job's test this is, and how many the job allows
  attempt?: { number: number; limit?: number };
  // Where this score places them among everyone on the test, shown with the result (library tests)
  getRankFor?: (score: number) => { rank: number; of: number } | null;
  // A library test: leaving still counts as an attempt, and the next try waits this many days
  retakeDays?: number;
  // Called once the candidate has opened every question (every slide of every task): from then on, leaving locks the
  // test for retakeDays
  onSawAll?: () => void;
  // Training for a company's team: no warnings for leaving the tab, no leaderboard rank, and the worked answers at the end
  training?: boolean;
  // The job simulation practice (with preview: nothing saved): a short start card instead of the intro, and full screen
  // as in the real one so they see how it works
  practice?: boolean;
  // A job simulation's start screen offers the practice first
  onPractice?: () => void;
  // The Corprax team trying a test (with preview: nothing saved): straight in, with no intro, signing, countdown or
  // full screen, and a note at the top saying so
  instant?: boolean;
  // The hiring company's own name and logo on the test (Scale plan)
  brand?: { name: string; logo?: string };
  // With instant: the note at the top instead of "Admin run · not saved" (e.g. a company previewing its draft)
  runLabel?: string;
  // Taken before signing up: the result is kept but not shown until they create an account (src/lib/guestResult.ts)
  guest?: { onSignUp: () => void };
}

// Every candidate gets their own numbers: the test's data is varied from a fresh seed before it opens (lib/variants.ts).
// It takes a moment (each variant is checked against the reference answers), so a short wait shows first
export const TestRunner: React.FC<TestRunnerProps> = (props) => {
  const [own, setOwn] = useState<AssessmentTest | null>(null);
  useEffect(() => {
    let live = true;
    setOwn(null);
    makeVariant(props.test, newVariantSeed()).then((v) => live && setOwn(v.test));
    return () => {
      live = false;
    };
  }, [props.test.id]);
  if (!own)
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center">
        <Pulse label="Preparing your test" />
        <p className="text-sm font-semibold text-slate-700">Preparing your test…</p>
      </div>
    );
  return <TestRunnerInner {...props} test={own} />;
};

const TestRunnerInner: React.FC<TestRunnerProps> = ({ test, onClose, onComplete, preview, savedNote, onBegin, attempt, training, getRankFor, retakeDays, onSawAll, practice, onPractice, instant, brand, runLabel, guest }) => {
  // Each hands-on task is shown with the questions about it; every other question on its own
  const groups = useMemo(() => groupQuestions(test.questions), [test.questions]);
  const ordered = useMemo(() => groups.flatMap((g) => g.questions), [groups]);
  const [groupIndex, setGroupIndex] = useState(0);
  // Within a task, the question on screen: each numbered question and each question about the task is its own slide
  const [slide, setSlide] = useState(0);
  // The question column's width: a share of the screen beside code, pixels beside a task's window
  const codeSplit = useResizable('vetter-split-code', 50);
  const taskSplit = useResizable('vetter-split-task', 420);
  const [userCodes, setUserCodes] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    test.questions.forEach((q) => {
      // A task open to any language starts in Python, with its template
      initial[q.id] = q.language === ANY_LANGUAGE ? packAnswer('python', languageById('python')!.starter) : q.starterCode;
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
  const [finalRank, setFinalRank] = useState<{ rank: number; of: number } | null>(null);
  // Module tests: the score by level and by area, and the level reached
  const [breakdown, setBreakdown] = useState<ResultBreakdown | undefined>();
  const [finalDuration, setFinalDuration] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // After the automatic checks, Corprax's AI takes a second look at code and written answers that fell short
  const [isAiMarking, setIsAiMarking] = useState(false);
  const [aiMarked, setAiMarked] = useState<Record<string, AiMark>>({});
  const answersRef = useRef<AnswerRecord[] | undefined>(undefined);
  // The intro screen shows first; the clock and proctoring only begin once the candidate starts
  const [hasStarted, setHasStarted] = useState(!!instant);
  // A job simulation's brief over the desktop: minimised (the default: the desktop shows each part's brief), open or wide
  const [briefView, setBriefView] = useState<'min' | 'open' | 'wide'>('min');

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
  const [flags, setFlags] = useState({ away: 0, pastes: 0, total: 0, fullscreen: 0 });
  // The test runs full screen, where the browser can (not on an iPhone, say); leaving it is recorded and the test is
  // covered until the candidate goes back. Not in a preview or training
  const wantsFullscreen = (!preview || !!practice) && !training && !instant && typeof document !== 'undefined' && !!document.fullscreenEnabled;
  const [outOfFullscreen, setOutOfFullscreen] = useState(false);
  const enterFullscreen = () => {
    if (wantsFullscreen && !document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
  };
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
  // A task's slides: its numbered questions (or the task as one slide), then each question about it
  const taskParts = currentQ.type === 'case' ? [] : splitParts(currentQ.prompt).parts;
  const promptSlides = currentQ.type === 'case' ? 0 : Math.max(1, taskParts.length);
  const slideCount = Math.max(1, promptSlides + followUps.length);
  const onSlide = Math.min(slide, slideCount - 1);
  // Every question opened: each slide of each part is counted once it's on screen. Once they've seen them all, quitting
  // locks a library test for retakeDays, and they're told so straight away
  const slidesPerGroup = useMemo(
    () =>
      groups.map((g) => {
        const q = g.questions[0];
        const parts = q.type === 'case' ? 0 : Math.max(1, splitParts(q.prompt).parts.length);
        return Math.max(1, parts + (g.task ? g.questions.length - 1 : 0));
      }),
    [groups]
  );
  const seenRef = useRef(new Set<string>());
  const [sawAll, setSawAll] = useState(false);
  const [sawAllNotice, setSawAllNotice] = useState(false);
  useEffect(() => {
    if (!hasStarted || sawAll) return;
    seenRef.current.add(`${groupIndex}:${onSlide}`);
    const total = slidesPerGroup.reduce((n, c) => n + c, 0);
    if (seenRef.current.size >= total) {
      setSawAll(true);
      onSawAll?.();
      if (retakeDays && !preview && !training) setSawAllNotice(true);
    }
  }, [hasStarted, groupIndex, onSlide, slidesPerGroup, sawAll]);

  // Cases are read, not answered, so only questions are numbered
  const numberOf = (q: Question) => ordered.filter((x) => x.type !== 'case').indexOf(q) + 1;
  // The workspace around the task: the Inbox (emails waiting at the start, and the threads that are questions), the
  // files handed over, and the AI tab on the questions the company allows it on
  const [view, setView] = useState<WorkspaceView>('task');
  const [readMail, setReadMail] = useState<Set<number>>(() => new Set());
  const [aiChats, setAiChats] = useState<Record<string, AiTurn[]>>({});
  // The desktop the test's tasks are worked on: its files, mail and the rest, shared by every task (the tasks' own work
  // stays in their answers)
  const [taskDesk, setTaskDesk] = useState('');
  const aiChatsRef = useRef(aiChats);
  aiChatsRef.current = aiChats;
  const inboxItems: InboxItem[] = useMemo(
    () => [
      ...(test.scenario?.inbox ?? []).map((message) => ({ message })),
      ...ordered.flatMap((q) => (q.type === 'email' && q.email ? q.email.thread.map((message) => ({ message, replyIn: `question ${ordered.filter((x) => x.type !== 'case').indexOf(q) + 1}` })) : [])),
    ],
    [test.id]
  );
  const workFiles = test.scenario?.files ?? [];
  const aiInTest = test.questions.some((q) => q.aiAllowed);
  const aiHere = currentGroup.questions.some((q) => q.aiAllowed);
  const aiKey = currentGroup.questions[0].id;
  useEffect(() => {
    if (view === 'ai' && !aiHere) setView('task');
  }, [aiHere]);
  const showWorkspace = inboxItems.length > 0 || workFiles.length > 0 || aiInTest;
  const isDone = (q: Question) =>
    q.type === 'case' ||
    questionScores[q.id] !== undefined ||
    (isAnswerType(q.type) && hasAnswer(q, userCodes[q.id] ?? '')) ||
    (isWorkspaceType(q.type) && (userCodes[q.id] ?? q.starterCode) !== q.starterCode);
  const setAnswer = (id: string, val: string) => setUserCodes((prev) => ({ ...prev, [id]: val }));
  // What a step is called: Task 2, Case 1, or the question's number
  // A group's kind: a question set (a section's context with questions about it), a case study, or a hands-on task
  const kindOfGroup = (g: (typeof groups)[number]) => (!g.task ? null : g.task.type === 'case' ? (g.task.section ? 'Section' : 'Case') : 'Task');
  // Every step is numbered in test order: part 1, 2, 3…, and the questions inside a part 1.1, 1.2…
  const groupLabel = (idx: number) => {
    const g = groups[idx];
    const k = kindOfGroup(g);
    return `${idx + 1} · ${k === 'Section' ? 'Question set' : k === 'Case' ? 'Case study' : k === 'Task' ? 'Task' : 'Question'}`;
  };
  const partNo = groupIndex + 1;
  // How the first question of a part is numbered: 3.1 for a part of several questions, 3 for a single question
  const firstOf = (idx: number) => {
    const g = groups[idx];
    if (!g) return '';
    const parts = g.task && g.task.type !== 'case' ? Math.max(1, splitParts(g.task.prompt).parts.length) : g.task ? 0 : 1;
    return parts + (g.task ? g.questions.length - 1 : 0) > 1 ? `${idx + 1}.1` : `${idx + 1}`;
  };
  const goToGroup = (idx: number) => {
    setGroupIndex(idx);
    setSlide(0);
    setRunResults(null);
  };
  const answeredCount = ordered.filter((q) => q.type !== 'case' && isDone(q)).length;
  const questionCount = ordered.filter((q) => q.type !== 'case').length;
  const isLastGroup = groupIndex === groups.length - 1;
  const currentCode = userCodes[currentQ.id] || '';
  // Coding in a language: which one (the task's, or the candidate's pick on a task open to any), and the code itself
  const anyLanguage = currentQ.language === ANY_LANGUAGE;
  const codeLanguage = answerLanguage(currentQ.language, anyLanguage ? unpackAnswer(currentCode).language ?? 'python' : undefined);
  const editorCode = anyLanguage ? unpackAnswer(currentCode).code : currentCode;
  const editorFile = currentQ.type === 'sql' ? 'sql_workspace.sql' : currentQ.type === 'schema' ? 'schema.sql' : currentQ.language ? codeLanguage.file : 'solution.js';
  const editorHighlight = currentQ.type === 'sql' || currentQ.type === 'schema' ? 'SQLite' : currentQ.language ? codeLanguage.editor : 'JavaScript';
  // Every sample table the task's schema reference names, from the candidate's own variant of the data when it has one
  const sampleTables = Array.from(currentQ.contextData?.matchAll(/Table:\s*(\w+)/g) ?? [])
    .map((m) => (currentQ.type === 'sql' && currentQ.tables?.find((t) => t.name === m[1])) || MOCK_DATABASE[m[1]])
    .filter(Boolean);
  const chartSpec =
    currentQ.preview === 'chart' && runResults?.type === 'code' ? parseChartSpec(runResults.testCaseResults[0]?.actual) : null;

  // The clock, read from the time the test began rather than counted tick by tick: browsers slow or pause timers in a
  // tab that's hidden, so leaving the test never stops the clock. It's read again the moment the candidate is back,
  // and the test hands itself in when time runs out, even if that happened while they were away
  useEffect(() => {
    if (!hasStarted) return;
    const tick = () => {
      const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
      if (limitMinutes === null) {
        setSecondsRemaining(elapsed);
        return;
      }
      const left = Math.max(0, limitMinutes * 60 - elapsed);
      setSecondsRemaining(left);
      if (left === 0 && !submittedRef.current) {
        clearInterval(interval);
        handleSubmitTest();
      }
    };
    const interval = setInterval(tick, 1000);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('focus', tick);
    };
  }, [hasStarted]);

  // How long the candidate has been away: from the moment they first left until they press "back to the test". Going
  // back and leaving again while the warning is still up doesn't restart it, and it counts up live
  const awaySinceRef = useRef<number | null>(null);
  const [lastAway, setLastAway] = useState<number | null>(null);
  useEffect(() => {
    if (!leftTab) return;
    const tick = () => awaySinceRef.current !== null && setLastAway(Math.max(1, Math.round((Date.now() - awaySinceRef.current) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [leftTab]);

  // The integrity monitor: tabs, windows, resizing, copy and paste, screens. Leaving the test brings up a warning
  useEffect(() => {
    if (!hasStarted) return;
    const monitor = startIntegrityMonitor(
      () => currentQuestionRef.current,
      (e, r) => {
        setFlags({
          fullscreen: r.fullscreenExits ?? 0,
          away: r.tabSwitches + r.windowSwitches,
          pastes: r.externalPastes,
          total: r.tabSwitches + r.windowSwitches + (r.fullscreenExits ?? 0) + r.externalPastes + r.resizes + r.copies + r.cuts + r.screenshotKeys,
        });
        if (e.type === 'tab-hidden' || e.type === 'window-blur') {
          if (!preview && !training) awaySinceRef.current ??= Date.now();
          const away = r.tabSwitches + r.windowSwitches;
          setFocusWarning(`You left the test: recorded (${away} ${away === 1 ? 'time' : 'times'})`);
          if (!preview && !training) setLeftTab(true);
        }
        if (e.type === 'fullscreen-exit') setFocusWarning(`You left full screen: recorded (${r.fullscreenExits ?? 1} ${(r.fullscreenExits ?? 1) === 1 ? 'time' : 'times'})`);
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

  // Full screen: watched from the start (the browser may have refused it on Begin), and left once the test is done
  useEffect(() => {
    if (!hasStarted || !wantsFullscreen) return;
    const onChange = () => setOutOfFullscreen(!document.fullscreenElement);
    onChange();
    document.addEventListener('fullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, [hasStarted, wantsFullscreen]);
  useEffect(() => {
    if (showCompletionModal && document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  }, [showCompletionModal]);
  // Out of full screen within the warning: the seconds left to go back before it's recorded (null once it counts)
  const [graceSeconds, setGraceSeconds] = useState<number | null>(null);
  useEffect(() => {
    if (!outOfFullscreen) {
      setGraceSeconds(null);
      return;
    }
    const tick = () => {
      const until = monitorRef.current?.fullscreenGraceUntil() ?? null;
      setGraceSeconds(until === null ? null : Math.max(0, Math.ceil((until - Date.now()) / 1000)));
    };
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [outOfFullscreen]);

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
      [currentQ.id]: currentQ.language === ANY_LANGUAGE ? packAnswer(codeLanguage.id, codeLanguage.starter) : currentQ.starterCode,
    }));
    setRunResults(null);
  };

  // A task open to any language: the candidate's pick, kept with their answer. Changing it starts from that language's
  // template, after asking if they'd written anything
  const switchLanguage = (id: string) => {
    const next = languageById(id);
    if (!next || next.id === codeLanguage.id) return;
    const written = editorCode.trim() && editorCode !== codeLanguage.starter;
    if (written && !window.confirm(`Switch to ${next.label}? Your ${codeLanguage.label} code will be replaced with a ${next.label} starting template.`)) return;
    handleCodeChange(packAnswer(next.id, next.starter));
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
    // Where AI was used, the conversation goes with the answer, so the company sees how it was used
    answersRef.current = answerRecords(test, userCodesRef.current, perQuestion, feedback, graded.runs, marks).map((r) => {
      const chat = aiChatsRef.current[r.id];
      if (!chat?.length) return r;
      const transcript = chat.map((t) => `${t.role === 'user' ? 'Candidate' : 'AI'}: ${t.text}`).join('\n\n');
      return { ...r, answer: `${r.answer}\n\n--- Used the AI assistant (${chat.filter((t) => t.role === 'user').length} messages) ---\n${transcript}`.slice(0, 20000) };
    });
    setQuestionScores(perQuestion);
    setQuestionFeedback(feedback);
    setFinalScore(score);
    // The AI overlay's checks, scored apart from the job score (with the AI's marks on any writing in them)
    const tagged = test.questions.flatMap((q) => (graded.runs[q.id] && 'testCaseResults' in graded.runs[q.id] ? graded.runs[q.id].testCaseResults : []).map((r) => ({ ...r, capability: q.testCases?.find((tc) => tc.id === r.id)?.capability })));
    const aiScore = aiScoreOf(tagged);
    const mode = test.questions.find((q) => q.desktop?.aiMode)?.desktop?.aiMode;
    const byLevel = breakdownFor(test, perQuestion);
    const levels = aiScore === undefined ? byLevel : { ...(byLevel ?? { aspects: [], tiers: [] }), ai: { score: aiScore, competencies: capabilityScores(tagged).map(({ id, score }) => ({ id, score })), ...(mode && { mode }) } };
    const duration = Math.round((Date.now() - startedAtRef.current) / 1000);
    setBreakdown(levels);
    setFinalRank(getRankFor?.(score) ?? null);
    setFinalDuration(duration);
    setIsSubmitting(false);
    setShowCompletionModal(true);
    // Saved the moment it's marked: closing the tab on the result can't throw a score away
    if (!preview) onComplete(test.id, score, duration, integrityRef.current, levels, answersRef.current);
  };

  const handleConfirmFinish = () => {
    if (preview) onComplete(test.id, finalScore, finalDuration, integrityRef.current, breakdown, answersRef.current);
    else onClose();
  };

  // Signed and Begin pressed: the try counts from here, so it's recorded once, before the countdown
  const committedRef = useRef(false);
  const handleCommit = () => {
    if (committedRef.current) return;
    committedRef.current = true;
    onBegin?.();
    // Full screen needs a click to ask for it: this one
    enterFullscreen();
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
  ) : retakeDays && sawAll ? (
    <>
      <strong>You&rsquo;ve seen every question, so if you quit now you can&rsquo;t retake this test for another {retakeDays} days.</strong> Your record
      shows it as left unfinished.
    </>
  ) : retakeDays ? (
    <>
      <strong>It&rsquo;s recorded as an attempt</strong> and shows as left unfinished. Once you&rsquo;ve seen every question, quitting means you
      can&rsquo;t retake it for {retakeDays} days.
    </>
  ) : (
    <>
      <strong>You&rsquo;ll have to retake the test</strong> from the start, with the full time.
    </>
  );
  // A hands-on task's brief and its questions: beside the work, or for a job simulation's desktop, in a panel over it
  // Every hands-on task is on the desktop: a job simulation's or desktop task's own, or the test's desktop with the
  // task's app open (a spreadsheet, a database, an app simulation, a code editor)
  const shellTask = !!currentGroup?.task && ['sheet', 'database', 'app'].includes(currentQ?.type);
  const codeOnDesk = !currentGroup?.task && (currentQ?.type === 'code' || currentQ?.type === 'sql');
  const onDesktop = (!!currentGroup?.task && currentQ?.type === 'desktop') || shellTask || codeOnDesk;
  // A skills task's brief opens over the desktop as the task starts (a job simulation's day has its own briefing)
  useEffect(() => {
    if (shellTask || (currentQ?.type === 'desktop' && !currentQ.desktop?.phases?.length)) setBriefView('open');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQ?.id]);
  const shellDesktop = (render: (ctx: DeskCtx) => React.ReactNode) => {
    const slot = taskSlot(currentQ);
    const cfg = taskDesktop(test, currentQ, aiHere);
    return (
      <Desktop
        key={`shell-${currentQ.id}`}
        question={{ ...currentQ, desktop: cfg }}
        answer={taskDesk}
        onChange={setTaskDesk}
        company={cfg.company}
        startApp={slot.id}
        slot={{ ...slot, render }}
      />
    );
  };
  // A skills task's own window, inside the desktop: its files are the desktop's, and exports are saved there
  const taskWindow = (ctx: DeskCtx) =>
    currentQ.type === 'sheet' ? (
      <SpreadsheetWindow key={currentQ.id} value={currentCode || currentQ.starterCode} onChange={handleCodeChange} fileName={currentQ.contextData || `${currentQ.title}.xlsx`} files={ctx.files.filter((f) => /\.(csv|tsv|txt)$/i.test(f.name))} onSaveFile={(f) => ctx.saveFile(f)} />
    ) : currentQ.type === 'database' ? (
      <DatabaseWindow key={currentQ.id} value={currentCode || currentQ.starterCode} onChange={handleCodeChange} tables={currentQ.tables ?? []} databaseName={currentQ.contextData || 'Database'} files={ctx.files.filter((f) => /\.(csv|tsv)$/i.test(f.name))} onSaveFile={(f) => ctx.saveFile(f)} />
    ) : (
      <AppWindow key={currentQ.id} value={currentCode} onChange={handleCodeChange} html={currentQ.appHtml ?? ''} appName={currentQ.contextData || currentQ.title} callouts={currentQ.callouts} files={ctx.files} onSaveFile={(f) => ctx.saveFile(f)} />
    );
  const taskPanel = !currentGroup?.task ? null : (
    <>
              {test.scenario && <CaseBrief scenario={test.scenario} />}
              <div>
                <div className="text-xs text-slate-500 font-medium mb-1">
                  {currentQ.type === 'case' ? (currentQ.section ? 'Section' : 'Case study') : 'Task'} &middot;{' '}
                  {(() => {
                    // A task in numbered questions counts those (and any questions about it after)
                    const n = slideCount;
                    return `${n} ${n === 1 ? 'question' : 'questions'}`;
                  })()}{' '}
                  &middot; Weight: {currentGroup.questions.reduce((n, q) => n + q.weight, 0)}%
                </div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  {`${partNo}. ${currentQ.title}`}
                </h2>
              </div>
              {/* One question per slide: jump to any, or use Next below once done */}
              {slideCount > 1 && (
                <nav aria-label="Questions in this task" className="flex flex-wrap gap-1.5">
                  {Array.from({ length: slideCount }, (_, i) => {
                    const fq = i >= promptSlides ? followUps[i - promptSlides] : undefined;
                    return (
                      <button
                        key={i}
                        onClick={() => setSlide(i)}
                        aria-current={i === onSlide ? 'step' : undefined}
                        aria-label={`Question ${partNo}.${i + 1}${fq && isDone(fq) ? ', answered' : ''}`}
                        className={`min-w-[2.75rem] h-8 px-2 rounded-full text-xs font-semibold tabular-nums transition-colors ${
                          i === onSlide ? 'bg-indigo-600 text-white' : fq && isDone(fq) ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {partNo}.{i + 1}
                      </button>
                    );
                  })}
                </nav>
              )}
              {onSlide < promptSlides ? (
                <>
                  <TaskPrompt text={currentQ.prompt} checks={currentQ.testCases} only={taskParts.length ? onSlide : undefined} prefix={partNo} className="text-sm leading-relaxed text-slate-800" />
                  {currentQ.testCases.length > 0 && (
                    <div className="space-y-2">
                      {/* A task in numbered questions lists each question's checks under it instead */}
                      {taskParts.length === 0 && (
                        <>
                          <div className="text-xs font-bold text-slate-800">What&rsquo;s marked ({currentQ.testCases.length} checks)</div>
                          <ul className="space-y-1.5">
                            {currentQ.testCases.map((tc) => (
                              <li key={tc.id} className="flex items-start gap-2 text-xs text-slate-700">
                                <CheckCircle2 className="w-3.5 h-3.5 mt-px shrink-0 text-slate-300" />
                                <span>{tc.description}</span>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                      <p className="text-[11px] text-slate-500">
                        Marked when you submit, on the {currentQ.type === 'sheet' ? 'workbook' : currentQ.type === 'app' ? 'simulation' : currentQ.type === 'desktop' ? 'desktop (emails sent, files and workbook)' : 'database'} as you leave it. Your work is kept if you move to another question or task.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                (() => {
                  const q = followUps[onSlide - promptSlides];
                  return (
                    <section key={q.id} className="rounded-lg border border-slate-200 bg-white p-4 space-y-3 shadow-2xs" aria-labelledby={`slide-${q.id}`}>
                      {currentQ.type === 'case' && onSlide === 0 && (
                        <p className="text-sm text-slate-500">{currentQ.section ? 'Use what’s on the left to answer each question.' : 'Read the material on the left, then answer each question. You can go back to it as often as you like.'}</p>
                      )}
                      <div className="flex items-start justify-between gap-2">
                        <h3 id={`slide-${q.id}`} className="flex items-center gap-2 text-sm font-bold text-slate-900">
                          <span className="inline-flex items-center justify-center min-w-[2.25rem] h-6 px-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs tabular-nums">
                            {partNo}.{onSlide + 1}
                          </span>
                          {q.title}
                        </h3>
                        {isDone(q) && <CheckCircle className="w-3.5 h-3.5 mt-1 shrink-0 text-emerald-600" />}
                      </div>
                      <RichText text={q.prompt} className="text-sm leading-relaxed text-slate-800" />
                      <AnswerInput question={q} answer={userCodes[q.id] ?? ''} onChange={(val) => setAnswer(q.id, val)} company={test.scenario?.company ?? test.companyName} />
                    </section>
                  );
                })()
              )}
    </>
  );

  if (!hasStarted && practice) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
        <div role="dialog" aria-modal="true" aria-labelledby="practice-title" className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700">Practice · about 3 minutes</div>
            <h2 id="practice-title" className="text-lg font-bold text-slate-900">Try the job simulation desktop</h2>
          </div>
          <ul className="text-sm text-slate-700 space-y-1.5 list-disc pl-5">
            <li>The same desktop as the real day: Mail, a Spreadsheet and Files.</li>
            <li>Two short timed parts, each with its task at the top. A new email lands when the second starts.</li>
            <li>It runs full screen, like the real one.</li>
            <li>
              <strong>Nothing is scored or saved.</strong> Do it as often as you like.
            </li>
          </ul>
          <div className="flex gap-2">
            <button
              onClick={() => {
                enterFullscreen();
                handleBegin();
              }}
              autoFocus
              className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold"
            >
              Start the practice
            </button>
            <button onClick={onClose} className="px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-600 hover:text-slate-900">
              Not now
            </button>
          </div>
        </div>
      </div>
    );
  }
  if (!hasStarted) {
    return (
      <TestIntro test={test} onBegin={handleBegin} onClose={onClose} onCommit={handleCommit} attempt={attempt} onPractice={onPractice} brand={brand} />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col overflow-hidden text-slate-900 font-sans">
      {/* Top Header Bar */}
      <div className="h-14 border-b border-slate-200 bg-white px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0 shadow-xs">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
          <BackButton onClick={() => (preview ? onClose() : setConfirmingExit(true))}>Exit</BackButton>
          <div className="hidden sm:block h-4 w-px bg-slate-200" />
          {brand && (
            <span className="hidden sm:flex items-center gap-2 shrink-0" title={`${brand.name} assessment`}>
              {brand.logo ? <Pic src={brand.logo} alt="" referrerPolicy="no-referrer" className="w-7 h-7 rounded-md object-cover border border-slate-200" /> : null}
              <span className="text-xs font-semibold text-slate-700 max-w-[10rem] truncate">{brand.name}</span>
              <span className="h-4 w-px bg-slate-200" />
            </span>
          )}
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-slate-900 tracking-tight truncate max-w-[50vw]">{test.title}</h1>
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span>{test.category}</span>
              <span aria-hidden="true">&middot;</span>
              <span>{levelName(test.difficulty)}</span>
              <span aria-hidden="true">&middot;</span>
              <span>{test.questions.length} Questions</span>
              {instant && <span className="px-1.5 py-px rounded bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wide">{runLabel ?? 'Admin run · not saved'}</span>}
            </div>
          </div>
        </div>

        {/* Right: Timer & Proctor Status */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
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
            <span className="hidden sm:inline">{flags.total === 0 ? 'Monitored' : `Monitored · ${flags.total} recorded`}</span>
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

      {/* Every question seen: from now on, quitting locks the test */}
      {sawAllNotice && (
        <div className="px-6 py-2 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3" role="alert">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
            <span className="font-medium">
              You&rsquo;ve now seen every question. If you quit now, you can&rsquo;t retake this test for another {retakeDays} days: finish and submit it.
            </span>
          </div>
          <button onClick={() => setSawAllNotice(false)} className="shrink-0 text-amber-800 hover:text-amber-950 underline font-mono text-[11px]">
            OK
          </button>
        </div>
      )}

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

      {showWorkspace && !onDesktop && (
        <WorkspaceTabs
          view={view}
          onView={setView}
          taskLabel={currentGroup.task ? currentGroup.task.contextData || currentGroup.task.title : `Question ${numberOf(currentQ)}`}
          inboxCount={inboxItems.length}
          unread={inboxItems.length - readMail.size}
          fileCount={workFiles.length}
          aiInTest={aiInTest}
          aiHere={aiHere}
        />
      )}

      {/* Main Split Workstation */}
      <div ref={currentGroup.task ? taskSplit.containerRef : codeOnDesk ? undefined : codeSplit.containerRef} className="relative flex-1 flex overflow-hidden">
        {/* The workspace's other tabs open over the task, which stays as it was underneath */}
        {view !== 'task' && (
          <div className="absolute inset-0 z-30 bg-white">
            {view === 'inbox' ? (
              <InboxPanel items={inboxItems} read={readMail} onRead={(i) => setReadMail((prev) => (prev.has(i) ? prev : new Set(prev).add(i)))} />
            ) : view === 'files' ? (
              <FilesPanel files={workFiles} />
            ) : (
              <AiPanel
                key={aiKey}
                task={`${currentGroup.questions.map((q) => `${q.title}\n${q.prompt}`).join('\n\n')}`.slice(0, 4000)}
                company={test.scenario?.company ?? test.companyName}
                chat={aiChats[aiKey] ?? []}
                onChat={(chat) => setAiChats((prev) => ({ ...prev, [aiKey]: chat }))}
              />
            )}
          </div>
        )}
        {/* While resizing, a cover keeps the drag from being caught by the work window (an app runs in a frame) */}
        {(codeSplit.dragging || taskSplit.dragging) && <div className="fixed inset-0 z-40 cursor-col-resize" />}
        {/* A hands-on task: its window on the left, the brief and the questions about it on the right */}
        {currentGroup.task ? (
          <>
            <div className="flex-1 min-w-0 p-3 bg-slate-100">
              {currentQ.type === 'case' ? (
                <CaseMaterial key={currentQ.id} question={currentQ} />
              ) : onDesktop ? (
                <div className="relative h-full">
                  {currentQ.type === 'desktop' ? (
                    <Desktop key={currentQ.id} question={currentQ.desktop?.phases?.length || !aiHere ? currentQ : { ...currentQ, desktop: { ...currentQ.desktop!, apps: [...currentQ.desktop!.apps, 'ai'] } }} answer={currentCode} onChange={handleCodeChange} company={test.scenario?.company ?? test.companyName} startApp={currentQ.desktop?.phases?.length ? undefined : firstWorkApp(currentQ.desktop!)} />
                  ) : (
                    shellDesktop((ctx) => taskWindow(ctx))
                  )}
                  {/* The brief and what's marked, over the desktop: opened from the footer, wider or minimised as needed */}
                  {briefView !== 'min' && (
                    <aside
                      aria-label="Your brief"
                      className={`absolute right-3 top-24 bottom-14 z-[75] flex flex-col bg-white/95 backdrop-blur-md rounded-xl shadow-2xl ring-1 ring-slate-900/10 overflow-hidden ${briefView === 'wide' ? 'w-[min(720px,calc(100%-1.5rem))]' : 'w-[min(380px,calc(100%-1.5rem))]'}`}
                    >
                      <div className="h-10 shrink-0 flex items-center gap-1 pl-4 pr-1.5 border-b border-slate-200">
                        <span className="text-xs font-semibold text-slate-700 flex-1 truncate">Your brief and what&rsquo;s marked</span>
                        <button onClick={() => setBriefView(briefView === 'wide' ? 'open' : 'wide')} title={briefView === 'wide' ? 'Make narrower' : 'Make wider'} aria-label={briefView === 'wide' ? 'Make narrower' : 'Make wider'} className="w-8 h-8 grid place-items-center rounded-md text-slate-500 hover:bg-slate-100">
                          {briefView === 'wide' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                        </button>
                        <button onClick={() => setBriefView('min')} title="Minimise" aria-label="Minimise the brief" className="w-8 h-8 grid place-items-center rounded-md text-slate-500 hover:bg-slate-100">
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-5">{taskPanel}</div>
                    </aside>
                  )}
                </div>
              ) : null}
            </div>
            {!onDesktop && (
              <ResizeHandle
                dragging={taskSplit.dragging}
                onPointerDown={taskSplit.start((x, rect) => clamp(rect.right - x, 320, rect.width * 0.65))}
                onNudge={(by) => taskSplit.setSize((w) => clamp(w - by * 24, 320, 900))}
              />
            )}
            {!onDesktop && (
              <aside style={{ width: taskSplit.size }} className="shrink-0 bg-white overflow-y-auto p-6 space-y-5">
                {taskPanel}
              </aside>
            )}
          </>
        ) : isAnswerType(currentQ.type) ? (
          // A question to answer on its own: one column, the question first and large, the answers under it
          <div className="flex-1 overflow-y-auto bg-slate-50">
            <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
              {test.scenario && <CaseBrief scenario={test.scenario} />}
              <div className="space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
                  Question {partNo} of {groups.length}
                  <span className="text-slate-400 font-medium normal-case tracking-normal"> &middot; {currentQ.weight}% of the score</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{currentQ.title}</h2>
                <RichText text={currentQ.prompt} className="text-lg leading-relaxed text-slate-800" />
                {currentQ.contextData && (
                  <div className="p-3 bg-indigo-50/50 border border-indigo-200 rounded-lg text-sm font-mono text-indigo-950 overflow-x-auto whitespace-pre-wrap">
                    {currentQ.contextData}
                  </div>
                )}
              </div>
              <div className="pt-2">
                <AnswerInput key={currentQ.id} question={currentQ} answer={currentCode} onChange={handleCodeChange} company={test.scenario?.company ?? test.companyName} />
              </div>
            </div>
          </div>
        ) : (
        <div className="flex-1 min-w-0 p-3 bg-slate-100">
        {shellDesktop(() => (
        <div ref={codeSplit.containerRef} className="relative h-full flex overflow-hidden bg-white">
        {/* Left Pane: Problem Description & Context */}
        <div style={{ width: `${codeSplit.size}%` }} className="shrink-0 flex flex-col bg-white overflow-hidden">
          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            {test.scenario && <CaseBrief scenario={test.scenario} />}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-indigo-700 mb-1.5">
                Question {partNo} of {groups.length}
                <span className="text-slate-400 font-medium normal-case tracking-normal"> &middot; {currentQ.weight}% of the score</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">{currentQ.title}</h2>
            </div>

            {slideCount > 1 && (
              <nav aria-label="Questions in this task" className="flex flex-wrap gap-1.5">
                {Array.from({ length: slideCount }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setSlide(i)}
                    aria-current={i === onSlide ? 'step' : undefined}
                    aria-label={`Question ${partNo}.${i + 1}`}
                    className={`min-w-[2.75rem] h-8 px-2 rounded-full text-xs font-semibold tabular-nums transition-colors ${i === onSlide ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    {partNo}.{i + 1}
                  </button>
                ))}
              </nav>
            )}
            <TaskPrompt text={currentQ.prompt} checks={currentQ.testCases} only={taskParts.length ? onSlide : undefined} prefix={partNo} className="text-[15px] leading-relaxed text-slate-800 font-sans" />

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
            {currentQ.testCases.length > 0 && splitParts(currentQ.prompt).parts.length === 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-800">Target Assertions ({currentQ.testCases.length})</div>
              <div className="space-y-2">
                {currentQ.testCases.map((tc, idx) => (
                  <div key={tc.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5 shadow-2xs">
                    <div className="text-slate-900 font-semibold">Test Case {idx + 1}: {tc.description}</div>
                    <div className="font-mono text-slate-500 text-[11px] truncate">
                      Expected: <span className="text-indigo-700 font-semibold">{tc.isHidden ? 'hidden' : tc.expectedOutput}</span>
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
              <span>{editorFile}</span>
              {anyLanguage && (
                <select
                  value={codeLanguage.id}
                  onChange={(e) => switchLanguage(e.target.value)}
                  aria-label="Language"
                  className="ml-1 px-2 py-1 bg-white border border-slate-300 rounded-md text-xs font-sans font-semibold text-slate-800"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label}
                    </option>
                  ))}
                </select>
              )}
              {currentQ.language && !anyLanguage && <span className="ml-1 px-1.5 py-0.5 rounded bg-white border border-slate-200 font-sans text-[11px] text-slate-600">{codeLanguage.label}</span>}
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
                <span>{isRunning ? 'Running…' : currentQ.type === 'sql' || currentQ.type === 'schema' ? 'Run query' : 'Run code'}</span>
              </button>
            </div>
          </div>

          {/* The code editor: highlighting for the task's language, brackets, indenting and search */}
          <div className="h-72 border-b border-slate-200 relative bg-[#282c34]">
            <CodeField
              key={currentQ.id}
              value={editorCode}
              onChange={(v) => handleCodeChange(anyLanguage ? packAnswer(codeLanguage.id, v) : v)}
              language={editorHighlight}
              ariaLabel={`${codeLanguage.label} code`}
              className="h-full"
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
                  <p>{currentQ.type === 'sql' || currentQ.type === 'schema' ? 'Click "Run query"' : 'Click "Run code"'} to check your answer against the test cases.{currentQ.language ? ' Your program gets each test case on standard input and should print the answer.' : ''}</p>
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
                      {/* A compile error, crash or time-out: the first one, in full, as the language reported it */}
                      {runResults.testCaseResults.find((t) => t.error) && (
                        <pre className="p-2 bg-rose-50 rounded-lg border border-rose-200 text-rose-900 text-[11px] whitespace-pre-wrap break-words max-h-56 overflow-y-auto">
                          {runResults.testCaseResults.find((t) => t.error)!.error}
                        </pre>
                      )}
                      {runResults.logs && runResults.logs.length > 0 && (
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-slate-700 text-xs">
                          <div className="text-slate-400 text-[10px] mb-1 font-semibold">{currentQ.language ? 'STDERR:' : 'STDOUT:'}</div>
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
                      <div className="text-[11px] space-y-1 text-slate-600 font-mono whitespace-pre-wrap break-words">
                        {/* A hidden case (a data file whose answer is the task) shows only what the program printed */}
                        {!currentQ.testCases.find((c) => c.id === tc.id)?.isHidden && (
                          <>
                            <div>Input: <span className="text-slate-900">{tc.input}</span></div>
                            <div>Expected: <span className="text-emerald-700 font-semibold">{tc.expected}</span></div>
                          </>
                        )}
                        <div>Actual: <span className={tc.passed ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-semibold'}>{tc.actual}</span></div>
                        {tc.error && <div>Error: <span className="text-rose-700">{tc.error}</span></div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        </div>
        ))}
        </div>
        )}
      </div>

      {/* Moving through the test: back, where you are and how much is answered, then next (or submit on the last) */}
      <footer className="shrink-0 border-t border-slate-200 bg-white px-4 sm:px-6 py-3 flex items-center gap-4">
        {onDesktop && !codeOnDesk && (
          <button
            onClick={() => setBriefView(briefView === 'min' ? 'open' : 'min')}
            aria-pressed={briefView !== 'min'}
            className={`px-3.5 py-2.5 rounded-lg text-sm font-semibold inline-flex items-center gap-1.5 border ${briefView !== 'min' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-300 text-slate-700 hover:border-slate-400'}`}
          >
            <FileText className="w-4 h-4" />
            {briefView === 'min' ? 'Brief & checks' : 'Hide brief'}
          </button>
        )}
        {onSlide > 0 || groupIndex > 0 ? (
          <BackButton onClick={() => (onSlide > 0 ? setSlide(onSlide - 1) : goToGroup(groupIndex - 1))} className="py-2.5 hidden sm:flex">
            Previous
          </BackButton>
        ) : onDesktop ? null : (
          <span className="hidden sm:block w-[7.5rem]" aria-hidden="true" />
        )}
        {/* Where you are: the pages of the test (each question, task or case), then the answered count and bar */}
        <div className="flex-1 min-w-0 mx-auto max-w-2xl flex flex-col items-center gap-2">
          <nav aria-label="Questions" className="flex items-center gap-1 max-w-full overflow-x-auto">
            <button
              onClick={() => groupIndex > 0 && goToGroup(groupIndex - 1)}
              disabled={groupIndex === 0}
              aria-label="Previous page"
              className="w-8 h-8 shrink-0 grid place-items-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {pageWindow(groups.length, groupIndex).map((idx, k) =>
              idx === null ? (
                <span key={`gap-${k}`} className="hidden sm:block w-6 text-center text-xs text-slate-400" aria-hidden="true">
                  …
                </span>
              ) : (
                <button
                  key={groups[idx].questions[0].id}
                  onClick={() => goToGroup(idx)}
                  aria-current={groupIndex === idx ? 'page' : undefined}
                  aria-label={`${groupLabel(idx)}${groups[idx].questions.every(isDone) ? ', answered' : ''}`}
                  title={groups[idx].task ? `${groups[idx].task!.title}: ${groups[idx].questions.length} ${groups[idx].questions.length === 1 ? 'part' : 'parts'}` : groups[idx].questions[0].title}
                  className={`relative min-w-8 h-8 px-2 shrink-0 rounded-md text-xs font-semibold tabular-nums transition-colors ${groupIndex === idx ? '' : 'hidden sm:block'} ${
                    groupIndex === idx
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : groups[idx].questions.every(isDone)
                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      : groups[idx].task
                      ? 'text-indigo-700 hover:bg-indigo-50'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {idx + 1}
                </button>
              )
            )}
            <span className="sm:hidden text-xs text-slate-500 tabular-nums px-1">of {groups.length}</span>
            <button
              onClick={() => groupIndex < groups.length - 1 && goToGroup(groupIndex + 1)}
              disabled={groupIndex >= groups.length - 1}
              aria-label="Next page"
              className="w-8 h-8 shrink-0 grid place-items-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </nav>
          <div className="w-full max-w-md flex items-center gap-3">
            <span className="hidden sm:inline text-xs text-slate-600 whitespace-nowrap truncate">
              <span className="font-semibold text-slate-900">{groupLabel(groupIndex)}</span>
              {slideCount > 1 && <> &middot; Question {partNo}.{onSlide + 1}</>}
            </span>
            <span className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden" aria-hidden="true">
              <span className="block h-full bg-indigo-600 rounded-full transition-all" style={{ width: `${questionCount ? (answeredCount / questionCount) * 100 : 0}%` }} />
            </span>
            <span className="text-xs text-slate-500 tabular-nums whitespace-nowrap">
              {answeredCount}/{questionCount} answered
            </span>
          </div>
        </div>
        {onSlide < slideCount - 1 ? (
          <button
            onClick={() => setSlide(onSlide + 1)}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1.5 shadow-xs"
          >
            Next: {partNo}.{onSlide + 2}
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : isLastGroup ? (
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
            Next: {firstOf(groupIndex + 1)}
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
            {/* The clock, still running behind this message */}
            <div className="grid grid-cols-2 gap-2">
              <div className={`rounded-xl border px-4 py-3 ${limitMinutes !== null && secondsRemaining <= 60 ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-slate-50'}`}>
                <div className="text-[11px] text-slate-500">{limitMinutes === null ? 'Time taken' : 'Time left'}</div>
                <div className={`font-mono text-2xl font-bold tabular-nums ${limitMinutes !== null && secondsRemaining <= 60 ? 'text-rose-700' : 'text-slate-900'}`} aria-live="off">
                  {formatTime(secondsRemaining)}
                </div>
                <div className="text-[10px] text-slate-400">Still running</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-[11px] text-slate-500">Away from the test for</div>
                <div className="font-mono text-2xl font-bold tabular-nums text-slate-900">{lastAway === null ? '…' : formatTime(lastAway)}</div>
                <div className="text-[10px] text-slate-400">Counting until you go back to the test</div>
              </div>
            </div>
            <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-5">
              <li>Stay on this tab until you submit. The clock kept running while you were away, and it doesn't stop for this message.</li>
              <li>If you close this tab, reload the page or exit the test, your answers are lost. {leavingCost}</li>
            </ul>
            <CheatingWarning compact />
            <button
              onClick={() => {
                awaySinceRef.current = null;
                setLastAway(null);
                setLeftTab(false);
                enterFullscreen();
              }}
              autoFocus
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow-xs"
            >
              I understand, back to the test
            </button>
          </div>
        </div>
      )}

      {/* Out of full screen: recorded, and the test stays covered until they go back */}
      {wantsFullscreen && outOfFullscreen && hasStarted && !leftTab && !confirmingExit && !isSubmitting && !showCompletionModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in" role="alertdialog" aria-modal="true" aria-labelledby="fullscreen-title">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-50 border border-slate-200 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="space-y-1">
                <h3 id="fullscreen-title" className="text-base font-bold text-slate-900">
                  {graceSeconds !== null ? 'You left full screen' : flags.fullscreen ? 'You left full screen' : 'This test runs full screen'}
                </h3>
                <p className="text-xs text-slate-500">
                  {graceSeconds !== null ? (
                    <>
                      Pressing Escape leaves full screen. Go back within <span className="font-mono font-bold text-slate-900 tabular-nums">{graceSeconds}s</span> and
                      nothing is recorded; after that, leaving full screen is recorded and the company sees it with your result.
                    </>
                  ) : flags.fullscreen ? (
                    `Leaving full screen has been recorded (${flags.fullscreen} ${flags.fullscreen === 1 ? 'time' : 'times'}), with how long you were out of it. The company sees it with your result.`
                  ) : (
                    'Go full screen to carry on. Leaving full screen during the test is recorded, and the company sees it with your result.'
                  )}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-700">
              The clock is still running: {limitMinutes === null ? 'time taken' : 'time left'} <span className="font-mono font-semibold tabular-nums">{formatTime(secondsRemaining)}</span>.
            </p>
            <button onClick={enterFullscreen} autoFocus className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow-xs">
              Back to full screen
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

      {/* Taken before signing up: marked and kept, shown once they have an account */}
      {showCompletionModal && guest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Your test is marked</h3>
            <p className="text-sm text-slate-600">
              Create a free account to see your score, the feedback on each task and your rank. Your result goes on your profile, where employers can find it.
            </p>
            <button
              onClick={guest.onSignUp}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <span>Create free account to see my score</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="text-xs text-slate-500 hover:text-slate-700">
              Not now (kept on this device for 24 hours)
            </button>
          </div>
        </div>
      )}

      {/* Completion Modal */}
      {showCompletionModal && !guest && (() => {
        return (
          // The result can be taller than the screen (the breakdown, every task's feedback): it scrolls within the screen
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain p-6 space-y-5 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{instant ? 'Test run finished' : practice ? 'Practice done' : preview ? 'Preview finished' : training ? 'Training complete' : 'Test complete!'}</h3>
                  <p className="text-xs text-slate-500">
                    {instant
                      ? runLabel
                        ? 'Preview: nothing was saved, recorded or sent to anyone. This is how candidates are scored.'
                        : 'Admin test run: nothing was saved, recorded or put on a leaderboard.'
                      : practice
                      ? 'Nothing was scored or saved. Below is what the checks found, so you can see how the real day is marked.'
                      : preview
                      ? 'This is how candidates are scored. Nothing is saved.'
                      : savedNote
                      ? savedNote
                      : isPublic(test)
                      ? 'Your score is saved to your profile and this test’s leaderboard'
                      : `Your score is saved and shared with ${test.companyName}`}
                  </p>
                </div>
              </div>

              {training ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <div className="text-xs text-slate-500 mb-1 font-medium">{breakdown?.ai && test.questions.some((q) => q.testCases?.some((tc) => !tc.capability)) ? 'Job score' : 'Your score'}</div>
                  <div className="text-3xl font-extrabold font-mono tabular-nums text-slate-900">{finalScore}</div>
                  <div className={`text-[11px] mt-1 font-medium ${finalScore >= test.passingScore ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {finalScore >= test.passingScore ? 'Well done: you’ve got the hang of it' : `Worth another go: ${test.passingScore} shows you’ve got it`}
                  </div>
                </div>
              ) : practice ? null : (
                <>
              {/* The score, and where it ranks on the test's leaderboard. No pass mark or badge: the score is the result */}
              <div className={`grid ${finalRank ? 'grid-cols-2' : 'grid-cols-1'} gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-center`}>
                <div>
                  <div className="text-xs text-slate-500 mb-1 font-medium">{breakdown?.ai && test.questions.some((q) => q.testCases?.some((tc) => !tc.capability)) ? 'Job score' : 'Your score'}</div>
                  <div className="text-3xl font-extrabold font-mono tabular-nums text-slate-900">
                    {finalScore}
                    <span className="text-sm font-medium text-slate-400">/100</span>
                  </div>
                </div>
                {finalRank && (
                  <div>
                    <div className="text-xs text-slate-500 mb-1 font-medium">Your rank on this test</div>
                    <div className="text-3xl font-extrabold text-slate-900 font-mono tabular-nums">#{finalRank.rank}</div>
                    <div className="text-[11px] text-indigo-700 mt-1 font-medium">of {finalRank.of}</div>
                  </div>
                )}
              </div>

                </>
              )}

              {breakdown && breakdown.tiers.length > 0 && <ResultBreakdownPanel breakdown={breakdown} testLevel={test.difficulty} />}
              {breakdown?.ai && <AiScorePanel ai={breakdown.ai} />}

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
                            <span className="ml-1.5 px-1.5 py-px rounded bg-indigo-50 text-indigo-700 text-[10px] font-semibold" title="Marked again by Corprax's AI, which gives credit for answers that are nearly right">
                              AI-marked
                            </span>
                          )}
                        </span>
                        <span className="font-mono font-semibold tabular-nums text-slate-900">{questionScores[q.id] ?? 0}/100</span>
                      </div>
                      {training && q.solutionCode && WORKED_ANSWER_TYPES.includes(q.type) && (
                        <div className="mt-0.5 pl-4 text-[11px] text-slate-600 whitespace-pre-wrap">
                          <span className="font-semibold text-slate-800">How to do it: </span>
                          {q.solutionCode}
                        </div>
                      )}
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
                  Code and written answers that weren't fully right were marked again by Corprax's AI, which gives credit for answers that are nearly there.
                </p>
              )}

              <button
                onClick={handleConfirmFinish}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs"
              >
                <span>{instant ? 'Done' : practice ? 'Back to the job simulation' : preview ? 'Back to the builder' : 'Done'}</span>
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
      <RichText text={q.prompt} className="text-sm leading-[1.7] text-slate-800 font-sans" />
    </article>
  </div>
);
