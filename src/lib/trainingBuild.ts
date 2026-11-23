import { AssessmentTest, Business, TrainingGuide, TrainingLesson } from '../types';
import { aiFetch, setAiPurpose, startAiRun } from './aiRequest';
import { Progress, buildAppPage } from './testChat';

/**
 * Guided training, built in two steps: the AI plans the lessons and the spec of the app (/api/write-training), then the
 * app is built like any simulation (buildAppPage). That reuses Praxa's app library when it has the software, and sends
 * a new app, or what this one added to a library app, to the Praxa team's review queue, so later training and job
 * simulations are built on it. The result is saved as the company's training, never among its tests.
 */

export interface TrainingPlan {
  title: string;
  summary: string;
  appName: string;
  product: string;
  minutes: number;
  appBrief: string;
  lessons: { title: string; intro: string; steps: { instruction: string; why: string; ref: string; path: string; expected: string; hint: string }[] }[];
  wrapUp: string;
}

export type Built = { ok: true; test: AssessmentTest } | { ok: false; error: string; needsCredit?: boolean };

const slug = (s: string, i: number) => (s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `step-${i + 1}`).slice(0, 40);

export async function planTraining(brief: string, business?: Business, change?: { text: string; current: TrainingGuide & { title: string } }): Promise<{ plan?: TrainingPlan; error?: string; needsCredit?: boolean }> {
  try {
    const res = await aiFetch('/api/write-training', {
      brief,
      company: { name: business?.name, sector: business?.sector },
      ...(change && { change: change.text, current: change.current }),
    });
    if (res.status === 402) return { needsCredit: true, error: "You've used the AI included in your plan and any credit. Top up or upgrade to carry on." };
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.error) return { error: body.error === 'not-configured' ? "Praxa's AI isn't set up on this server." : body.error || "Couldn't plan the training." };
    return { plan: body as TrainingPlan };
  } catch (err) {
    return { error: (err as Error)?.name === 'AbortError' ? 'Stopped.' : "Couldn't reach Praxa's AI. Check your connection." };
  }
}

// The lessons as stored, each step with an id and a ref unique across the training
function lessonsOf(plan: TrainingPlan): TrainingLesson[] {
  const used = new Set<string>();
  let n = 0;
  return plan.lessons.slice(0, 8).map((l, li) => ({
    id: `l${li + 1}`,
    title: String(l.title).slice(0, 120),
    intro: String(l.intro).slice(0, 800),
    steps: (l.steps ?? []).slice(0, 8).map((s) => {
      let ref = slug(String(s.ref ?? ''), n);
      while (used.has(ref)) ref = `${ref}-2`;
      used.add(ref);
      n++;
      return {
        id: `s${n}`,
        instruction: String(s.instruction).slice(0, 400),
        why: String(s.why).slice(0, 400),
        ref,
        path: String(s.path).trim().slice(0, 200),
        expected: String(s.expected).trim().slice(0, 200),
        hint: String(s.hint).slice(0, 400),
      };
    }),
  }));
}

// The app built (or fitted from the library) for the plan, and the training around it
export async function buildTraining(plan: TrainingPlan, business: Business | undefined, progress: Progress, keep?: Pick<AssessmentTest, 'id'>): Promise<Built> {
  startAiRun();
  setAiPurpose(`Training: ${plan.title}`);
  const lessons = lessonsOf(plan);
  const steps = lessons.flatMap((l) => l.steps);
  if (!steps.length) return { ok: false, error: 'The plan had no steps to build. Try again.' };
  const refs = steps.map((s) => `- data-ref="${s.ref}": ${s.instruction} (done when ${s.path} = ${s.expected})`).join('\n');
  const brief = `${plan.appBrief}

This is guided TRAINING, not a test: a coach beside the app walks the learner through each step below and glows on the
element marked with its data-ref, so put each data-ref on the exact control or area named, and make every step's state
path change as described when they do it (and not before). Nothing on the page needs hiding.
${refs}`;
  const page = await buildAppPage(
    {
      id: 'app',
      type: 'app',
      title: `${plan.appName}: ${plan.title}`,
      prompt: plan.summary,
      contextData: plan.appName,
      appHtml: brief,
      testCases: steps.map((s, i) => ({ id: `tc${i + 1}`, description: s.instruction, input: s.path, expectedOutput: s.expected })),
    },
    undefined,
    { training: true, sector: business?.sector },
    progress,
    { owner: business?.name ? `${business.name} (training)` : 'Praxa (training)' }
  );
  if (!page.appHtml || page.appHtml === brief) return { ok: false, error: "The app for this training couldn't be built. Try again in a moment." };
  // The builder may rename state paths to match what it built: each step follows its check
  const built = page.testCases ?? [];
  if (built.length === steps.length)
    built.forEach((tc, i) => {
      if (tc.input?.trim()) steps[i].path = tc.input.trim();
      if (tc.expectedOutput?.trim()) steps[i].expected = tc.expectedOutput.trim();
    });
  const guide: TrainingGuide = { summary: plan.summary, appName: plan.appName, product: plan.product, lessons, wrapUp: plan.wrapUp, appBrief: plan.appBrief };
  const test: AssessmentTest = {
    id: keep?.id ?? `training-${Date.now()}`,
    title: plan.title,
    category: 'Customer Support',
    difficulty: 'Beginner',
    type: 'custom',
    purpose: 'training',
    timeLimit: 'none',
    description: plan.summary,
    estimatedMinutes: Math.max(5, Math.min(90, Math.round(plan.minutes) || 20)),
    // Finishing every step is the pass (skipped steps count against it)
    passingScore: 80,
    totalQuestions: 1,
    skillsTested: [plan.appName, ...lessons.map((l) => l.title)].slice(0, 8),
    ...(business && { businessId: business.id, companyName: business.name }),
    guide,
    questions: [
      {
        id: 'app',
        title: plan.appName,
        type: 'app',
        prompt: plan.summary,
        contextData: plan.appName,
        appHtml: page.appHtml,
        ...(page.libraryApp && { libraryApp: page.libraryApp }),
        starterCode: '',
        testCases: steps.map((s, i) => ({ id: `tc${i + 1}`, description: s.instruction, input: s.path, expectedOutput: s.expected })),
        timeLimitMinutes: 0,
        weight: 1,
      },
    ],
  };
  return { ok: true, test };
}

// A saved training as the plan it came from, to change and rebuild
export const planOf = (test: AssessmentTest): TrainingPlan | null =>
  test.guide
    ? {
        title: test.title,
        summary: test.guide.summary,
        appName: test.guide.appName,
        product: test.guide.product ?? '',
        minutes: test.estimatedMinutes,
        appBrief: test.guide.appBrief,
        lessons: test.guide.lessons.map((l) => ({ title: l.title, intro: l.intro, steps: l.steps.map(({ id: _id, ...s }) => s) })),
        wrapUp: test.guide.wrapUp,
      }
    : null;
