/**
 * Link styled as a Button — DESIGN_SYSTEM.md §6.
 *
 * Renders an accessible router <Link> while sharing the exact Button styling,
 * avoiding invalid interactive element nesting (<button> inside <a>).
 */

import { Link } from 'react-router-dom';
import { buttonClassName } from './Button';

export default function LinkButton({
  to,
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...rest
}) {
  return (
    <Link to={to} className={buttonClassName(variant, className, size)} {...rest}>
      {children}
    </Link>
  );
}
