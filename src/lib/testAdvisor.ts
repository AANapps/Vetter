import { AssessmentTest, Business, TestKind, User } from '../types';
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
  // Candidates on Vetter who suit the role, when the company asked to see some, each with why
  people?: SuggestedPerson[];
  // What the chat took the company to want: people, a test, both, or it couldn't tell and asked
  intent?: AdvisorIntent;
  // Quick answers to a question the reply asks
  options?: string[];
  // For a test: what Vetter's AI would write it from
  brief?: string;
  // Set when the reply is a failure rather than advice
  error?: boolean;
  // Written by Vetter itself on coming back from the AI creator: what was just made (saved, or kept as a draft)
  created?: { title: string; kind: TestKind; testId?: string; draft?: boolean; questions: number; apps: number };
  // Offers to build something more from the same brief, the kind just made named (written by Vetter itself)
  offerMore?: { brief: string; built: TestKind };
}

export type AdvisorIntent = 'candidates' | 'test' | 'both' | 'training' | 'unclear';

export interface SuggestedPerson {
  candidateId: string;
  reason: string;
  // Skills the role needs that they haven't verified, and a brief for a test that would check them
  gaps?: string[];
  testBrief?: string;
}

export const CUSTOM_KIND_LABELS: Record<CustomIdea['kind'], string> = {
  app: 'App simulation',
  sheet: 'Spreadsheet task',
  database: 'Database task',
  code: 'Coding task',
  written: 'Written case',
  mixed: 'Custom test',
};

// Without the AI, what a message is after: a test when it names one, people when it's looking for someone
const ASKS_FOR_TEST = /\b(tests?|assessments?|exams?|quiz|screening task)\b/i;
const ASKS_FOR_PEOPLE = /\b(candidates?|people|applicants?|who (could|might|would)|talent|profiles?|looking for|need(s|ing)? (a|an|some)|hiring (a|an)|find (me )?(a|an|some|someone))\b/i;

// Without the AI: candidates whose title or verified skills share words with what was asked, best scores first
function matchPeople(asked: string, candidates: User[]) {
  const words = asked.toLowerCase().split(/[^a-z0-9+#]+/).filter((w) => w.length > 2 && !['the', 'and', 'for', 'who', 'candidates', 'candidate', 'people', 'show', 'some', 'with', 'that', 'could', 'might', 'suit', 'role'].includes(w));
  return candidates
    .map((c) => {
      const hay = `${c.title} ${c.verifiedSkills.map((s) => s.skillName).join(' ')}`.toLowerCase();
      const hits = words.filter((w) => hay.includes(w)).length;
      const best = [...c.verifiedSkills].sort((a, b) => b.score - a.score).slice(0, 2);
      return { c, hits, best };
    })
    .filter((m) => m.hits > 0)
    .sort((a, b) => b.hits - a.hits || (b.best[0]?.score ?? 0) - (a.best[0]?.score ?? 0))
    .slice(0, 5)
    .map(({ c, best }) => ({
      candidateId: c.id,
      reason: `${c.title || 'Candidate'}${best.length ? `, verified in ${best.map((s) => `${s.skillName} (${s.score})`).join(' and ')}` : ''}.`,
    }));
}

export async function askAdvisor(turns: AdvisorTurn[], tests: AssessmentTest[], business?: Business, candidates: User[] = []): Promise<AdvisorTurn> {
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
        candidates: candidates.map((c) => ({
            id: c.id,
            title: c.title,
            location: c.location,
            ...(c.careerStage && { stage: c.careerStage }),
            years: c.yearsExperience,
            work: c.workPreference,
            ...((c.studySubject || c.university) && { studied: [c.studySubject, c.university].filter(Boolean).join(', ') }),
            skills: c.verifiedSkills.map((s) => ({ name: s.skillName, score: s.score, level: s.level })),
            ...(c.experience?.length && { jobs: c.experience.slice(0, 5).map((j) => `${j.role} at ${j.company}, ${j.start} to ${j.end ?? 'now'}`) }),
            tests: new Set(c.testResults.map((r) => r.testId)).size,
        })),
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
    const lastAsk = messages[messages.length - 1]?.text ?? '';
    if (ASKS_FOR_PEOPLE.test(lastAsk) && !ASKS_FOR_TEST.test(lastAsk)) {
      const people = matchPeople(asked, candidates);
      return {
        role: 'assistant',
        text: people.length
          ? "Vetter's AI isn't switched on here, so these are the candidates whose titles and verified skills match the words you used."
          : "Vetter's AI isn't switched on here, and no candidate's title or verified skills match those words. Try naming the skills or the role.",
        intent: 'candidates',
        people,
      };
    }
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
    people: body.people ?? [],
    intent: body.intent,
    options: (body.options ?? []).slice(0, 4),
    brief: String(body.brief ?? '').trim() || undefined,
  };
}
