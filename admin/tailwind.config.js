/**
 * Tailwind config for the SafarUp Admin app.
 *
 * DESIGN_SYSTEM.md §2.1 & §12.1 require public and admin to share the SAME
 * brand tokens (brand, navy, accent, neutral base), while PRD §116 governs the
 * composition: "dense but readable, data-oriented, keyboard-friendly, fast,
 * desktop-first".
 */

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Shared brand blue ramp — DESIGN_SYSTEM.md §2.1
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#2563eb',
          600: '#1d4ed8',
          700: '#1e40af',
        },
        // SafarUp navy — brand anchor, dark sidebar/header elements, headings
        navy: {
          50: '#f4f6fa',
          100: '#e4e9f2',
          200: '#c8d2e3',
          300: '#9dafca',
          400: '#6b83a8',
          500: '#4a6288',
          600: '#394e70',
          700: '#2b3c57',
          800: '#1d293d',
          900: '#131c2b',
          950: '#0a1120',
        },
        // SafarUp orange — accent, conversion actions, highlights
        accent: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        display: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },
      borderRadius: {
        // Tuned for admin density (0.75rem / 12px)
        card: '0.75rem',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(19 28 43 / 0.05), 0 2px 8px -2px rgb(19 28 43 / 0.06)',
        'card-hover': '0 3px 8px 0 rgb(19 28 43 / 0.08), 0 8px 16px -3px rgb(19 28 43 / 0.1)',
        dropdown: '0 4px 20px -2px rgb(19 28 43 / 0.15)',
        float: '0 8px 30px -4px rgb(19 28 43 / 0.15)',
      },
      transitionTimingFunction: {
        standard: 'cubic-bezier(0.2, 0, 0.2, 1)',
      },
      keyframes: {
        'fade-rise': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'none' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-rise': 'fade-rise 180ms cubic-bezier(0.2, 0, 0.2, 1) both',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [],
};
