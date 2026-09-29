/**
 * Filter chip — DESIGN_SYSTEM.md §6 (Discovery: filter chips).
 *
 * A chip is a *link* when it navigates to a filtered list and a *toggle*
 * button when it mutates the current list. Both are reachable by keyboard and
 * both mark their state in text (`aria-pressed` / `aria-current`) as well as
 * colour, because colour is never the only carrier of state (§7).
 */

import { Link } from 'react-router-dom';

const BASE =
  'inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 ring-inset transition-colors duration-150 ease-standard';

const TONE = {
  active: 'bg-navy-900 text-white ring-navy-900',
  inactive: 'bg-white text-navy-700 ring-navy-200 hover:bg-navy-50 hover:text-navy-900',
};

export default function Chip({ as = 'button', to, active = false, children, className = '', ...rest }) {
  const classes = [BASE, active ? TONE.active : TONE.inactive, className].filter(Boolean).join(' ');

  if (as === 'link') {
    return (
      <Link to={to} className={classes} {...rest}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" aria-pressed={active} className={classes} {...rest}>
      {children}
    </button>
  );
}
