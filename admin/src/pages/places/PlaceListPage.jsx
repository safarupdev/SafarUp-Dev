/**
 * Place list — PLACE.domain.contract.md.
 *
 * Single bounded page: `placeRepository.list()` returns a plain array, so the
 * API defines no `nextCursor` for this list. The screen says so rather than
 * offering a "Load more" that cannot work.
 *
 * The admin Place payload does **not** resolve its relations (only the public
 * detail does), so district and category names are resolved here from the
 * district/category lists. The raw `districtId` / `categoryIds[]` remain the
 * stored truth — a Place references canonical records, it never copies them
 * (§186).
 *
 * District and Category filters are sent as **slugs** and the backend resolves
 * them through the published-only lookup, so filtering by a DRAFT or ARCHIVED
 * district/category slug would silently return an empty set. The filter
 * options therefore list PUBLISHED records only, and the UI states why.
 */

import { useSearchParams } from 'react-router-dom';

import { CONTENT_ENTITIES } from '../../api/content.api';
import { useCategoryOptions, useDistrictOptions, useFlatContentList } from '../../hooks/useContentQueries';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import LinkButton from '../../components/ui/LinkButton';
import StatusFilter from '../../components/content/StatusFilter';
import ContentRoleNotice from '../../components/content/ContentRoleNotice';
import { formatDateTime } from '../../lib/format';

const idOf = (row) => row.id ?? row._id;

/** Maps an id to a display name using an already-loaded options list. */
function nameLookup(items = []) {
  return new Map(items.map((item) => [idOf(item), item.name]));
}

export default function PlaceListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') ?? '';
  const district = searchParams.get('district') ?? '';
  const category = searchParams.get('category') ?? '';

  const districts = useDistrictOptions();
  const categories = useCategoryOptions();

  const query = useFlatContentList({
    entity: CONTENT_ENTITIES.places,
    params: {
      ...(status ? { status } : {}),
      ...(district ? { district } : {}),
      ...(category ? { category } : {}),
    },
  });

  const rows = query.data?.items ?? [];
  const districtNames = nameLookup(districts.data?.items);
  const categoryNames = nameLookup(categories.data?.items);

  const publishedDistricts = (districts.data?.items ?? []).filter((item) => item.status === 'PUBLISHED');
  const publishedCategories = (categories.data?.items ?? []).filter((item) => item.status === 'PUBLISHED');

  function setFilter(key, value) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  }

  const hasFilters = Boolean(status || district || category);

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => (
        <LinkButton
          to={`/places/${idOf(row)}`}
          variant="ghost"
          className="px-0 py-0 font-medium text-brand-600 hover:text-brand-700"
        >
          {row.name}
        </LinkButton>
      ),
    },
    {
      key: 'slug',
      header: 'Slug',
      render: (row) => <code className="text-xs text-slate-600">/{row.slug}</code>,
    },
    {
      key: 'district',
      header: 'District',
      render: (row) => districtNames.get(row.districtId) ?? <span className="text-slate-400">Unresolved</span>,
    },
    {
      key: 'categories',
      header: 'Categories',
      className: 'text-slate-600',
      render: (row) => {
        const names = (row.categoryIds ?? []).map((id) => categoryNames.get(id)).filter(Boolean);
        return names.length ? names.join(', ') : '—';
      },
    },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'updatedAt',
      header: 'Last updated',
      className: 'whitespace-nowrap text-slate-500',
      render: (row) => formatDateTime(row.updatedAt),
    },
    {
      key: 'actions',
      header: 'Actions',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (row) => (
        <LinkButton to={`/places/${idOf(row)}`} variant="ghost" className="px-2 py-1">
          Edit
        </LinkButton>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Places"
        description="Canonical, reusable places — temples, towers, sanctuaries, hills. A place record is referenced by destinations and trips; it is never duplicated into them (PRD §186)."
        actions={<LinkButton to="/places/new">New place</LinkButton>}
      />

      <ContentRoleNotice />

      <div className="flex flex-wrap items-end gap-3">
        <StatusFilter value={status} onChange={(value) => setFilter('status', value)} id="place-status" />

        <FilterSelect
          id="place-district"
          label="District"
          value={district}
          onChange={(value) => setFilter('district', value)}
          options={publishedDistricts}
          isLoading={districts.isLoading}
        />
        <FilterSelect
          id="place-category"
          label="Category"
          value={category}
          onChange={(value) => setFilter('category', value)}
          options={publishedCategories}
          isLoading={categories.isLoading}
        />

        {hasFilters && (
          <button
            type="button"
            onClick={() => setSearchParams({}, { replace: true })}
            className="pb-2 text-sm text-brand-600 hover:text-brand-700"
          >
            Clear filters
          </button>
        )}
      </div>

      <p className="text-xs text-slate-500">
        The district and category filters are resolved by the server against <strong>published</strong>{' '}
        records only, so only published districts and categories are offered here. An unpublished
        record can still be linked from the place editor.
      </p>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={idOf}
        isLoading={query.isLoading}
        error={query.error}
        onRetry={query.refetch}
        caption="Places, most recently updated first"
        empty={{
          title: hasFilters ? 'No places match these filters' : 'No places yet',
          description: hasFilters
            ? 'An unresolvable filter is an empty result, not an error — the server never returns unfiltered data in its place.'
            : 'A place is a canonical record with one canonical identity. Create the first one to link it from a destination.',
          action: hasFilters ? null : <LinkButton to="/places/new">New place</LinkButton>,
        }}
      />

      {!query.isLoading && !query.error && rows.length > 0 && (
        <p className="text-center text-xs text-slate-500">
          Showing {rows.length} place{rows.length === 1 ? '' : 's'}. This endpoint is a single bounded
          page — it returns no pagination cursor.
        </p>
      )}
    </div>
  );
}

function FilterSelect({ id, label, value, onChange, options, isLoading }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </label>
      <select
        id={id}
        value={value}
        disabled={isLoading}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:opacity-60"
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={idOf(option)} value={option.slug}>
            {option.name}
          </option>
        ))}
      </select>
    </div>
  );
}
