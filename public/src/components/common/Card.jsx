/**
 * Card — DESIGN_SYSTEM.md §6 (Content) and §7 (interaction states).
 *
 * The same "a raised white box holding one topic" object was re-implemented
 * three ways across the public pages (`border border-navy-100`,
 * `ring-1 ring-navy-100 shadow-card`, `border-dashed border-navy-200`), each
 * with its own radius and padding. This component is the single recipe: it
 * normalises radius, padding and the border/shadow treatment so a card cannot
 * drift per page.
 *
 * It is deliberately a thin wrapper over existing Tailwind utilities — no new
 * CSS system, no CSS-in-JS, no runtime styling. Everything it emits is a class
 * already present in `tailwind.config.js`, so removing this file changes no
 * visual behaviour.
 *
 * Variants:
 *   `surface` — the default. Ring + `shadow-card`. Raised, for real content:
 *               destination/trip cards, detail panels, summary blocks.
 *   `outline` — 1px border, no shadow. Flat and quiet, for a card sitting
 *               inside another card or next to a surface variant, where two
 *               shadows would compete.
 *   `inset`    — dashed border, no shadow. Reserved for *placeholder* regions:
 *               upcoming trips, empty lists, "coming soon". Dashed reads as
 *               provisional; a dashed edge must never wrap real content.
 *
 * A whole-card link: use `as="link"` / `to`. This keeps one tab stop, and the
 * title inside remains the link text (see DestinationCard for the stretched
 * pseudo-element pattern for image-led cards).
 */

import { Link } from 'react-router-dom';

const VARIANTS = {
  surface: 'bg-white ring-1 ring-navy-100 shadow-card',
  outline: 'bg-white border border-navy-100',
  inset: 'border border-dashed border-navy-200 bg-navy-50/40',
};

// Radius, border/shadow recipe and padding in one place.
const PAD = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6 sm:p-8',
};

export default function Card({
  as,
  to,
  variant = 'surface',
  pad = 'md',
  hover = false,
  className = '',
  children,
  ...rest
}) {
  const classes = [
    'rounded-card',
    VARIANTS[variant],
    PAD[pad],
    hover
      ? 'transition-shadow duration-200 ease-standard hover:shadow-card-hover focus-within:shadow-card-hover'
      : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (as === 'link' || to) {
    return (
      <Link to={to} className={`block ${classes}`} {...rest}>
        {children}
      </Link>
    );
  }

  if (as) {
    const Tag = as;
    return (
      <Tag className={classes} {...rest}>
        {children}
      </Tag>
    );
  }

  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
