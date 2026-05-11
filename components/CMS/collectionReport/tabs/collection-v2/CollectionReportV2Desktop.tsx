/**
 * Collection Report V2 — Desktop Session List
 *
 * Desktop table view for collection capture sessions.
 * Shows aggregated session data with status indicators.
 */

'use client';

import type { V2Session } from '@/lib/hooks/collectionReport/useCollectionReportV2Data';
import { formatDate } from '@/lib/utils/date/formatting';
import CollectionReportV2SessionsSkeleton from '@/components/ui/skeletons/CollectionReportV2SessionsSkeleton';

type V2DesktopProps = {
  sessions: V2Session[];
  loading: boolean;
  groupByLocation?: boolean;
  onViewSession?: (sessionId: string) => void;
  onSubmitSession?: (sessionId: string) => void;
  onDeleteSession?: (sessionId: string) => void;
};

function SessionRow({
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
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 font-medium text-gray-900">
        {session.locationName}
      </td>
      <td className="px-4 py-3 text-gray-600">
        {session.collectorName || session.collector}
      </td>
      <td className="px-4 py-3">
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
      </td>
      <td className="px-4 py-3 text-center text-gray-900">
        {session.machinesTotal}
      </td>
      <td className="px-4 py-3 text-center">
        <span className="font-medium text-green-600">
          {session.machinesCaptured}
        </span>
        {session.machinesConfirmed > 0 && (
          <span className="ml-1 text-xs text-gray-400">
            ({session.machinesConfirmed} confirmed)
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-center">
        <span
          className={
            session.machinesSkipped > 0
              ? 'font-medium text-amber-600'
              : 'text-gray-400'
          }
        >
          {session.machinesSkipped}
        </span>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-gray-500">
        {formatDate(session.createdAt)}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end space-x-2">
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
      </td>
    </tr>
  );
}

function GroupedSessionList({
  sessions,
  onViewSession,
  onSubmitSession,
  onDeleteSession,
}: {
  sessions: V2Session[];
  onViewSession?: (sessionId: string) => void;
  onSubmitSession?: (sessionId: string) => void;
  onDeleteSession?: (sessionId: string) => void;
}) {
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
    <div className="space-y-6">
      {Object.entries(grouped).map(([locationId, group]) => (
        <div key={locationId}>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
            {group.locationName}
            <span className="ml-2 font-normal text-gray-400">
              ({group.sessions.length} session
              {group.sessions.length !== 1 ? 's' : ''})
            </span>
          </h3>
          <div className="overflow-x-auto rounded-lg bg-white shadow-md">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Collector</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-center font-medium">Machines</th>
                  <th className="px-4 py-3 text-center font-medium">Captured</th>
                  <th className="px-4 py-3 text-center font-medium">Skipped</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {group.sessions.map(session => (
                  <SessionRow
                    key={session.sessionId}
                    session={session}
                    onViewSession={onViewSession}
                    onSubmitSession={onSubmitSession}
                    onDeleteSession={onDeleteSession}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CollectionReportV2Desktop({
  sessions,
  loading,
  groupByLocation = false,
  onViewSession,
  onSubmitSession,
  onDeleteSession,
}: V2DesktopProps) {
  if (loading) {
    return <CollectionReportV2SessionsSkeleton />;
  }

  if (sessions.length === 0) {
    return (
      <div className="hidden md:block">
        <div className="rounded-lg bg-white py-12 text-center shadow-md">
          <p className="text-gray-500">No capture sessions found</p>
        </div>
      </div>
    );
  }

  if (groupByLocation) {
    return (
      <div className="hidden md:block">
        <GroupedSessionList
          sessions={sessions}
          onViewSession={onViewSession}
          onSubmitSession={onSubmitSession}
          onDeleteSession={onDeleteSession}
        />
      </div>
    );
  }

  return (
    <div className="hidden md:block">
      <div className="overflow-x-auto rounded-lg bg-white shadow-md">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
            <tr>
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 font-medium">Collector</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-center font-medium">Machines</th>
              <th className="px-4 py-3 text-center font-medium">Captured</th>
              <th className="px-4 py-3 text-center font-medium">Skipped</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sessions.map(session => (
              <SessionRow
                key={session.sessionId}
                session={session}
                onViewSession={onViewSession}
                onSubmitSession={onSubmitSession}
                onDeleteSession={onDeleteSession}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

