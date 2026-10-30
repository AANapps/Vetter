import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { API_ROUTES } from './server/routes';

/**
 * Production server: serves the built site from dist (each job's pre-rendered page included), answers the AI
 * endpoints (writing tests, marking answers), and hands any other path to the app. Run `npm run build` then `npm start`.
 */
const root = path.dirname(fileURLToPath(import.meta.url));
// The same files Vite reads: .env.local first, then .env
dotenv.config({ path: [path.join(root, '.env.local'), path.join(root, '.env')], quiet: true });
const dist = path.join(root, 'dist');
const port = Number(process.env.PORT) || 3000;

const app = express();
app.use(express.json({ limit: '300kb' }));

for (const [route, handle] of Object.entries(API_ROUTES)) {
  app.post(route, async (req, res) => {
    const { status, json } = await handle(req.body, process.env);
    res.status(status).json(json);
  });
}

app.use(express.static(dist, { extensions: ['html'] }));
// Paths with no file (jobs posted in the app, for one) are the app's to show
app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));

const server = app.listen(port, () => console.log(`Vetter on http://localhost:${port}`));
// Researching software and building an app simulation can take a few minutes, past Node's 5-minute default
server.requestTimeout = 10 * 60 * 1000;
