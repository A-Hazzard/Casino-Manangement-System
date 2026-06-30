/**
 * Dev Collection Table
 *
 * Renders the explorer result rows for the selected model. Restores the original
 * meters layout: each field is its own column, the `movement.*` delta shows as a
 * sub-line under its matching column, and the primary date (e.g. readAt) shows
 * under `_id`. Adds a leading select-all / per-row checkbox column, search-match
 * highlighting, and per-row Edit / Delete / Export actions.
 */

'use client';

import { forwardRef, useMemo } from 'react';
import { Download, Pencil, Trash2 } from 'lucide-react';

import { Checkbox } from '@/components/shared/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shared/ui/table';
import type { DevCollectionTableProps } from '@/lib/types/dev/collectionExplorer';
import {
  formatCellValue,
  getMovementKeys,
  getNestedValue,
} from '@/lib/utils/dev/tableColumns';

import CellValueRenderer from './CellValueRenderer';

const DevCollectionTable = forwardRef<HTMLDivElement, DevCollectionTableProps>(
  function DevCollectionTable(
    {
      records,
      columns,
      primaryDateField,
      selectedIds,
      matchMap,
      onToggleRow,
      onToggleAll,
      allSelected,
      onEditRow,
      onDeleteRow,
      onExportRow,
    },
    ref
  ) {
    const movementKeys = useMemo(() => getMovementKeys(records), [records]);

    return (
      <div className="rounded-lg border border-gray-200 bg-container shadow-sm">
        <div ref={ref} className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-10 px-3 py-2.5">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={onToggleAll}
                    aria-label="Select all rows on this page"
                  />
                </TableHead>
                {columns.map(col => (
                  <TableHead
                    key={col}
                    className="whitespace-nowrap px-3 py-2.5 text-xs font-medium uppercase tracking-wider text-grayHighlight"
                  >
                    {col}
                  </TableHead>
                ))}
                <TableHead className="px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-grayHighlight">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record, rowIndex) => {
                const id = String(record._id);
                const matchedCols = matchMap?.get(rowIndex);
                const isRowMatch = !!matchedCols;
                const isSelected = selectedIds.has(id);
                return (
                  <TableRow
                    key={id}
                    data-search-match={isRowMatch ? 'true' : undefined}
                    className={`border-l-4 transition-colors ${
                      isSelected
                        ? 'border-l-buttonActive bg-buttonActive/5'
                        : isRowMatch
                          ? 'border-l-amber-500 bg-amber-50/60 hover:bg-amber-100/40'
                          : record.deletedAt
                            ? 'border-l-transparent bg-red-50/60 opacity-70'
                            : rowIndex % 2 === 0
                              ? 'border-l-transparent bg-white'
                              : 'border-l-transparent bg-gray-50/50'
                    } hover:bg-muted/50`}
                  >
                    <TableCell className="px-3 py-2">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onToggleRow(id)}
                        aria-label={`Select row ${id}`}
                      />
                    </TableCell>

                    {columns.map(col => {
                      const value = getNestedValue(record, col);
                      const isCellMatch = matchedCols?.has(col) ?? false;

                      // `_id` shows the primary date (e.g. readAt) beneath it.
                      if (col === '_id') {
                        const dateValue = primaryDateField
                          ? getNestedValue(record, primaryDateField)
                          : undefined;
                        const dateDisplay = dateValue
                          ? formatCellValue(primaryDateField, dateValue)
                          : '—';
                        return (
                          <TableCell
                            key={col}
                            className={`whitespace-nowrap px-3 py-2 font-mono text-[10px] text-grayHighlight ${isCellMatch ? 'bg-amber-200/70 font-semibold' : ''}`}
                          >
                            <CellValueRenderer value={value} col={col} />
                            <br />
                            <span className="text-[10px] text-gray-400">
                              {dateDisplay}
                            </span>
                          </TableCell>
                        );
                      }

                      // A top-level meter column shows its movement delta beneath.
                      const isMovementCol =
                        !col.startsWith('movement.') && movementKeys.has(col);
                      const movValue = isMovementCol
                        ? getNestedValue(record, `movement.${col}`)
                        : undefined;

                      return (
                        <TableCell
                          key={col}
                          className={`px-3 py-2 text-xs text-gray-700 ${
                            col === 'deletedAt' && value != null
                              ? 'font-medium text-red-600'
                              : ''
                          } ${isCellMatch ? 'bg-amber-200/70 font-semibold' : ''}`}
                        >
                          <CellValueRenderer value={value} col={col} />
                          {movValue != null && (
                            <>
                              <br />
                              <span className="text-[10px] text-gray-400">
                                {formatCellValue(col, movValue)}
                              </span>
                            </>
                          )}
                        </TableCell>
                      );
                    })}

                    <TableCell className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onEditRow(record)}
                          title="Edit record"
                          aria-label="Edit record"
                          className="rounded p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onExportRow(record)}
                          title="Export record as JSON"
                          aria-label="Export record"
                          className="rounded p-1.5 text-gray-500 hover:bg-emerald-50 hover:text-emerald-600"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDeleteRow(record)}
                          title="Delete record"
                          aria-label="Delete record"
                          className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }
);

export default DevCollectionTable;
