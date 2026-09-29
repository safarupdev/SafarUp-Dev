/**
 * Status filter — PRD §38 (lifecycle), §117 (admin tables are filterable).
 *
 * Deliberately a segmented control of exactly the three contract statuses
 * plus "All": there is no free-text search box anywhere in this CMS, because
 * `?q=` returns 400 in Phase 2 (API.destination.contract.md §2.1b) and a
 * search box that silently returns unfiltered results would misreport the
 * result set.
 */

import { CONTENT_STATUSES } from '../../validators/content.schema';

const OPTIONS = [{ value: '', label: 'All' }, ...CONTENT_STATUSES.map((s) => ({ value: s, label: s }))];

export default function StatusFilter({ value, onChange, id = 'status-filter' }) {
  return (
    <div role="group" aria-labelledby={`${id}-label`} className="flex flex-wrap items-center gap-2">
      <span id={`${id}-label`} className="text-xs font-medium uppercase tracking-wide text-slate-500">
        Status
      </span>
      <div className="inline-flex flex-wrap gap-1 rounded-md border border-slate-200 bg-white p-1">
        {OPTIONS.map((option) => {
          const isActive = (value ?? '') === option.value;
          return (
            <button
              key={option.value || 'all'}
              type="button"
              aria-pressed={isActive}
              onClick={() => onChange(option.value)}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${
                isActive ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
