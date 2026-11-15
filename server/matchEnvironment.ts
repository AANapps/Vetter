import Anthropic from '@anthropic-ai/sdk';
import { meter } from './meter.js';
import { apiFailure } from './generateTest.js';

/**
 * Vetter's environment library keeps one simulation per app, and each test that uses the app builds on it and adds
 * features. This works out which app a new simulation copies and finds it in the library, if it's there. A quick model
 * is enough; it only reads short summaries.
 */

interface MatchRequest {
  title?: string;
  prompt?: string;
  brief?: string;
  environments?: { id: string; app?: string; name: string; product: string; summary: string; features?: string[] }[];
}

const schema = {
  type: 'object',
  properties: { id: { type: 'string' }, app: { type: 'string' }, reason: { type: 'string' } },
  required: ['id', 'app', 'reason'],
  additionalProperties: false,
};

const SYSTEM = `You find the app a new simulation page copies in Vetter's library. Vetter keeps one simulation per app (Meta Ads
Manager, Salesforce, Square POS...), and every test that uses an app builds on the library's copy of it and adds the
features it needs, so the app grows. First work out which app the new page copies, from its task and spec. Then pick
the library entry for THAT app: the same product, whatever it is called (Facebook Ads Manager is Meta Ads Manager; the
Leads Center and retargeting audiences are parts of Meta Ads Manager). A different product of the same kind is NOT a
match (Google Ads is not Meta Ads Manager; HubSpot is not Salesforce). When the spec names no product, pick a "Generic"
entry of the same kind, if there is one. If the app isn't in the library, return id "". app: the app the new page
copies, as people call it. reason: one short sentence.`;

export async function matchEnvironment(body: unknown, apiKey: string | undefined, model: string): Promise<{ status: number; json: unknown }> {
  const req = (body ?? {}) as MatchRequest;
  const list = (req.environments ?? []).slice(0, 60);
  if (!list.length) return { status: 200, json: { id: '', reason: 'The library is empty.' } };
  if (!apiKey) return { status: 503, json: { error: 'not-configured' } };
  const client = new Anthropic({ apiKey });
  try {
    const message = await client.messages.create({
      model,
      max_tokens: 400,
      output_config: { format: { type: 'json_schema', schema } },
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            `THE NEW PAGE: ${String(req.title ?? '').slice(0, 200)}`,
            `THE TASK:\n${String(req.prompt ?? '').slice(0, 3000)}`,
            `THE PAGE SPEC:\n${String(req.brief ?? '').slice(0, 5000)}`,
            `THE LIBRARY:\n${list.map((e) => `- ${e.id}: APP ${String(e.app ?? e.name).slice(0, 80)} (${String(e.product).slice(0, 60)}). ${String(e.summary).slice(0, 300)} Features: ${(e.features ?? []).slice(0, 30).join('; ').slice(0, 600)}`).join('\n')}`,
          ].join('\n\n'),
        },
      ],
    });
    meter(model, message.usage);
    const text = message.content.flatMap((block) => (block.type === 'text' ? [block.text] : [])).join('');
    const out = JSON.parse(text) as { id?: string; app?: string; reason?: string };
    const id = list.some((e) => e.id === out.id) ? String(out.id) : '';
    return { status: 200, json: { id, app: String(out.app ?? ''), reason: String(out.reason ?? '') } };
  } catch (err) {
    return apiFailure('match-environment', err);
  }
}
