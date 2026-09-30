/**
 * Empty State — DESIGN_SYSTEM.md §6 (States) and PRD §112.
 */

import Icon from './Icon';

export default function EmptyState({
  title = 'No records found',
  description,
  action,
  icon = 'inbox',
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-card border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Icon name={icon} className="h-5 w-5" />
      </div>
      <p className="text-sm font-semibold text-navy-950 mt-1">{title}</p>
      {description && <p className="max-w-md text-xs text-slate-500">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
