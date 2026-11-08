import Anthropic from '@anthropic-ai/sdk';
import { meter } from './meter.js';
import { MAX_PROMPT, PRICES, apiFailure, questionSchema } from './generateTest.js';
import { GuideRequest, styleGuide } from './testChat.js';

/**
 * Writes one section of a planned test in full (server/planTest.ts made the plan). The browser asks for every section
 * at once, so a long test is written in parallel and each request stays short enough for the host's time limit.
 */

export interface WriteRequest extends GuideRequest {
  job?: string;
  // What the company has said in the conversation
  brief: string;
  plan: {
    title: string;
    difficulty: string;
    company?: string;
    setting?: string;
    people?: string[];
    blueprint: string[];
    items: { ref: string; taskRef: string; type: string; title: string; brief: string; points: number; minutes: number }[];
  };
  // The refs of the items to write now, in order
  write: string[];
  research?: string;
}

const MAX_TEXT = 8000;

const schema = {
  type: 'object',
  properties: { questions: { type: 'array', items: questionSchema } },
  required: ['questions'],
  additionalProperties: false,
};

function instructions(req: WriteRequest): string {
  return `You write questions for Vetter, a skills-testing platform for hiring. A test designer has planned a ${req.plan.difficulty}-level
test, "${req.plan.title}". Write the items you're given in full, so that whoever passes can really do the job and whoever
can't is found out.

Write exactly the items listed under WRITE NOW, in that order, one question each, keeping each item's ref (every item
here has one, plain questions too, whatever the rules below say), taskRef, type,
points and minutes (as timeLimitMinutes), and following its brief. The rest of the plan is there so you know what other
items cover: don't test the same thing twice. A question about a case or task must turn on what that case or task
contains, so read its brief. keep is "" on every question.
${styleGuide(req)}
${req.research ? `\nRESEARCH on what the simulations copy:\n${req.research.slice(0, MAX_TEXT)}` : ''}`;
}

export async function writeQuestions(body: unknown, apiKey: string | undefined, model: string): Promise<{ status: number; json: unknown }> {
  const req = body as WriteRequest;
  if (!req?.plan?.items?.length || !req.write?.length) return { status: 400, json: { error: 'Nothing to write.' } };
  if (!apiKey) return { status: 503, json: { error: 'not-configured' } };

  const wanted = new Set(req.write);
  const line = (i: WriteRequest['plan']['items'][number]) =>
    `- ${i.ref}${i.taskRef ? ` (about ${i.taskRef})` : ''} [${i.type}, ${i.points} points, ${i.minutes} min] ${i.title}: ${i.brief}`;
  const content = [
    req.job ? `THE JOB:\n${req.job.slice(0, MAX_PROMPT)}` : '',
    req.brief ? `WHAT THE COMPANY SAID:\n${req.brief.slice(0, MAX_TEXT)}` : '',
    req.plan.setting ? `THE JOB SIMULATION, at ${req.plan.company || 'the company'}:\n${req.plan.setting}\n\nTHE PEOPLE (use these, by name and address; an email's address book is drawn from them):\n${(req.plan.people ?? []).join('\n')}` : '',
    `WHAT THE HIRE NEEDS:\n${req.plan.blueprint.join('\n')}`,
    `THE WHOLE PLAN:\n${req.plan.items.map(line).join('\n')}`,
    `WRITE NOW:\n${req.plan.items.filter((i) => wanted.has(i.ref)).map(line).join('\n')}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  const hands = req.plan.items.some((i) => wanted.has(i.ref) && ['app', 'sheet', 'database', 'code'].includes(i.type));
  const client = new Anthropic({ apiKey });
  try {
    const message = await client.beta.messages
      .stream({
        model,
        max_tokens: 64000,
        // A section with a hands-on task carries a lot of content (data, a page spec), so it thinks less to stay well
        // inside the host's five-minute limit; the plan has already done the designing
        output_config: { effort: hands ? 'low' : 'medium', format: { type: 'json_schema', schema } },
        ...(!model.includes('haiku') && { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }),
        system: [{ type: 'text', text: instructions(req), cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content }],
      })
      .finalMessage();
    meter(model, message.usage);
    const price = PRICES[model];
    const { input_tokens, output_tokens } = message.usage;
    if (price) console.log(`[write-questions] ${req.write.length} items, ${input_tokens} in, ${output_tokens} out: $${((input_tokens * price.input + output_tokens * price.output) / 1e6).toFixed(3)}`);
    if (message.stop_reason === 'refusal') return { status: 422, json: { error: 'Vetter declined to write part of this test.' } };
    if (message.stop_reason === 'max_tokens') return { status: 502, json: { error: 'A section came back incomplete.' } };
    return { status: 200, json: JSON.parse(message.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('')) };
  } catch (err) {
    return apiFailure('write-questions', err);
  }
}
