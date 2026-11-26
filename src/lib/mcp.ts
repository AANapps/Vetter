import { MockApiConfig, MockApiState, callApi } from './mockApi';

/**
 * AI tools (MCP) on the desktop (the AI Tools app, src/components/desk/McpApp.tsx): the candidate sets up the tools an
 * AI agent gets, the way an MCP server exposes a company's systems: which of the API's operations become tools, each
 * tool's name and description (what the AI reads to decide when to use it), its inputs, and whether a person must
 * confirm it before it runs. Then real requests from customers are tried on a live agent (server/deskAgent.ts mode
 * "tools") that can only use those tools; its calls go to the company's API (src/lib/mockApi.ts) for real.
 * Marked on whether the agent got things done, and on safety: confirmation on what changes money or data, and no tool
 * for what the agent must never do.
 */

export interface McpParam {
  name: string;
  in: 'path' | 'query' | 'body';
  type: 'string' | 'number';
  required?: boolean;
  about: string;
}
export interface McpOperation {
  id: string;
  label: string; // "Find customers"
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string; // "/orders/{id}"
  about: string;
  // Changes money or data, or can't be undone
  destructive?: boolean;
  params: McpParam[];
}
export interface McpScenario {
  id: string;
  title: string;
  // What the customer writes to the agent
  message: string;
}
export interface McpConfig {
  name?: string;
  // Who the agent is, for its instructions
  agentRole: string;
  operations: McpOperation[];
  scenarios: McpScenario[];
  // Tools already set up when the day starts (some to fix)
  tools?: McpTool[];
}
export interface McpTool {
  id: string;
  name: string;
  description: string;
  op: string;
  confirm: boolean;
  // The operation's inputs the tool takes, with what the AI is told about each
  params: { name: string; description: string }[];
}
export interface McpStep {
  kind: 'customer' | 'agent' | 'tool';
  text?: string;
  tool?: string;
  input?: Record<string, unknown>;
  status?: number;
  result?: string;
  // A tool that needed confirming: what the person said
  confirmed?: boolean;
}
export interface McpRun {
  scenario: string;
  steps: McpStep[];
  final: string;
  at: number;
  done: boolean;
}
export interface McpState {
  tools: McpTool[];
  runs: Record<string, McpRun>;
}

export const TOOL_NAME = /^[a-zA-Z0-9_-]{1,64}$/;

// A tool as the AI sees it (Anthropic's tool format: name, description, input_schema)
export function toolSchema(t: McpTool, op: McpOperation) {
  const props: Record<string, { type: string; description: string }> = {};
  const required: string[] = [];
  for (const p of t.params) {
    const def = op.params.find((x) => x.name === p.name);
    if (!def) continue;
    props[p.name] = { type: def.type, description: p.description || def.about };
    if (def.required) required.push(p.name);
  }
  return { name: t.name, description: t.description, input_schema: { type: 'object', properties: props, required } };
}

// Runs a tool call on the company's API: path, query and body made from the inputs, the key added by the server it runs on
export function runTool(api: MockApiConfig, state: MockApiState | undefined, t: McpTool, op: McpOperation, input: Record<string, unknown>) {
  let path = op.path;
  const query = new URLSearchParams();
  const body: Record<string, unknown> = {};
  const allowed = new Set(t.params.map((p) => p.name));
  for (const p of op.params) {
    const v = input[p.name];
    if (v === undefined || v === '' || !allowed.has(p.name)) continue;
    if (p.in === 'path') path = path.replace(`{${p.name}}`, encodeURIComponent(String(v)));
    else if (p.in === 'query') query.set(p.name, String(v));
    else body[p.name] = p.type === 'number' ? Number(v) : String(v);
  }
  if (/\{[^}]+\}/.test(path)) return { res: { status: 400, body: { error: `Missing ${path.match(/\{([^}]+)\}/)![1]}` } }, state: state ?? { collections: {}, calls: [] } };
  const q = query.toString();
  return callApi(api, state, { method: op.method, url: `${api.baseUrl}${path}${q ? `?${q}` : ''}`, headers: { [api.auth.header]: api.auth.key }, ...(op.method === 'POST' || op.method === 'PATCH' ? { body: JSON.stringify(body) } : {}) }, 'agent');
}
