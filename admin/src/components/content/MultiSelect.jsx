/**
 * N:M multi-select for ID-array relationships.
 *
 * Backs Destination `categoryIds[]` / `placeIds[]` (PRD §200.2, §200.3) and
 * Place `categoryIds[]`. The relationship is a plain array of **IDs**, never a
 * copied name — renaming a Category must not rewrite denormalised strings on
 * Destinations (CATEGORY.domain.contract.md §5).
 *
 * Notes:
 *  - The text box below filters the **already-loaded list in the browser**. It
 *    is not the `?q=` search parameter, which returns 400 in Phase 2
 *    (API.destination.contract.md §2.1b).
 *  - Options come from the *admin* list, so a DRAFT or ARCHIVED category can
 *    still be linked to while it is being built. The status is spelled out
 *    next to each option, because a linked DRAFT category will not appear on
 *    public surfaces.
 *  - Already-selected IDs are always shown, even if the loaded page no longer
 *    contains them, so a stale link is visible rather than silently dropped
 *    on the next save.
 */

import { useMemo, useState } from 'react';
import Input from '../ui/Input';
import StatusBadge from '../common/StatusBadge';

const MAX_VISIBLE = 200;

export default function MultiSelect({
  id,
  label,
  description,
  options = [],
  value = [],
  onChange,
  error,
  isLoading = false,
  loadError = null,
  onRetryLoad,
  emptyLabel = 'Nothing available to link yet.',
  disabled = false,
}) {
  const [filter, setFilter] = useState('');
  const selected = useMemo(() => (Array.isArray(value) ? value : []), [value]);

  // Union of the loaded options and anything already selected, so a linked
  // record that is missing from the current page is never invisible.
  const merged = useMemo(() => {
    const byId = new Map();
    for (const option of options) {
      if (option?.id) byId.set(option.id, { id: option.id, name: option.name, slug: option.slug, status: option.status });
    }
    for (const id_ of selected) {
      if (!byId.has(id_)) byId.set(id_, { id: id_, name: `Unresolved reference (${id_})`, status: null });
    }
    return [...byId.values()];
  }, [options, selected]);

  const matched = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return merged;
    return merged.filter(
      (option) =>
        option.name?.toLowerCase().includes(needle) || option.slug?.toLowerCase().includes(needle)
    );
  }, [merged, filter]);

  const visible = matched.slice(0, MAX_VISIBLE);
  const isTruncated = matched.length > MAX_VISIBLE;

  function toggle(optionId) {
    if (selected.includes(optionId)) {
      onChange(selected.filter((current) => current !== optionId));
    } else {
      onChange([...selected, optionId]);
    }
  }

  return (
    <fieldset className="flex flex-col gap-1.5" disabled={disabled}>
      <legend className="text-sm font-medium text-slate-700">
        {label}
        <span className="ml-2 font-normal text-slate-500">({selected.length} selected)</span>
      </legend>

      {description && <p className="text-sm text-slate-500">{description}</p>}

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {loadError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          <p>Could not load the list to link from: {loadError}</p>
          {onRetryLoad && (
            <button
              type="button"
              onClick={onRetryLoad}
              className="mt-1 text-sm font-medium underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Try again
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              id={`${id}-filter`}
              type="search"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Filter loaded items…"
              aria-label={`Filter ${label}`}
              className="max-w-xs"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => onChange([])}
              disabled={selected.length === 0}
              className="text-sm text-slate-600 underline hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
            >
              Clear selection
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto rounded-md border border-slate-200 bg-white p-2">
            {isLoading && <p className="px-1 py-2 text-sm text-slate-500">Loading…</p>}

            {!isLoading && merged.length === 0 && (
              <p className="px-1 py-2 text-sm text-slate-500">{emptyLabel}</p>
            )}

            {!isLoading && merged.length > 0 && visible.length === 0 && (
              <p className="px-1 py-2 text-sm text-slate-500">No loaded item matches “{filter}”.</p>
            )}

            {!isLoading &&
              visible.map((option) => {
                const checkboxId = `${id}-${option.id}`;
                return (
                  <div key={option.id} className="flex items-center gap-2 rounded px-1 py-1 hover:bg-slate-50">
                    <input
                      id={checkboxId}
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      checked={selected.includes(option.id)}
                      onChange={() => toggle(option.id)}
                    />
                    <label htmlFor={checkboxId} className="flex-1 cursor-pointer text-sm text-slate-700">
                      <span className="font-medium">{option.name}</span>
                      <span className="ml-2 text-xs text-slate-500">/{option.slug}</span>
                    </label>
                    {option.status && <StatusBadge status={option.status} />}
                  </div>
                );
              })}

            {!isLoading && isTruncated && (
              <p className="border-t border-slate-100 px-1 pt-2 text-xs text-slate-500">
                Showing the first {MAX_VISIBLE} matching items. Narrow the filter to see the rest.
              </p>
            )}
          </div>
        </>
      )}
    </fieldset>
  );
}
