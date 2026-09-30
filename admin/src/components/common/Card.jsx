/**
 * Admin Card Primitive — DESIGN_SYSTEM.md §6.1 & PRD §116.
 *
 * Byte-identical token recipe matching public/src/components/common/Card.jsx:
 * ring-1 ring-navy-100 shadow-card for real content, border-navy-100 for outline,
 * and border-dashed border-navy-200 bg-navy-50/40 for inset.
 */

import { Link } from 'react-router-dom';

const VARIANTS = {
  surface: 'bg-white ring-1 ring-navy-100 shadow-card',
  outline: 'bg-white border border-navy-100',
  inset: 'border border-dashed border-navy-200 bg-navy-50/40',
};

const PAD = {
  none: '',
  xs: 'p-3',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
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
    VARIANTS[variant] ?? VARIANTS.surface,
    PAD[pad] ?? PAD.md,
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
