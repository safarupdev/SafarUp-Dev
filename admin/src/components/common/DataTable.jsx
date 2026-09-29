/**
 * Content list table — PRD §117 (admin tables), DESIGN_SYSTEM §6 (States).
 *
 * Owns the three mandatory data-backed states so no list page re-implements
 * them: skeleton while loading, an empty state when the result set is
 * genuinely empty, and an error state with a retry. An unresolvable *filter*
 * is also an empty set, not an error — the backend deliberately returns an
 * empty list for an unknown district/category slug rather than unfiltered
 * data, so the two must not be conflated in the UI either.
 */

import TableSkeleton from './TableSkeleton';
import EmptyState from './EmptyState';
import ErrorState from './ErrorState';

export default function DataTable({
  columns,
  rows,
  rowKey,
  isLoading,
  error,
  onRetry,
  empty,
  caption,
}) {
  if (isLoading) {
    return <TableSkeleton rows={5} columns={columns.length} />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }

  if (!rows || rows.length === 0) {
    return <EmptyState {...empty} />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full border-collapse text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={`px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 ${
                  column.headerClassName ?? ''
                }`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
              {columns.map((column) => (
                <td key={column.key} className={`px-4 py-3 align-top text-slate-700 ${column.className ?? ''}`}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
