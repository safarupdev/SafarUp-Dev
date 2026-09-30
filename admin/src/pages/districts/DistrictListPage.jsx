/**
 * District list — DISTRICT.domain.contract.md.
 *
 * Cursor-paginated (`{ items, nextCursor }`) and filtered by status. Includes
 * DRAFT and ARCHIVED rows, which is the point of the admin list: only
 * PUBLISHED is publicly readable (PRD §63).
 *
 * Deliberately no search box. The API rejects `q` with 400 in Phase 2
 * (API.destination.contract.md §2.1b), and a search box that silently
 * returned unfiltered rows would misreport the result set.
 */

import { Link, useSearchParams } from 'react-router-dom';

import { CONTENT_ENTITIES } from '../../api/content.api';
import { flattenPages, useCursorContentList } from '../../hooks/useContentQueries';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import Button from '../../components/ui/Button';
import LinkButton from '../../components/ui/LinkButton';
import StatusFilter from '../../components/content/StatusFilter';
import ContentRoleNotice from '../../components/content/ContentRoleNotice';
import { formatDateTime } from '../../lib/format';

/** Backend entities expose both `_id` and `id`; prefer `id`. */
const idOf = (row) => row.id ?? row._id;

const COLUMNS = [
  {
    key: 'name',
    header: 'Name',
    render: (row) => (
      <Link
        to={`/districts/${idOf(row)}`}
        className="font-medium text-brand-600 hover:text-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
      >
        {row.name}
      </Link>
    ),
  },
  {
    key: 'slug',
    header: 'Slug',
    render: (row) => <code className="text-xs text-slate-600">/{row.slug}</code>,
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
    className: 'text-right whitespace-nowrap',
    render: (row) => <EditLink id={idOf(row)} />,
  },
];

function EditLink({ id }) {
  return (
    <LinkButton to={`/districts/${id}`} variant="ghost" className="px-2 py-1">
      Edit
    </LinkButton>
  );
}

export default function DistrictListPage() {
  // The status filter lives in the URL, so a filtered list is linkable and
  // survives a refresh.
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') ?? '';

  const query = useCursorContentList({
    entity: CONTENT_ENTITIES.districts,
    params: status ? { status } : {},
  });

  const rows = flattenPages(query);

  function setStatus(next) {
    setSearchParams(next ? { status: next } : {}, { replace: true });
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Districts"
        description="Canonical geographic entities. Every Destination and Place belongs to exactly one District (PRD §200.3). A District has no editorial content beyond its name — coordinates, hierarchy and descriptions are deliberately not modelled."
        actions={<LinkButton to="/districts/new">New district</LinkButton>}
      />

      <ContentRoleNotice />
      <StatusFilter value={status} onChange={setStatus} id="district-status" />

      <DataTable
        columns={COLUMNS}
        rows={rows}
        rowKey={idOf}
        isLoading={query.isLoading}
        error={query.error}
        onRetry={query.refetch}
        paginated={false}
        caption="Districts, most recently updated first"
        empty={{
          title: status ? `No ${status.toLowerCase()} districts` : 'No districts yet',
          description: status
            ? 'No district currently has this status. Try a different filter.'
            : 'A district is the canonical geography a destination and its places belong to. Create the first one to start linking content.',
          action: status ? null : <LinkButton to="/districts/new">New district</LinkButton>,
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
          End of list — {rows.length} district{rows.length === 1 ? '' : 's'}.
        </p>
      )}
    </div>
  );
}
