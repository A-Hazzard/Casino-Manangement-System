/**
 * Activity Log Panel Component
 *
 * Reusable component for viewing activity logs for both Vault Managers and Cashiers.
 *
 * @module components/VAULT/shared/ActivityLogPanel
 */

'use client';

import ActivityLogDateFilter from '@/components/shared/ui/ActivityLogDateFilter';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Input } from '@/components/shared/ui/input';
import PaginationControls from '@/components/shared/ui/PaginationControls';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/shared/ui/table';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { cn } from '@/lib/utils';
import { safeFormatDate } from '@/lib/utils/date/formatting';
import { formatActivityType } from '@/lib/utils/formatters';
import { AnimatePresence, motion } from 'framer-motion';
import { History, Loader2, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

type ActivityLogEntry = {
  _id: string;
  timestamp: string;
  type: string;
  amount: number;
  performedBy: string;
  notes?: string;
  metadata?: any;
};

type ActivityLogPanelProps = {
  locationId: string;
  userId?: string;
  title?: string;
  limit?: number; // Background limit
};

export default function ActivityLogPanel({
  locationId,
  userId,
  title = 'Activity Log',
  limit = 100, // Query limit in background
}: ActivityLogPanelProps) {
  const { formatAmount } = useCurrencyFormat();
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Date filtering state
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>();

  // Pagination state (client-side of the fetched limit)
  const [currentPage, setCurrentPage] = useState(0);
  const ITEMS_PER_PAGE = 20;

  const fetchActivities = useCallback(async () => {
    if (!locationId) return;

    setLoading(true);
    try {
      let url = `/api/vault/activity-log?locationId=${locationId}&limit=${limit}`;
      if (userId) url += `&userId=${userId}`;
      
      if (dateRange?.from) url += `&startDate=${dateRange.from.toISOString()}`;
      if (dateRange?.to) url += `&endDate=${dateRange.to.toISOString()}`;
      // In a real scenario we'd use timePeriod on backend if supported, or calculate dateRange on frontend.
      // ActivityLogDateFilter handles generating the custom dateRange object or passes custom timePeriod string.
      // We will rely on dateRange mostly if provided.

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setActivities(data.activities || []);
          setCurrentPage(0); // Reset page on new fetch
        }
      }
    } catch (error) {
      console.error('Failed to fetch activity log', error);
    } finally {
      setLoading(false);
    }
  }, [locationId, userId, limit, dateRange]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case 'float_increase':
      case 'cashier_shift_open':
        return 'default';
      case 'float_decrease':
        return 'outline';
      case 'expense':
      case 'payout':
        return 'destructive';
      case 'vault_reconciliation':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const isNegativeActivity = (type: string, amount: number) => {
    return ['float_decrease', 'expense', 'payout'].includes(type) || amount < 0;
  };

  const filteredActivities = activities.filter(act =>
    act.notes?.toLowerCase().includes(search.toLowerCase()) ||
    act.type.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredActivities.length / ITEMS_PER_PAGE);
  const paginatedActivities = filteredActivities.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );

  return (
    <Card className="rounded-lg bg-container shadow-md border-t-4 border-orangeHighlight h-full animate-in fade-in duration-500 flex flex-col">
      <CardHeader className="pb-4 space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <div className="flex h-8 w-8 items-center justify-center rounded border border-gray-300">
                <History className="h-4 w-4 text-orangeHighlight" />
            </div>
            {title}
          </CardTitle>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search logs..."
                className="pl-8 sm:w-[250px]"
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setCurrentPage(0);
                }}
              />
            </div>
            <Button variant="outline" size="icon" onClick={fetchActivities} disabled={loading} className="shrink-0">
              <Loader2 className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Custom Date Filters */}
        <ActivityLogDateFilter
          onDateRangeChange={(range) => setDateRange(range)}
          onTimePeriodChange={() => {}}
          disabled={loading}
        />
      </CardHeader>
      
      <CardContent className="p-0 sm:p-6 sm:pt-0 flex-1 flex flex-col">
        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto rounded-lg border border-gray-100 bg-white shadow-sm flex-1">
          <Table>
            <TableHeader>
              <TableRow className="bg-button hover:bg-button transition-colors">
                <TableHead isFirstColumn className="font-semibold text-white">Type</TableHead>
                <TableHead className="font-semibold text-white text-right">Amount</TableHead>
                <TableHead className="font-semibold text-white pl-8">Notes</TableHead>
                <TableHead className="font-semibold text-white text-right">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-orangeHighlight" />
                        <span className="text-sm text-gray-500 font-medium">Loading activities...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedActivities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-gray-500 italic">
                    No activities found matching criteria.
                  </TableCell>
                </TableRow>
              ) : (
                <AnimatePresence initial={false}>
                  {paginatedActivities.map(activity => {
                    const isNeg = isNegativeActivity(activity.type, activity.amount);
                    return (
                      <motion.tr 
                        key={activity._id} 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="transition-colors hover:bg-muted/30"
                      >
                        <TableCell isFirstColumn>
                          <Badge className={getBadgeVariant(activity.type) === 'destructive' ? 'bg-red-100 text-red-700 hover:bg-red-100 border-none' : 'bg-blue-50 text-blue-700 hover:bg-blue-50 border-none'}>
                            {formatActivityType(activity.type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn("font-bold whitespace-nowrap", isNeg ? "text-red-600" : "text-green-600")}>
                            {isNeg ? `-${formatAmount(Math.abs(activity.amount))}` : formatAmount(activity.amount)}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 truncate max-w-[400px] pl-8">
                          {activity.notes || '-'}
                        </TableCell>
                        <TableCell className="text-xs font-mono font-medium text-gray-600 text-right">
                          {safeFormatDate(activity.timestamp, { month: 'numeric', day: 'numeric', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Cards View */}
        <div className="sm:hidden space-y-3 p-4 bg-gray-50/50 flex-1">
           {loading ? (
              <div className="py-12 flex flex-col items-center gap-2">
                 <Loader2 className="h-8 w-8 animate-spin text-orangeHighlight" />
                 <span className="text-sm text-gray-500 italic">Loading activities...</span>
              </div>
           ) : paginatedActivities.length === 0 ? (
              <div className="py-12 text-center text-gray-500 italic">
                 No activities found.
              </div>
           ) : (
              <AnimatePresence initial={false}>
                {paginatedActivities.map(activity => {
                  const isNeg = isNegativeActivity(activity.type, activity.amount);
                  return (
                    <motion.div 
                      key={activity._id} 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className={cn("bg-white rounded-lg border p-4 shadow-sm space-y-2 border-l-4", isNeg ? "border-l-red-600" : "border-l-green-600 border-gray-100")}
                    >
                      <div className="flex items-center justify-between">
                         <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-tighter">
                            {safeFormatDate(activity.timestamp, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                         </span>
                         <Badge className={getBadgeVariant(activity.type) === 'destructive' ? 'bg-red-100 text-red-700 hover:bg-red-100 border-none text-[10px]' : 'bg-blue-50 text-blue-700 hover:bg-blue-50 border-none text-[10px]'}>
                            {formatActivityType(activity.type)}
                         </Badge>
                      </div>
                      <div className="flex items-center justify-between gap-2 border-t border-gray-50 pt-2">
                         <p className="text-xs text-gray-600 truncate flex-1">{activity.notes || '-'}</p>
                         <span className={cn("text-sm font-bold", isNeg ? "text-red-600" : "text-green-600")}>
                            {isNeg ? `-${formatAmount(Math.abs(activity.amount))}` : formatAmount(activity.amount)}
                         </span>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
           )}
        </div>

        {/* Pagination Details */}
        {!loading && filteredActivities.length > 0 && (
          <div className="pt-4 border-t px-4 sm:px-0">
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              setCurrentPage={setCurrentPage}
              totalCount={filteredActivities.length}
              limit={ITEMS_PER_PAGE}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
