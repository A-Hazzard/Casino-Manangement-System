'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type ReportedMachineMovement = {
  manualMetersIn?: number;
  manualMetersOut?: number;
  machineGross?: number;
};

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
  // SAS lifetime meters read from the machine
  sasMetersIn: number | null;
  sasMetersOut: number | null;
  sasGross?: number;
  // Manual meters entered by the collector (metersMatch === false)
  manualMetersIn?: number;
  manualMetersOut?: number;
  // Previous SAS meter readings (from last submitted session for this machine)
  prevSasMetersIn?: number;
  prevSasMetersOut?: number;
  // Movement delta (manual meters - previous sas meters)
  movement?: ReportedMachineMovement;
  sasStartTime?: string;
  sasEndTime?: string;
  sessionStartTime?: string;
  sessionEndTime?: string;
  imageData?: string;
  metersMatch?: boolean;
  machineGross?: number;
  grossDifference?: number;
  createdAt?: string;
  updatedAt?: string;
};

type MachinesTabProps = {
  machines: SessionMachine[];
  noSMIBLocation?: boolean;
};

type SortField =
  | 'machineName'
  | 'lifetimeMachineIn'
  | 'lifetimeMachineOut'
  | 'lifetimeSasIn'
  | 'lifetimeSasGross'
  | 'movementMachineIn'
  | 'movementMachineOut'
  | 'movementMachineGross'
  | 'variation';

const ITEMS_PER_PAGE = 20;

export default function CollectionReportV2SessionReportMachinesTab({
  machines,
  noSMIBLocation,
}: MachinesTabProps) {
  // ============================================================================
  // State & Hooks
  // ============================================================================
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('machineName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoPreviewName, setPhotoPreviewName] = useState('');

  // ============================================================================
  // Handlers
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
  // Computed
  // ============================================================================

  const filtered = (() => {
    if (!searchTerm.trim()) return machines;

    const term = searchTerm.toLowerCase();
    return machines.filter(machine => {
      const name = (
        machine.machineCustomName ||
        machine.machineName ||
        ''
      ).toLowerCase();
      const serial = (machine.serialNumber || '').toLowerCase();
      return name.includes(term) || serial.includes(term);
    });
  })();

  const sorted = (() => {
    const list = [...filtered];
    list.sort((a, b) => {
      let cmp = 0;

      // Lifetime machine values: prefer manual for noSMIB, sas for SMIB metersMatch
      const lifetimeMachineInA = a.manualMetersIn ?? a.sasMetersIn ?? 0;
      const lifetimeMachineInB = b.manualMetersIn ?? b.sasMetersIn ?? 0;
      const lifetimeMachineOutA = a.manualMetersOut ?? a.sasMetersOut ?? 0;
      const lifetimeMachineOutB = b.manualMetersOut ?? b.sasMetersOut ?? 0;

      switch (sortField) {
        case 'machineName': {
          const nameA = (
            a.machineCustomName ||
            a.machineName ||
            ''
          ).toLowerCase();
          const nameB = (
            b.machineCustomName ||
            b.machineName ||
            ''
          ).toLowerCase();
          cmp = nameA.localeCompare(nameB);
          break;
        }
        case 'lifetimeMachineIn':
          cmp = lifetimeMachineInA - lifetimeMachineInB;
          break;
        case 'lifetimeMachineOut':
          cmp = lifetimeMachineOutA - lifetimeMachineOutB;
          break;
        case 'lifetimeSasIn':
          cmp = (a.sasMetersIn ?? 0) - (b.sasMetersIn ?? 0);
          break;
        case 'lifetimeSasGross':
          cmp = (a.sasGross ?? 0) - (b.sasGross ?? 0);
          break;
        case 'movementMachineIn':
          cmp =
            (a.movement?.manualMetersIn ?? 0) -
            (b.movement?.manualMetersIn ?? 0);
          break;
        case 'movementMachineOut':
          cmp =
            (a.movement?.manualMetersOut ?? 0) -
            (b.movement?.manualMetersOut ?? 0);
          break;
        case 'movementMachineGross':
          cmp =
            (a.movement?.machineGross ?? 0) - (b.movement?.machineGross ?? 0);
          break;
        case 'variation':
          cmp = (a.grossDifference ?? 0) - (b.grossDifference ?? 0);
          break;
      }

      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return list;
  })();

  const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE) || 1;

  const paginated = (() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sorted.slice(start, start + ITEMS_PER_PAGE);
  })();

  (() => {
    if (currentPage > Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1) {
      setCurrentPage(1);
    }
  })();

  // ============================================================================
  // Helpers
  // ============================================================================

  const formatNum = (value: number | null) =>
    value != null ? value.toLocaleString() : 'N/A';

  const formatDateTime = (iso: string | undefined): string => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return '—';
    }
  };

  // ============================================================================
  // Sort Icon
  // ============================================================================

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <span className="ml-1 inline-block text-xs text-gray-300">⇅</span>;
    }
    return (
      <span className="ml-1 inline-block text-xs text-blue-500">
        {sortDirection === 'asc' ? '▲' : '▼'}
      </span>
    );
  };

  // ============================================================================
  // Sortable Header
  // ============================================================================

  const SortableHeader = ({
    label,
    field,
    align = 'left',
  }: {
    label: string;
    field: SortField;
    align?: 'left' | 'right';
  }) => (
    <th
      onClick={() => handleSort(field)}
      className={`cursor-pointer border-r border-gray-100 px-3 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 transition-colors last:border-r-0 hover:text-blue-600 ${align === 'right' ? 'text-right' : 'text-left'}`}
    >
      {label}
      <SortIcon field={field} />
    </th>
  );

  // ============================================================================
  // Machine Subtext (serial · game)
  // ============================================================================

  const MachineSubtext = ({ machine }: { machine: SessionMachine }) => {
    const parts = [machine.serialNumber, machine.game].filter(Boolean);
    if (parts.length === 0) return null;
    return <p className="text-xs text-gray-500">{parts.join(' · ')}</p>;
  };

  // ============================================================================
  // Match Icon
  // ============================================================================

  const MatchIcon = ({ machine }: { machine: SessionMachine }) => {
    if (machine.metersMatch === true) {
      return (
        <span
          className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-500 text-[10px] text-white shadow-sm"
          title="Meters match"
        >
          ✓
        </span>
      );
    }
    if (machine.metersMatch === false) {
      return (
        <span
          className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-red-500 text-[10px] text-white shadow-sm"
          title="Manual entry"
        >
          ✗
        </span>
      );
    }
    return (
      <span
        className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gray-300 text-[10px] text-white shadow-sm"
        title="Not captured"
      >
        —
      </span>
    );
  };

  // ============================================================================
  // Photo Thumbnail
  // ============================================================================

  const PhotoThumbnail = ({
    machine,
    onPhotoClick,
  }: {
    machine: SessionMachine;
    onPhotoClick: () => void;
  }) => {
    if (machine.imageData) {
      return (
        <button
          type="button"
          onClick={onPhotoClick}
          className="block h-12 w-12 flex-shrink-0 overflow-hidden rounded border border-gray-200 transition-opacity hover:opacity-80"
        >
          <img
            src={machine.imageData}
            alt={machine.machineName}
            className="h-full w-full object-cover"
          />
        </button>
      );
    }
    return (
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded border border-gray-200 bg-gray-100 text-xs text-gray-400">
        —
      </div>
    );
  };

  // ============================================================================
  // SAS Times Cell (desktop)
  // ============================================================================

  const SasTimesCell = ({ machine }: { machine: SessionMachine }) => {
    const startStr = formatDateTime(machine.sasStartTime);
    const endStr = formatDateTime(machine.sasEndTime);
    const hasBoth = startStr === '—' && endStr === '—';

    if (hasBoth) {
      return (
        <td className="border-r border-gray-100 px-3 py-3 last:border-r-0">
          <span className="text-xs text-gray-400">—</span>
        </td>
      );
    }

    return (
      <td className="border-r border-gray-100 px-3 py-3 last:border-r-0">
        <div className="space-y-1">
          <p className="whitespace-nowrap text-xs text-gray-500">{startStr}</p>
          <p className="whitespace-nowrap text-xs text-gray-500">{endStr}</p>
        </div>
      </td>
    );
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold text-gray-900 lg:hidden">Machines</h2>
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
          {/* ================================================================
              Desktop table
          ================================================================ */}
          <div className="hidden overflow-x-auto rounded-xl bg-white shadow-sm lg:block">
            <table className="w-full border-collapse border border-gray-200 text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {/* Col 1 — Photo */}
                  <th className="w-20 border-b border-r border-gray-100 px-3 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 last:border-r-0">
                    Photo
                  </th>

                  {/* Col 2 — Machine */}
                  <SortableHeader label="Machine" field="machineName" />

                  {/* Col 3 — Lifetime Machine In/Out */}
                  <SortableHeader
                    label="Lifetime Machine In/Out"
                    field="lifetimeMachineIn"
                    align="right"
                  />
                  {/* Col 4 — Movement Machine In/Out */}
                  <SortableHeader
                    label="Movement Machine In/Out"
                    field="movementMachineIn"
                    align="right"
                  />
                  {/* Cols 5-6 — SAS columns, merged for noSMIB */}
                  <SortableHeader
                    label="Lifetime SAS In/Out"
                    field="lifetimeSasIn"
                    align="right"
                  />
                  <SortableHeader
                    label="Lifetime SAS Gross"
                    field="lifetimeSasGross"
                    align="right"
                  />

                  {/* Col 7 — Movement Gross */}
                  <SortableHeader
                    label="Movement Gross"
                    field="movementMachineGross"
                    align="right"
                  />

                  {/* Col 8 — Variation */}
                  <SortableHeader
                    label="Variation"
                    field="variation"
                    align="right"
                  />

                  {/* Last col — SAS Times (always shown) */}
                  <th className="border-b border-r border-gray-100 px-3 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 last:border-r-0">
                    SAS Times
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(machine => {
                  // Lifetime machine values: manual meters are the primary source for
                  // both noSMIB and SMIB-manual-entry. For SMIB metersMatch, sasMetersIn
                  // equals the confirmed reading but manualMetersIn is also set to it.
                  const lifetimeMachineIn =
                    machine.manualMetersIn ?? machine.sasMetersIn ?? null;
                  const lifetimeMachineOut =
                    machine.manualMetersOut ?? machine.sasMetersOut ?? null;
                  // SAS values are null for noSMIB — show N/A rather than 0
                  const lifetimeSasIn = machine.sasMetersIn;
                  const lifetimeSasOut = machine.sasMetersOut;
                  const lifetimeSasGross = machine.sasGross ?? null;

                  return (
                    <tr
                      key={machine.reportedMachineId}
                      className="border-b border-gray-100 transition-colors last:border-b-0 hover:bg-gray-50/80"
                    >
                      {/* Col 1 — Photo */}
                      <td className="border-r border-gray-100 px-3 py-3 last:border-r-0">
                        <PhotoThumbnail
                          machine={machine}
                          onPhotoClick={() => {
                            setPhotoPreviewUrl(machine.imageData || null);
                            setPhotoPreviewName(
                              machine.machineCustomName || machine.machineName
                            );
                          }}
                        />
                      </td>

                      {/* Col 2 — Machine name + subtext */}
                      <td className="border-r border-gray-100 px-3 py-3 last:border-r-0">
                        <div className="flex items-center gap-2">
                          <MatchIcon machine={machine} />
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() =>
                                router.push(`/cabinets/${machine.machineId}`)
                              }
                              className="cursor-pointer font-medium text-gray-900 decoration-gray-300 transition-colors hover:text-black hover:underline"
                            >
                              {machine.machineCustomName || machine.machineName}
                            </button>
                            <MachineSubtext machine={machine} />
                          </div>
                        </div>
                      </td>

                      {/* Col 3 — Lifetime Machine In/Out */}
                      <td className="whitespace-nowrap border-r border-gray-100 px-3 py-3 text-right font-medium tabular-nums text-gray-900 last:border-r-0">
                        {formatNum(lifetimeMachineIn)}/{formatNum(lifetimeMachineOut)}
                      </td>

                      {/* Col 4 — Movement Machine In/Out */}
                      <td className="whitespace-nowrap border-r border-gray-100 px-3 py-3 text-right font-medium tabular-nums text-gray-700 last:border-r-0">
                        {formatNum(machine.movement?.manualMetersIn ?? null)}/{formatNum(machine.movement?.manualMetersOut ?? null)}
                      </td>

                      {/* Cols 5-6 — SAS: merged for noSMIB, separate for SMIB */}
                      {noSMIBLocation ? (
                        <td
                          colSpan={2}
                          className="border-r border-gray-100 px-3 py-3 text-center font-medium italic text-gray-400 last:border-r-0"
                        >
                          No SMIBs for this Location
                        </td>
                      ) : (
                        <>
                          {/* Col 5 — Lifetime SAS In/Out */}
                          <td className="whitespace-nowrap border-r border-gray-100 px-3 py-3 text-right font-medium tabular-nums text-gray-600 last:border-r-0">
                            {formatNum(lifetimeSasIn)}/{formatNum(lifetimeSasOut)}
                          </td>

                          {/* Col 6 — Lifetime SAS Gross */}
                          <td className="whitespace-nowrap border-r border-gray-100 px-3 py-3 text-right font-medium tabular-nums text-gray-600 last:border-r-0">
                            {formatNum(lifetimeSasGross)}
                          </td>
                        </>
                      )}

                      {/* Col 7 — Movement Gross */}
                      <td className="whitespace-nowrap border-r border-gray-100 px-3 py-3 text-right font-medium tabular-nums text-gray-700 last:border-r-0">
                        {formatNum(machine.movement?.machineGross ?? null)}
                      </td>

                      {/* Col 8 — Variation */}
                      {noSMIBLocation ? (
                        <td className="whitespace-nowrap border-r border-gray-100 px-3 py-3 text-right font-medium text-gray-400 last:border-r-0">
                          —
                        </td>
                      ) : (
                        <td
                          className={`whitespace-nowrap border-r border-gray-100 px-3 py-3 text-right font-semibold tabular-nums last:border-r-0 ${
                            machine.grossDifference !== null &&
                            machine.grossDifference !== undefined &&
                            machine.grossDifference !== 0
                              ? 'text-red-600'
                              : 'text-gray-900'
                          }`}
                        >
                          {formatNum(machine.grossDifference ?? null)}
                        </td>
                      )}

                      {/* Col 9 — SAS Times */}
                      <SasTimesCell machine={machine} />
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ================================================================
              Mobile cards
          ================================================================ */}
          <div className="space-y-3 lg:hidden">
            {paginated.map(machine => {
              const lifetimeMachineIn =
                machine.manualMetersIn ?? machine.sasMetersIn ?? null;
              const lifetimeMachineOut =
                machine.manualMetersOut ?? machine.sasMetersOut ?? null;
              const lifetimeSasGross = machine.sasGross ?? null;
              const startStr = formatDateTime(machine.sasStartTime);
              const endStr = formatDateTime(machine.sasEndTime);

              return (
                <div
                  key={machine.reportedMachineId}
                  className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                >
                  {/* Card header — photo + match icon + name + subtext */}
                  <div className="mb-3 flex items-start gap-3">
                    <PhotoThumbnail
                      machine={machine}
                      onPhotoClick={() => {
                        setPhotoPreviewUrl(machine.imageData || null);
                        setPhotoPreviewName(
                          machine.machineCustomName || machine.machineName
                        );
                      }}
                    />
                    <div className="flex min-w-0 flex-1 items-start gap-2">
                      <MatchIcon machine={machine} />
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() =>
                            router.push(`/cabinets/${machine.machineId}`)
                          }
                          className="cursor-pointer font-medium text-gray-900 decoration-gray-300 transition-colors hover:text-black hover:underline"
                        >
                          {machine.machineCustomName || machine.machineName}
                        </button>
                        <MachineSubtext machine={machine} />
                      </div>
                    </div>
                  </div>

                  {/* Data grid */}
                  <div className="grid grid-cols-2 gap-y-2 text-sm">
                    {/* Lifetime Machine In/Out */}
                    <div className="col-span-2">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                        Lifetime Machine In/Out
                      </p>
                      <p className="mt-0.5 font-medium tabular-nums text-gray-900">
                        {formatNum(lifetimeMachineIn)}/{formatNum(lifetimeMachineOut)}
                      </p>
                    </div>

                    {/* Movement Machine In/Out */}
                    <div className="col-span-2">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                        Movement Machine In/Out
                      </p>
                      <p className="mt-0.5 font-medium tabular-nums text-gray-700">
                        {formatNum(machine.movement?.manualMetersIn ?? null)}/{formatNum(machine.movement?.manualMetersOut ?? null)}
                      </p>
                    </div>

                    {/* SAS section — merged for noSMIB */}
                    {noSMIBLocation ? (
                      <div className="col-span-2">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                          SAS
                        </p>
                        <p className="mt-0.5 font-normal italic text-gray-400">
                          No SMIBs for this Location
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Lifetime SAS In/Out */}
                        <div className="col-span-2">
                          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                            Lifetime SAS In/Out
                          </p>
                          <p className="mt-0.5 font-medium tabular-nums text-gray-600">
                            {formatNum(machine.sasMetersIn)}/{formatNum(machine.sasMetersOut)}
                          </p>
                        </div>
                      </>
                    )}

                    {/* Movement Gross + Lifetime SAS Gross side-by-side */}
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                        Movement Gross
                      </p>
                      <p className="mt-0.5 font-medium tabular-nums text-gray-700">
                        {formatNum(machine.movement?.machineGross ?? null)}
                      </p>
                    </div>
                    {!noSMIBLocation ? (
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                          Lifetime SAS Gross
                        </p>
                        <p className="mt-0.5 font-medium tabular-nums text-gray-600">
                          {formatNum(lifetimeSasGross)}
                        </p>
                      </div>
                    ) : (
                      <div />
                    )}

                    {/* Variation at the end */}
                    {!noSMIBLocation ? (
                      <div className="col-span-2">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                          Variation
                        </p>
                        <p
                          className={`mt-0.5 font-semibold tabular-nums ${
                            machine.grossDifference !== null &&
                            machine.grossDifference !== undefined &&
                            machine.grossDifference !== 0
                              ? 'text-red-600'
                              : 'text-gray-900'
                          }`}
                        >
                          {formatNum(machine.grossDifference ?? null)}
                        </p>
                      </div>
                    ) : (
                      <div className="col-span-2">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                          Variation
                        </p>
                        <p className="mt-0.5 font-normal italic text-gray-400">
                          —
                        </p>
                      </div>
                    )}

                    {/* SAS Times — col-span-2, border-top section */}
                    <div className="col-span-2 border-t border-gray-100 pt-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                            Start Time
                          </p>
                          <p className="mt-0.5 whitespace-nowrap text-xs text-gray-500">
                            {startStr}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                            End Time
                          </p>
                          <p className="mt-0.5 whitespace-nowrap text-xs text-gray-500">
                            {endStr}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ================================================================
              Pagination
          ================================================================ */}
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
                  const page = Math.max(
                    1,
                    Math.min(totalPages, Number(e.target.value) || 1)
                  );
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

      {/* ================================================================
          Photo preview modal
      ================================================================ */}
      {photoPreviewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPhotoPreviewUrl(null)}
        >
          <div
            className="relative inline-block"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPhotoPreviewUrl(null)}
              className="absolute -right-3 -top-3 z-50 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md hover:bg-gray-100"
            >
              <svg
                className="h-4 w-4 text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
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
