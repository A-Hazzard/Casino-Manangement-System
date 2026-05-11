'use client';

import { useMembersActivityLog } from '@/lib/hooks/members/useMembersActivityLog';
import { format } from 'date-fns';
import {
  Activity,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Info,
  Smartphone,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Card, CardContent } from '@/components/shared/ui/card';

/**
 * MembersActivityLogTab Component
 * Displays a table of activity logs related to members (mostly SMS logs).
 * Restricted to Admins, Developers, and Owners.
 */
export default function MembersActivityLogTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const { activities, isLoading, pagination, refreshData } =
    useMembersActivityLog({
      page,
      limit: 15,
      search: debouncedSearch,
    });

  // Handle search with debounce behavior
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    // Simple debounce
    const handler = setTimeout(() => {
      setDebouncedSearch(e.target.value);
      setPage(1);
    }, 500);
    return () => clearTimeout(handler);
  };

  const getActionIcon = (action: string) => {
    if (action.includes('success'))
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    if (action.includes('failed'))
      return <XCircle className="h-4 w-4 text-rose-500" />;
    if (action.includes('sms'))
      return <Smartphone className="h-4 w-4 text-sky-500" />;
    return <Activity className="h-4 w-4 text-slate-500" />;
  };

  const formatAction = (action: string) => {
    return action
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="mt-6 space-y-6">
      {/* Filters Bar */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search logs (phone, user, action)..."
            value={search}
            onChange={handleSearchChange}
            className="border-none bg-slate-50 pl-10 ring-1 ring-slate-200 transition-all focus:ring-sky-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshData()}
            disabled={isLoading}
            className="flex items-center gap-2 transition-colors hover:bg-slate-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Logs Table */}
      <Card className="overflow-hidden border-none bg-white shadow-md">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="w-48 px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Timestamp
                  </th>
                  <th className="w-40 px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Action
                  </th>
                  <th className="w-48 px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    User
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Details
                  </th>
                  <th className="w-32 px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="px-6 py-6">
                        <div className="h-4 w-full rounded bg-slate-100"></div>
                      </td>
                    </tr>
                  ))
                ) : activities.length > 0 ? (
                  activities.map(log => (
                    <tr
                      key={log._id}
                      className="group transition-colors hover:bg-slate-50/50"
                    >
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-700">
                            {format(new Date(log.timestamp), 'MMM d, yyyy')}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <Clock className="h-3 w-3" />
                            {format(new Date(log.timestamp), 'HH:mm:ss')}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-2 rounded-full bg-slate-100/50 px-2.5 py-1 text-xs font-medium text-slate-600">
                          {getActionIcon(log.action)}
                          {formatAction(log.action)}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-700">
                            {log.username}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {log.ipAddress}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="line-clamp-2 text-sm leading-relaxed text-slate-600">
                          {log.details}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        {log.action.includes('success') ? (
                          <span className="inline-flex items-center rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                            Success
                          </span>
                        ) : log.action.includes('failed') ? (
                          <span className="inline-flex items-center rounded bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800">
                            Failed
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800">
                            Logged
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Info className="h-10 w-10 text-slate-200" />
                        <p className="font-medium text-slate-400">
                          No activity logs found
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-100 bg-transparent px-2 pt-4">
          <p className="text-sm text-slate-500">
            Showing{' '}
            <span className="font-medium">
              {(page - 1) * pagination.limit + 1}
            </span>{' '}
            to{' '}
            <span className="font-medium">
              {Math.min(page * pagination.limit, pagination.totalCount)}
            </span>{' '}
            of <span className="font-medium">{pagination.totalCount}</span> logs
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              disabled={page === 1 || isLoading}
              onClick={() => setPage(page - 1)}
              className="h-8 w-8 text-slate-500 transition-colors hover:text-sky-600"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex h-8 items-center rounded-md border border-slate-200 bg-white px-3 shadow-sm">
              <span className="text-sm font-semibold text-slate-700">
                {page}{' '}
                <span className="mx-1 font-normal text-slate-300">/</span>{' '}
                {pagination.totalPages}
              </span>
            </div>
            <Button
              variant="outline"
              size="icon"
              disabled={page === pagination.totalPages || isLoading}
              onClick={() => setPage(page + 1)}
              className="h-8 w-8 text-slate-500 transition-colors hover:text-sky-600"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
