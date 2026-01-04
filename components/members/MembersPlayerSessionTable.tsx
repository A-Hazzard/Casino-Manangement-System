/**
 * Members Player Session Table Component
 * Table component for displaying member gaming sessions with sorting and filtering.
 *
 * Features:
 * - Session data display (time, length, money in/out, jackpot, won/loss, points, games played)
 * - Sortable columns
 * - Expandable session details
 * - Navigation to session details
 * - Currency formatting
 * - Date/time formatting
 * - Responsive design
 *
 * @param props - Component props
 */
'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { MemberSession } from '@/shared/types/entities';
import { formatCurrency } from '@/lib/utils/formatters';
import {
  getMoneyInColorClass,
  getMoneyOutColorClass,
} from '@/lib/utils/financialColors';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import Link from 'next/link';
import { ActivityIcon, ChevronUp, ChevronDown } from 'lucide-react';

// ============================================================================
// Helper Functions & Types
// ============================================================================

// Custom format function for login time to show date and time on separate lines
const formatLoginTime = (
  dateTime: string | Date | null | undefined
): string => {
  if (!dateTime) {
    return 'N/A';
  }

  try {
    const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }

    const dateStr = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: '2-digit',
    }).format(date);

    const timeStr = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);

    return `${dateStr}\n${timeStr}`;
  } catch {
    return 'Invalid Date';
  }
};

type SortOption =
  | 'time'
  | 'sessionLength'
  | 'moneyIn'
  | 'moneyOut'
  | 'jackpot'
  | 'wonLess'
  | 'points'
  | 'gamesPlayed'
  | 'gamesWon'
  | 'coinIn'
  | 'coinOut';

export type MembersPlayerSessionTableProps = {
  sessions: MemberSession[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  sortOption: SortOption;
  sortOrder: 'asc' | 'desc';
  onSort: (column: SortOption) => void;
};

const TABLE_HEADERS = [
  { label: 'Login Time', sortKey: 'time' as SortOption },
  { label: 'Session Length', sortKey: 'sessionLength' as SortOption },
  { label: 'Money In', sortKey: 'moneyIn' as SortOption },
  { label: 'Money Out', sortKey: 'moneyOut' as SortOption },
  { label: 'Jackpot', sortKey: 'jackpot' as SortOption },
  { label: 'Won/Less', sortKey: 'wonLess' as SortOption },
  { label: 'Points', sortKey: 'points' as SortOption },
  { label: 'Games Played', sortKey: 'gamesPlayed' as SortOption },
  { label: 'Games Won', sortKey: 'gamesWon' as SortOption },
  { label: 'Coin In', sortKey: 'coinIn' as SortOption },
  { label: 'Coin Out', sortKey: 'coinOut' as SortOption },
  { label: 'Actions', sortKey: null },
];

// Sortable header component
const SortableHeader = ({
  children,
  sortKey,
  currentSort,
  onSort,
}: {
  children: React.ReactNode;
  sortKey: SortOption;
  currentSort: { key: SortOption; direction: 'asc' | 'desc' };
  onSort: (key: SortOption) => void;
}) => {
  const isActive = currentSort.key === sortKey;

  return (
    <th
      className="cursor-pointer select-none p-3 text-center font-medium text-white transition-colors hover:bg-buttonActive"
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center justify-center gap-1">
        <span>{children}</span>
        {isActive ? (
          currentSort.direction === 'asc' ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )
        ) : (
          <div className="h-4 w-4 opacity-30">
            <ChevronUp className="h-4 w-4" />
          </div>
        )}
      </div>
    </th>
  );
};

// Session Card Component for Mobile/Tablet
const SessionCard = ({ session }: { session: MemberSession }) => {
  const { formatAmount, shouldShowCurrency } = useCurrencyFormat();
  const wonLess = (session.won || 0) - (session.bet || 0);
  const wonLessColor = wonLess >= 0 ? 'text-green-600' : 'text-red-600';

  return (
    <div className="overflow-hidden rounded-lg border bg-white transition-shadow hover:shadow-md">
      {/* Card Header */}
      <div className="border-b bg-gradient-to-r from-gray-50 to-white p-4">
        <div className="mb-2 flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900">
              {session.sessionId && session.sessionId !== session._id
                ? `Session ${session.sessionId}`
                : formatLoginTime(session.time)}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Duration: {session.sessionLength || 'N/A'}
            </p>
          </div>
          <Link
            href={`/sessions/${session.sessionId || session._id}/${
              session.machineId
            }/events`}
          >
            <Button
              variant="outline"
              size="sm"
              className="h-8"
            >
              <ActivityIcon className="mr-1 h-3 w-3" />
              Events
            </Button>
          </Link>
        </div>
      </div>

      {/* Card Content - 2x2 Grid */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Money In</span>
            <span className={`font-semibold ${getMoneyInColorClass()}`}>
              {shouldShowCurrency()
                ? formatAmount(session.moneyIn || 0)
                : formatCurrency(session.moneyIn || 0)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Money Out</span>
            <span className={`font-semibold ${getMoneyOutColorClass(session.moneyOut, session.moneyIn)}`}>
              {shouldShowCurrency()
                ? formatAmount(session.moneyOut || 0)
                : formatCurrency(session.moneyOut || 0)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Jackpot</span>
            <span className="font-semibold">
              {shouldShowCurrency()
                ? formatAmount(session.jackpot || 0)
                : formatCurrency(session.jackpot || 0)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Won/Less</span>
            <span className={`font-semibold ${wonLessColor}`}>
              {shouldShowCurrency()
                ? formatAmount(wonLess || 0)
                : formatCurrency(wonLess || 0)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Points</span>
            <span className="font-semibold">{session.points || 0}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Games Played</span>
            <span className="font-semibold">{session.gamesPlayed || 0}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Games Won</span>
            <span className="font-semibold">{session.gamesWon || 0}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Coin In</span>
            <span className="font-semibold">{formatCurrency(session.coinIn || 0)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function MembersPlayerSessionTable({
  sessions,
  currentPage,
  totalPages,
  onPageChange,
  sortOption,
  sortOrder,
  onSort,
}: MembersPlayerSessionTableProps) {
  const { formatAmount, shouldShowCurrency } = useCurrencyFormat();
  const handleFirstPage = () => onPageChange(0);
  const handleLastPage = () => onPageChange(totalPages - 1);
  const handlePrevPage = () => currentPage > 0 && onPageChange(currentPage - 1);
  const handleNextPage = () =>
    currentPage < totalPages - 1 && onPageChange(currentPage + 1);

  // Sort sessions based on current sort option and order
  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortOption) {
        case 'time':
          // Handle both individual sessions (Date objects) and grouped data (formatted strings)
          if (typeof a.time === 'string' && typeof b.time === 'string') {
            // For grouped data, sort by the string representation
            aValue = a.time;
            bValue = b.time;
          } else {
            // For individual sessions, sort by timestamp
            aValue = a.time ? new Date(a.time).getTime() : 0;
            bValue = b.time ? new Date(b.time).getTime() : 0;
          }
          break;
        case 'sessionLength':
          aValue = a.sessionLength || 'N/A';
          bValue = b.sessionLength || 'N/A';
          break;
        case 'moneyIn':
          aValue = a.moneyIn || 0;
          bValue = b.moneyIn || 0;
          break;
        case 'moneyOut':
          aValue = a.moneyOut || 0;
          bValue = b.moneyOut || 0;
          break;
        case 'jackpot':
          aValue = a.jackpot || 0;
          bValue = b.jackpot || 0;
          break;
        case 'wonLess':
          aValue = a.wonLess || 0;
          bValue = b.wonLess || 0;
          break;
        case 'points':
          aValue = a.points || 0;
          bValue = b.points || 0;
          break;
        case 'gamesPlayed':
          aValue = a.gamesPlayed || 0;
          bValue = b.gamesPlayed || 0;
          break;
        case 'gamesWon':
          aValue = a.gamesWon || 0;
          bValue = b.gamesWon || 0;
          break;
        case 'coinIn':
          aValue = a.coinIn || 0;
          bValue = b.coinIn || 0;
          break;
        case 'coinOut':
          aValue = a.coinOut || 0;
          bValue = b.coinOut || 0;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }, [sessions, sortOption, sortOrder]);

  const renderCell = (session: MemberSession, header: string) => {
    const wonLess = (session.won || 0) - (session.bet || 0);
    const wonLessColor = wonLess >= 0 ? 'text-green-600' : 'text-red-600';

    switch (header) {
      case 'Login Time':
        // Show date for grouped data, formatted time for individual sessions
        if (session.sessionId && session.sessionId !== session._id) {
          /* Show date as group key for grouped data */
          return (
            <div className="font-semibold text-gray-900">
              {session.sessionId}
            </div>
          );
        } else {
          /* Show formatted time for individual session data */
          return (
            <div className="whitespace-pre-line">
              {formatLoginTime(session.time)}
            </div>
          );
        }
      case 'Session Length':
        return session.sessionLength || 'N/A';
      case 'Money In':
        return (
          <span className={getMoneyInColorClass()}>
            {shouldShowCurrency()
              ? formatAmount(session.moneyIn || 0)
              : formatCurrency(session.moneyIn || 0)}
          </span>
        );
      case 'Money Out':
        return (
          <span className={getMoneyOutColorClass(session.moneyOut, session.moneyIn)}>
            {shouldShowCurrency()
              ? formatAmount(session.moneyOut || 0)
              : formatCurrency(session.moneyOut || 0)}
          </span>
        );
      case 'Jackpot':
        return shouldShowCurrency()
          ? formatAmount(session.jackpot || 0)
          : formatCurrency(session.jackpot || 0);
      case 'Won/Less':
        return (
          <span className={wonLessColor}>
            {shouldShowCurrency()
              ? formatAmount(wonLess || 0)
              : formatCurrency(wonLess || 0)}
          </span>
        );
      case 'Points':
        return session.points || 0;
      case 'Games Played':
        return session.gamesPlayed || 0;
      case 'Games Won':
        return session.gamesWon || 0;
      case 'Coin In':
        return shouldShowCurrency()
          ? formatAmount(session.coinIn || 0)
          : formatCurrency(session.coinIn || 0);
      case 'Coin Out':
        return shouldShowCurrency()
          ? formatAmount(session.coinOut || 0)
          : formatCurrency(session.coinOut || 0);
      case 'Actions':
        // Don't show actions for grouped data, only for individual sessions
        if (session.sessionId && session.sessionId !== session._id) {
          /* No actions available for grouped data */
          return <span className="text-gray-400">-</span>;
        } else {
          /* Show view events button for individual sessions */
          return (
            <Link
              href={`/sessions/${session.sessionId || session._id}/${
                session.machineId
              }/events`}
            >
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1 text-xs"
              >
                <ActivityIcon className="h-3 w-3" />
                View Events
              </Button>
            </Link>
          );
        }
      default:
        return null;
    }
  };

  return (
    <div className="rounded-md border bg-white">
      {/* Card Grid View - shown below xl breakpoint */}
      <div className="block p-4 xl:hidden">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {sortedSessions.map(session => (
            <SessionCard key={session._id} session={session} />
          ))}
        </div>
      </div>

      {/* Desktop Table View - shown on xl and above */}
      <div className="hidden xl:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1400px]">
            <thead className="bg-button text-white">
              <tr>
                {TABLE_HEADERS.map(header =>
                  header.sortKey ? (
                    <SortableHeader
                      key={header.label}
                      sortKey={header.sortKey}
                      currentSort={{ key: sortOption, direction: sortOrder }}
                      onSort={onSort}
                    >
                      {header.label}
                    </SortableHeader>
                  ) : (
                    <th
                      key={header.label}
                      className="p-3 text-center font-medium text-white"
                    >
                      <span>{header.label}</span>
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {sortedSessions.map(session => (
                <tr key={session._id} className="border-b hover:bg-muted/30">
                  {TABLE_HEADERS.map(header => (
                    <td
                      key={header.label}
                      className="bg-white p-3 text-center text-sm"
                    >
                      {renderCell(session, header.label)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Pagination */}
      <div className="flex flex-col space-y-3 border-t bg-muted/20 px-4 py-3 sm:hidden">
        <div className="text-center text-xs text-muted-foreground">
          Page {currentPage + 1} of {totalPages}
        </div>
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleFirstPage}
            disabled={currentPage === 0}
            className="h-8 px-2"
          >
            ««
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevPage}
            disabled={currentPage === 0}
            className="h-8 px-2"
          >
            ‹
          </Button>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Page</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={currentPage + 1}
              onChange={e => {
                let val = Number(e.target.value);
                if (isNaN(val)) val = 1;
                if (val < 1) val = 1;
                if (val > totalPages) val = totalPages;
                onPageChange(val - 1);
              }}
              className="h-8 w-12 rounded-md border border-input bg-background px-2 text-center text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Page number"
            />
            <span className="text-xs text-muted-foreground">of {totalPages}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={currentPage >= totalPages - 1}
            className="h-8 px-2"
          >
            ›
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLastPage}
            disabled={currentPage >= totalPages - 1}
            className="h-8 px-2"
          >
            »»
          </Button>
        </div>
      </div>

      {/* Desktop Pagination */}
      <div className="hidden items-center justify-between border-t bg-muted/20 px-4 py-3 sm:flex">
        <span className="text-sm text-muted-foreground">
          Page {currentPage + 1} of {totalPages}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleFirstPage}
            disabled={currentPage === 0}
          >
            First
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevPage}
            disabled={currentPage === 0}
          >
            Previous
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Page</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={currentPage + 1}
              onChange={e => {
                let val = Number(e.target.value);
                if (isNaN(val)) val = 1;
                if (val < 1) val = 1;
                if (val > totalPages) val = totalPages;
                onPageChange(val - 1);
              }}
              className="h-9 w-16 rounded-md border border-input bg-background px-2 text-center text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Page number"
            />
            <span className="text-sm text-muted-foreground">of {totalPages}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={currentPage >= totalPages - 1}
          >
            Next
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLastPage}
            disabled={currentPage >= totalPages - 1}
          >
            Last
          </Button>
        </div>
      </div>
    </div>
  );
}
