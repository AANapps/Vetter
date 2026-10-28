import { GoogleGenAI } from '@google/genai';

/**
 * Writes a test from a prompt or job description with Gemini, and picks tests from the library that fit.
 * Runs on the server so the API key never reaches the browser. The browser checks everything that comes back
 * (src/lib/testGeneration.ts) before anyone sees it.
 */

export interface GenerateRequest {
  prompt: string;
  wantNewTest: boolean;
  wantExisting: boolean;
  questionCount: number;
  styles: string[];
  level: string;
  // The tests already on Vetter the company could use, and roles a library test can be filed under
  library: { id: string; title: string; category: string; difficulty: string; skills: string[]; roles: string[]; description: string }[];
  roles: string[];
  categories: string[];
  // Sample tables SQL questions can query
  tables: { name: string; columns: string[] }[];
}

const MAX_PROMPT = 6000;

const questionSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: ['choice', 'multi', 'text', 'order', 'match', 'code', 'sql'] },
    title: { type: 'string' },
    prompt: { type: 'string' },
    options: { type: 'array', items: { type: 'string' } },
    correctOption: { type: 'integer' },
    correctOptions: { type: 'array', items: { type: 'integer' } },
    acceptedAnswers: { type: 'array', items: { type: 'string' } },
    items: { type: 'array', items: { type: 'string' } },
    pairs: { type: 'array', items: { type: 'object', properties: { left: { type: 'string' }, right: { type: 'string' } }, required: ['left', 'right'] } },
    starterCode: { type: 'string' },
    solutionCode: { type: 'string' },
    testCases: {
      type: 'array',
      items: {
        type: 'object',
        properties: { description: { type: 'string' }, input: { type: 'string' }, expectedOutput: { type: 'string' } },
        required: ['description', 'input', 'expectedOutput'],
      },
    },
    tables: { type: 'array', items: { type: 'string' } },
    timeLimitMinutes: { type: 'integer' },
    points: { type: 'integer' },
  },
  required: ['type', 'title', 'prompt', 'timeLimitMinutes', 'points'],
};

const responseSchema = {
  type: 'object',
  properties: {
    existing: {
      type: 'array',
      items: { type: 'object', properties: { testId: { type: 'string' }, reason: { type: 'string' } }, required: ['testId', 'reason'] },
    },
    test: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        category: { type: 'string' },
        passingScore: { type: 'integer' },
        skillsTested: { type: 'array', items: { type: 'string' } },
        roles: { type: 'array', items: { type: 'string' } },
        questions: { type: 'array', items: questionSchema },
      },
      required: ['title', 'description', 'category', 'passingScore', 'skillsTested', 'questions'],
    },
  },
  required: ['existing'],
};

function instructions(req: GenerateRequest): string {
  return `You help companies on Vetter, a skills-based hiring platform, choose and write tests for a job.

${req.wantExisting ? `Pick up to 4 tests from the LIBRARY that genuinely fit the job, best first, each with a one-sentence reason a hiring manager would find useful. Only use ids from the library. Return an empty list if none fit.` : 'Return an empty "existing" list.'}

${
  req.wantNewTest
    ? `Write one new test of exactly ${req.questionCount} questions at ${req.level} level that checks what the job really needs, without repeating what the picked library tests already cover.
Use only these question styles: ${req.styles.join(', ')}. Mix them where it suits the job. Every question must be answerable from its prompt alone.
Style rules:
- choice: 4 options, exactly one right; correctOption is its 0-based index.
- multi: 4 to 6 options; correctOptions lists every right index (at least 2).
- text: a short factual answer (a word, number or short phrase); acceptedAnswers lists every acceptable wording.
- order: 4 to 6 items listed in the RIGHT order (candidates see them shuffled).
- match: 3 to 5 pairs; each left prompt with its right answer, all distinct.
- code: JavaScript. starterCode defines "function solution(...)". solutionCode is a correct reference implementation. 3 to 5 testCases; input is a JSON array of the arguments, e.g. "[[3,1,2]]" calls solution([3,1,2]); expectedOutput is the JSON result.
- sql: query only these tables: ${req.tables.map((t) => `${t.name}(${t.columns.join(', ')})`).join('; ')}. List the tables used in "tables". solutionCode is a correct SQLite query; starterCode is a comment and "SELECT ".
timeLimitMinutes is realistic for the question (2 to 5 for answer styles, 10 to 20 for code and sql). points reflect importance.
category must be one of: ${req.categories.join(', ')}. passingScore between 60 and 80. roles: pick from ${req.roles.join(', ')}.
Write plainly, in British English, with no em dashes.`
    : 'Do not include "test".'
}

LIBRARY:
${req.library.map((t) => `- ${t.id}: ${t.title} (${t.category}, ${t.difficulty}; skills: ${t.skills.join(', ')}; roles: ${t.roles.join(', ')}). ${t.description}`).join('\n')}`;
}

export async function generateTest(body: unknown, apiKey: string | undefined, model: string): Promise<{ status: number; json: unknown }> {
  const req = body as GenerateRequest;
  if (!req || typeof req.prompt !== 'string' || !req.prompt.trim()) return { status: 400, json: { error: 'Describe the job or the test you want.' } };
  if (!apiKey) return { status: 503, json: { error: 'not-configured' } };

  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model,
      contents: `The job or test the company described:\n\n${req.prompt.slice(0, MAX_PROMPT)}`,
      config: {
        systemInstruction: instructions({ ...req, questionCount: Math.min(15, Math.max(1, Math.round(req.questionCount || 6))) }),
        responseMimeType: 'application/json',
        responseJsonSchema: responseSchema,
        temperature: 0.7,
      },
    });
    return { status: 200, json: JSON.parse(response.text ?? '{}') };
  } catch (err) {
    return { status: 502, json: { error: err instanceof Error ? err.message : 'The AI request failed.' } };
  }
}
