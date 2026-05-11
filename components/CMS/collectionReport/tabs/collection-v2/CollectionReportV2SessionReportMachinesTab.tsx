/**
 * Collection Report V2 — Session Report Machines Tab
 *
 * Searchable, sortable, paginated table of captured machines.
 * Desktop: sortable table with photo thumbnails.
 * Mobile: card layout with same data.
 */

'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import StatusBadge from './CollectionReportV2StatusBadge';

type SessionMachine = {
  reportedMachineId: string;
  machineId: string;
  machineName: string;
  machineCustomName: string;
  serialNumber: string;
  manufacturer: string;
  game?: string;
  status: 'pending' | 'captured' | 'confirmed' | 'skipped';
  sequenceOrder: number;
  systemMetersIn: number;
  systemMetersOut: number;
  sasStartTime?: string;
  sasEndTime?: string;
  imageData?: string;
  imageFileId?: string;
  imageName?: string;
  metersMatch?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type MachinesTabProps = {
  machines: SessionMachine[];
};

type SortField =
  | 'machineName'
  | 'serialNumber'
  | 'systemMetersIn'
  | 'systemMetersOut'
  | 'metersMatch'
  | 'status'
  | 'capturedAt';

const ITEMS_PER_PAGE = 20;

export default function CollectionReportV2SessionReportMachinesTab({
  machines,
}: MachinesTabProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('machineName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoPreviewName, setPhotoPreviewName] = useState('');

  // ============================================================================
  // Sort
  // ============================================================================

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // ============================================================================
  // Filter + Sort + Paginate
  // ============================================================================

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return machines;

    const term = searchTerm.toLowerCase();
    return machines.filter(machine => {
      const name = (
        machine.machineCustomName ||
        machine.machineName ||
        ''
      ).toLowerCase();
      const serial = (machine.serialNumber || '').toLowerCase();
      return (
        name.includes(term) ||
        serial.includes(term)
      );
    });
  }, [machines, searchTerm]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      let cmp = 0;

      switch (sortField) {
        case 'machineName': {
          const nameA = (
            a.machineCustomName || a.machineName || ''
          ).toLowerCase();
          const nameB = (
            b.machineCustomName || b.machineName || ''
          ).toLowerCase();
          cmp = nameA.localeCompare(nameB);
          break;
        }
        case 'serialNumber':
          cmp = (a.serialNumber || '').localeCompare(b.serialNumber || '');
          break;
        case 'systemMetersIn':
          cmp = a.systemMetersIn - b.systemMetersIn;
          break;
        case 'systemMetersOut':
          cmp = a.systemMetersOut - b.systemMetersOut;
          break;
        case 'metersMatch': {
          const aVal = a.metersMatch === true ? 1 : a.metersMatch === false ? 0 : -1;
          const bVal = b.metersMatch === true ? 1 : b.metersMatch === false ? 0 : -1;
          cmp = aVal - bVal;
          break;
        }
        case 'status': {
          const order = { pending: 0, captured: 1, confirmed: 2, skipped: 3 };
          cmp = (order[a.status] ?? 0) - (order[b.status] ?? 0);
          break;
        }
        case 'capturedAt': {
          const aTime = new Date(
            a.createdAt || a.updatedAt || 0
          ).getTime();
          const bTime = new Date(
            b.createdAt || b.updatedAt || 0
          ).getTime();
          cmp = aTime - bTime;
          break;
        }
      }

      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [filtered, sortField, sortDirection]);

  const totalPages = useMemo(
    () => Math.ceil(sorted.length / ITEMS_PER_PAGE) || 1,
    [sorted.length]
  );

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sorted.slice(start, start + ITEMS_PER_PAGE);
  }, [sorted, currentPage]);

  // Reset to page 1 when search changes
  useMemo(() => {
    if (currentPage > Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1) {
      setCurrentPage(1);
    }
  }, [filtered.length]);

  // ============================================================================
  // Helpers
  // ============================================================================

  const formatNum = (value: number) => value.toLocaleString();
  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return '—';
    }
  };

  const metersMatchLabel = (match?: boolean) => {
    if (match === true) return { label: 'Yes', className: 'text-green-700 bg-green-50 border-green-200' };
    if (match === false) return { label: 'No', className: 'text-amber-700 bg-amber-50 border-amber-200' };
    return { label: '—', className: 'text-gray-400 bg-gray-50 border-gray-200' };
  };

  // ============================================================================
  // Photo Preview Modal
  // ============================================================================

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return (
      <span className="ml-1 inline-block text-xs">
        {sortDirection === 'asc' ? '\u25B2' : '\u25BC'}
      </span>
    );
  };

  const SortableHeader = ({
    label,
    field,
  }: {
    label: string;
    field: SortField;
  }) => (
    <th
      onClick={() => handleSort(field)}
      className="cursor-pointer px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 transition-colors hover:text-blue-600"
    >
      {label}
      <SortIcon field={field} />
    </th>
  );

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold text-gray-900 lg:hidden">
          Machines
        </h2>
        <div className="relative max-w-sm flex-1">
          <input
            type="text"
            placeholder="Search machines..."
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
      </div>

      {/* Empty state */}
      {sorted.length === 0 && (
        <div className="rounded-lg bg-white py-12 text-center shadow">
          <p className="text-gray-500">
            {searchTerm
              ? 'No machines match your search'
              : 'No machine data available'}
          </p>
        </div>
      )}

      {sorted.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm lg:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50/50">
                <tr>
                  <th className="w-14 px-3 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Photo
                  </th>
                  <SortableHeader label="Machine" field="machineName" />
                  <SortableHeader label="Serial" field="serialNumber" />
                  <SortableHeader label="Sys In" field="systemMetersIn" />
                  <SortableHeader label="Sys Out" field="systemMetersOut" />
                  <SortableHeader label="Match" field="metersMatch" />
                  <SortableHeader label="Status" field="status" />
                  <SortableHeader label="Time" field="capturedAt" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginated.map(machine => {
                  const match = metersMatchLabel(machine.metersMatch);
                  return (
                    <tr
                      key={machine.reportedMachineId}
                      className="transition-colors hover:bg-gray-50/80"
                    >
                      {/* Photo thumbnail */}
                      <td className="px-3 py-3">
                        {machine.imageData ? (
                          <button
                            type="button"
                            onClick={() => {
                              setPhotoPreviewUrl(machine.imageData || null);
                              setPhotoPreviewName(
                                machine.machineCustomName ||
                                  machine.machineName
                              );
                            }}
                            className="block h-12 w-12 flex-shrink-0 overflow-hidden rounded border border-gray-200 transition-opacity hover:opacity-80"
                          >
                            <img
                              src={machine.imageData}
                              alt={machine.machineName}
                              className="h-full w-full object-cover"
                            />
                          </button>
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded border border-gray-200 bg-gray-100 text-xs text-gray-400">
                            —
                          </div>
                        )}
                      </td>

                      {/* Machine name */}
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() =>
                            router.push(`/cabinets/${machine.machineId}`)
                          }
                          className="cursor-pointer font-medium text-gray-900 decoration-gray-300 transition-colors hover:text-black hover:underline"
                        >
                          {machine.machineCustomName || machine.machineName}
                        </button>
                      </td>

                      {/* Serial */}
                      <td className="px-3 py-3 text-gray-600">
                        {machine.serialNumber || '—'}
                      </td>

                      {/* Sys In */}
                      <td className="px-3 py-3 text-right font-medium text-gray-900 tabular-nums">
                        {formatNum(machine.systemMetersIn)}
                      </td>

                      {/* Sys Out */}
                      <td className="px-3 py-3 text-right font-medium text-gray-900 tabular-nums">
                        {formatNum(machine.systemMetersOut)}
                      </td>

                      {/* Match */}
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${match.className}`}
                        >
                          {match.label}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3">
                        <StatusBadge status={machine.status} />
                      </td>

                      {/* Captured At */}
                      <td className="whitespace-nowrap px-3 py-3 text-xs text-gray-500">
                        {formatTime(
                          machine.createdAt || machine.updatedAt
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 lg:hidden">
            {paginated.map(machine => {
              const match = metersMatchLabel(machine.metersMatch);
              return (
                <div
                  key={machine.reportedMachineId}
                  className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                >
                  {/* Header row */}
                  <div className="mb-3 flex items-start gap-3">
                    {machine.imageData ? (
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoPreviewUrl(machine.imageData || null);
                          setPhotoPreviewName(
                            machine.machineCustomName || machine.machineName
                          );
                        }}
                        className="h-12 w-12 flex-shrink-0 overflow-hidden rounded border border-gray-200"
                      >
                        <img
                          src={machine.imageData}
                          alt={machine.machineName}
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ) : (
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded border border-gray-200 bg-gray-100 text-xs text-gray-400">
                        —
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() =>
                          router.push(`/cabinets/${machine.machineId}`)
                        }
                        className="cursor-pointer font-medium text-gray-900 decoration-gray-300 transition-colors hover:text-black hover:underline"
                      >
                        {machine.machineCustomName || machine.machineName}
                      </button>
                      {machine.serialNumber && (
                        <p className="text-xs text-gray-500">
                          {machine.serialNumber}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={machine.status} />
                  </div>

                  {/* Data grid */}
                  <div className="grid grid-cols-2 gap-y-2 text-sm">
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                        Sys In
                      </p>
                      <p className="mt-0.5 font-medium text-gray-900 tabular-nums">
                        {formatNum(machine.systemMetersIn)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                        Sys Out
                      </p>
                      <p className="mt-0.5 font-medium text-gray-900 tabular-nums">
                        {formatNum(machine.systemMetersOut)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                        Match
                      </p>
                      <span
                        className={`mt-0.5 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${match.className}`}
                      >
                        {match.label}
                      </span>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                        Captured
                      </p>
                      <p className="mt-0.5 font-medium text-gray-600">
                        {formatTime(
                          machine.createdAt || machine.updatedAt
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-2 py-4">
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              First
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              Prev
            </button>
            <div className="flex items-center gap-1 px-2">
              <span className="text-sm text-gray-500">Page</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={currentPage}
                onChange={e => {
                  const page = Math.max(1, Math.min(totalPages, Number(e.target.value) || 1));
                  setCurrentPage(page);
                }}
                className="w-12 rounded border border-gray-300 p-1 text-center text-sm focus:border-blue-500 focus:outline-none"
              />
              <span className="text-sm text-gray-500">of {totalPages}</span>
            </div>
            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              Next
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              Last
            </button>
          </div>
        </>
      )}

      {/* Photo preview modal */}
      {photoPreviewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPhotoPreviewUrl(null)}
        >
          <div
            className="relative max-w-2xl"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPhotoPreviewUrl(null)}
              className="absolute -right-3 -top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md hover:bg-gray-100"
            >
              <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={photoPreviewUrl}
              alt={photoPreviewName}
              className="max-h-[80vh] rounded-lg object-contain shadow-2xl"
            />
            <p className="mt-2 text-center text-sm text-white/70">
              {photoPreviewName}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
