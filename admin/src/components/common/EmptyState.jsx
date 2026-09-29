/**
 * Empty state — DESIGN_SYSTEM §6 ("States" group: skeleton/loading, empty,
 * error, confirmation, success) and PRD §112 (a missing entity is an empty
 * state, never an error and never a fabricated result).
 */

export default function EmptyState({ title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {description && <p className="max-w-md text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
