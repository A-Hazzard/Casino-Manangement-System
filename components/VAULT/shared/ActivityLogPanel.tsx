/**
 * Activity Log Panel Component
 *
 * Reusable component for viewing activity logs for both Vault Managers and Cashiers.
 *
 * @module components/VAULT/shared/ActivityLogPanel
 */

'use client';

import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Input } from '@/components/shared/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/shared/ui/table';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { safeFormatDate } from '@/lib/utils/date/formatting';
import { formatActivityType } from '@/lib/utils/formatters';
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
  limit?: number;
};

export default function ActivityLogPanel({
  locationId,
  userId,
  title = 'Activity Log',
  limit = 20,
}: ActivityLogPanelProps) {
  const { formatAmount } = useCurrencyFormat();
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType] = useState('all');

  const fetchActivities = useCallback(async () => {
    if (!locationId) return;

    setLoading(true);
    try {
      let url = `/api/vault/activity-log?locationId=${locationId}&limit=${limit}`;
      if (userId) url += `&userId=${userId}`;
      if (filterType !== 'all') url += `&type=${filterType}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setActivities(data.activities);
        }
      }
    } catch (error) {
      console.error('Failed to fetch activity log', error);
    } finally {
      setLoading(false);
    }
  }, [locationId, userId, filterType, limit]);

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
        return 'destructive';
      case 'vault_reconciliation':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const filteredActivities = activities.filter(act =>
    act.notes?.toLowerCase().includes(search.toLowerCase()) ||
    act.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card className="rounded-lg bg-container shadow-md border-t-4 border-orangeHighlight h-full animate-in fade-in duration-500">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <div className="flex h-8 w-8 items-center justify-center rounded border border-gray-300">
                <History className="h-4 w-4 text-orangeHighlight" />
            </div>
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search..."
                className="pl-8 w-[200px]"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Button variant="ghost" size="sm" onClick={fetchActivities} disabled={loading}>
              <Loader2 className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 sm:p-6 sm:pt-0">
        {/* Desktop Table */}
        <div className="hidden sm:block overflow-x-auto rounded-lg border border-gray-100 bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-button hover:bg-button transition-colors">
                <TableHead isFirstColumn className="font-semibold text-white">Time</TableHead>
                <TableHead className="font-semibold text-white">Type</TableHead>
                <TableHead className="font-semibold text-white">Amount</TableHead>
                <TableHead className="font-semibold text-white">Notes</TableHead>
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
              ) : filteredActivities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-gray-500 italic">
                    No activities found for this period.
                  </TableCell>
                </TableRow>
              ) : (
                filteredActivities.map(activity => (
                  <TableRow key={activity._id} className="transition-colors hover:bg-muted/30">
                    <TableCell isFirstColumn className="text-xs font-mono font-medium text-gray-600">
                      {safeFormatDate(activity.timestamp, { hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell>
                      <Badge className={getBadgeVariant(activity.type) === 'destructive' ? 'bg-red-100 text-red-700 hover:bg-red-100 border-none' : 'bg-blue-50 text-blue-700 hover:bg-blue-50 border-none'}>
                        {formatActivityType(activity.type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={activity.amount > 0 ? 'text-button font-bold' : 'text-orangeHighlight font-bold'}>
                        {formatAmount(activity.amount)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 max-w-[250px] truncate">
                      {activity.notes}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile View */}
        <div className="sm:hidden space-y-3 p-4 bg-gray-50/50">
           {loading ? (
              <div className="py-12 flex flex-col items-center gap-2">
                 <Loader2 className="h-8 w-8 animate-spin text-orangeHighlight" />
                 <span className="text-sm text-gray-500 italic">Loading activities...</span>
              </div>
           ) : filteredActivities.length === 0 ? (
              <div className="py-12 text-center text-gray-500 italic">
                 No activities found.
              </div>
           ) : (
              filteredActivities.map(activity => (
                <div key={activity._id} className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                     <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-tighter">
                        {safeFormatDate(activity.timestamp, { hour: '2-digit', minute: '2-digit' })}
                     </span>
                     <Badge className={getBadgeVariant(activity.type) === 'destructive' ? 'bg-red-100 text-red-700 hover:bg-red-100 border-none text-[10px]' : 'bg-blue-50 text-blue-700 hover:bg-blue-50 border-none text-[10px]'}>
                        {formatActivityType(activity.type)}
                     </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-gray-50 pt-2">
                     <p className="text-xs text-gray-600 truncate flex-1">{activity.notes}</p>
                     <span className={activity.amount > 0 ? 'text-sm font-bold text-button' : 'text-sm font-bold text-orangeHighlight'}>
                        {formatAmount(activity.amount)}
                     </span>
                  </div>
                </div>
              ))
           )}
        </div>
      </CardContent>
    </Card>
  );
}
