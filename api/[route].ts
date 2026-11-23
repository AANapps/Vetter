import type { IncomingMessage, ServerResponse } from 'http';
import { API_ROUTES, previewOf, purposeOf } from '../server/routes.js';

/**
 * The AI endpoints on Vercel (/api/generate-test, /api/test-chat, /api/grade-answers), the same handlers server.ts
 * answers elsewhere. Needs ANTHROPIC_API_KEY in the Vercel project's environment variables.
 */
type Request = IncomingMessage & { body?: unknown; query?: Record<string, string | string[]> };

// The Firebase project id the site is built with (.env.production) only reaches the browser bundle, not this
// function, so sign-ins couldn't be checked here. It isn't secret; a FIREBASE_PROJECT_ID set in Vercel still wins
const env = { ...process.env, FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'vetter-7b06f' };

export default async function handler(req: Request, res: ServerResponse) {
  const route = API_ROUTES[`/api/${req.query?.route}`];
  if (!route) return send(res, 404, { error: 'Not found' });
  if (req.method !== 'POST') return send(res, 405, { error: 'Use POST' });
  const { status, json } = await route(req.body, env, {
    authorization: req.headers.authorization,
    origin: req.headers.origin,
    purpose: purposeOf(req.headers['x-praxa-for']),
    preview: previewOf(req.headers['x-praxa-preview']),
  });
  send(res, status, json);
}

function send(res: ServerResponse, status: number, json: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(json));
}
