/**
 * Category list — CATEGORY.domain.contract.md.
 *
 * Single bounded page: `categoryRepository.list()` returns a plain array with
 * no `nextCursor`, so the API defines no cursor for this list. The screen asks
 * for the maximum page size (100) and says so, rather than pretending a
 * "Load more" exists.
 *
 * No search box: `?q=` returns 400 in Phase 2
 * (API.destination.contract.md §2.1b).
 */

import { useSearchParams } from 'react-router-dom';

import { CONTENT_ENTITIES } from '../../api/content.api';
import { useFlatContentList } from '../../hooks/useContentQueries';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import LinkButton from '../../components/ui/LinkButton';
import StatusFilter from '../../components/content/StatusFilter';
import ContentRoleNotice from '../../components/content/ContentRoleNotice';
import { formatDateTime } from '../../lib/format';

const idOf = (row) => row.id ?? row._id;

const COLUMNS = [
  {
    key: 'name',
    header: 'Name',
    render: (row) => (
      <LinkButton to={`/categories/${idOf(row)}`} variant="ghost" className="px-0 py-0 font-medium text-brand-600 hover:text-brand-700">
        {row.name}
      </LinkButton>
    ),
  },
  {
    key: 'slug',
    header: 'Slug',
    render: (row) => <code className="text-xs text-slate-600">/{row.slug}</code>,
  },
  { key: 'sortOrder', header: 'Explore order', render: (row) => row.sortOrder ?? '—' },
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
      <LinkButton to={`/categories/${idOf(row)}`} variant="ghost" className="px-2 py-1">
        Edit
      </LinkButton>
    ),
  },
];

export default function CategoryListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') ?? '';

  const query = useFlatContentList({
    entity: CONTENT_ENTITIES.categories,
    params: status ? { status } : {},
  });

  const rows = query.data?.items ?? [];

  function setStatus(next) {
    setSearchParams(next ? { status: next } : {}, { replace: true });
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Categories"
        description="A flat taxonomy. Destinations and Places reference categories by ID in an N:M array, so renaming a category never rewrites denormalised names on those records (PRD §200.3)."
        actions={<LinkButton to="/categories/new">New category</LinkButton>}
      />

      <ContentRoleNotice />
      <StatusFilter value={status} onChange={setStatus} id="category-status" />

      <DataTable
        columns={COLUMNS}
        rows={rows}
        rowKey={idOf}
        isLoading={query.isLoading}
        error={query.error}
        onRetry={query.refetch}
        caption="Categories, ordered for Explore"
        empty={{
          title: status ? `No ${status.toLowerCase()} categories` : 'No categories yet',
          description: status
            ? 'No category currently has this status. Try a different filter.'
            : 'Categories are the controlled vocabulary used to filter destinations. Create the first one.',
          action: status ? null : <LinkButton to="/categories/new">New category</LinkButton>,
        }}
      />

      {!query.isLoading && !query.error && rows.length > 0 && (
        <p className="text-center text-xs text-slate-500">
          Showing {rows.length} categor{rows.length === 1 ? 'y' : 'ies'}. This endpoint is a single
          bounded page — it returns no pagination cursor.
        </p>
      )}
    </div>
  );
}
