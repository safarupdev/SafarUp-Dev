import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // DEV-ONLY preview plumbing (not a production architecture change).
    //
    // The public app talks to the API through `VITE_API_BASE_URL`, which
    // defaults to the absolute `http://localhost:4000/api`. That is fine for
    // local development but breaks any externally reachable preview: a
    // visitor's browser resolves `localhost` to their own machine, so every
    // API-backed list silently renders its error/empty state.
    //
    // Proxying `/api` through this dev server keeps the browser on one origin,
    // so a single tunnel to this port is enough and no CORS change or second
    // tunnel is needed. `build` is untouched, so the production bundle is
    // unaffected; the backend origin comes from the environment, with the
    // emulator-driven default matching `npm run dev:backend`.
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // DESIGN_SYSTEM.md §10 — hero imagery is the largest cost on a destination
    // page, so the app shell should not be. Split the router and the data
    // layer out of the entry chunk.
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          data: ['axios', '@tanstack/react-query'],
        },
      },
    },
  },
});
