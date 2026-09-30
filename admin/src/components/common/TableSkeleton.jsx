/**
 * Table Skeleton — DESIGN_SYSTEM.md §10 ("skeletons over spinners for content that is known to arrive").
 */

export default function TableSkeleton({ rows = 6, columns = 5 }) {
  return (
    <div
      className="overflow-hidden rounded-lg border border-slate-200/90 bg-white shadow-card"
      aria-busy="true"
    >
      <span className="sr-only">Loading content…</span>
      <table className="w-full table-fixed border-collapse">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-3.5 py-3">
                <div className="skeleton h-3 w-3/4" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: columns }).map((__, colIndex) => (
                <td key={colIndex} className="px-3.5 py-3">
                  <div
                    className={`skeleton h-3.5 ${
                      colIndex === 0 ? 'w-4/5' : colIndex === columns - 1 ? 'w-1/3' : 'w-1/2'
                    }`}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
