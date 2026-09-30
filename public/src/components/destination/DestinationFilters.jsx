/**
 * Destination filters — PRD §22 (destination list), API.destination.contract.md §2.1
 * (`district`, `category`), DESIGN_SYSTEM.md §4 (side filters) and §6 (filter chips).
 *
 * Filter state lives in the **URL**, not in component state: a filtered view
 * stays shareable, bookmarkable and reachable by a crawler (PRD §172). The
 * same control set is used on both breakpoints and composed differently by
 * layout — vertical sticky rail on desktop, horizontally scrolling chip row
 * on mobile so it does not push the results below the fold.
 *
 * There is deliberately **no search box**. `?q=` answers 400
 * `SEARCH_NOT_AVAILABLE` in Phase 2 (API.destination.contract.md §2.1b);
 * offering a search input that cannot search would be a lie in the UI.
 */

import { useSearchParams } from 'react-router-dom';
import Chip from '../common/Chip';
import { destinationsPath } from '../../constants/routes';

function FilterGroup({ legend, children }) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-navy-500">
        {legend}
      </legend>
      <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-wrap lg:overflow-visible lg:pb-0">{children}</div>
    </fieldset>
  );
}

export default function DestinationFilters({ districts, categories, activeDistrict, activeCategory, disabled }) {
  const [, setSearchParams] = useSearchParams();

  const apply = (next) => {
    // Replace rather than push: a filter change is a refinement of the same
    // page, and Back should return to where the visitor came from rather than
    // walking backwards through every chip they tried.
    setSearchParams(next, { replace: true });
  };

  const hasFilters = Boolean(activeDistrict || activeCategory);

  return (
    <div className={`flex flex-col gap-5 lg:sticky lg:top-24 ${disabled ? 'opacity-60' : ''}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-navy-900">Filters</h2>
        {hasFilters ? (
          <button
            type="button"
            onClick={() => apply(new URLSearchParams())}
            className="min-h-11 rounded-full px-3 text-sm font-semibold text-brand-700 transition-colors hover:bg-navy-50"
          >
            Clear all
          </button>
        ) : null}
      </div>

      <FilterGroup legend="District">
        <Chip as="link" to={destinationsPath({ category: activeCategory })} active={!activeDistrict}>
          All districts
        </Chip>
        {districts.map((district) => (
          <Chip
            key={district.id}
            as="link"
            to={destinationsPath({ district: district.slug, category: activeCategory })}
            active={activeDistrict === district.slug}
          >
            {district.name}
          </Chip>
        ))}
      </FilterGroup>

      <FilterGroup legend="Category">
        <Chip as="link" to={destinationsPath({ district: activeDistrict })} active={!activeCategory}>
          All categories
        </Chip>
        {categories.map((category) => (
          <Chip
            key={category.id}
            as="link"
            to={destinationsPath({ district: activeDistrict, category: category.slug })}
            active={activeCategory === category.slug}
          >
            {category.name}
          </Chip>
        ))}
      </FilterGroup>
    </div>
  );
}
