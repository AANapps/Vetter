import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import {seoPages} from './seoPages';
import {generateTest} from './server/generateTest';

export default defineConfig(({mode}) => {
  // The address the site is served from, for canonical links, the sitemap and job listings
  const env = loadEnv(mode, process.cwd(), '');
  const siteUrl = (env.SITE_URL || 'https://vetter.dev').replace(/\/+$/, '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      seoPages(siteUrl),
      // The AI test generator in development; server.ts answers it in production. The key stays on the server.
      {
        name: 'vetter-generate-test',
        configureServer(server) {
          server.middlewares.use('/api/generate-test', (req, res) => {
            let raw = '';
            req.on('data', (chunk) => (raw += chunk));
            req.on('end', async () => {
              let body: unknown = null;
              try {
                body = JSON.parse(raw);
              } catch {
                // Answered as a bad request below
              }
              const {status, json} = await generateTest(body, env.GEMINI_API_KEY, env.GEMINI_MODEL || 'gemini-2.5-flash');
              res.statusCode = status;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(json));
            });
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
