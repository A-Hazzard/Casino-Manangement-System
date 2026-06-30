'use client';

import Link from 'next/link';
import type { V2Session } from '@/lib/hooks/collectionReport/useCollectionReportV2Data';
import { formatDate } from '@/lib/utils/date/formatting';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shared/ui/table';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { getGrossColorClass } from '@/lib/utils/financial';
import CollectionReportV2SessionsSkeleton from '@/components/ui/skeletons/CollectionReportV2SessionsSkeleton';
import { Fragment } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

type V2DesktopProps = {
  sessions: V2Session[];
  loading: boolean;
  isRefreshing?: boolean;
  canManage?: boolean;
  onViewSession?: (sessionId: string) => void;
  onEditSession?: (sessionId: string) => void;
  onSubmitSession?: (sessionId: string) => void;
  onDeleteSession?: (sessionId: string) => void;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (field: string) => void;
  selectedSessions?: Set<string>;
  onSessionSelectionChange?: (sessionId: string, checked: boolean) => void;
  showBulkSelection?: boolean;
};

function CollectorHover({ session }: { session: V2Session }) {
  const name = session.collectorName || session.collector;
  const hasDetails = session.collectorEmail || session.collectorFirstName;

  if (!hasDetails) {
    return <span>{name}</span>;
  }

  return (
    <div className="group relative">
      <span className="cursor-help border-b border-dotted border-gray-400">
        {name}
      </span>
      <div className="absolute left-0 top-full z-50 mt-1 hidden w-max max-w-xs rounded bg-gray-800 px-3 py-2 text-xs text-white shadow-lg group-hover:block">
        <div className="space-y-1">
          {(session.collectorFirstName || session.collectorLastName) && (
            <div className="font-semibold">
              {[session.collectorFirstName, session.collectorLastName]
                .filter(Boolean)
                .join(' ')}
            </div>
          )}
          {session.collector && (
            <div className="text-gray-300">ID: {session.collector}</div>
          )}
          {session.collectorEmail && (
            <div className="text-gray-300">{session.collectorEmail}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function SessionRow({
  session,
  canManage,
  onViewSession,
  onEditSession,
  onSubmitSession,
  onDeleteSession,
  selectedSessions,
  onSessionSelectionChange,
  showBulkSelection,
}: {
  session: V2Session;
  canManage?: boolean;
  onViewSession?: (sessionId: string) => void;
  onEditSession?: (sessionId: string) => void;
  onSubmitSession?: (sessionId: string) => void;
  onDeleteSession?: (sessionId: string) => void;
  selectedSessions?: Set<string>;
  onSessionSelectionChange?: (sessionId: string, checked: boolean) => void;
  showBulkSelection?: boolean;
}) {
  const { formatAmount } = useCurrencyFormat();

  const formatGross = (value: number) => {
    if (value === 0) return '$0.00';
    return formatAmount(value);
  };

  // ============================================================================
  // Computed
  // ============================================================================
  const displayVariation =
    session.totalMachineGross === 0 ? 0 : session.totalGrossDifference;

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <TableRow className="hover:bg-lighterGreenHighlight">
      {showBulkSelection && (
        <TableCell centered={false} isFirstColumn={true} className="w-10 px-2">
          <input
            type="checkbox"
            className="h-4 w-4 cursor-pointer rounded border-gray-300 text-button focus:ring-button"
            checked={selectedSessions?.has(session.sessionId) ?? false}
            onChange={e =>
              onSessionSelectionChange?.(session.sessionId, e.target.checked)
            }
          />
        </TableCell>
      )}
      <TableCell centered={false} isFirstColumn={!showBulkSelection}>
        <Link
          href={`/locations/${session.locationId}`}
          className="text-buttonActive hover:underline"
        >
          {session.locationName}
        </Link>
      </TableCell>
      <TableCell centered={false}>
        <CollectorHover session={session} />
      </TableCell>
      <TableCell centered={true}>
        <span className="font-medium text-green-600">
          {session.machinesConfirmed}/{session.machinesTotal}
        </span>
      </TableCell>
      <TableCell centered={true}>
        <span
          className={`font-semibold ${getGrossColorClass(session.totalMachineGross)}`}
        >
          {formatGross(session.totalMachineGross)}
        </span>
      </TableCell>
      {session.noSMIBLocation ? (
        <TableCell centered={true} colSpan={2}>
          <span className="text-xs font-medium italic text-gray-500">
            No SMIBs for this Location
          </span>
        </TableCell>
      ) : (
        <>
          <TableCell centered={true}>
            <span
              className={`font-semibold ${getGrossColorClass(session.totalSasGross)}`}
            >
              {formatGross(session.totalSasGross)}
            </span>
          </TableCell>
          <TableCell centered={true}>
            <span
              className={`font-semibold ${getGrossColorClass(displayVariation)}`}
            >
              {formatGross(displayVariation)}
            </span>
          </TableCell>
        </>
      )}
      <TableCell centered={true} className="whitespace-nowrap text-gray-500">
        {formatDate(session.createdAt)}
      </TableCell>
      <TableCell centered={true}>
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => onViewSession?.(session.sessionId)}
            className="rounded bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
          >
            View
          </button>
          {session.sessionStatus === 'in-progress' && (
            <button
              type="button"
              onClick={() => onSubmitSession?.(session.sessionId)}
              className="rounded bg-green-50 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-100"
            >
              Submit
            </button>
          )}
          {canManage && (
            <>
              <button
                type="button"
                onClick={() => onEditSession?.(session.sessionId)}
                className="rounded p-1.5 text-blue-600 hover:bg-blue-100"
                title="Edit session"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => onDeleteSession?.(session.sessionId)}
                className="rounded p-1.5 text-red-600 hover:bg-red-100"
                title="Delete session"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

const HEADERS = [
  {
    key: 'location',
    label: 'LOCATION',
    centered: false,
    isFirst: true,
    sortable: true,
  },
  { key: 'collector', label: 'COLLECTOR', centered: false, sortable: true },
  { key: 'matched', label: 'MATCHED', centered: true, sortable: true },
  {
    key: 'machineGross',
    label: 'MACHINE GROSS',
    centered: true,
    sortable: true,
  },
  { key: 'sasGross', label: 'SAS GROSS', centered: true, sortable: true },
  { key: 'variation', label: 'VARIATION', centered: true, sortable: true },
  { key: 'created', label: 'CREATED', centered: true, sortable: true },
  { key: 'actions', label: 'ACTIONS', centered: true, sortable: false },
];

export default function CollectionReportV2Desktop({
  sessions,
  loading,
  canManage,
  onViewSession,
  onEditSession,
  onSubmitSession,
  onDeleteSession,
  sortField,
  sortDirection,
  onSort,
  isRefreshing,
  selectedSessions,
  onSessionSelectionChange,
  showBulkSelection = false,
}: V2DesktopProps) {
  const selectedCount = showBulkSelection
    ? selectedSessions?.size ?? 0
    : 0;

  // ============================================================================
  // Render
  // ============================================================================
  if ((loading && sessions.length === 0) || isRefreshing) {
    return <CollectionReportV2SessionsSkeleton />;
  }

  if (!loading && !isRefreshing && sessions.length === 0) {
    return (
      <div className="hidden md:block">
        <div className="flex flex-col items-center justify-center rounded-lg bg-container p-8 shadow-md">
          <div className="mb-2 text-lg text-gray-500">No Data Available</div>
          <div className="text-center text-sm text-gray-400">
            No capture sessions found.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="hidden w-full min-w-0 overflow-x-auto bg-white shadow md:block">
      {showBulkSelection && selectedCount > 0 && (
        <div className="flex items-center justify-between bg-blue-50 px-4 py-2">
          <span className="text-sm text-blue-700">
            {selectedCount} session{selectedCount !== 1 ? 's' : ''} selected
          </span>
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow className="bg-button hover:bg-button">
            {showBulkSelection && (
              <TableHead
                centered={false}
                isFirstColumn={true}
                className="w-10 px-2 font-semibold text-white"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 cursor-pointer rounded border-gray-300 text-button focus:ring-button"
                  checked={
                    sessions.length > 0 &&
                    sessions.every(s => selectedSessions?.has(s.sessionId))
                  }
                  onChange={e =>
                    onSessionSelectionChange &&
                    onSessionSelectionChange(
                      '__select_all__',
                      e.target.checked
                    )
                  }
                />
              </TableHead>
            )}
            {HEADERS.map(header => {
              const isActive = sortField === header.key;
              const isSortable = header.sortable;
              return (
                <Fragment key={header.key}>
                  <TableHead
                    centered={header.centered}
                    isFirstColumn={header.isFirst ?? false}
                    className={`font-semibold text-white ${
                      isSortable
                        ? 'cursor-pointer select-none hover:bg-button/80'
                        : ''
                    }`}
                    onClick={
                      isSortable ? () => onSort?.(header.key) : undefined
                    }
                  >
                    <div
                      className={`flex items-center gap-1 ${
                        header.centered ? 'justify-center' : ''
                      }`}
                    >
                      {header.label}
                      {isSortable &&
                        isActive &&
                        (sortDirection === 'asc' ? (
                          <ChevronUp className="h-4 w-4 shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 shrink-0" />
                        ))}
                    </div>
                  </TableHead>
                </Fragment>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
           {sessions.map(session => (
              <SessionRow
                key={session.sessionId}
                session={session}
                canManage={canManage}
                onViewSession={onViewSession}
                onEditSession={onEditSession}
                onSubmitSession={onSubmitSession}
                onDeleteSession={onDeleteSession}
                selectedSessions={selectedSessions}
                onSessionSelectionChange={onSessionSelectionChange}
                showBulkSelection={showBulkSelection}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
