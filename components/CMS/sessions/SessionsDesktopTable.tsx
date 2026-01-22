'use client';

import { Button } from '@/components/shared/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/shared/ui/table';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { SessionsTableProps } from '@/lib/types/sessions';
import { formatDate } from '@/lib/utils/date';
import { formatMachineDisplayNameWithBold } from '@/components/shared/ui/machineDisplay';
import { ExternalLink, Eye } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/**
 * Formats duration from minutes to H:MM:SS
 */
export function formatDuration(minutes: number): string {
  if (!minutes || isNaN(minutes)) return '0:00:00';
  const totalSeconds = Math.floor(minutes * 60);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Formats points for display
 */
function formatPoints(points: number): string {
  if (!points || isNaN(points)) return '0';
  return points.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function SessionsDesktopTable({
  sessions,
  sortOption,
  sortOrder,
  onSort,
}: Pick<SessionsTableProps, 'sessions' | 'sortOption' | 'sortOrder' | 'onSort'>) {
  const { formatAmount } = useCurrencyFormat();
  const router = useRouter();

  const renderSortArrow = (field: string) => {
    if (sortOption === field) {
      return sortOrder === 'asc' ? '▲' : '▼';
    }
    return null;
  };

  return (
    <div className="hidden rounded-md border border-gray-200 bg-white lg:block">
      <Table>
        <TableHeader>
          <TableRow className="bg-button hover:bg-button">
            <TableHead
              className="cursor-pointer py-3 pl-3 text-left font-medium text-white"
              onClick={() => onSort && onSort('memberName')}
            >
              Player {renderSortArrow('memberName')}
            </TableHead>
            <TableHead
              className="cursor-pointer py-3 text-left font-medium text-white"
              onClick={() => onSort && onSort('machineName')}
            >
              Machine {renderSortArrow('machineName')}
            </TableHead>
            <TableHead
              className="cursor-pointer py-3 text-center font-medium text-white"
              onClick={() => onSort && onSort('startTime')}
            >
              Start Time {renderSortArrow('startTime')}
            </TableHead>
            <TableHead
              className="cursor-pointer py-3 text-center font-medium text-white"
              onClick={() => onSort && onSort('duration')}
            >
              Duration {renderSortArrow('duration')}
            </TableHead>
            <TableHead
              className="cursor-pointer py-3 text-center font-medium text-white"
              onClick={() => onSort && onSort('handle')}
            >
              Handle {renderSortArrow('handle')}
            </TableHead>
            <TableHead
              className="cursor-pointer py-3 text-center font-medium text-white"
              onClick={() => onSort && onSort('jackpot')}
            >
              Jackpot {renderSortArrow('jackpot')}
            </TableHead>
            <TableHead
              className="cursor-pointer py-3 text-center font-medium text-white"
              onClick={() => onSort && onSort('points')}
            >
              Points {renderSortArrow('points')}
            </TableHead>
            <TableHead className="py-3 pr-3 text-center font-medium text-white">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map(session => (
            <TableRow
              key={session._id}
              className="border-b transition-colors hover:bg-muted/30"
            >
              {/* Player Column */}
              <TableCell className="bg-white p-3 text-left align-top">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium text-gray-900">
                    {session.memberName || 'Unknown Player'}
                  </div>
                  <div className="break-all text-xs text-gray-500">
                    ID: {session.memberId || 'N/A'}
                  </div>
                </div>
              </TableCell>

              {/* Machine Column */}
              <TableCell className="bg-white p-3 text-left align-top">
                <div className="space-y-1">
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
              </TableCell>

              {/* Start Time Column */}
              <TableCell className="bg-white p-3 text-center text-sm text-gray-900">
                {formatDate(session.startTime)}
              </TableCell>

              {/* Duration Column */}
              <TableCell className="bg-white p-3 text-center text-sm text-gray-900">
                {formatDuration(session.duration)}
              </TableCell>

              {/* Handle Column */}
              <TableCell className="bg-white p-3 text-center text-sm text-gray-900">
                {formatAmount(session.handle)}
              </TableCell>

              {/* Jackpot Column */}
              <TableCell className="bg-white p-3 text-center text-sm text-gray-900">
                {formatAmount(session.jackpot)}
              </TableCell>

              {/* Points Column */}
              <TableCell className="bg-white p-3 text-center text-sm text-gray-900">
                {formatPoints(session.points)}
              </TableCell>

              {/* Actions Column */}
              <TableCell className="bg-white p-3 text-center align-middle">
                <Link
                  href={`/sessions/${session._id}/${session.machineId || ''}/events`}
                >
                  <Button
                    size="sm"
                    variant="outline"
                    className="inline-flex items-center justify-center gap-1 px-3 py-1"
                  >
                    <Eye className="h-4 w-4" />
                    <span>Events</span>
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

