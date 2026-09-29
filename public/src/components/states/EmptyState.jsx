/**
 * Empty state — DESIGN_SYSTEM.md §6 (States), PRD §112.
 *
 * §112: an empty state states the fact plainly and offers the next useful
 * action. It is never an apology and never a spinner. "A missing entity is an
 * empty state, never an error and never a fabricated result"
 * (API.destination.contract.md §2.3) — this component is where that rule is
 * expressed in the UI.
 */

import Icon from '../common/Icon';
import Button from '../common/Button';

export default function EmptyState({ icon = 'inbox', title, description, action, actionTo, onAction, className = '' }) {
  return (
    <div
      className={`flex flex-col items-center gap-4 rounded-2xl border border-dashed border-navy-200 bg-navy-50/60 px-6 py-12 text-center ${className}`}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-navy-500 ring-1 ring-navy-100">
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <div className="max-w-md space-y-1.5">
        <p className="text-base font-semibold text-navy-900">{title}</p>
        {description ? <p className="text-sm leading-relaxed text-navy-600">{description}</p> : null}
      </div>
      {action ? (
        onAction ? (
          <Button onClick={onAction}>{action}</Button>
        ) : (
          <Button as="link" to={actionTo}>
            {action}
          </Button>
        )
      ) : null}
    </div>
  );
}
