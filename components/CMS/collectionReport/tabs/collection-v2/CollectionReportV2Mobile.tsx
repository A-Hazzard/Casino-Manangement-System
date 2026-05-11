/**
 * Collection Report V2 — Mobile Session Cards
 *
 * Mobile card view for collection capture sessions.
 * Shows aggregated session data in a card layout.
 */

'use client';

import type { V2Session } from '@/lib/hooks/collectionReport/useCollectionReportV2Data';
import { formatDate } from '@/lib/utils/date/formatting';
import CollectionReportV2SessionsSkeleton from '@/components/ui/skeletons/CollectionReportV2SessionsSkeleton';

type V2MobileProps = {
  sessions: V2Session[];
  loading: boolean;
  groupByLocation?: boolean;
  onViewSession?: (sessionId: string) => void;
  onSubmitSession?: (sessionId: string) => void;
  onDeleteSession?: (sessionId: string) => void;
};

function SessionCard({
  session,
  onViewSession,
  onSubmitSession,
  onDeleteSession,
}: {
  session: V2Session;
  onViewSession?: (sessionId: string) => void;
  onSubmitSession?: (sessionId: string) => void;
  onDeleteSession?: (sessionId: string) => void;
}) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-md">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">
            {session.locationName}
          </h3>
          <p className="text-xs text-gray-500">
            {session.collectorName || session.collector}
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            session.sessionStatus === 'submitted'
              ? 'bg-green-100 text-green-800'
              : 'bg-amber-100 text-amber-800'
          }`}
        >
          {session.sessionStatus === 'submitted'
            ? 'Submitted'
            : 'In Progress'}
        </span>
      </div>

      {/* Stats Row */}
      <div className="mb-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded bg-gray-50 p-2">
          <div className="font-semibold text-gray-900">
            {session.machinesTotal}
          </div>
          <div className="text-gray-500">Total</div>
        </div>
        <div className="rounded bg-green-50 p-2">
          <div className="font-semibold text-green-700">
            {session.machinesCaptured}
          </div>
          <div className="text-green-600">Captured</div>
        </div>
        <div className="rounded bg-amber-50 p-2">
          <div className="font-semibold text-amber-700">
            {session.machinesSkipped}
          </div>
          <div className="text-amber-600">Skipped</div>
        </div>
      </div>

      {/* Confirmed info */}
      {session.machinesConfirmed > 0 && (
        <p className="mb-2 text-xs text-gray-500">
          {session.machinesConfirmed} machine
          {session.machinesConfirmed > 1 ? 's' : ''} confirmed
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-3">
        <span className="text-xs text-gray-400">
          {formatDate(session.createdAt)}
        </span>
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={() => onViewSession?.(session.sessionId)}
            className="rounded bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
          >
            View
          </button>
          {session.sessionStatus === 'in-progress' && (
            <>
              <button
                type="button"
                onClick={() => onSubmitSession?.(session.sessionId)}
                className="rounded bg-green-50 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-100"
              >
                Submit
              </button>
              <button
                type="button"
                onClick={() => onDeleteSession?.(session.sessionId)}
                className="rounded bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
              >
                Delete
              </button>
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
  groupByLocation = false,
  onViewSession,
  onSubmitSession,
  onDeleteSession,
}: V2MobileProps) {
  if (loading) {
    return <CollectionReportV2SessionsSkeleton />;
  }

  if (sessions.length === 0) {
    return (
      <div className="md:hidden">
        <div className="rounded-lg bg-white py-12 text-center shadow-md">
          <p className="text-gray-500">No capture sessions found</p>
        </div>
      </div>
    );
  }

  if (groupByLocation) {
    const grouped = sessions.reduce<
      Record<string, { locationName: string; sessions: V2Session[] }>
    >((acc, session) => {
      const key = session.locationId;
      if (!acc[key]) {
        acc[key] = { locationName: session.locationName, sessions: [] };
      }
      acc[key].sessions.push(session);
      return acc;
    }, {});

    return (
      <div className="space-y-6 md:hidden">
        {Object.entries(grouped).map(([locationId, group]) => (
          <div key={locationId}>
            <h3 className="mb-2 px-1 text-sm font-semibold uppercase tracking-wide text-gray-500">
              {group.locationName}
              <span className="ml-2 font-normal text-gray-400">
                ({group.sessions.length} session
                {group.sessions.length !== 1 ? 's' : ''})
              </span>
            </h3>
            <div className="space-y-3">
              {group.sessions.map(session => (
                <SessionCard
                  key={session.sessionId}
                  session={session}
                  onViewSession={onViewSession}
                  onSubmitSession={onSubmitSession}
                  onDeleteSession={onDeleteSession}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 md:hidden">
      {sessions.map(session => (
        <SessionCard
          key={session.sessionId}
          session={session}
          onViewSession={onViewSession}
          onSubmitSession={onSubmitSession}
          onDeleteSession={onDeleteSession}
        />
      ))}
    </div>
  );
}

