/**
 * Button / link button — DESIGN_SYSTEM.md §6 (Actions) and §7 (interaction
 * states: hover · active · focus · disabled · loading).
 *
 * One component so a CTA cannot pick up a different shape, focus ring or
 * disabled treatment in one place and not another. Renders a real `<button>`
 * for actions and a real `<a>` for navigation — a `<div onClick>` would break
 * keyboard operability and open-in-new-tab.
 */

import { Link } from 'react-router-dom';

const VARIANTS = {
  // White on accent-600 #ea580c is 3.56:1 — below the 4.5:1 AA threshold for
  // body-size text, so a primary CTA was failing AA. accent-700 #c2410c is
  // 5.18:1 and passes. Hover steps one deeper (accent-800, 7.31:1).
  primary:
    'bg-accent-700 text-white shadow-sm hover:bg-accent-800 active:bg-accent-900 disabled:bg-navy-200 disabled:text-navy-500',
  // brand-600 #1d4ed8 on white is 6.70:1 — passes AA, unchanged.
  brand: 'bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-700 disabled:bg-navy-200 disabled:text-navy-500',
  secondary:
    'bg-white text-navy-900 ring-1 ring-inset ring-navy-200 shadow-sm hover:bg-navy-50 active:bg-navy-100 disabled:text-navy-500',
  ghost: 'text-brand-700 hover:bg-navy-50 active:bg-navy-100 disabled:text-navy-500',
  // Secondary CTA on a dark surface (hero, footer CTA band).
  //
  // This exists because pages used to reach for `variant="secondary"` plus a
  // `className` of `bg-transparent text-white ring-white/30`. That silently
  // broke: `secondary` already sets `bg-white` and `text-navy-900`, and
  // Tailwind resolves two competing `background-color`/`color` utilities by
  // STYLESHEET order, not by the order they appear in `className`. The result
  // was `bg-white` winning the background while `text-white` won the text —
  // a solid white pill with white text, i.e. an invisible label on the two
  // most important CTAs on the site. Callers must not be able to reach that
  // state by overriding `secondary`, so the dark-surface treatment is its own
  // variant instead of a set of overrides.
  onDark:
    'bg-transparent text-white ring-1 ring-inset ring-white/45 hover:bg-white/10 hover:ring-white/70 active:bg-white/15 focus-visible:ring-white',
};

const SIZES = {
  // 44px (min-h-11) is the floor for every size that can be a touch target on
  // mobile (DESIGN_SYSTEM §9). `sm` used to be 36px, which fails it, and it is
  // the only header action on mobile. `sm`/`md` are now 44px; `lg` is larger.
  sm: 'min-h-11 px-4 text-sm',
  md: 'min-h-11 px-5 text-[0.95rem]',
  lg: 'min-h-12 px-6 text-base',
};

export default function Button({
  as,
  to,
  href,
  variant = 'primary',
  size = 'md',
  className = '',
  fullWidth = false,
  children,
  ...rest
}) {
  const classes = [
    'inline-flex items-center justify-center gap-2 rounded-full font-semibold',
    'transition-colors duration-150 ease-standard',
    'disabled:cursor-not-allowed',
    VARIANTS[variant],
    SIZES[size],
    fullWidth ? 'w-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (as === 'link' || to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {children}
      </Link>
    );
  }

  if (as === 'anchor' || href) {
    return (
      <a href={href} className={classes} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <button type="button" className={classes} {...rest}>
      {children}
    </button>
  );
}
