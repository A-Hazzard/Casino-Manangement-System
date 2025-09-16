"use client";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye } from "lucide-react";
import {
  formatCurrency,
  formatDuration,
  formatDate,
  formatPoints,
} from "@/lib/helpers/sessions";
import type { Session } from "@/lib/types/sessions";

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
  if (sessions.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-gray-500">
          No sessions found for the selected criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-button hover:bg-button">
              <TableHead className="text-white font-semibold">Player</TableHead>
              <TableHead className="text-white font-semibold">Machine</TableHead>
              <TableHead className="text-white font-semibold">Start Time</TableHead>
              <TableHead className="text-white font-semibold">Duration</TableHead>
              <TableHead className="text-white font-semibold">Handle</TableHead>
              <TableHead className="text-white font-semibold">Jackpot</TableHead>
              <TableHead className="text-white font-semibold">Points</TableHead>
              <TableHead className="text-white font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((session) => (
              <TableRow key={session._id} className="hover:bg-gray-50">
                <TableCell>
                  <div className="text-sm font-medium text-gray-900">
                    {session.memberName || "Unknown Player"}
                  </div>
                  <div className="text-sm text-gray-500">
                    ID: {session.memberId}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm font-medium text-gray-900">
                    {session.machineId}
                  </div>
                  <div className="text-sm text-gray-500">
                    {session.machineName || "Unknown Machine"}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-gray-900">
                  {formatDate(session.startTime)}
                </TableCell>
                <TableCell className="text-sm text-gray-900">
                  {formatDuration(session.duration)}
                </TableCell>
                <TableCell className="text-sm text-gray-900">
                  {formatCurrency(session.handle)}
                </TableCell>
                <TableCell className="text-sm text-gray-900">
                  {formatCurrency(session.jackpot)}
                </TableCell>
                <TableCell className="text-sm text-gray-900">
                  {formatPoints(session.points)}
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      onViewEvents(session._id, session.machineId || "")
                    }
                    className="flex items-center space-x-1"
                  >
                    <Eye className="h-4 w-4" />
                    <span>Events</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-4 p-4">
        {sessions.map((session) => (
          <div
            key={session._id}
            className="border border-gray-200 rounded-lg p-4 space-y-3"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium text-gray-900">
                  {session.memberName || "Unknown Player"}
                </h3>
                <p className="text-sm text-gray-500">
                  Player ID: {session.memberId}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  onViewEvents(session._id, session.machineId || "")
                }
                className="flex items-center space-x-1"
              >
                <Eye className="h-4 w-4" />
                <span>Events</span>
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Machine:</span>
                <p className="font-medium">{session.machineId}</p>
              </div>
              <div>
                <span className="text-gray-500">Duration:</span>
                <p className="font-medium">
                  {formatDuration(session.duration)}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Handle:</span>
                <p className="font-medium">{formatCurrency(session.handle)}</p>
              </div>
              <div>
                <span className="text-gray-500">Points:</span>
                <p className="font-medium">{formatPoints(session.points)}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <span className="text-xs text-gray-500">
                Started: {formatDate(session.startTime)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
