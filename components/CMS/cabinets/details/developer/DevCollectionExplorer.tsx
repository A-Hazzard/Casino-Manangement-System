/**
 * Dev Collection Explorer
 *
 * The developer "Developer Options" tab: a model-agnostic DB explorer. Pick any
 * registry collection, filter by date, search, and run individual or bulk
 * edit / delete / export. Replaces the former meters-only Developer Tools.
 *
 * Features:
 * - Model picker (grouped) + optional "scope to this cabinet" filter
 * - Date-period + date-field filters, free-text search with match navigation
 * - Row selection (per-row + select-all) driving a bulk action bar
 * - Structured single edit, set-fields bulk edit, hard delete (confirmed), export
 */

'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Filter, Search, Trash2 } from 'lucide-react';

import { Button } from '@/components/shared/ui/button';
import ConfirmationModal from '@/components/shared/ui/ConfirmationModal';
import { MuiDateCalendar } from '@/components/shared/ui/MuiDateCalendar';
import PaginationControls from '@/components/shared/ui/PaginationControls';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/shared/ui/popover';
import { MetersTableSkeleton } from '@/components/shared/ui/skeletons/CabinetDetailSkeletons';

import { useDevCollectionExplorer } from '@/lib/hooks/dev/useDevCollectionExplorer';
import type { DevCollectionRecord } from '@shared/types/dev';
import type {
  DevExplorerProps,
  DevTimePeriod,
} from '@/lib/types/dev/collectionExplorer';

import DevBulkEditModal from './DevBulkEditModal';
import DevCollectionTable from './DevCollectionTable';
import DevRecordEditModal from './DevRecordEditModal';
import DevQueryBuilder from './DevQueryBuilder';

const TIME_PERIODS: DevTimePeriod[] = [
  'Today',
  'Yesterday',
  '7d',
  '30d',
  'All Time',
  'Custom',
];

const FILTER_LABELS: Record<DevTimePeriod, string> = {
  Today: 'Today',
  Yesterday: 'Yesterday',
  '7d': 'Last 7 Days',
  '30d': 'Last 30 Days',
  'All Time': 'All Time',
  Custom: 'Custom',
};

function formatCustomRangeLabel(from?: Date, to?: Date): string {
  if (!from || !to) return 'Custom';
  const fmt = (date: Date) =>
    date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  return `${fmt(from)} – ${fmt(to)}`;
}

export default function DevCollectionExplorer({
  defaultCabinetId,
  refreshTrigger,
}: DevExplorerProps) {
  // ============================================================================
  // State & Hooks
  // ============================================================================
  const explorer = useDevCollectionExplorer(defaultCabinetId, refreshTrigger);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<DevCollectionRecord | null>(null);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DevCollectionRecord | null>(
    null
  );
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [showQueryBuilder, setShowQueryBuilder] = useState(false);

  // ============================================================================
  // Computed
  // ============================================================================
  const modelGroups = useMemo(() => {
    const groups = new Map<string, { key: string; label: string }[]>();
    for (const model of explorer.models) {
      const list = groups.get(model.group) ?? [];
      list.push({ key: model.key, label: model.label });
      groups.set(model.group, list);
    }
    return Array.from(groups.entries());
  }, [explorer.models]);

  const selectedCount = explorer.selectedIds.size;

  // ============================================================================
  // Handlers
  // ============================================================================
  const handlePeriodClick = (period: DevTimePeriod) => {
    if (period === 'Custom') {
      explorer.setTimePeriod('Custom');
      setPopoverOpen(true);
    } else {
      setPopoverOpen(false);
      explorer.setTimePeriod(period);
    }
  };

  const handleCustomApply = (range?: { from: Date; to: Date }) => {
    setPopoverOpen(false);
    if (!range?.from || !range?.to) return;
    explorer.setCustomDateRange({ from: range.from, to: range.to });
    explorer.setTimePeriod('Custom');
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const ok = await explorer.deleteRecords([String(deleteTarget._id)]);
    if (ok) setDeleteTarget(null);
  };

  const handleConfirmBulkDelete = async () => {
    const ok = await explorer.deleteRecords(Array.from(explorer.selectedIds));
    if (ok) setBulkDeleteOpen(false);
  };

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div className="w-full overflow-hidden">
      {/* Model picker + scope */}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label
            htmlFor="devModelSelect"
            className="whitespace-nowrap text-sm font-medium text-gray-600"
          >
            Collection
          </label>
          <select
            id="devModelSelect"
            value={explorer.modelKey}
            onChange={e => explorer.setModelKey(e.target.value)}
            className="h-9 rounded-md border border-gray-300 bg-white px-2.5 text-sm text-gray-700 focus:border-buttonActive focus:ring-buttonActive"
          >
            {modelGroups.map(([group, list]) => (
              <optgroup key={group} label={group}>
                {list.map(model => (
                  <option key={model.key} value={model.key}>
                    {model.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {explorer.cabinetScopable && (
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={explorer.scopeToCabinet}
              onChange={e => explorer.setScopeToCabinet(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            Scope to this cabinet
          </label>
        )}
      </div>

      {/* Date filters + date field + export */}
      <div className="flex flex-wrap items-center gap-2">
        {TIME_PERIODS.filter(period => period !== 'Custom').map(period => (
          <Button
            key={period}
            onClick={() => handlePeriodClick(period)}
            className={`rounded-md px-3 py-1 text-sm transition-colors ${
              explorer.timePeriod === period
                ? 'bg-buttonActive text-white'
                : 'bg-button text-white hover:bg-button/90'
            }`}
          >
            {FILTER_LABELS[period]}
          </Button>
        ))}

        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              className={`rounded-md px-3 py-1 text-sm transition-colors ${
                explorer.timePeriod === 'Custom'
                  ? 'bg-buttonActive text-white'
                  : 'bg-button text-white hover:bg-button/90'
              }`}
            >
              {explorer.timePeriod === 'Custom' &&
              explorer.customDateRange.from &&
              explorer.customDateRange.to
                ? formatCustomRangeLabel(
                    explorer.customDateRange.from,
                    explorer.customDateRange.to
                  )
                : 'Custom'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start" side="bottom">
            <MuiDateCalendar
              date={explorer.customDateRange.from}
              endDate={explorer.customDateRange.to}
              showTime={true}
              buttonLabel="Apply"
              onSelect={handleCustomApply}
            />
          </PopoverContent>
        </Popover>

        {explorer.dateFields.length > 0 && (
          <div className="flex items-center gap-2">
            <label
              htmlFor="devDateFieldSelect"
              className="whitespace-nowrap text-sm font-medium text-gray-600"
            >
              Date Field
            </label>
            <select
              id="devDateFieldSelect"
              value={explorer.dateField}
              onChange={e => explorer.setDateField(e.target.value)}
              className="h-9 rounded-md border border-gray-300 bg-white px-2.5 text-sm text-gray-700 focus:border-buttonActive focus:ring-buttonActive"
            >
              {explorer.dateFields.map(field => (
                <option key={field} value={field}>
                  {field}
                </option>
              ))}
            </select>
          </div>
        )}

        <Button
          onClick={() => setShowQueryBuilder(prev => !prev)}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-semibold text-white shadow-sm transition-colors ${
            showQueryBuilder
              ? 'bg-purple-700 hover:bg-purple-800'
              : explorer.appliedFilters.length > 0
                ? 'bg-purple-600 hover:bg-purple-700 ring-2 ring-purple-300'
                : 'bg-purple-500 hover:bg-purple-600'
          }`}
          title="Toggle Visual Query Builder"
        >
          <Filter className="h-4 w-4" />
          Query Builder
          {explorer.appliedFilters.length > 0 && (
            <span className="ml-1 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-purple-700">
              {explorer.appliedFilters.length}
            </span>
          )}
        </Button>

        <Popover open={exportOpen} onOpenChange={setExportOpen}>
          <PopoverTrigger asChild>
            <Button
              className="ml-auto flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1 text-sm text-white hover:bg-emerald-700"
              title="Export all matching records (no pagination limit)"
            >
              <Download className="h-4 w-4" /> Export
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-36 p-1" align="end" side="bottom">
            <button
              onClick={() => {
                setExportOpen(false);
                explorer.exportRecords('csv');
              }}
              className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              CSV
            </button>
            <button
              onClick={() => {
                setExportOpen(false);
                explorer.exportRecords('json');
              }}
              className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              JSON
            </button>
          </PopoverContent>
        </Popover>
      </div>

      {/* Collapsible Visual Query Builder */}
      {showQueryBuilder && (
        <div className="my-3">
          <DevQueryBuilder
            columns={explorer.columns}
            fields={explorer.fields}
            filterClauses={explorer.filterClauses}
            filterLogic={explorer.filterLogic}
            querySortField={explorer.querySortField}
            querySortDir={explorer.querySortDir}
            queryLimit={explorer.queryLimit}
            onClausesChange={explorer.setFilterClauses}
            onLogicChange={explorer.setFilterLogic}
            onSortFieldChange={explorer.setQuerySortField}
            onSortDirChange={explorer.setQuerySortDir}
            onLimitChange={explorer.setQueryLimit}
            onRun={explorer.applyQuery}
            onClear={explorer.clearQuery}
          />
        </div>
      )}

      {/* Search */}
      <div className="my-3 flex flex-wrap items-center gap-2">
        <div className="flex h-9 w-full max-w-xl items-center overflow-hidden rounded-md border border-gray-300 bg-white focus-within:border-buttonActive focus-within:ring-1 focus-within:ring-buttonActive">
          <input
            type="text"
            placeholder={
              explorer.searchColumn
                ? `Search ${explorer.searchColumn}...`
                : 'Search all fields...'
            }
            value={explorer.searchQuery}
            onChange={e => explorer.setSearchQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                explorer.runSearch();
              }
            }}
            className="h-full min-w-0 flex-1 bg-white px-3 py-1.5 text-xs focus:outline-none"
          />
          <select
            aria-label="Search column"
            value={explorer.searchColumn}
            onChange={e => explorer.setSearchColumn(e.target.value)}
            className="h-full w-auto shrink-0 cursor-pointer border-l border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
          >
            <option value="">All fields</option>
            {explorer.columns.map(col => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
          <select
            aria-label="Match mode"
            value={explorer.searchMatchMode}
            onChange={e =>
              explorer.setSearchMatchMode(
                e.target.value as 'contains' | 'exact'
              )
            }
            className="h-full w-auto shrink-0 cursor-pointer border-l border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 focus:outline-none"
          >
            <option value="contains">Contains</option>
            <option value="exact">Exact</option>
          </select>
          <button
            onClick={explorer.runSearch}
            aria-label="Submit search"
            title="Submit search"
            className="flex h-full shrink-0 items-center justify-center border-l border-gray-200 px-3 py-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-700"
          >
            <Search className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {!explorer.loading &&
          explorer.appliedTerm &&
          explorer.matchCount > 0 && (
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Button
                onClick={() => explorer.goToMatch(explorer.matchOrdinal - 1)}
                disabled={explorer.matchOrdinal <= 0}
                className="h-8 rounded-md border border-gray-300 bg-white px-2 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                aria-label="Previous match"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[5rem] text-center tabular-nums">
                {explorer.matchOrdinal + 1} of {explorer.matchCount}
              </span>
              <Button
                onClick={() => explorer.goToMatch(explorer.matchOrdinal + 1)}
                disabled={explorer.matchOrdinal >= explorer.matchCount - 1}
                className="h-8 rounded-md border border-gray-300 bg-white px-2 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                aria-label="Next match"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        {!explorer.loading &&
          explorer.appliedTerm &&
          explorer.matchCount === 0 && (
            <span className="text-sm font-medium text-amber-700">
              No matches
            </span>
          )}
      </div>

      {/* Bulk action bar */}
      {selectedCount > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-buttonActive/30 bg-buttonActive/5 px-3 py-2">
          <span className="text-sm font-medium text-gray-700">
            {selectedCount} selected
          </span>
          <Button
            onClick={() => setBulkEditOpen(true)}
            className="h-8 rounded-md bg-button px-3 text-sm text-white hover:bg-buttonActive"
          >
            Edit Selected
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button className="flex h-8 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-sm text-white hover:bg-emerald-700">
                <Download className="h-4 w-4" /> Export Selected
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-36 p-1" align="start" side="bottom">
              <button
                onClick={() => explorer.exportSelected('csv')}
                className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                CSV
              </button>
              <button
                onClick={() => explorer.exportSelected('json')}
                className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                JSON
              </button>
            </PopoverContent>
          </Popover>
          <Button
            onClick={() => setBulkDeleteOpen(true)}
            className="flex h-8 items-center gap-1.5 rounded-md bg-destructive px-3 text-sm text-white hover:bg-destructive/90"
          >
            <Trash2 className="h-4 w-4" /> Delete Selected
          </Button>
          <button
            onClick={explorer.clearSelection}
            className="ml-1 text-sm text-gray-500 hover:underline"
          >
            Clear
          </button>
        </div>
      )}

      {/* Status line */}
      {!explorer.loading &&
        !explorer.error &&
        explorer.displayedRecords.length > 0 &&
        explorer.total !== null && (
          <p className="text-xs text-grayHighlight">
            {explorer.total} record{explorer.total !== 1 ? 's' : ''} total
          </p>
        )}

      {/* Loading / error / table */}
      {explorer.loading && <MetersTableSkeleton />}

      {explorer.error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Error: {explorer.error}
        </div>
      )}

      {!explorer.loading &&
        !explorer.error &&
        explorer.displayedRecords.length > 0 && (
          <DevCollectionTable
            ref={explorer.tableContainerRef}
            records={explorer.displayedRecords}
            columns={explorer.columns}
            primaryDateField={explorer.primaryDateField}
            selectedIds={explorer.selectedIds}
            matchMap={explorer.matchMap}
            onToggleRow={explorer.toggleRow}
            onToggleAll={explorer.toggleAll}
            allSelected={explorer.allSelected}
            onEditRow={setEditTarget}
            onDeleteRow={setDeleteTarget}
            onExportRow={explorer.exportSingle}
          />
        )}

      {/* Pagination */}
      {!explorer.loading && explorer.displayedRecords.length > 0 && (
        <PaginationControls
          currentPage={explorer.displayPage}
          totalPages={explorer.totalDisplayPages}
          totalCount={explorer.total}
          setCurrentPage={explorer.goToDisplayPage}
          hasMore={explorer.hasMore}
        />
      )}

      {/* Empty state */}
      {!explorer.loading &&
        !explorer.error &&
        explorer.displayedRecords.length === 0 && (
          <div className="flex h-32 items-center justify-center rounded-lg border border-gray-200 bg-container text-sm text-grayHighlight shadow-sm">
            No records found for the selected filters.
          </div>
        )}

      {/* Modals */}
      <DevRecordEditModal
        open={!!editTarget}
        onOpenChange={open => !open && setEditTarget(null)}
        record={editTarget}
        fields={explorer.fields}
        saving={explorer.mutating}
        onSave={async set => {
          if (!editTarget) return;
          const ok = await explorer.editRecord(String(editTarget._id), set);
          if (ok) setEditTarget(null);
        }}
      />

      <DevBulkEditModal
        open={bulkEditOpen}
        onOpenChange={setBulkEditOpen}
        selectedCount={selectedCount}
        fields={explorer.fields}
        saving={explorer.mutating}
        onSave={async set => {
          const ok = await explorer.bulkEdit(set);
          if (ok) setBulkEditOpen(false);
        }}
      />

      <ConfirmationModal
        open={!!deleteTarget}
        onOpenChange={open => !open && setDeleteTarget(null)}
        title="Delete Record"
        description={`Permanently delete record ${deleteTarget ? String(deleteTarget._id) : ''}?`}
        confirmLabel="Delete"
        variant="destructive"
        loading={explorer.mutating}
        onConfirm={handleConfirmDelete}
      />

      <ConfirmationModal
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title="Delete Selected Records"
        description={`Permanently delete ${selectedCount} selected record(s)?`}
        confirmLabel={`Delete ${selectedCount}`}
        variant="destructive"
        loading={explorer.mutating}
        onConfirm={handleConfirmBulkDelete}
      />
    </div>
  );
}
