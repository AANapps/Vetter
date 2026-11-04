import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * What one request to Vetter's AI cost, added up across every call to Claude it makes (a test written in one go, a
 * chat turn that researched software first...). Each handler reports its calls with meter(); routes.ts runs billed
 * requests inside metered() and charges the company for the total (server/credits.ts).
 */

// US dollars per million tokens, as Anthropic charges them
export const PRICES: Record<string, { input: number; output: number }> = {
  'claude-opus-5-5': { input: 4, output: 20 },
  'claude-sonnet-5-5': { input: 2, output: 10 },
  'claude-haiku-5-5': { input: 0.1, output: 0.5 },
};
// Dollars per web search, while researching software
const SEARCH_PRICE = 10 / 1000;

type Usage = {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  server_tool_use?: { web_search_requests?: number | null } | null;
};

const store = new AsyncLocalStorage<{ usd: number }>();

// Cached reads cost a tenth of a normal input token and cache writes a quarter more; input_tokens leaves both out
export function costOf(model: string, usage: Usage): number {
  const price = PRICES[model] ?? PRICES['claude-opus-5-5'];
  const input = usage.input_tokens + (usage.cache_read_input_tokens ?? 0) * 0.1 + (usage.cache_creation_input_tokens ?? 0) * 1.25;
  return (input * price.input + usage.output_tokens * price.output) / 1e6 + (usage.server_tool_use?.web_search_requests ?? 0) * SEARCH_PRICE;
}

export function meter(model: string, usage: Usage) {
  const tally = store.getStore();
  if (tally) tally.usd += costOf(model, usage);
}

export async function metered<T>(run: () => Promise<T>): Promise<{ result: T; usd: number }> {
  const tally = { usd: 0 };
  const result = await store.run(tally, run);
  return { result, usd: tally.usd };
}
