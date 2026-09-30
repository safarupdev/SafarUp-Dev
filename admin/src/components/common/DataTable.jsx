/**
 * Data Grid Component — Exactly matching Image 2 specification.
 *
 * Features:
 *  - Pill search bar with magnifying glass
 *  - Pill dropdown filter ("Select District / Country ⌵")
 *  - Segmented status / severity filter pill tabs (All, Emergency, High, Medium, Low)
 *  - Spacious table with sort chevrons on headers
 *  - High contrast action controls (View ⌵ dropdown button)
 *  - Image 2 pagination with dark active page pill (1) and numbered buttons (2, 3, 4)
 *  - CSV export capability
 */

import { useMemo, useState } from 'react';
import TableSkeleton from './TableSkeleton';
import EmptyState from './EmptyState';
import ErrorState from './ErrorState';
import Icon from './Icon';

function exportToCsv(filename, columns, rows) {
  const exportableCols = columns.filter((col) => col.key !== 'actions');
  const headers = exportableCols.map((col) => `"${col.header.replace(/"/g, '""')}"`).join(',');

  const lines = rows.map((row) =>
    exportableCols
      .map((col) => {
        let val = '';
        if (typeof col.exportValue === 'function') {
          val = col.exportValue(row);
        } else if (typeof col.render === 'function') {
          val = row[col.key] ?? '';
        } else {
          val = row[col.key] ?? '';
        }

        if (val === null || val === undefined) val = '';
        if (typeof val === 'object') val = JSON.stringify(val);
        return `"${String(val).replace(/"/g, '""')}"`;
      })
      .join(',')
  );

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...lines].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `${filename || 'export'}-${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function DataTable({
  columns,
  rows = [],
  rowKey,
  isLoading,
  error,
  onRetry,
  empty,
  caption,
  searchable = true,
  searchPlaceholder = 'Search...',
  exportable = true,
  paginated = true,
  defaultPageSize = 10,
  filterDropdown, // { label: string, options: [{ label, value }], value, onChange }
  segmentedFilters, // [{ id: 'all', label: 'All' }, ...]
  activeSegment = 'all',
  onSegmentChange,
  toolbar,
  className = '',
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  // 1. Client Search Filter
  const filteredRows = useMemo(() => {
    if (!rows || rows.length === 0) return [];
    if (!searchQuery.trim()) return rows;

    const q = searchQuery.toLowerCase().trim();
    return rows.filter((row) => {
      return columns.some((col) => {
        if (col.key === 'actions') return false;
        const val = row[col.key];
        if (val === null || val === undefined) return false;
        if (typeof val === 'string' || typeof val === 'number') {
          return String(val).toLowerCase().includes(q);
        }
        return false;
      });
    });
  }, [rows, columns, searchQuery]);

  // 2. Sorting
  const sortedRows = useMemo(() => {
    if (!sortKey) return filteredRows;

    const column = columns.find((c) => c.key === sortKey);
    if (!column) return filteredRows;

    return [...filteredRows].sort((a, b) => {
      let valA;
      let valB;

      if (typeof column.sortValue === 'function') {
        valA = column.sortValue(a);
        valB = column.sortValue(b);
      } else {
        valA = a[sortKey];
        valB = b[sortKey];
      }

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      const comparison = String(valA).localeCompare(String(valB), undefined, { numeric: true });
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredRows, sortKey, sortDirection, columns]);

  // 3. Pagination
  const totalPages = paginated && pageSize > 0 ? Math.ceil(sortedRows.length / pageSize) : 1;
  const paginatedRows = useMemo(() => {
    if (!paginated || pageSize <= 0) return sortedRows;
    const start = (currentPage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, paginated, currentPage, pageSize]);

  const handleSort = (key) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortKey(null);
        setSortDirection('asc');
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  if (isLoading) {
    return <TableSkeleton rows={defaultPageSize > 10 ? 8 : 5} columns={columns.length} />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }

  if (!rows || rows.length === 0) {
    return <EmptyState {...empty} />;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search & Filter Toolbar — Matching Image 2 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: Pill Search Input */}
        <div className="flex flex-1 items-center gap-3">
          {searchable && (
            <div className="relative w-full max-w-xs">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Icon name="search" className="h-4 w-4" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={searchPlaceholder}
                className="w-full rounded-full border border-slate-200 bg-white py-2 pl-9.5 pr-4 text-xs font-medium text-slate-900 placeholder:text-slate-400 shadow-2xs focus:border-slate-400 focus:outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-navy-950"
                  title="Clear search"
                >
                  <Icon name="x" className="h-3 w-3" />
                </button>
              )}
            </div>
          )}

          {toolbar}
        </div>

        {/* Right: Select Dropdown & Segmented Control (Exact match to Image 2) */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Dropdown Filter Pill */}
          {filterDropdown && (
            <div className="relative">
              <select
                value={filterDropdown.value}
                onChange={(e) => filterDropdown.onChange(e.target.value)}
                className="appearance-none rounded-full border border-slate-200 bg-white py-1.5 pl-4 pr-8 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 focus:outline-none cursor-pointer"
              >
                {filterDropdown.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400">
                <Icon name="chevronDown" className="h-3 w-3" />
              </span>
            </div>
          )}

          {/* Segmented Control Pill Group (Image 2 right toolbar) */}
          {segmentedFilters && (
            <div className="flex items-center rounded-full border border-slate-200 bg-slate-50/80 p-0.5 shadow-2xs">
              {segmentedFilters.map((tab) => {
                const isActive = activeSegment === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => onSegmentChange && onSegmentChange(tab.id)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-navy-950 text-white shadow-xs'
                        : 'text-slate-600 hover:text-navy-950 hover:bg-white/60'
                    }`}
                  >
                    {tab.icon && (
                      <span className={tab.iconColor ?? ''}>
                        <Icon name={tab.icon} className="h-3 w-3" />
                      </span>
                    )}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {exportable && sortedRows.length > 0 && (
            <button
              type="button"
              onClick={() => exportToCsv(caption, columns, sortedRows)}
              title="Export to CSV"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
            >
              <Icon name="download" className="h-3 w-3 text-slate-500" />
              <span>Export</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table Surface — Exactly matching Image 2 */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
        <div className="admin-scrollbar overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            {caption && <caption className="sr-only">{caption}</caption>}
            <thead>
              <tr className="border-b border-slate-100 bg-white">
                {columns.map((column) => {
                  const isSorted = sortKey === column.key;
                  const isSortable = column.sortable !== false && column.key !== 'actions';

                  return (
                    <th
                      key={column.key}
                      scope="col"
                      className={`px-4 py-3.5 text-xs font-bold text-slate-900 select-none ${
                        column.headerClassName ?? ''
                      }`}
                    >
                      {isSortable ? (
                        <button
                          type="button"
                          onClick={() => handleSort(column.key)}
                          className="inline-flex items-center gap-1 text-slate-900 hover:text-black transition-colors"
                        >
                          <span>{column.header}</span>
                          <Icon
                            name="chevronDown"
                            className={`h-3 w-3 text-slate-400 transition-transform ${
                              isSorted && sortDirection === 'desc' ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                      ) : (
                        column.header
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-10 text-center text-slate-500">
                    No matching records found for &ldquo;{searchQuery}&rdquo;.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => (
                  <tr
                    key={rowKey(row)}
                    className="transition-colors hover:bg-slate-50/60"
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={`px-4 py-3.5 align-middle text-slate-800 ${column.className ?? ''}`}
                      >
                        {column.render(row)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Numbered Pagination Bar — Exact match to Image 2 bottom-left controls */}
        {paginated && sortedRows.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 bg-white px-4 py-3 text-xs">
            {/* Numbered Page Buttons (Image 2 style) */}
            <div className="flex items-center gap-1.5">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, idx) => {
                const pageNum = idx + 1;
                const isActive = pageNum === currentPage;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-navy-950 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              {totalPages > 5 && (
                <>
                  <span className="text-slate-400 px-1">...</span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(totalPages)}
                    className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold transition-all ${
                      currentPage === totalPages
                        ? 'bg-navy-950 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>

            {/* Showing Range */}
            <div className="text-xs text-slate-500 font-medium">
              Showing{' '}
              <strong className="font-semibold text-slate-800">
                {Math.min((currentPage - 1) * pageSize + 1, sortedRows.length)}
              </strong>{' '}
              to{' '}
              <strong className="font-semibold text-slate-800">
                {Math.min(currentPage * pageSize, sortedRows.length)}
              </strong>{' '}
              of <strong className="font-semibold text-slate-800">{sortedRows.length}</strong> records
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
