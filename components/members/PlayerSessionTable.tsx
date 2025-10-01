"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { MemberSession } from "@/shared/types/entities";
import { formatCurrency } from "@/lib/utils/formatters";
import Link from "next/link";
import { ActivityIcon, ChevronUp, ChevronDown } from "lucide-react";

// Custom format function for login time to show date and time on separate lines
const formatLoginTime = (
  dateTime: string | Date | null | undefined
): string => {
  if (!dateTime) {
    return "N/A";
  }

  try {
    const date = typeof dateTime === "string" ? new Date(dateTime) : dateTime;
    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }

    const dateStr = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "2-digit",
    }).format(date);

    const timeStr = new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date);

    return `${dateStr}\n${timeStr}`;
  } catch {
    return "Invalid Date";
  }
};

type SortOption =
  | "time"
  | "sessionLength"
  | "moneyIn"
  | "moneyOut"
  | "jackpot"
  | "wonLess"
  | "points"
  | "gamesPlayed"
  | "gamesWon"
  | "coinIn"
  | "coinOut";

type PlayerSessionTableProps = {
  sessions: MemberSession[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  sortOption: SortOption;
  sortOrder: "asc" | "desc";
  onSort: (column: SortOption) => void;
};

const TABLE_HEADERS = [
  { label: "Login Time", sortKey: "time" as SortOption },
  { label: "Session Length", sortKey: "sessionLength" as SortOption },
  { label: "Money In", sortKey: "moneyIn" as SortOption },
  { label: "Money Out", sortKey: "moneyOut" as SortOption },
  { label: "Jackpot", sortKey: "jackpot" as SortOption },
  { label: "Won/Less", sortKey: "wonLess" as SortOption },
  { label: "Points", sortKey: "points" as SortOption },
  { label: "Games Played", sortKey: "gamesPlayed" as SortOption },
  { label: "Games Won", sortKey: "gamesWon" as SortOption },
  { label: "Coin In", sortKey: "coinIn" as SortOption },
  { label: "Coin Out", sortKey: "coinOut" as SortOption },
  { label: "Actions", sortKey: null },
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
  currentSort: { key: SortOption; direction: "asc" | "desc" };
  onSort: (key: SortOption) => void;
}) => {
  const isActive = currentSort.key === sortKey;

  return (
    <th
      className="p-3 border border-border text-sm relative cursor-pointer whitespace-nowrap hover:bg-gray-100 transition-colors select-none"
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center justify-center gap-1">
        <span>{children}</span>
        {isActive ? (
          currentSort.direction === "asc" ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )
        ) : (
          <div className="w-4 h-4 opacity-30">
            <ChevronUp className="w-4 h-4" />
          </div>
        )}
      </div>
    </th>
  );
};

// Session Card Component for Mobile
const SessionCard = ({ session }: { session: MemberSession }) => {
  const wonLess = (session.won || 0) - (session.bet || 0);
  const wonLessColor = wonLess >= 0 ? "text-green-600" : "text-red-600";

  return (
    <div className="bg-container shadow-sm rounded-lg p-4 w-full mx-auto border border-border">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 gap-2">
        <h3 className="text-base font-semibold text-gray-800 break-words">
          {session.sessionId && session.sessionId !== session._id
            ? session.sessionId
            : `Login Time: ${formatLoginTime(session.time)}`}
        </h3>
        <span className="text-sm text-gray-500 whitespace-nowrap">
          Length: {session.sessionLength}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div className="flex justify-between items-center">
          <span className="font-medium text-gray-600">Money In</span>
          <span className="font-semibold text-right break-all">
            {formatCurrency(session.moneyIn)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-medium text-gray-600">Money Out</span>
          <span className="font-semibold text-right break-all">
            {formatCurrency(session.moneyOut)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-medium text-gray-600">Jackpot</span>
          <span className="font-semibold text-right break-all">
            {formatCurrency(session.jackpot)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-medium text-gray-600">Won/Less</span>
          <span
            className={`font-semibold text-right break-all ${wonLessColor}`}
          >
            {formatCurrency(wonLess)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-medium text-gray-600">Points</span>
          <span className="font-semibold text-right">{session.points}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-medium text-gray-600">Games Played</span>
          <span className="font-semibold text-right">
            {session.gamesPlayed}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-medium text-gray-600">Games Won</span>
          <span className="font-semibold text-right">{session.gamesWon}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-medium text-gray-600">Coin In</span>
          <span className="font-semibold text-right break-all">
            {formatCurrency(session.coinIn)}
          </span>
        </div>
        <div className="flex justify-between items-center sm:col-span-2">
          <span className="font-medium text-gray-600">Coin Out</span>
          <span className="font-semibold text-right break-all">
            {formatCurrency(session.coinOut)}
          </span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-200">
        <Link
          href={`/sessions/${session.sessionId || session._id}/${
            session.machineId
          }/events`}
        >
          <Button
            variant="outline"
            size="sm"
            className="w-full flex items-center justify-center gap-2 text-xs"
          >
            <ActivityIcon className="w-3 h-3" />
            View Events
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default function PlayerSessionTable({
  sessions,
  currentPage,
  totalPages,
  onPageChange,
  sortOption,
  sortOrder,
  onSort,
}: PlayerSessionTableProps) {
  const handleFirstPage = () => onPageChange(0);
  const handleLastPage = () => onPageChange(totalPages - 1);
  const handlePrevPage = () => currentPage > 0 && onPageChange(currentPage - 1);
  const handleNextPage = () =>
    currentPage < totalPages - 1 && onPageChange(currentPage + 1);

  // Sort sessions based on current sort option and order
  const sortedSessions = React.useMemo(() => {
    return [...sessions].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortOption) {
        case "time":
          // Handle both individual sessions (Date objects) and grouped data (formatted strings)
          if (typeof a.time === "string" && typeof b.time === "string") {
            // For grouped data, sort by the string representation
            aValue = a.time;
            bValue = b.time;
          } else {
            // For individual sessions, sort by timestamp
            aValue = a.time ? new Date(a.time).getTime() : 0;
            bValue = b.time ? new Date(b.time).getTime() : 0;
          }
          break;
        case "sessionLength":
          aValue = a.sessionLength || "N/A";
          bValue = b.sessionLength || "N/A";
          break;
        case "moneyIn":
          aValue = a.moneyIn || 0;
          bValue = b.moneyIn || 0;
          break;
        case "moneyOut":
          aValue = a.moneyOut || 0;
          bValue = b.moneyOut || 0;
          break;
        case "jackpot":
          aValue = a.jackpot || 0;
          bValue = b.jackpot || 0;
          break;
        case "wonLess":
          aValue = a.wonLess || 0;
          bValue = b.wonLess || 0;
          break;
        case "points":
          aValue = a.points || 0;
          bValue = b.points || 0;
          break;
        case "gamesPlayed":
          aValue = a.gamesPlayed || 0;
          bValue = b.gamesPlayed || 0;
          break;
        case "gamesWon":
          aValue = a.gamesWon || 0;
          bValue = b.gamesWon || 0;
          break;
        case "coinIn":
          aValue = a.coinIn || 0;
          bValue = b.coinIn || 0;
          break;
        case "coinOut":
          aValue = a.coinOut || 0;
          bValue = b.coinOut || 0;
          break;
        default:
          return 0;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortOrder === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (sortOrder === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }, [sessions, sortOption, sortOrder]);

  const renderCell = (session: MemberSession, header: string) => {
    const wonLess = (session.won || 0) - (session.bet || 0);
    const wonLessColor = wonLess >= 0 ? "text-green-600" : "text-red-600";

    switch (header) {
      case "Login Time":
        // For grouped data, show the date as the group key
        if (session.sessionId && session.sessionId !== session._id) {
          // This is grouped data, show the date
          return (
            <div className="font-semibold text-gray-900">
              {session.sessionId}
            </div>
          );
        } else {
          // This is individual session data, show formatted time
          return (
            <div className="whitespace-pre-line">
              {formatLoginTime(session.time)}
            </div>
          );
        }
      case "Session Length":
        return session.sessionLength || "N/A";
      case "Money In":
        return formatCurrency(session.moneyIn);
      case "Money Out":
        return formatCurrency(session.moneyOut);
      case "Jackpot":
        return formatCurrency(session.jackpot);
      case "Won/Less":
        return <span className={wonLessColor}>{formatCurrency(wonLess)}</span>;
      case "Points":
        return session.points || 0;
      case "Games Played":
        return session.gamesPlayed || 0;
      case "Games Won":
        return session.gamesWon || 0;
      case "Coin In":
        return formatCurrency(session.coinIn);
      case "Coin Out":
        return formatCurrency(session.coinOut);
      case "Actions":
        // For grouped data, don't show actions since there's no single session
        if (session.sessionId && session.sessionId !== session._id) {
          return <span className="text-gray-400">-</span>;
        } else {
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
                <ActivityIcon className="w-3 h-3" />
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
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Mobile/Tablet Card View */}
      <div className="block md:hidden">
        <div className="grid grid-cols-1 gap-4 p-4">
          {sortedSessions.map((session) => (
            <SessionCard key={session._id} session={session} />
          ))}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-center min-w-[1400px]">
            <thead className="bg-button text-white">
              <tr>
                {TABLE_HEADERS.map((header) =>
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
                      className="p-3 border border-border text-sm relative whitespace-nowrap"
                    >
                      <span>{header.label}</span>
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {sortedSessions.map((session) => (
                <tr key={session._id} className="hover:bg-muted">
                  {TABLE_HEADERS.map((header) => (
                    <td
                      key={header.label}
                      className="p-3 bg-container border border-border text-sm text-left hover:bg-accent whitespace-nowrap"
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
      <div className="flex flex-col space-y-3 px-4 py-3 bg-gray-50 border-t sm:hidden">
        <div className="text-xs text-gray-600 text-center">
          Page {currentPage + 1} of {totalPages}
        </div>
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleFirstPage}
            disabled={currentPage === 0}
            className="px-2 py-1 text-xs"
          >
            ««
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevPage}
            disabled={currentPage === 0}
            className="px-2 py-1 text-xs"
          >
            ‹
          </Button>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-600">Page</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={currentPage + 1}
              onChange={(e) => {
                let val = Number(e.target.value);
                if (isNaN(val)) val = 1;
                if (val < 1) val = 1;
                if (val > totalPages) val = totalPages;
                onPageChange(val - 1);
              }}
              className="w-12 px-1 py-1 border border-gray-300 rounded text-center text-xs text-gray-700 focus:ring-buttonActive focus:border-buttonActive"
              aria-label="Page number"
            />
            <span className="text-xs text-gray-600">of {totalPages}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={currentPage === totalPages - 1}
            className="px-2 py-1 text-xs"
          >
            ›
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLastPage}
            disabled={currentPage === totalPages - 1}
            className="px-2 py-1 text-xs"
          >
            »»
          </Button>
        </div>
      </div>

      {/* Desktop Pagination */}
      <div className="hidden sm:flex items-center justify-between px-4 py-3 bg-gray-50 border-t">
        <span className="text-sm text-gray-600">
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
            <span className="text-sm text-gray-600">Page</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={currentPage + 1}
              onChange={(e) => {
                let val = Number(e.target.value);
                if (isNaN(val)) val = 1;
                if (val < 1) val = 1;
                if (val > totalPages) val = totalPages;
                onPageChange(val - 1);
              }}
              className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm text-gray-700 focus:ring-buttonActive focus:border-buttonActive"
              aria-label="Page number"
            />
            <span className="text-sm text-gray-600">of {totalPages}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={currentPage === totalPages - 1}
          >
            Next
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLastPage}
            disabled={currentPage === totalPages - 1}
          >
            Last
          </Button>
        </div>
      </div>
    </div>
  );
}
