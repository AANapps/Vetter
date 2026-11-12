import Anthropic from '@anthropic-ai/sdk';
import { meter } from './meter.js';
import { PRICES, apiFailure } from './generateTest.js';

/**
 * When a company posts a job, reads the job description and picks the tests from Vetter's library (and the company's
 * own) that fit it, each with a reason. The job form then asks the company whether to include them. It only reads and
 * picks, so it's quick, and free like the home chat.
 */

export interface SuggestTestsRequest {
  job: { title: string; description: string; sector?: string; level?: string; department?: string };
  library: { id: string; title: string; category: string; difficulty: string; skills: string[]; roles: string[]; description: string }[];
}

const MAX_TEXT = 8000;
const MAX_LIBRARY = 400;

const schema = {
  type: 'object',
  properties: {
    picks: {
      type: 'array',
      items: { type: 'object', properties: { testId: { type: 'string' }, reason: { type: 'string' } }, required: ['testId', 'reason'], additionalProperties: false },
    },
  },
  required: ['picks'],
  additionalProperties: false,
};

const instructions = `You help a company that is posting a job on Vetter, a skills-testing platform for hiring. Read the job and pick
the tests from THE LIBRARY that candidates for it should take: up to four, best first, by their exact id. Only pick a
test that checks work this job really does day to day; a good candidate must look at it and think "yes, that's my job".
First decide whether the job is desk work (done at a computer) or hands-on work (trades, clinical, dental and care,
hospitality, retail floor, warehouse...): never pick a spreadsheet, database, coding or office-software test for
hands-on work unless the job description itself asks for that skill. Prefer the test at the job's level. reason is one
sentence a hiring manager would find useful, saying what the test checks for this role; if the level or focus isn't
exact, say so. If nothing in the library really fits, return no picks: an empty list is better than a poor fit.`;

export async function suggestTests(body: unknown, apiKey: string | undefined, model: string): Promise<{ status: number; json: unknown }> {
  const req = body as SuggestTestsRequest;
  if (!req?.job?.title?.trim() || !Array.isArray(req.library)) return { status: 400, json: { error: 'Nothing to suggest for.' } };
  if (!req.library.length) return { status: 200, json: { picks: [] } };
  if (!apiKey) return { status: 503, json: { error: 'not-configured' } };

  const { job } = req;
  const library = req.library.slice(0, MAX_LIBRARY);
  const content = [
    `THE JOB: ${String(job.title).slice(0, 200)}${job.level ? ` (${String(job.level).slice(0, 60)})` : ''}${job.department ? `, ${String(job.department).slice(0, 100)}` : ''}${job.sector ? `; sector: ${String(job.sector).slice(0, 40)}` : ''}`,
    `THE JOB DESCRIPTION:\n${String(job.description ?? '').slice(0, MAX_TEXT) || '(none given: go by the title)'}`,
    `THE LIBRARY:\n${library.map((t) => `- ${t.id}: ${t.title} (${t.category}, ${t.difficulty}; skills: ${(t.skills ?? []).join(', ')}; roles: ${(t.roles ?? []).join(', ')}). ${String(t.description ?? '').slice(0, 300)}`).join('\n')}`,
  ].join('\n\n');

  const client = new Anthropic({ apiKey });
  try {
    const message = await client.beta.messages.create({
      model,
      max_tokens: 2000,
      output_config: { effort: 'low', format: { type: 'json_schema', schema } },
      system: instructions,
      messages: [{ role: 'user', content }],
    });
    meter(model, message.usage);
    const price = PRICES[model];
    const { input_tokens, output_tokens } = message.usage;
    if (price) console.log(`[suggest-tests] ${input_tokens} in, ${output_tokens} out: $${((input_tokens * price.input + output_tokens * price.output) / 1e6).toFixed(4)}`);
    if (message.stop_reason === 'refusal') return { status: 200, json: { picks: [] } };
    const out = JSON.parse(message.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('')) as { picks?: { testId: string; reason: string }[] };
    const ids = new Set(library.map((t) => t.id));
    const seen = new Set<string>();
    const picks = (out.picks ?? []).filter((p) => ids.has(p.testId) && !seen.has(p.testId) && seen.add(p.testId)).slice(0, 4);
    return { status: 200, json: { picks } };
  } catch (err) {
    return apiFailure('suggest-tests', err);
  }
}
