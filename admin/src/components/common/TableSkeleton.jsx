/**
 * Table skeleton — DESIGN_SYSTEM §10 ("skeletons over spinners for content
 * that is known to arrive"). Reserves the row height so the table does not
 * jump when data lands, and announces itself politely to screen readers.
 */

export default function TableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white" aria-busy="true">
      <span className="sr-only">Loading content…</span>
      <table className="w-full table-fixed border-collapse">
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex} className="border-b border-slate-100 last:border-0">
              {Array.from({ length: columns }).map((__, colIndex) => (
                <td key={colIndex} className="px-4 py-3">
                  <div
                    className={`h-3 animate-pulse rounded bg-slate-100 ${
                      colIndex === 0 ? 'w-2/3' : 'w-1/2'
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
