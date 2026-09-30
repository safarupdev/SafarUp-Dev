/**
 * Tailwind config for the SafarUp Public app.
 *
 * DESIGN_SYSTEM.md §12.1 requires the public app to carry the *same* brand
 * tokens as `admin/`, so the two apps share one visual language rather than
 * two themes. §2.1 of the design system names four token groups:
 *
 *   - `brand`  — the primary action / link blue. The `brand-50 … brand-700`
 *                values in DESIGN_SYSTEM.md §2.1 ARE the admin scale, so
 *                50/100/500/600/700 below are byte-identical to
 *                `admin/tailwind.config.js`. 200–400 fill the ellipsis in the
 *                documented range; they are the same Tailwind blue ramp and
 *                introduce no new hue.
 *   - `navy`   — brand anchor, headings, high-contrast surfaces. Open item in
 *                DESIGN_SYSTEM.md §12 ("exact hex/ramp values for navy and
 *                orange — to be fixed at first implementation and recorded
 *                here"). Fixed below at first public implementation.
 *   - `accent` — SafarUp orange. Accent and CTA energy, India-forward.
 *   - slate   — Tailwind's neutral base; untouched.
 *
 * Public is intentionally *prettier and more spacious* than admin: §2.1 and
 * §116 — admin is dense and data-oriented, public is editorial and premium.
 * Same tokens, different composition (§167).
 */

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Identical to admin/tailwind.config.js. Do not drift (DESIGN_SYSTEM.md §2.1).
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
        // SafarUp navy — brand anchor, headings, high-contrast surfaces.
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
        // SafarUp orange — accent, CTAs, energy.
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
        // System stack only. DESIGN_SYSTEM.md §10 / §1: premium must not be
        // paid for with a webfont round trip. A self-hosted variable font is a
        // deliberate later increment, not a default.
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
      maxWidth: {
        // DESIGN_SYSTEM.md §4: a readable maximum measure for long-form travel
        // content. `2xl` alone is far too wide to read a 2000-word overview.
        prose: '68ch',
        shell: '80rem',
      },
      spacing: {
        // DESIGN_SYSTEM.md §5: bottom nav height, so content can reserve
        // exactly this much space and the two never collide (§195.2).
        'bottom-nav': '4.5rem',
        // Floating (inset) bottom nav: same bar height as `bottom-nav`, so the
        // two navs are interchangeable, but the bar no longer sits flush with
        // the viewport edge.
        'floating-nav': '4.5rem',
        // The visible gap between the floating bar and the bottom of the
        // viewport. Content clearance must include it (see `.pb-floating-nav`
        // in src/index.css) or the last element sits under the gap, not under
        // the bar, and looks clipped.
        'floating-nav-gap': '1.25rem',
      },
      borderRadius: {
        // Card radius, normalised. §7 of the task: the same card object was
        // being re-implemented with three different radii.
        card: '1rem',
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(19 28 43 / 0.04), 0 8px 24px -12px rgb(19 28 43 / 0.18)',
        'card-hover': '0 2px 4px 0 rgb(19 28 43 / 0.06), 0 18px 40px -16px rgb(19 28 43 / 0.28)',
        nav: '0 -1px 0 0 rgb(19 28 43 / 0.08)',
        // Floating nav sits *above* the viewport edge and over page content, so
        // it needs an all-side lift, not the flat top-edge hairline above.
        'floating-nav':
          '0 -4px 16px -6px rgb(10 17 32 / 0.18), 0 12px 40px -12px rgb(10 17 32 / 0.35)',
        // Floating / glass controls that are not the nav itself.
        float: '0 8px 32px -10px rgb(10 17 32 / 0.28)',
      },
      backdropBlur: {
        // Named so glass has one value everywhere: nav, floating buttons and
        // overlays all read as the same material (2026 direction: glass is
        // intentional, not decorative — see DESIGN_SYSTEM.md §13).
        glass: '1rem',
      },
      transitionTimingFunction: {
        // Small, standard curve. DESIGN_SYSTEM.md §8 motion scale.
        standard: 'cubic-bezier(0.2, 0, 0.2, 1)',
      },
      keyframes: {
        'fade-rise': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'none' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-rise': 'fade-rise 220ms cubic-bezier(0.2, 0, 0.2, 1) both',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [],
};
