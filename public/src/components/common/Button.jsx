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
  primary:
    'bg-accent-600 text-white shadow-sm hover:bg-accent-700 active:bg-accent-800 disabled:bg-navy-200 disabled:text-navy-500',
  brand: 'bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-700 disabled:bg-navy-200 disabled:text-navy-500',
  secondary:
    'bg-white text-navy-900 ring-1 ring-inset ring-navy-200 shadow-sm hover:bg-navy-50 active:bg-navy-100 disabled:text-navy-400',
  ghost: 'text-brand-700 hover:bg-navy-50 active:bg-navy-100 disabled:text-navy-400',
};

const SIZES = {
  // `md` is the minimum comfortable touch target on mobile (DESIGN_SYSTEM §9).
  sm: 'min-h-9 px-3.5 text-sm',
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
