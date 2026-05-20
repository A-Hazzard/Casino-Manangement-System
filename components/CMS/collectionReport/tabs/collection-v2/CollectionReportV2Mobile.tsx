'use client';

import Link from 'next/link';
import type { V2Session } from '@/lib/hooks/collectionReport/useCollectionReportV2Data';
import { formatDate } from '@/lib/utils/date/formatting';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { getGrossColorClass } from '@/lib/utils/financial';
import CollectionReportV2SessionsSkeleton from '@/components/ui/skeletons/CollectionReportV2SessionsSkeleton';
import { RotateCcw, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type V2MobileProps = {
  sessions: V2Session[];
  loading: boolean;
  isRefreshing?: boolean;
  canManage?: boolean;
  showArchived?: boolean;
  onViewSession?: (sessionId: string) => void;
  onEditSession?: (sessionId: string) => void;
  onSubmitSession?: (sessionId: string) => void;
  onDeleteSession?: (sessionId: string) => void;
  onRestoreSession?: (sessionId: string) => void;
  onPermanentDeleteSession?: (sessionId: string) => void;
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
  showArchived,
  onViewSession,
  onEditSession,
  onSubmitSession,
  onDeleteSession,
  onRestoreSession,
  onPermanentDeleteSession,
}: {
  session: V2Session;
  canManage?: boolean;
  showArchived?: boolean;
  onViewSession?: (sessionId: string) => void;
  onEditSession?: (sessionId: string) => void;
  onSubmitSession?: (sessionId: string) => void;
  onDeleteSession?: (sessionId: string) => void;
  onRestoreSession?: (sessionId: string) => void;
  onPermanentDeleteSession?: (sessionId: string) => void;
}) {
  const { formatAmount } = useCurrencyFormat();

  const formatGross = (value: number) => {
    if (value === 0) return '$0.00';
    return formatAmount(value);
  };

  const archivedDate = session.deletedAt
    ? formatDistanceToNow(new Date(session.deletedAt), { addSuffix: true })
    : '';

  return (
    <div
      className={`transform overflow-hidden rounded-lg bg-white shadow-sm transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-md${showArchived ? 'border border-amber-200' : ''}`}
    >
      {/* Header Section */}
      <div
        className={`px-4 py-3 text-white${showArchived ? 'bg-amber-600' : 'bg-lighterBlueHighlight'}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Session:</span>
            <Link
              href={`/locations/${session.locationId}`}
              className="border-b border-dotted border-white/50 hover:underline"
            >
              {session.locationName}
            </Link>
          </div>
          {showArchived && (
            <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
              ARCHIVED
            </span>
          )}
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

        {showArchived && archivedDate && (
          <div className="flex justify-between border-t border-amber-100 pt-3">
            <span className="text-sm font-medium text-gray-700">Archived</span>
            <span className="text-sm font-semibold text-amber-700">
              {archivedDate}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-3 flex flex-col gap-2">
          {showArchived ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onRestoreSession?.(session.sessionId)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded border border-amber-500 bg-white px-3 py-2 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-500 hover:text-white"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Restore
              </button>
              {canManage && (
                <button
                  type="button"
                  onClick={() => onPermanentDeleteSession?.(session.sessionId)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded border border-red-600 bg-white px-3 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-600 hover:text-white"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              )}
            </div>
          ) : (
            <>
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
            </>
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
  showArchived,
  onViewSession,
  onEditSession,
  onSubmitSession,
  onDeleteSession,
  onRestoreSession,
  onPermanentDeleteSession,
  isRefreshing,
}: V2MobileProps) {
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

  return (
    <div className="space-y-4 md:hidden">
      {sessions.map(session => (
        <SessionCard
          key={session.sessionId}
          session={session}
          canManage={canManage}
          showArchived={showArchived}
          onViewSession={onViewSession}
          onEditSession={onEditSession}
          onSubmitSession={onSubmitSession}
          onDeleteSession={onDeleteSession}
          onRestoreSession={onRestoreSession}
          onPermanentDeleteSession={onPermanentDeleteSession}
        />
      ))}
    </div>
  );
}
