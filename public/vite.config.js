import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
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
