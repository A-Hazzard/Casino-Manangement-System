'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/shared/ui/button';
import { ModernCalendar } from '@/components/shared/ui/ModernCalendar';
import type { CollectionDocument } from '@/lib/types/collection';
import { formatDateWithOrdinal } from '@/lib/utils/date/formatting';
import { formatMachineDisplayNameWithBold } from '@/components/shared/ui/machineDisplay';
import { Edit3, Trash2, Search, Info, CheckSquare, ChevronDown, ChevronRight, Clock } from 'lucide-react';
import { CollectionReportDetailsJackpotIndicator } from '@/components/CMS/collectionReport/details/components/CollectionReportDetailsIndicators';

type NewCollectionCollectedMachinesProps = {
  collectedMachineEntries: CollectionDocument[];
  isProcessing: boolean;
  onEditEntry: (id: string) => void;
  onDeleteEntry: (id: string) => void;
  updateAllSasStartDate?: Date | undefined;
  setUpdateAllSasStartDate?: (date: Date | undefined) => void;
  updateAllSasEndDate?: Date | undefined;
  setUpdateAllSasEndDate?: (date: Date | undefined) => void;
  onApplyAllDates?: () => void;
  variationMachineIds?: string[];
  sasUpdateProgress?: { completed: number; total: number } | null;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  onDeleteSelected?: () => void;
  includeJackpotMap?: Record<string, boolean>;
};

export default function CollectionReportNewCollectionCollectedMachines({
  collectedMachineEntries,
  isProcessing,
  onEditEntry,
  onDeleteEntry,
  updateAllSasStartDate,
  setUpdateAllSasStartDate,
  updateAllSasEndDate,
  setUpdateAllSasEndDate,
  onApplyAllDates,
  variationMachineIds = [],
  sasUpdateProgress,
  selectedIds = [],
  onToggleSelect,
  onDeleteSelected,
  includeJackpotMap = {},
}: NewCollectionCollectedMachinesProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sasExpanded, setSasExpanded] = useState(false);

  const filteredEntries = useMemo(() => {
    const reversed = collectedMachineEntries.slice().reverse();
    if (!searchQuery.trim()) return reversed;
    const searchTermLower = searchQuery.toLowerCase();
    return reversed.filter(
      entry =>
        (entry.serialNumber?.toLowerCase() || '').includes(searchTermLower) ||
        (entry.machineCustomName?.toLowerCase() || '').includes(searchTermLower) ||
        (entry.machineId?.toLowerCase() || '').includes(searchTermLower) ||
        (entry.game?.toLowerCase() || '').includes(searchTermLower)
    );
  }, [collectedMachineEntries, searchQuery]);

  const allVisibleSelected = useMemo(() => {
    if (filteredEntries.length === 0 || !onToggleSelect) return false;
    return filteredEntries.every(entry => selectedIds.includes(String(entry._id)));
  }, [filteredEntries, selectedIds, onToggleSelect]);

  const handleHeaderSelectAll = () => {
    if (!onToggleSelect) return;
    if (allVisibleSelected) {
      filteredEntries.forEach(entry => onToggleSelect(String(entry._id)));
    } else {
      filteredEntries.forEach(entry => {
        if (!selectedIds.includes(String(entry._id))) onToggleSelect(String(entry._id));
      });
    }
  };

  return (
    <div className="flex min-h-0 w-full flex-col bg-gray-50">
      <div className="flex items-center justify-between border-b border-gray-300 bg-gray-100 p-3">
        <h3 className="text-sm font-bold text-gray-700">
          Collected Machines ({collectedMachineEntries.length})
        </h3>
        {onToggleSelect && collectedMachineEntries.length > 0 && (
          <button
            onClick={handleHeaderSelectAll}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 hover:bg-gray-200"
            title={allVisibleSelected ? 'Deselect all' : 'Select all visible'}
          >
            <CheckSquare className="h-3 w-3" />
            {allVisibleSelected ? 'Deselect All' : 'Select All'}
          </button>
        )}
      </div>

      {/* Bulk delete bar */}
      {selectedIds.length > 0 && onDeleteSelected && (
        <div className="flex items-center justify-between border-b border-red-200 bg-red-50 px-3 py-1.5">
          <span className="text-[11px] font-semibold text-red-700">
            {selectedIds.length} selected
          </span>
          <button
            onClick={onDeleteSelected}
            disabled={isProcessing}
            className="flex items-center gap-1 rounded bg-red-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-red-700 disabled:opacity-50"
          >
            <Trash2 className="h-3 w-3" />
            Delete Selected
          </button>
        </div>
      )}

      {/* Update All SAS Times — collapsible to keep list visible */}
      {collectedMachineEntries.length >= 1 &&
        setUpdateAllSasStartDate &&
        setUpdateAllSasEndDate &&
        onApplyAllDates && (
          <div className="border-b border-gray-200">
            <button
              onClick={() => setSasExpanded(prev => !prev)}
              className="flex w-full items-center gap-2 bg-blue-50 px-3 py-2 text-left transition-colors hover:bg-blue-100"
            >
              <Clock className="h-3.5 w-3.5 shrink-0 text-blue-500" />
              <span className="flex-1 text-[11px] font-semibold text-blue-700">Update All SAS Times</span>
              {sasUpdateProgress && (
                <span className="text-[10px] font-bold text-blue-600">
                  {sasUpdateProgress.completed}/{sasUpdateProgress.total}
                </span>
              )}
              {sasExpanded
                ? <ChevronDown className="h-3.5 w-3.5 text-blue-500" />
                : <ChevronRight className="h-3.5 w-3.5 text-blue-400" />
              }
            </button>

            {sasExpanded && (
              <div className="space-y-2 bg-blue-50/60 p-3">
                <div>
                  <label className="mb-0.5 block text-[9px] font-medium text-gray-500">Start Time</label>
                  <ModernCalendar
                    date={updateAllSasStartDate ? { from: updateAllSasStartDate, to: updateAllSasStartDate } : undefined}
                    onSelect={range => { if (range?.from) setUpdateAllSasStartDate(range.from); else setUpdateAllSasStartDate(undefined); }}
                    enableTimeInputs={true} mode="single" className="w-full min-w-0"
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[9px] font-medium text-gray-500">End Time</label>
                  <ModernCalendar
                    date={updateAllSasEndDate ? { from: updateAllSasEndDate, to: updateAllSasEndDate } : undefined}
                    onSelect={range => { if (range?.from) setUpdateAllSasEndDate(range.from); else setUpdateAllSasEndDate(undefined); }}
                    enableTimeInputs={true} mode="single" className="w-full min-w-0"
                  />
                </div>
                <Button
                  onClick={onApplyAllDates}
                  disabled={(!updateAllSasStartDate && !updateAllSasEndDate) || isProcessing}
                  className="h-8 w-full bg-blue-600 text-[10px] font-bold hover:bg-blue-700" size="sm"
                >
                  {isProcessing ? 'Updating...' : 'APPLY TIMES TO ALL'}
                </Button>
                {sasUpdateProgress && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[9px] font-semibold text-blue-700">
                      <span>{sasUpdateProgress.completed}/{sasUpdateProgress.total}</span>
                      <span>{Math.round((sasUpdateProgress.completed / sasUpdateProgress.total) * 100)}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-blue-200">
                      <div className="h-full rounded-full bg-blue-600 transition-all duration-200" style={{ width: `${(sasUpdateProgress.completed / sasUpdateProgress.total) * 100}%` }} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      {/* Search collected machines */}
      {collectedMachineEntries.length > 0 && (
        <div className="border-b border-gray-300 px-3 py-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search collected..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white py-1.5 pl-8 pr-3 text-xs text-gray-700 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
        </div>
      )}

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {collectedMachineEntries.length === 0 ? (
          <p className="py-10 text-center text-xs text-gray-500">No machines collected yet.</p>
        ) : filteredEntries.length === 0 ? (
          <p className="py-10 text-center text-xs text-gray-500">No machines match your search.</p>
        ) : (
          filteredEntries.map((entry, index) => {
            const hasVariation = variationMachineIds.some(vid => String(vid) === String(entry.machineId));
            const isSelected = selectedIds.includes(String(entry._id));
            const displayIn = entry.ramClear ? (entry.movement?.metersIn ?? entry.metersIn) : entry.metersIn;
            const displayOut = entry.ramClear ? (entry.movement?.metersOut ?? entry.metersOut) : entry.metersOut;
            return (
              <div
                key={entry._id ? String(entry._id) : `entry-${index}-${entry.machineCustomName || entry.machineId || 'unknown'}`}
                className={`rounded-lg border transition-colors ${
                  isSelected
                    ? 'border-blue-300 bg-blue-50 ring-1 ring-blue-300'
                    : hasVariation
                      ? 'border-amber-300 bg-amber-50 ring-1 ring-amber-300'
                      : 'border-gray-200 bg-white'
                }`}
              >
                {/* Header: checkbox · name · badges · actions */}
                <div className="flex items-center gap-2 px-3 py-2">
                  {onToggleSelect && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(String(entry._id))}
                      className="h-3.5 w-3.5 shrink-0 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  )}
                  <p className={`min-w-0 flex-1 truncate text-xs font-bold ${isSelected ? 'text-blue-900' : hasVariation ? 'text-amber-900' : 'text-gray-900'}`}>
                    {formatMachineDisplayNameWithBold({
                      serialNumber: entry.serialNumber,
                      custom: { name: entry.machineCustomName },
                      game: entry.game,
                    })}
                  </p>
                  <div className="flex shrink-0 items-center gap-1">
                    {hasVariation && (
                      <span className="flex items-center gap-0.5 rounded bg-amber-500 px-1.5 py-0.5 text-[9px] font-black uppercase text-white">
                        <Info className="h-2.5 w-2.5" />
                        Var
                      </span>
                    )}
                    {includeJackpotMap[String(entry.machineId)] && (
                      <CollectionReportDetailsJackpotIndicator />
                    )}
                    {entry.ramClear && (
                      <span className="rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-red-700">
                        RAM
                      </span>
                    )}
                    <Button
                      variant="ghost" size="icon"
                      className="h-6 w-6 p-0 hover:bg-gray-100"
                      onClick={() => onEditEntry(String(entry._id))}
                      disabled={isProcessing}
                    >
                      <Edit3 className="h-3.5 w-3.5 text-blue-500" />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      className="h-6 w-6 p-0 hover:bg-gray-100"
                      onClick={() => onDeleteEntry(String(entry._id))}
                      disabled={isProcessing}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  </div>
                </div>

                {/* Stats: meters + SAS times */}
                <div className={`border-t px-3 py-1.5 text-[11px] ${hasVariation ? 'border-amber-200 bg-amber-50/60' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                    <span className={`font-semibold ${isSelected ? 'text-blue-800' : 'text-gray-700'}`}>
                      In: <span className="text-green-700">{displayIn?.toLocaleString()}</span>
                    </span>
                    <span className="text-gray-300">|</span>
                    <span className={`font-semibold ${isSelected ? 'text-blue-800' : 'text-gray-700'}`}>
                      Out: <span className="text-red-600">{displayOut?.toLocaleString()}</span>
                    </span>
                  </div>
                  {entry.sasMeters?.sasStartTime && entry.sasMeters?.sasEndTime ? (
                    <p
                      className={`mt-1 break-words text-[10px] leading-snug ${hasVariation ? 'text-amber-700' : 'text-gray-500'}`}
                    >
                      {formatDateWithOrdinal(entry.sasMeters.sasStartTime)} →{' '}
                      {formatDateWithOrdinal(entry.sasMeters.sasEndTime)}
                    </p>
                  ) : (
                    <p className="mt-1 text-[10px] italic text-gray-400">No time set</p>
                  )}
                </div>

                {/* Notes (only if present) */}
                {entry.notes && (
                  <div className={`border-t px-3 py-1 text-[11px] italic ${hasVariation ? 'border-amber-200 text-amber-700' : 'border-gray-100 text-gray-500'}`}>
                    {entry.notes}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
