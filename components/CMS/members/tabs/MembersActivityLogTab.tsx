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
  Clock
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

  const { activities, isLoading, pagination, refreshData } = useMembersActivityLog({
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
    if (action.includes('success')) return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    if (action.includes('failed')) return <XCircle className="h-4 w-4 text-rose-500" />;
    if (action.includes('sms')) return <Smartphone className="h-4 w-4 text-sky-500" />;
    return <Activity className="h-4 w-4 text-slate-500" />;
  };

  const formatAction = (action: string) => {
    return action.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="space-y-6 mt-6">
      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search logs (phone, user, action)..."
            value={search}
            onChange={handleSearchChange}
            className="pl-10 bg-slate-50 border-none ring-1 ring-slate-200 focus:ring-sky-500 transition-all"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refreshData()} 
            disabled={isLoading}
            className="flex items-center gap-2 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Logs Table */}
      <Card className="border-none shadow-md overflow-hidden bg-white">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-48">Timestamp</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-40">Action</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-48">User</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Details</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="px-6 py-6"><div className="h-4 bg-slate-100 rounded w-full"></div></td>
                    </tr>
                  ))
                ) : activities.length > 0 ? (
                  activities.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-700">
                            {format(new Date(log.timestamp), 'MMM d, yyyy')}
                          </span>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(log.timestamp), 'HH:mm:ss')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100/50 text-slate-600">
                          {getActionIcon(log.action)}
                          {formatAction(log.action)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm text-slate-700 font-medium">{log.username}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{log.ipAddress}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                          {log.details}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {log.action.includes('success') ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                            Success
                          </span>
                        ) : log.action.includes('failed') ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-100 text-rose-800">
                            Failed
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
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
                        <p className="text-slate-400 font-medium">No activity logs found</p>
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
        <div className="flex items-center justify-between border-t border-slate-100 pt-4 bg-transparent px-2">
          <p className="text-sm text-slate-500">
            Showing <span className="font-medium">{(page - 1) * pagination.limit + 1}</span> to{' '}
            <span className="font-medium">
              {Math.min(page * pagination.limit, pagination.totalCount)}
            </span> of{' '}
            <span className="font-medium">{pagination.totalCount}</span> logs
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              disabled={page === 1 || isLoading}
              onClick={() => setPage(page - 1)}
              className="h-8 w-8 text-slate-500 hover:text-sky-600 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center bg-white border border-slate-200 rounded-md px-3 h-8 shadow-sm">
              <span className="text-sm font-semibold text-slate-700">
                {page} <span className="text-slate-300 font-normal mx-1">/</span> {pagination.totalPages}
              </span>
            </div>
            <Button
              variant="outline"
              size="icon"
              disabled={page === pagination.totalPages || isLoading}
              onClick={() => setPage(page + 1)}
              className="h-8 w-8 text-slate-500 hover:text-sky-600 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
