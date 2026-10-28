import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import {seoPages} from './seoPages';
import {API_ROUTES} from './server/routes';

export default defineConfig(({mode}) => {
  // The address the site is served from, for canonical links, the sitemap and job listings
  const env = loadEnv(mode, process.cwd(), '');
  const siteUrl = (env.SITE_URL || 'https://vetter.dev').replace(/\/+$/, '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      seoPages(
        siteUrl,
        env.VITE_FIREBASE_PROJECT_ID && env.VITE_FIREBASE_EMULATORS !== 'true'
          ? { projectId: env.VITE_FIREBASE_PROJECT_ID, apiKey: env.VITE_FIREBASE_API_KEY }
          : undefined
      ),
      // The AI endpoints in development; server.ts answers them in production. The key stays on the server.
      {
        name: 'vetter-ai-endpoints',
        configureServer(server) {
          for (const [route, handle] of Object.entries(API_ROUTES)) {
            server.middlewares.use(route, (req, res) => {
              let raw = '';
              req.on('data', (chunk) => (raw += chunk));
              req.on('end', async () => {
                let body: unknown = null;
                try {
                  body = JSON.parse(raw);
                } catch {
                  // Answered as a bad request
                }
                const {status, json} = await handle(body, env);
                res.statusCode = status;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(json));
              });
            });
          }
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
