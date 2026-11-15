import Anthropic from '@anthropic-ai/sdk';
import { meter } from './meter.js';
import { apiFailure } from './generateTest.js';

/**
 * Vetter's environment library: every simulation page it has built (a CRM, a help desk, a booking system) is kept, so
 * the next test that needs the same kind of software starts from that page instead of designing one from nothing. This
 * picks the saved environment, if any, that a new simulation's spec can be built on: the same kind of product, with
 * the screens the task needs or close to them. A quick model is enough; it only reads short summaries.
 */

interface MatchRequest {
  title?: string;
  prompt?: string;
  brief?: string;
  environments?: { id: string; name: string; product: string; summary: string }[];
}

const schema = {
  type: 'object',
  properties: { id: { type: 'string' }, reason: { type: 'string' } },
  required: ['id', 'reason'],
  additionalProperties: false,
};

const SYSTEM = `You pick a starting point for an interactive simulation page on Vetter, a skills-testing platform. Vetter keeps
a library of pages it built for earlier tests, each a working copy of a kind of software or equipment. A new page is
needed. Pick the one saved environment that copies the SAME KIND of product (a CRM for a CRM task, a help desk for a
ticket task, a spreadsheet-like grid is not a CRM) and whose shell, screens and components would carry most of the new
task, so that only the data and task-specific parts need to change. Prefer one that copies the same product family the
spec names. If none is clearly the same kind of product, return id "" (a new page is designed from scratch). Never pick
one just because it is close in topic. reason: one short sentence.`;

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
            `THE LIBRARY:\n${list.map((e) => `- ${e.id}: ${String(e.name).slice(0, 80)} (copies: ${String(e.product).slice(0, 80)}). ${String(e.summary).slice(0, 400)}`).join('\n')}`,
          ].join('\n\n'),
        },
      ],
    });
    meter(model, message.usage);
    const text = message.content.flatMap((block) => (block.type === 'text' ? [block.text] : [])).join('');
    const out = JSON.parse(text) as { id?: string; reason?: string };
    const id = list.some((e) => e.id === out.id) ? String(out.id) : '';
    return { status: 200, json: { id, reason: String(out.reason ?? '') } };
  } catch (err) {
    return apiFailure('match-environment', err);
  }
}
