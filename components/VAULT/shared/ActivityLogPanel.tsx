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
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5" />
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
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-gray-400" />
                  </TableCell>
                </TableRow>
              ) : filteredActivities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-gray-500">
                    No activities found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredActivities.map(activity => (
                  <TableRow key={activity._id}>
                    <TableCell className="text-xs font-mono">
                      {new Date(activity.timestamp).toLocaleTimeString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getBadgeVariant(activity.type)}>
                        {activity.type.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className={activity.amount > 0 ? 'text-green-600 font-medium' : ''}>
                      {formatAmount(activity.amount)}
                    </TableCell>
                    <TableCell className="text-sm truncate max-w-[200px]">
                      {activity.notes}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
