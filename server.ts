import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { generateTest } from './server/generateTest';

/**
 * Production server: serves the built site from dist (each job's pre-rendered page included), answers the AI
 * test generator, and hands any other path to the app. Run `npm run build` then `npm start`.
 */
const root = path.dirname(fileURLToPath(import.meta.url));
// The same files Vite reads: .env.local first, then .env
dotenv.config({ path: [path.join(root, '.env.local'), path.join(root, '.env')], quiet: true });
const dist = path.join(root, 'dist');
const port = Number(process.env.PORT) || 3000;
const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const app = express();
app.use(express.json({ limit: '300kb' }));

app.post('/api/generate-test', async (req, res) => {
  const { status, json } = await generateTest(req.body, process.env.GEMINI_API_KEY, model);
  res.status(status).json(json);
});

app.use(express.static(dist, { extensions: ['html'] }));
// Paths with no file (jobs posted in the app, for one) are the app's to show
app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));

app.listen(port, () => console.log(`Vetter on http://localhost:${port}`));
