/**
 * A company's REST API, simulated in the browser for the API console, the Automations "HTTP request" step and the
 * AI tools (MCP) builder: collections of records behind the usual endpoints, with an API key, pagination, filters,
 * validation and a rate limit, answering like a real API (status codes and JSON). Everything a call changes is kept
 * in the desktop's state (DeskAppsState.api), so checks read the records and the calls made.
 *
 *   GET    /<collection>?<filter>=…&page=2&per_page=10   a page of records: { data, page, per_page, total, total_pages }
 *   GET    /<collection>/<id>                            one record, or 404
 *   POST   /<collection>                                 create (JSON body, validated: 422 with details), 201
 *   PATCH  /<collection>/<id>                            change fields (validated), 200
 *   DELETE /<collection>/<id>                            204
 * Without the right key header: 401. A method the collection doesn't allow: 405. Over the rate limit: 429.
 */

export interface ApiField {
  name: string;
  type: 'string' | 'number' | 'boolean';
  required?: boolean;
  enum?: string[];
  // Set by the API, not the caller (ids, timestamps)
  readOnly?: boolean;
}
export interface ApiCollection {
  name: string; // "customers"
  idField: string; // "id"
  idPrefix: string; // "CUS-"
  fields: ApiField[];
  records: Record<string, unknown>[];
  methods: ('GET' | 'POST' | 'PATCH' | 'DELETE')[];
  // Query parameters a list can be filtered by (exact match)
  filters?: string[];
}
export interface MockApiConfig {
  name: string;
  baseUrl: string; // "https://api.northfield.example/v1"
  auth: { header: string; key: string };
  perPage: number;
  maxPerPage?: number;
  // Calls allowed in any 60 seconds
  rateLimit?: number;
  collections: ApiCollection[];
  // The API's documentation, shown in the console (plain text with "# " headings and "- " bullets)
  docs: string;
}
export interface ApiCall {
  method: string;
  path: string;
  status: number;
  at: number;
  // Where it came from: the console, an automation, or the AI agent through a tool
  via: 'console' | 'automation' | 'agent';
  body?: string;
}
export interface MockApiState {
  collections: Record<string, Record<string, unknown>[]>;
  calls: ApiCall[];
  // The console's request history (what was sent), newest last
  history?: { method: string; url: string; headers: [string, string][]; body: string; status: number; response: string; at: number }[];
}
export interface ApiRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}
export interface ApiResponse {
  status: number;
  body: unknown;
}

const lower = (s: string) => String(s ?? '').toLowerCase();
export const recordsOf = (cfg: MockApiConfig, state: MockApiState | undefined, name: string) => state?.collections?.[name] ?? cfg.collections.find((c) => c.name === name)?.records ?? [];

// One call: the response, and the API's state after it
export function callApi(cfg: MockApiConfig, state: MockApiState | undefined, req: ApiRequest, via: ApiCall['via'], now = Date.now()): { res: ApiResponse; state: MockApiState } {
  const cur: MockApiState = { collections: state?.collections ?? {}, calls: state?.calls ?? [], ...(state?.history && { history: state.history }) };
  const method = req.method.toUpperCase();
  let url = req.url.trim();
  if (lower(url).startsWith(lower(cfg.baseUrl))) url = url.slice(cfg.baseUrl.length);
  else if (/^https?:\/\//i.test(url)) return done(404, { error: `Unknown host. This API is at ${cfg.baseUrl}` }, url);
  const [rawPath, query = ''] = url.split('?');
  const path = `/${rawPath.replace(/^\/+|\/+$/g, '')}`;
  const params = Object.fromEntries(new URLSearchParams(query));

  function done(status: number, body: unknown, p = path): { res: ApiResponse; state: MockApiState } {
    return { res: { status, body }, state: { ...cur, calls: [...cur.calls, { method, path: p, status, at: now, via, ...(req.body && method !== 'GET' && { body: req.body.slice(0, 2000) }) }].slice(-300) } };
  }

  // The key first, then the rate limit
  const key = Object.entries(req.headers ?? {}).find(([k]) => lower(k) === lower(cfg.auth.header))?.[1];
  if (!key || key.trim() !== cfg.auth.key) return done(401, { error: `Missing or invalid API key. Send it in the ${cfg.auth.header} header.` });
  if (cfg.rateLimit && cur.calls.filter((c) => now - c.at < 60_000).length >= cfg.rateLimit) return done(429, { error: 'Too many requests. Wait a minute and try again.', retry_after_seconds: 60 });

  const [, name, id, extra] = path.split('/');
  const col = cfg.collections.find((c) => c.name === name);
  if (!col || extra !== undefined) return done(404, { error: `No such endpoint: ${method} ${path}` });
  const records = recordsOf(cfg, cur, col.name);
  const save = (next: Record<string, unknown>[]) => (cur.collections = { ...cur.collections, [col.name]: next });
  const find = () => records.find((r) => lower(String(r[col.idField])) === lower(decodeURIComponent(id)));

  if (!col.methods.includes(method as ApiCollection['methods'][number]) || (method === 'POST' && id) || ((method === 'PATCH' || method === 'DELETE') && !id))
    return done(405, { error: `${method} isn't allowed on ${id ? `/${col.name}/{${col.idField}}` : `/${col.name}`}. Allowed: ${col.methods.join(', ')}` });

  if (method === 'GET' && id) {
    const r = find();
    return r ? done(200, r) : done(404, { error: `No ${col.name.replace(/s$/, '')} with ${col.idField} ${id}` });
  }
  if (method === 'GET') {
    const unknown = Object.keys(params).filter((k) => !['page', 'per_page'].includes(k) && !(col.filters ?? []).includes(k));
    if (unknown.length) return done(400, { error: `Unknown query parameter${unknown.length > 1 ? 's' : ''}: ${unknown.join(', ')}. Filters on /${col.name}: ${(col.filters ?? []).join(', ') || 'none'}` });
    const matching = records.filter((r) => (col.filters ?? []).every((f) => params[f] === undefined || lower(String(r[f])) === lower(params[f])));
    const per = Math.min(Math.max(1, Number(params.per_page) || cfg.perPage), cfg.maxPerPage ?? cfg.perPage);
    const page = Math.max(1, Math.floor(Number(params.page) || 1));
    const pages = Math.max(1, Math.ceil(matching.length / per));
    return done(200, { data: matching.slice((page - 1) * per, page * per), page, per_page: per, total: matching.length, total_pages: pages, ...(page < pages && { next_page: page + 1 }) });
  }
  if (method === 'DELETE') {
    if (!find()) return done(404, { error: `No ${col.name.replace(/s$/, '')} with ${col.idField} ${id}` });
    save(records.filter((r) => r !== find()));
    return done(204, null);
  }

  // POST and PATCH: a JSON body, checked against the fields
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(req.body || '{}');
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
  } catch {
    return done(400, { error: 'The body must be a JSON object, e.g. {"name": "…"}. Set Content-Type: application/json.' });
  }
  const problems: string[] = [];
  for (const [k, v] of Object.entries(body)) {
    const f = col.fields.find((x) => x.name === k);
    if (!f) problems.push(`${k}: not a field of ${col.name}`);
    else if (f.readOnly) problems.push(`${k}: set by the API, can't be sent`);
    else if (f.type === 'number' && typeof v !== 'number') problems.push(`${k}: must be a number`);
    else if (f.type === 'boolean' && typeof v !== 'boolean') problems.push(`${k}: must be true or false`);
    else if (f.type === 'string' && typeof v !== 'string') problems.push(`${k}: must be a string`);
    else if (f.enum && !f.enum.includes(String(v))) problems.push(`${k}: must be one of ${f.enum.join(', ')}`);
  }
  if (method === 'POST') for (const f of col.fields) if (f.required && !f.readOnly && (body[f.name] === undefined || body[f.name] === '')) problems.push(`${f.name}: required`);
  // A field naming another collection's id must point at a record that exists
  for (const [k, v] of Object.entries(body)) {
    const other = cfg.collections.find((c) => k === `${c.name.replace(/s$/, '')}_id`);
    if (other && typeof v === 'string' && !recordsOf(cfg, cur, other.name).some((r) => lower(String(r[other.idField])) === lower(v))) problems.push(`${k}: no ${other.name.replace(/s$/, '')} ${v}`);
  }
  if (problems.length) return done(422, { error: 'Validation failed', details: problems });
  if (method === 'PATCH') {
    const r = find();
    if (!r) return done(404, { error: `No ${col.name.replace(/s$/, '')} with ${col.idField} ${id}` });
    const next = { ...r, ...body };
    save(records.map((x) => (x === r ? next : x)));
    return done(200, next);
  }
  const n = records.reduce((m, r) => Math.max(m, Number(String(r[col.idField]).replace(/\D/g, '')) || 0), 0) + 1;
  const made = { [col.idField]: `${col.idPrefix}${n}`, ...body, ...(col.fields.some((f) => f.name === 'created_at') && { created_at: new Date(now).toISOString().slice(0, 10) }) };
  save([...records, made]);
  return done(201, made);
}

// The checks on the API (src/lib/deskApps.ts deskAppValue):
//   apirec:<collection>:<field>=<value>:<field>   a field of the first record whose field is that value
//   apicount:<collection>                         how many records it has now
//   apicalls:<METHOD>:<path start>[:<status>]     how many calls were made (any way: console, automation, agent)
export function apiValue(cfg: MockApiConfig, state: MockApiState | undefined, kind: string, parts: string[]): unknown {
  if (kind === 'apicount') return recordsOf(cfg, state, parts[0]).length;
  if (kind === 'apirec') {
    const [name, spec, field] = parts;
    const [f, ...v] = spec.split('=');
    const r = recordsOf(cfg, state, name).find((x) => lower(String(x[f] ?? '')) === lower(v.join('=')));
    return r?.[field];
  }
  const [method, start, status] = parts;
  return (state?.calls ?? []).filter((c) => c.method === method.toUpperCase() && c.path.startsWith(start) && (!status || String(c.status) === status)).length;
}
