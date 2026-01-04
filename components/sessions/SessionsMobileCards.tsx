'use client';

import { Button } from '@/components/ui/button';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { SessionsTableProps } from '@/lib/types/sessions';
import { formatDate } from '@/lib/utils/dateFormatting';
import { Eye } from 'lucide-react';
import Link from 'next/link';
import { formatDuration } from './SessionsDesktopTable';

export function SessionsMobileCards({ sessions }: Pick<SessionsTableProps, 'sessions'>) {
  const { formatAmount } = useCurrencyFormat();

  return (
    <div className="block p-4 lg:hidden">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {sessions.map((session) => (
          <div
            key={session._id}
            className="overflow-hidden rounded-lg border bg-white transition-shadow hover:shadow-md"
          >
            {/* Card Header */}
            <div className="border-b bg-gradient-to-r from-gray-50 to-white p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-gray-900">
                    {session.memberName || 'Unknown Player'}
                  </div>
                  <div className="text-xs text-gray-500">ID: {session.memberId || 'N/A'}</div>
                </div>
                <Link href={`/sessions/${session._id}/${session.machineId || ''}/events`}>
                  <Button size="sm" variant="outline" className="h-8 gap-1">
                    <Eye className="h-3 w-3" />
                    View Events
                  </Button>
                </Link>
              </div>
            </div>
            {/* Card Content */}
            <div className="p-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500">Machine</span>
                  <span className="font-medium text-gray-900">
                    {session.machineSerialNumber || 'N/A'}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500">Duration</span>
                  <span className="font-medium text-gray-900">{formatDuration(session.duration)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500">Handle</span>
                  <span className="font-medium text-gray-900">{formatAmount(session.handle)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500">Jackpot</span>
                  <span className="font-medium text-gray-900">{formatAmount(session.jackpot)}</span>
                </div>
                <div className="col-span-2 flex flex-col border-t pt-2">
                  <span className="text-xs text-gray-500">Start Time</span>
                  <span className="font-medium text-gray-900">{formatDate(session.startTime)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
