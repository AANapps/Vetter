import { AssessmentTest, Business } from '../types';
import { Suggestion, libraryFor, matchExisting } from './testGeneration';

// The company home's chat (server/testAdvisor.ts does the AI side): who they're hiring in, a roadmap, the library tests
// that fit and custom pieces worth building out. Without the AI, the library is still matched on the words used.

export interface CustomIdea {
  title: string;
  kind: 'app' | 'sheet' | 'database' | 'code' | 'written' | 'mixed';
  why: string;
  // What the test chat is seeded with, to build it
  brief: string;
}

export interface AdvisorTurn {
  role: 'user' | 'assistant';
  text: string;
  roadmap?: { step: string; detail: string }[];
  existing?: Suggestion[];
  custom?: CustomIdea[];
  // Set when the reply is a failure rather than advice
  error?: boolean;
}

export const CUSTOM_KIND_LABELS: Record<CustomIdea['kind'], string> = {
  app: 'App simulation',
  sheet: 'Spreadsheet task',
  database: 'Database task',
  code: 'Coding task',
  written: 'Written case',
  mixed: 'Custom test',
};

export async function askAdvisor(turns: AdvisorTurn[], tests: AssessmentTest[], business?: Business): Promise<AdvisorTurn> {
  const library = libraryFor(tests, business);
  const messages = turns.filter((t) => !t.error).map(({ role, text }) => ({ role, text }));
  let res: Response | undefined;
  let body: Record<string, any> = {};
  try {
    res = await fetch('/api/test-advisor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        company: business?.name,
        library: library.map((t) => ({
          id: t.id,
          title: t.title,
          category: t.category,
          difficulty: t.difficulty,
          skills: t.skillsTested,
          roles: t.roles ?? [],
          description: t.description,
          minutes: t.estimatedMinutes,
          types: [...new Set(t.questions.map((q) => q.type))],
        })),
      }),
    });
    body = await res.json().catch(() => ({}));
  } catch {
    return { role: 'assistant', text: "Couldn't reach Vetter. Check your connection and try again.", error: true };
  }

  // No AI here (or no endpoint at all): the library tests that share the most words with what they asked for
  if (!res.ok && (body.error === 'not-configured' || res.status === 404)) {
    const asked = messages.filter((m) => m.role === 'user').map((m) => m.text).join('\n');
    const existing = matchExisting(asked, library);
    return {
      role: 'assistant',
      text: existing.length
        ? "Vetter's AI isn't switched on here, so these are the library tests that match the words you used. Use one as it is, or edit a copy to make it your own."
        : "Vetter's AI isn't switched on here, and no library test matches those words. Try naming the skills or tools, or create a test yourself.",
      existing,
    };
  }
  if (!res.ok) return { role: 'assistant', text: body.error || `Something went wrong (${res.status}). Try again.`, error: true };

  const existing: Suggestion[] = ((body.existing ?? []) as { testId: string; reason: string }[]).flatMap(({ testId, reason }) => {
    const test = library.find((t) => t.id === testId);
    return test ? [{ test, reason }] : [];
  });
  return {
    role: 'assistant',
    text: String(body.reply ?? '').trim(),
    roadmap: body.roadmap ?? [],
    existing,
    custom: body.custom ?? [],
  };
}
