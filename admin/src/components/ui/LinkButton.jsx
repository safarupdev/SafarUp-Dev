/**
 * Link styled as a Button.
 *
 * A router <Link> renders an <a>, and a <button> inside an <a> is invalid
 * interactive nesting with poor keyboard and screen-reader behaviour
 * (DESIGN_SYSTEM §9). This gives navigation the exact Button appearance
 * without nesting two interactive elements.
 */

import { Link } from 'react-router-dom';
import { buttonClassName } from './Button';

export default function LinkButton({ to, variant = 'primary', className = '', children, ...rest }) {
  return (
    <Link to={to} className={buttonClassName(variant, className)} {...rest}>
      {children}
    </Link>
  );
}
