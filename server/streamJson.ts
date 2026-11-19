import Anthropic from '@anthropic-ai/sdk';

type Params = Parameters<Anthropic['beta']['messages']['stream']>[0];

/**
 * A streamed request whose reply is JSON in a set shape (output_config.format). Claude turns the shape into a grammar
 * and refuses one it finds too large ("The compiled grammar is too large..."); then the request is sent again without
 * the grammar, with the shape written into the instructions, and the JSON is cut out of the reply. Callers read the
 * text as before
 */
export async function streamJson(client: Anthropic, params: Params): Promise<Anthropic.Beta.BetaMessage> {
  try {
    return await client.beta.messages.stream(params).finalMessage();
  } catch (err) {
    const { format, ...config } = (params.output_config ?? {}) as { format?: { schema?: unknown } } & Record<string, unknown>;
    if (!(err instanceof Anthropic.BadRequestError) || !/grammar is too large/i.test(err.message) || !format?.schema) throw err;
    console.warn('[streamJson] the reply shape is too large for a grammar; asking for it in the instructions instead');
    const rule = `Reply with only one JSON object (no code fences, nothing before or after it) matching this JSON schema exactly, with every property present:\n${JSON.stringify(format.schema)}`;
    const system: Params['system'] =
      typeof params.system === 'string' || !params.system ? `${params.system ?? ''}\n\n${rule}`.trim() : [...params.system, { type: 'text', text: rule }];
    const message = await client.beta.messages.stream({ ...params, system, output_config: config }).finalMessage();
    const text = message.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
    const json = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
    const rest = message.content.filter((b) => b.type !== 'text');
    return { ...message, content: [...rest, { type: 'text', text: json || text, citations: null } as Anthropic.Beta.BetaTextBlock] };
  }
}
