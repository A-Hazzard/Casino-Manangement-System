'use client';

import { Button } from '@/components/ui/button';
import {
  formatCurrency,
  formatDate,
  formatDuration,
  formatPoints,
} from '@/lib/helpers/sessions';
import type { Session } from '@/lib/types/sessions';
import { formatMachineDisplayNameWithBold } from '@/lib/utils/machineDisplay';
import { ExternalLink, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';

type SessionsTableProps = {
  sessions: Session[];
  onViewEvents: (sessionId: string, machineId: string) => void;
};

/**
 * Sessions Table Component
 * Displays sessions data in a responsive table format
 */
export default function SessionsTable({
  sessions,
  onViewEvents,
}: SessionsTableProps) {
  const router = useRouter();

  if (sessions.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <p className="text-gray-500">
          No sessions found for the selected criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-white">
      {/* Desktop Table - shown on xl and above */}
      <div className="hidden xl:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-button text-white">
              <tr>
                <th className="p-3 text-left font-medium text-white">Player</th>
                <th className="p-3 text-left font-medium text-white">
                  Machine
                </th>
                <th className="p-3 text-center font-medium text-white">
                  Start Time
                </th>
                <th className="p-3 text-center font-medium text-white">
                  Duration
                </th>
                <th className="p-3 text-center font-medium text-white">
                  Handle
                </th>
                <th className="p-3 text-center font-medium text-white">
                  Jackpot
                </th>
                <th className="p-3 text-center font-medium text-white">
                  Points
                </th>
                <th className="p-3 text-center font-medium text-white">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(session => (
                <tr key={session._id} className="border-b hover:bg-muted/30">
                  <td className="bg-white p-3 text-left align-top">
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium text-gray-900">
                        {session.memberName || 'Unknown Player'}
                      </div>
                      <div className="break-all text-xs text-gray-500">
                        ID: {session.memberId || 'N/A'}
                      </div>
                    </div>
                  </td>
                  <td className="bg-white p-3 text-left align-top">
                    <div className="space-y-1">
                      {/* Row 1: Serial Number (CustomName, Game) - Navigate to cabinet details */}
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            if (session.machineId) {
                              router.push(`/cabinets/${session.machineId}`);
                            }
                          }}
                          className="cursor-pointer whitespace-normal break-words text-left text-sm font-medium hover:text-blue-600 hover:underline"
                          title="Click to view cabinet details"
                          disabled={!session.machineId}
                        >
                          {formatMachineDisplayNameWithBold({
                            serialNumber:
                              session.machineSerialNumber ||
                              session.machineId ||
                              'N/A',
                            custom: { name: session.machineCustomName },
                            game: session.machineGame,
                          })}
                        </button>
                      </div>
                      {/* Row 2: Machine ID with external link icon */}
                      <div className="flex items-center gap-1.5">
                        <span className="break-all text-xs text-gray-600">
                          ID: {session.machineId || 'N/A'}
                        </span>
                        {session.machineId && (
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              router.push(`/cabinets/${session.machineId}`);
                            }}
                            className="flex-shrink-0"
                            title="View cabinet details"
                          >
                            <ExternalLink className="h-3 w-3 cursor-pointer text-gray-500 transition-transform hover:scale-110 hover:text-blue-600" />
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="bg-white p-3 text-center text-sm text-gray-900">
                    {formatDate(session.startTime)}
                  </td>
                  <td className="bg-white p-3 text-center text-sm text-gray-900">
                    {formatDuration(session.duration)}
                  </td>
                  <td className="bg-white p-3 text-center text-sm text-gray-900">
                    {formatCurrency(session.handle)}
                  </td>
                  <td className="bg-white p-3 text-center text-sm text-gray-900">
                    {formatCurrency(session.jackpot)}
                  </td>
                  <td className="bg-white p-3 text-center text-sm text-gray-900">
                    {formatPoints(session.points)}
                  </td>
                  <td className="bg-white p-3 text-center align-middle">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        onViewEvents(session._id, session.machineId || '')
                      }
                      className="inline-flex items-center justify-center gap-1 px-3 py-1"
                    >
                      <Eye className="h-4 w-4" />
                      <span>Events</span>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Card Grid View - shown below xl */}
      <div className="block p-4 xl:hidden">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {sessions.map(session => (
            <div
              key={session._id}
              className="overflow-hidden rounded-lg border bg-white transition-shadow hover:shadow-md"
            >
              {/* Card Header */}
              <div className="border-b bg-gradient-to-r from-gray-50 to-white p-4">
                <div className="mb-2 flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="break-words text-sm font-semibold text-gray-900">
                      {session.memberName || 'Unknown Player'}
                    </h3>
                    <p className="mt-1 break-all text-xs text-muted-foreground">
                      ID: {session.memberId || 'N/A'}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      onViewEvents(session._id, session.machineId || '')
                    }
                    className="inline-flex h-8 items-center justify-center"
                  >
                    <Eye className="mr-1 h-3 w-3" />
                    Events
                  </Button>
                </div>
              </div>

              {/* Card Content - 2x2 Grid */}
              <div className="p-4">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div className="flex min-w-0 flex-col">
                    <span className="text-xs text-muted-foreground">
                      Machine
                    </span>
                    <span className="break-all text-sm font-semibold">
                      {session.machineSerialNumber ||
                        session.machineId ||
                        'Unknown'}
                      {(session.machineCustomName || session.machineGame) && (
                        <span className="font-bold">
                          {' '}
                          (
                          {[session.machineCustomName, session.machineGame]
                            .filter(Boolean)
                            .join(', ')}
                          )
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">
                      Duration
                    </span>
                    <span className="font-semibold">
                      {formatDuration(session.duration)}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">
                      Handle
                    </span>
                    <span className="font-semibold">
                      {formatCurrency(session.handle)}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">
                      Jackpot
                    </span>
                    <span className="font-semibold">
                      {formatCurrency(session.jackpot)}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">
                      Points
                    </span>
                    <span className="font-semibold">
                      {formatPoints(session.points)}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">
                      Start Time
                    </span>
                    <span className="text-xs font-semibold">
                      {formatDate(session.startTime)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
