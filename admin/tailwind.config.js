/**
 * Tailwind config for the SafarUp Admin app.
 *
 * PRD §116 (Admin Design Language): "dense but readable, data-oriented,
 * keyboard-friendly, fast, desktop-first ... does not need elaborate
 * marketing visuals." Kept close to Tailwind defaults on purpose — admin
 * UI should prioritize legibility and density over decoration.
 */

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#2563eb',
          600: '#1d4ed8',
          700: '#1e40af',
        },
      },
    },
  },
  plugins: [],
};
