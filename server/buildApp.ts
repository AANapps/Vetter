import Anthropic from '@anthropic-ai/sdk';
import { meter } from './meter.js';
import { APP_PAGE_RULES, GAME_PAGE_RULES, PRICES, apiFailure, sectorSimulationRules } from './generateTest.js';
import { APP_KIT_GUIDE } from './appKit.js';

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
  // A change the company asked for: the page as it is, and what to change
  edit?: { html: string; change: string };
  // Training for a company's own people rather than a hiring test: the tips can guide them step by step
  training?: boolean;
  // A game-like simulation in a gamified test, or the one advanced simulation that is the whole test: built with more
  // thought and, standalone, more room and a check per task
  game?: 'gamified' | 'standalone';
  // The sector the company hires in, which decides what the simulation shows
  sector?: string;
  // A retry after a game page ran out of time: built at the usual effort
  quick?: boolean;
  // The page worked out in detail by the designer (server/designApp.ts), to type out
  design?: string;
}

const MAX_TEXT = 8000;
// A page is under 60KB (a standalone simulation 100KB), so the one being repaired fits whole
const MAX_PAGE = 150000;

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
    callouts: {
      type: 'array',
      items: {
        type: 'object',
        properties: { ref: { type: 'string' }, text: { type: 'string' } },
        required: ['ref', 'text'],
        additionalProperties: false,
      },
    },
  },
  required: ['appHtml', 'testCases', 'callouts'],
  additionalProperties: false,
};

const SYSTEM = (research: string, training: boolean, game?: BuildAppRequest['game'], sector?: string) => `You build the interactive pages candidates work in on Vetter, a skills-testing platform for hiring. A test
designer has written the task and a spec for the page. Build exactly that page, so a candidate who can really do the job
succeeds and one who can't is found out.
${APP_PAGE_RULES}${game ? GAME_PAGE_RULES : ''}${sectorSimulationRules(sector)}${APP_KIT_GUIDE}${
  game === 'standalone'
    ? `
STANDALONE: this page is the whole test, so it may be up to 100KB. It works through the spec's tasks one at a time: a
task card ("Task 3 of 10", what's needed, Done and Skip buttons) over the simulation, the next task arriving when one is
done or skipped, every earlier result kept. The state records each task's outcome under tasks.<n>, and there is one
check per task (8 to 15), its description naming the task.`
    : ''
}
Return appHtml and testCases. testCases are the designer's checks, with each input a dotted path into the state object
your page really keeps and expectedOutput its value once the task is done right ("|" between acceptable forms; a list as
a JSON array, compared in any order; numbers to 2 decimal places). Keep the designer's intent for each check; change a
path or value only to match the page you built. ${game === 'standalone' ? '8 to 15 checks, one per task' : '3 to 6 checks'}; the starting state must fail every one, and none may be
passable without doing the task properly.
TIPS ON THE PAGE: candidates find long instructions hard to follow, so the page itself shows where things are. Give 3 to
6 elements the task uses a data-ref attribute with a short unique name (data-ref="orders-list"), on an element that is
on screen when it matters (the button, the list, the form field, the tab), and return callouts: one for each, in the
order the candidate will need them, ref being the data-ref and text at most 18 words, plain and friendly, saying what it
is and what it's for ("New refunds start here: pick the order first, then the reason."). ${
  training
    ? 'This is training for the company\'s own people: the tips may guide them step by step through the task.'
    : 'This is a hiring test: tips show where things are and what they do, never which choice is right, the values to enter or the answer to any check.'
}
${research ? `\nRESEARCH on the job and what the page copies (keep every term, step and value true to it):\n${research.slice(0, MAX_TEXT * 2)}` : ''}`;

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
        // five-minute limit. Game-like simulations get more (their behaviour is harder to get right); one that ran out of
        // time is retried at low
        output_config: { effort: req.game && !req.quick ? 'medium' : 'low', format: { type: 'json_schema', schema } },
        ...(!model.includes('haiku') && { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }),
        system: SYSTEM(req.research ?? '', !!req.training, req.game, req.sector),
        messages: [
          {
            role: 'user',
            content: [
              `TASK TITLE: ${String(req.title ?? '').slice(0, 200)}`,
              `THE TASK AS THE CANDIDATE READS IT:\n${String(req.prompt ?? '').slice(0, MAX_TEXT)}`,
              `THE PAGE SPEC:\n${req.brief.slice(0, req.game === 'standalone' ? MAX_TEXT * 2 : MAX_TEXT)}`,
              `THE PLANNED CHECKS:\n${JSON.stringify((req.testCases ?? []).slice(0, req.game === 'standalone' ? 15 : 8))}`,
              ...(req.design && !req.fix?.html && !req.edit?.html
                ? [
                    `THE PAGE DESIGN, worked out in detail by Vetter's product designer: build exactly this, with its look, layout, screens, data, state and controls (where it and the spec disagree, the spec wins):\n${String(req.design).slice(0, MAX_TEXT * 3)}`,
                  ]
                : []),
              ...(req.fix?.html
                ? [
                    `THE PAGE AS YOU BUILT IT:\n${String(req.fix.html).slice(0, MAX_PAGE)}`,
                    `PROBLEMS FOUND WHEN VETTER CLICKED THROUGH IT:\n${(req.fix.problems ?? []).slice(0, 30).map((p) => `- ${String(p).slice(0, 200)}`).join('\n')}`,
                    'Return the whole page again, keeping its data-ref tips, with every problem fixed: make each control named above do what its label says in this kind of product, or grey it out (disabled, reduced opacity, cursor:not-allowed, a "Not available in this test" title) when it is outside the task. Fix any errors. Keep everything that already works, the data and the state paths the checks read.',
                  ]
                : []),
              ...(req.edit?.html
                ? [
                    `THE PAGE AS IT IS NOW:\n${String(req.edit.html).slice(0, MAX_PAGE)}`,
                    `THE CHANGE THE COMPANY ASKED FOR:\n${String(req.edit.change ?? '').slice(0, MAX_TEXT)}`,
                    'Return the whole page again (with its data-ref tips and callouts, updated for the change) with exactly that change made, done properly and working (new screens, controls, data or behaviour all fully functional, as in the real product). Keep everything else as it is: the look, the data the task\'s questions rely on, and the state paths the checks read, unless the change needs them to change; then update the checks to match.',
                  ]
                : []),
            ].join('\n\n'),
          },
        ],
      })
      .finalMessage();
    meter(model, message.usage);

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
