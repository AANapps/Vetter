import Anthropic from '@anthropic-ai/sdk';
import { APP_PAGE_RULES, PRICES, apiFailure } from './generateTest.js';

/**
 * Builds one interactive page of a test from the spec the test designer wrote (its appBrief). Each page is a request of
 * its own, run side by side with the others, so a test with several large pages still fits the host's time limit and
 * every page gets the model's full attention. The browser tries the page out (probeApp) before it joins the draft.
 */

export interface BuildAppRequest {
  title: string;
  // The task as the candidate reads it
  prompt: string;
  // The designer's full spec: what the page shows, its data, interactions and state
  brief: string;
  // The checks the designer planned on the page's state; the builder may rename paths to match what it builds
  testCases: { description: string; input: string; expectedOutput: string }[];
  // Notes on the software or device it copies, when there are any
  research?: string;
  // A repair: the page as built, and what went wrong when Vetter clicked through it
  fix?: { html: string; problems: string[] };
}

const MAX_TEXT = 8000;
// A page is under 60KB, so the one being repaired fits whole
const MAX_PAGE = 90000;

const schema = {
  type: 'object',
  properties: {
    appHtml: { type: 'string' },
    testCases: {
      type: 'array',
      items: {
        type: 'object',
        properties: { description: { type: 'string' }, input: { type: 'string' }, expectedOutput: { type: 'string' } },
        required: ['description', 'input', 'expectedOutput'],
        additionalProperties: false,
      },
    },
  },
  required: ['appHtml', 'testCases'],
  additionalProperties: false,
};

const SYSTEM = (research: string) => `You build the interactive pages candidates work in on Vetter, a skills-testing platform for hiring. A test
designer has written the task and a spec for the page. Build exactly that page, so a candidate who can really do the job
succeeds and one who can't is found out.
${APP_PAGE_RULES}
Return appHtml and testCases. testCases are the designer's checks, with each input a dotted path into the state object
your page really keeps and expectedOutput its value once the task is done right ("|" between acceptable forms; a list as
a JSON array, compared in any order; numbers to 2 decimal places). Keep the designer's intent for each check; change a
path or value only to match the page you built. 3 to 6 checks; the starting state must fail every one, and none may be
passable without doing the task properly.
${research ? `\nRESEARCH on what the page copies:\n${research.slice(0, MAX_TEXT)}` : ''}`;

export async function buildApp(body: unknown, apiKey: string | undefined, model: string): Promise<{ status: number; json: unknown }> {
  const req = body as BuildAppRequest;
  if (!req || typeof req.brief !== 'string' || !req.brief.trim()) return { status: 400, json: { error: 'Nothing to build.' } };
  if (!apiKey) return { status: 503, json: { error: 'not-configured' } };

  const client = new Anthropic({ apiKey });
  try {
    const message = await client.beta.messages
      .stream({
        model,
        max_tokens: 64000,
        // Low effort: the designer has done the thinking in the spec, and a page at higher effort can run past the host's
        // five-minute limit
        output_config: { effort: 'low', format: { type: 'json_schema', schema } },
        ...(!model.includes('haiku') && { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }),
        system: SYSTEM(req.research ?? ''),
        messages: [
          {
            role: 'user',
            content: [
              `TASK TITLE: ${String(req.title ?? '').slice(0, 200)}`,
              `THE TASK AS THE CANDIDATE READS IT:\n${String(req.prompt ?? '').slice(0, MAX_TEXT)}`,
              `THE PAGE SPEC:\n${req.brief.slice(0, MAX_TEXT)}`,
              `THE PLANNED CHECKS:\n${JSON.stringify((req.testCases ?? []).slice(0, 8))}`,
              ...(req.fix?.html
                ? [
                    `THE PAGE AS YOU BUILT IT:\n${String(req.fix.html).slice(0, MAX_PAGE)}`,
                    `PROBLEMS FOUND WHEN VETTER CLICKED THROUGH IT:\n${(req.fix.problems ?? []).slice(0, 30).map((p) => `- ${String(p).slice(0, 200)}`).join('\n')}`,
                    'Return the whole page again with every problem fixed: make each control named above do what its label says in this kind of product, or grey it out (disabled, reduced opacity, cursor:not-allowed, a "Not available in this test" title) when it is outside the task. Fix any errors. Keep everything that already works, the data and the state paths the checks read.',
                  ]
                : []),
            ].join('\n\n'),
          },
        ],
      })
      .finalMessage();

    const price = PRICES[model];
    const { input_tokens, output_tokens } = message.usage;
    if (price) console.log(`[build-app] ${input_tokens} in, ${output_tokens} out: $${((input_tokens * price.input + output_tokens * price.output) / 1e6).toFixed(3)}`);

    if (message.stop_reason === 'refusal') return { status: 422, json: { error: 'The page builder declined this task.' } };
    if (message.stop_reason === 'max_tokens') return { status: 502, json: { error: 'The page came back incomplete.' } };
    const text = message.content.flatMap((block) => (block.type === 'text' ? [block.text] : [])).join('');
    return { status: 200, json: JSON.parse(text) };
  } catch (err) {
    return apiFailure('build-app', err);
  }
}
