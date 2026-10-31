import type { IncomingMessage, ServerResponse } from 'http';
import { API_ROUTES } from '../server/routes.js';

/**
 * The AI endpoints on Vercel (/api/generate-test, /api/test-chat, /api/grade-answers), the same handlers server.ts
 * answers elsewhere. Needs ANTHROPIC_API_KEY in the Vercel project's environment variables.
 */
type Request = IncomingMessage & { body?: unknown; query?: Record<string, string | string[]> };

export default async function handler(req: Request, res: ServerResponse) {
  const route = API_ROUTES[`/api/${req.query?.route}`];
  if (!route) return send(res, 404, { error: 'Not found' });
  if (req.method !== 'POST') return send(res, 405, { error: 'Use POST' });
  const { status, json } = await route(req.body, process.env);
  send(res, status, json);
}

function send(res: ServerResponse, status: number, json: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(json));
}
