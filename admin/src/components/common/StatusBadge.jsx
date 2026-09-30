/**
 * Status Badge — PRD §38 lifecycle, §78, §116, DESIGN_SYSTEM.md §7.
 *
 * Colour is never the only carrier of state: includes semantic label and indicator dot.
 */

const STYLES = {
  DRAFT: {
    bg: 'bg-slate-100 text-slate-700 ring-slate-300',
    dot: 'bg-slate-500',
  },
  PUBLISHED: {
    bg: 'bg-emerald-50 text-emerald-800 ring-emerald-300/80',
    dot: 'bg-emerald-600',
  },
  ARCHIVED: {
    bg: 'bg-amber-50 text-amber-800 ring-amber-300/80',
    dot: 'bg-amber-600',
  },
  ACTIVE: {
    bg: 'bg-blue-50 text-blue-800 ring-blue-300/80',
    dot: 'bg-blue-600',
  },
  PENDING: {
    bg: 'bg-yellow-50 text-yellow-800 ring-yellow-300/80',
    dot: 'bg-yellow-600',
  },
  CONFIRMED: {
    bg: 'bg-emerald-50 text-emerald-800 ring-emerald-300/80',
    dot: 'bg-emerald-600',
  },
  CANCELLED: {
    bg: 'bg-rose-50 text-rose-800 ring-rose-300/80',
    dot: 'bg-rose-600',
  },
  COMPLETED: {
    bg: 'bg-indigo-50 text-indigo-800 ring-indigo-300/80',
    dot: 'bg-indigo-600',
  },
  NEW: {
    bg: 'bg-emerald-50 text-emerald-800 ring-emerald-300/80',
    dot: 'bg-emerald-600',
  },
  'IN PROGRESS': {
    bg: 'bg-amber-50 text-amber-800 ring-amber-300/80',
    dot: 'bg-amber-600',
  },
  RESOLVED: {
    bg: 'bg-slate-100 text-slate-700 ring-slate-300',
    dot: 'bg-slate-500',
  },
  FEATURED: {
    bg: 'bg-accent-50 text-accent-800 ring-accent-300/80',
    dot: 'bg-accent-600',
  },
};

export default function StatusBadge({ status, className = '' }) {
  const normalized = (status ?? 'UNKNOWN').toUpperCase();
  const theme = STYLES[normalized] ?? {
    bg: 'bg-slate-100 text-slate-700 ring-slate-300',
    dot: 'bg-slate-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${theme.bg} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${theme.dot}`} aria-hidden="true" />
      {normalized}
    </span>
  );
}
