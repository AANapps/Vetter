import Anthropic from '@anthropic-ai/sdk';
import { meter } from './meter.js';
import { APP_PAGE_RULES, GAME_PAGE_RULES, PRICES, apiFailure, sectorSimulationRules } from './generateTest.js';
import { APP_KIT_GUIDE } from './appKit.js';
import type { BuildAppRequest } from './buildApp.js';

/**
 * The first half of building an interactive page: a product designer works out the page in detail (its look, layout,
 * screens, data, state, every control and the tips) at high effort, writing no code. The page builder
 * (server/buildApp.ts) then types it out as a working page. Split in two, each half gets its own request within the
 * host's time limit, so the thinking no longer has to squeeze into the same five minutes as the writing.
 */

const MAX_TEXT = 8000;

const schema = {
  type: 'object',
  properties: { design: { type: 'string' } },
  required: ['design'],
  additionalProperties: false,
};

const SYSTEM = (req: BuildAppRequest) => `You are the senior product designer for Vetter, a skills-testing platform for hiring. A candidate will work
in an interactive page that copies the software, equipment or workplace of a job. A test designer has written the task
and a spec. Before a developer builds it, you design the page in full detail, so the developer only has to type it out
and it comes out looking and working like a current, polished product that someone in the job would recognise. Write
no code.

THE RULES THE PAGE MUST FOLLOW (design within them):
${APP_PAGE_RULES}${req.game ? GAME_PAGE_RULES : ''}${sectorSimulationRules(req.sector)}
${APP_KIT_GUIDE}

WRITE THE DESIGN as plain text with these numbered sections, concrete and complete, at most about 1,800 words:
1. LOOK: the kind of product it should feel like (never a brand name), the --vk-* settings to set (hex values), density,
   a light or dark shell, and anything distinctive about this product's look.
2. LAYOUT: the page's structure (regions, their sizes and how they scroll), and for each screen which regions show what
   and which kit pieces to use. Lay it out the way this kind of product really is, not a generic template.
3. SCREENS AND FLOW: every screen, panel, dialog and drawer, how the candidate gets to each, and what each shows.
4. DATA: every record the task needs with its fields and exact values (the figures, names and dates the checks and the
   task's questions depend on), plus how many realistic filler records of each kind and what they look like.
5. STATE: the one JSON state object (its shape and starting values), and for each planned check the dotted path it reads
   and the value once the task is done right. The starting state must fail every check.
6. CONTROLS: every visible control and exactly what it does; which are greyed out as outside the task.
7. TIPS: the 3 to 6 elements to mark with data-ref (name and what each is for).
${req.game ? '8. THE SCENE: what is drawn (views, parts, positions, sizes, states), what moves and when, and every interaction.\n' : ''}
${req.training ? 'This is training for a company\'s own people.' : 'This is a hiring test: nothing on the page may give away the answer.'}
${req.research ? `\nRESEARCH on the job and what the page copies (keep every term, step and value true to it):\n${req.research.slice(0, MAX_TEXT * 2)}` : ''}`;

export async function designApp(body: unknown, apiKey: string | undefined, model: string): Promise<{ status: number; json: unknown }> {
  const req = body as BuildAppRequest;
  if (!req || typeof req.brief !== 'string' || !req.brief.trim()) return { status: 400, json: { error: 'Nothing to design.' } };
  if (!apiKey) return { status: 503, json: { error: 'not-configured' } };

  const client = new Anthropic({ apiKey });
  try {
    const message = await client.beta.messages
      .stream({
        model,
        max_tokens: 24000,
        // The thinking happens here, at high effort; the design itself is short, so it fits the time limit
        output_config: { effort: 'high', format: { type: 'json_schema', schema } },
        ...(!model.includes('haiku') && { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }),
        system: SYSTEM(req),
        messages: [
          {
            role: 'user',
            content: [
              `TASK TITLE: ${String(req.title ?? '').slice(0, 200)}`,
              `THE TASK AS THE CANDIDATE READS IT:\n${String(req.prompt ?? '').slice(0, MAX_TEXT)}`,
              `THE PAGE SPEC:\n${req.brief.slice(0, req.game === 'standalone' ? MAX_TEXT * 2 : MAX_TEXT)}`,
              `THE PLANNED CHECKS:\n${JSON.stringify((req.testCases ?? []).slice(0, req.game === 'standalone' ? 15 : 8))}`,
            ].join('\n\n'),
          },
        ],
      })
      .finalMessage();
    meter(model, message.usage);

    const price = PRICES[model];
    const { input_tokens, output_tokens } = message.usage;
    if (price) console.log(`[design-app] ${input_tokens} in, ${output_tokens} out: $${((input_tokens * price.input + output_tokens * price.output) / 1e6).toFixed(3)}`);

    if (message.stop_reason === 'refusal') return { status: 422, json: { error: 'The designer declined this task.' } };
    if (message.stop_reason === 'max_tokens') return { status: 502, json: { error: 'The design came back incomplete.' } };
    const text = message.content.flatMap((block) => (block.type === 'text' ? [block.text] : [])).join('');
    return { status: 200, json: JSON.parse(text) };
  } catch (err) {
    return apiFailure('design-app', err);
  }
}
