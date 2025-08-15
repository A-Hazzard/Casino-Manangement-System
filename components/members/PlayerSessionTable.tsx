"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { MemberSession } from "@/lib/types/members";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
} from "@radix-ui/react-icons";
import { formatCurrency } from "@/lib/utils/formatters";
import Link from "next/link";
import { ActivityIcon } from "lucide-react";

// Custom format function for login time to show date and time on separate lines
const formatLoginTime = (dateTime: string | Date | null | undefined): string => {
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
  } catch (error) {
    return "Invalid Date";
  }
};

type PlayerSessionTableProps = {
  sessions: MemberSession[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  memberId: string;
};

const TABLE_HEADERS = [
  "Login Time",
  "Session Length",
  "Handle",
  "Cancel. Cred.",
  "Jackpot",
  "Won/Less",
  "Points",
  "Games Played",
  "Games Won",
  "Coin In",
  "Coin Out",
  "Actions",
];

// Session Card Component for Mobile
const SessionCard = ({
  session,
  memberId,
}: {
  session: MemberSession;
  memberId: string;
}) => {
  const wonLess = (session.won || 0) - (session.bet || 0);
  const wonLessColor = wonLess >= 0 ? "text-green-600" : "text-red-600";

  return (
    <div className="bg-container shadow-sm rounded-lg p-4 w-full mx-auto border border-border">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 gap-2">
        <h3 className="text-base font-semibold text-gray-800 break-words">
          {session.sessionId && session.sessionId !== session._id 
            ? session.sessionId 
            : `Login Time: ${formatLoginTime(session.time)}`
          }
        </h3>
        <span className="text-sm text-gray-500 whitespace-nowrap">Length: {session.sessionLength}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div className="flex justify-between items-center">
          <span className="font-medium text-gray-600">Handle</span>
          <span className="font-semibold text-right break-all">
            {formatCurrency(session.handle)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-medium text-gray-600">Cancel. Cred.</span>
          <span className="font-semibold text-right break-all">
            {formatCurrency(session.cancelledCredits)}
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
          <span className={`font-semibold text-right break-all ${wonLessColor}`}>
            {formatCurrency(wonLess)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-medium text-gray-600">Points</span>
          <span className="font-semibold text-right">{session.points}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-medium text-gray-600">Games Played</span>
          <span className="font-semibold text-right">{session.gamesPlayed}</span>
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
  memberId,
}: PlayerSessionTableProps) {
  const handleFirstPage = () => onPageChange(0);
  const handleLastPage = () => onPageChange(totalPages - 1);
  const handlePrevPage = () => currentPage > 0 && onPageChange(currentPage - 1);
  const handleNextPage = () =>
    currentPage < totalPages - 1 && onPageChange(currentPage + 1);

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
      case "Handle":
        return formatCurrency(session.handle);
      case "Cancel. Cred.":
        return formatCurrency(session.cancelledCredits);
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
          {sessions.map((session) => (
            <SessionCard
              key={session._id}
              session={session}
              memberId={memberId}
            />
          ))}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-center min-w-[1400px]">
            <thead className="bg-button text-white">
              <tr>
                {TABLE_HEADERS.map((header) => (
                  <th
                    key={header}
                    className="p-3 border border-border text-sm relative cursor-pointer whitespace-nowrap"
                  >
                    <span>{header}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session._id} className="hover:bg-muted">
                  {TABLE_HEADERS.map((header) => (
                    <td
                      key={header}
                      className="p-3 bg-container border border-border text-sm text-left hover:bg-accent whitespace-nowrap"
                    >
                      {renderCell(session, header)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 bg-gray-50 border-t gap-3">
        <span className="text-sm text-gray-600">
          Page {currentPage + 1} of {totalPages}
        </span>
        <div className="flex items-center space-x-1 sm:space-x-2">
          <Button
            onClick={handleFirstPage}
            disabled={currentPage === 0}
            variant="ghost"
            size="sm"
            className="p-1 sm:p-2"
          >
            <DoubleArrowLeftIcon className="w-3 h-3 sm:w-4 sm:h-4" />
          </Button>
          <Button
            onClick={handlePrevPage}
            disabled={currentPage === 0}
            variant="ghost"
            size="sm"
            className="p-1 sm:p-2"
          >
            <ChevronLeftIcon className="w-3 h-3 sm:w-4 sm:h-4" />
          </Button>
          <Button
            onClick={handleNextPage}
            disabled={currentPage === totalPages - 1}
            variant="ghost"
            size="sm"
            className="p-1 sm:p-2"
          >
            <ChevronRightIcon className="w-3 h-3 sm:w-4 sm:h-4" />
          </Button>
          <Button
            onClick={handleLastPage}
            disabled={currentPage === totalPages - 1}
            variant="ghost"
            size="sm"
            className="p-1 sm:p-2"
          >
            <DoubleArrowRightIcon className="w-3 h-3 sm:w-4 sm:h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
