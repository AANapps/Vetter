import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import {seoPages} from './seoPages';

export default defineConfig(({mode}) => {
  // The address the site is served from, for canonical links, the sitemap and job listings
  const siteUrl = (loadEnv(mode, process.cwd(), '').SITE_URL || 'https://vetter.dev').replace(/\/+$/, '');
  return {
    plugins: [react(), tailwindcss(), seoPages(siteUrl)],
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
