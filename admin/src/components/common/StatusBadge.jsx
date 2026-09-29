/**
 * Status badge — PRD §38 lifecycle, §78.
 *
 * DESIGN_SYSTEM §7: colour is never the only carrier of state, so the status
 * word itself is always rendered next to the colour.
 */

const STYLES = {
  DRAFT: 'bg-slate-100 text-slate-700 ring-slate-300',
  PUBLISHED: 'bg-green-50 text-green-800 ring-green-300',
  ARCHIVED: 'bg-amber-50 text-amber-800 ring-amber-300',
};

export default function StatusBadge({ status }) {
  const label = status ?? 'UNKNOWN';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
        STYLES[label] ?? 'bg-slate-100 text-slate-700 ring-slate-300'
      }`}
    >
      {label}
    </span>
  );
}
