'use client';

import Link from 'next/link';
import type { V2Session } from '@/lib/hooks/collectionReport/useCollectionReportV2Data';
import { formatDate } from '@/lib/utils/date/formatting';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { getGrossColorClass } from '@/lib/utils/financial';
import CollectionReportV2SessionsSkeleton from '@/components/ui/skeletons/CollectionReportV2SessionsSkeleton';

type V2MobileProps = {
  sessions: V2Session[];
  loading: boolean;
  isRefreshing?: boolean;
  canManage?: boolean;
  onViewSession?: (sessionId: string) => void;
  onEditSession?: (sessionId: string) => void;
  onSubmitSession?: (sessionId: string) => void;
  onDeleteSession?: (sessionId: string) => void;
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
      <div className="absolute bottom-full left-0 z-50 mb-1 hidden w-max max-w-xs rounded bg-gray-800 px-3 py-2 text-xs text-white shadow-lg group-hover:block">
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

function SessionCard({
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

  return (
    <div className="transform overflow-hidden rounded-lg bg-white shadow-sm transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-md">
      {/* Header Section */}
      <div className="bg-lighterBlueHighlight px-4 py-3 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {showBulkSelection && (
              <input
                type="checkbox"
                className="h-4 w-4 cursor-pointer rounded border-gray-300 text-button focus:ring-button"
                checked={selectedSessions?.has(session.sessionId) ?? false}
                onChange={e =>
                  onSessionSelectionChange?.(session.sessionId, e.target.checked)
                }
              />
            )}
            <span className="font-semibold">Session:</span>
            <Link
              href={`/locations/${session.locationId}`}
              className="border-b border-dotted border-white/50 hover:underline"
            >
              {session.locationName}
            </Link>
          </div>
        </div>
        <div className="mt-1 text-xs text-blue-100">
          <span>Collector: </span>
          <CollectorHover session={session} />
        </div>
      </div>

      {/* Content Section */}
      <div className="flex flex-col gap-3 p-4">
        {/* Status Badge */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Status</span>
          <span className="rounded bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
            {session.sessionStatus === 'in-progress'
              ? 'In Progress'
              : 'Completed'}
          </span>
        </div>

        {/* Stats Fields */}
        <div className="flex justify-between">
          <span className="text-sm font-medium text-gray-700">
            Machines Matched
          </span>
          <span className="text-sm font-semibold text-green-700">
            {session.machinesConfirmed}/{session.machinesTotal}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-sm font-medium text-gray-700">
            Machine Gross
          </span>
          <span
            className={`text-sm font-semibold ${getGrossColorClass(session.totalMachineGross)}`}
          >
            {formatGross(session.totalMachineGross)}
          </span>
        </div>

        {session.noSMIBLocation ? (
          <div className="flex flex-col items-center justify-center border-y border-gray-50 py-2">
            <span className="text-center text-sm font-normal italic text-gray-500">
              No SMIBs for this Location
            </span>
          </div>
        ) : (
          <>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-700">
                SAS Gross
              </span>
              <span
                className={`text-sm font-semibold ${getGrossColorClass(session.totalSasGross)}`}
              >
                {formatGross(session.totalSasGross)}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-700">
                Variation
              </span>
              <span
                className={`text-sm font-semibold ${getGrossColorClass(session.totalMachineGross === 0 ? 0 : session.totalGrossDifference)}`}
              >
                {formatGross(
                  session.totalMachineGross === 0
                    ? 0
                    : session.totalGrossDifference
                )}
              </span>
            </div>
          </>
        )}

        <div className="flex justify-between border-t border-gray-100 pt-3">
          <span className="text-sm font-medium text-gray-700">
            Date Created
          </span>
          <span className="text-sm font-semibold text-gray-900">
            {formatDate(session.createdAt)}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onViewSession?.(session.sessionId)}
              className="flex-1 rounded border border-button bg-white px-3 py-2 text-xs font-medium text-button transition-colors hover:bg-button hover:text-white"
            >
              View Details
            </button>
            {session.sessionStatus === 'in-progress' && (
              <button
                type="button"
                onClick={() => onSubmitSession?.(session.sessionId)}
                className="flex-1 rounded border border-green-600 bg-white px-3 py-2 text-xs font-medium text-green-600 transition-colors hover:bg-green-600 hover:text-white"
              >
                Submit
              </button>
            )}
          </div>
          {canManage && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onEditSession?.(session.sessionId)}
                className="flex-1 rounded border border-blue-600 bg-white px-3 py-2 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-600 hover:text-white"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => onDeleteSession?.(session.sessionId)}
                className="flex-1 rounded border border-red-600 bg-white px-3 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-600 hover:text-white"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CollectionReportV2Mobile({
  sessions,
  loading,
  canManage,
  onViewSession,
  onEditSession,
  onSubmitSession,
  onDeleteSession,
  isRefreshing,
  selectedSessions,
  onSessionSelectionChange,
  showBulkSelection = false,
}: V2MobileProps) {
  // ============================================================================
  // Render
  // ============================================================================
  if ((loading && sessions.length === 0) || isRefreshing) {
    return <CollectionReportV2SessionsSkeleton />;
  }

  if (!loading && !isRefreshing && sessions.length === 0) {
    return (
      <div className="md:hidden">
        <div className="flex flex-col items-center justify-center rounded-lg bg-container p-8 shadow-md">
          <div className="mb-2 text-lg text-gray-500">No Data Available</div>
          <div className="text-center text-sm text-gray-400">
            No capture sessions found.
          </div>
        </div>
      </div>
    );
  }

  const selectedCount = showBulkSelection
    ? selectedSessions?.size ?? 0
    : 0;

  const allVisibleSelected =
    sessions.length > 0 &&
    sessions.every(s => selectedSessions?.has(s.sessionId));

  return (
    <div className="space-y-4 md:hidden">
      {showBulkSelection && (
        <div className="flex items-center justify-between rounded-lg bg-blue-50 px-4 py-2">
          <label className="flex items-center gap-2 text-sm text-blue-700">
            <input
              type="checkbox"
              className="h-4 w-4 cursor-pointer rounded border-gray-300 text-button focus:ring-button"
              checked={allVisibleSelected}
              onChange={e =>
                onSessionSelectionChange?.('__select_all__', e.target.checked)
              }
            />
            {selectedCount > 0
              ? `${selectedCount} selected`
              : 'Select all'}
          </label>
        </div>
      )}
      {sessions.map(session => (
        <SessionCard
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
    </div>
  );
}
