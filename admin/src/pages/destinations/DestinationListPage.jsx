/**
 * Destination list — DESTINATION.domain.contract.md.
 *
 * Cursor-paginated (`{ items, nextCursor }`, ordered `updatedAt DESC`), status
 * filterable, and — unlike the taxonomy lists — the admin payload resolves its
 * relations, so district, categories and places are shown directly
 * (batch-resolved server-side, no N+1: FIRESTORE.destination.contract.md §5).
 *
 * No search box: `q` returns 400 in Phase 2
 * (API.destination.contract.md §2.1b).
 */

import { useSearchParams } from 'react-router-dom';

import { CONTENT_ENTITIES } from '../../api/content.api';
import { flattenPages, useCursorContentList } from '../../hooks/useContentQueries';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import LinkButton from '../../components/ui/LinkButton';
import Button from '../../components/ui/Button';
import StatusFilter from '../../components/content/StatusFilter';
import ContentRoleNotice from '../../components/content/ContentRoleNotice';
import { formatDateTime, relationNames } from '../../lib/format';

const idOf = (row) => row.id ?? row._id;

const COLUMNS = [
  {
    key: 'name',
    header: 'Name',
    render: (row) => (
      <LinkButton
        to={`/destinations/${idOf(row)}`}
        variant="ghost"
        className="px-0 py-0 text-left font-medium text-brand-600 hover:text-brand-700"
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
    render: (row) => row.district?.name ?? <span className="text-slate-400">Unresolved</span>,
  },
  {
    key: 'categories',
    header: 'Categories',
    className: 'text-slate-600',
    render: (row) => relationNames(row.categories),
  },
  {
    key: 'places',
    header: 'Places',
    className: 'text-slate-600',
    render: (row) =>
      Array.isArray(row.placeIds) && row.placeIds.length > 0 ? (
        <span title={relationNames(row.places)}>{row.placeIds.length}</span>
      ) : (
        '—'
      ),
  },
  {
    key: 'status',
    header: 'Status',
    className: 'whitespace-nowrap',
    render: (row) => (
      <span className="flex flex-col items-start gap-1">
        <StatusBadge status={row.status} />
        {row.featured && (
          <span className="text-xs font-medium text-brand-700">Featured</span>
        )}
      </span>
    ),
  },
  {
    key: 'publishedAt',
    header: 'Published',
    className: 'whitespace-nowrap text-slate-500',
    render: (row) => (row.publishedAt ? formatDateTime(row.publishedAt) : '—'),
  },
  {
    key: 'actions',
    header: 'Actions',
    headerClassName: 'text-right',
    className: 'text-right',
    render: (row) => (
      <LinkButton to={`/destinations/${idOf(row)}`} variant="ghost" className="px-2 py-1">
        Edit
      </LinkButton>
    ),
  },
];

export default function DestinationListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') ?? '';

  const query = useCursorContentList({
    entity: CONTENT_ENTITIES.destinations,
    params: status ? { status } : {},
  });

  const rows = flattenPages(query);

  function setStatus(next) {
    setSearchParams(next ? { status: next } : {}, { replace: true });
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Destinations"
        description="The canonical discovery and intent entity (PRD §22). Only PUBLISHED destinations are publicly readable; drafts and archived records are visible here only."
        actions={<LinkButton to="/destinations/new">New destination</LinkButton>}
      />

      <ContentRoleNotice />
      <StatusFilter value={status} onChange={setStatus} id="destination-status" />

      <DataTable
        columns={COLUMNS}
        rows={rows}
        rowKey={idOf}
        isLoading={query.isLoading}
        error={query.error}
        onRetry={query.refetch}
        paginated={false}
        caption="Destinations, most recently updated first"
        empty={{
          title: status ? `No ${status.toLowerCase()} destinations` : 'No destinations yet',
          description: status
            ? 'No destination currently has this status. Try a different filter.'
            : 'A destination is the hub connecting editorial discovery, canonical places and travel intent. Create the first one.',
          action: status ? null : <LinkButton to="/destinations/new">New destination</LinkButton>,
        }}
      />

      {query.hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="secondary"
            isLoading={query.isFetchingNextPage}
            onClick={() => query.fetchNextPage()}
          >
            Load more
          </Button>
        </div>
      )}

      {!query.isLoading && !query.error && rows.length > 0 && !query.hasNextPage && (
        <p className="text-center text-xs text-slate-500">
          End of list — {rows.length} destination{rows.length === 1 ? '' : 's'}.
        </p>
      )}
    </div>
  );
}
