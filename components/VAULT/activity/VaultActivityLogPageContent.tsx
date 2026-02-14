/**
 * Vault Activity Log Page Content
 *
 * Comprehensive activity log viewer with filtering, pagination, and CSV export.
 *
 * @module components/VAULT/activity/VaultActivityLogPageContent
 */

'use client';

import PageLayout from '@/components/shared/layout/PageLayout';
import ActivityLogDateFilter from '@/components/shared/ui/ActivityLogDateFilter';
import { Button } from '@/components/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Label } from '@/components/shared/ui/label';
import PaginationControls from '@/components/shared/ui/PaginationControls';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shared/ui/table';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useUserStore } from '@/lib/store/userStore';
import { cn } from '@/lib/utils';
import { getGamingDayRangeForPeriod } from '@/lib/utils/gamingDayRange';
import { TimePeriod } from '@/shared/types';
import { Download, RefreshCw, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import VaultManagerHeader from '../layout/VaultManagerHeader';

type ActivityLog = {
  _id: string;
  timestamp: string;
  type: string;
  amount: number;
  performedBy: string;
  performerName?: string;
  notes?: string;
  from?: { type: string; id?: string };
  to?: { type: string; id?: string };
};

type Cashier = {
  _id: string;
  username: string;
  profile?: {
    firstName: string;
    lastName: string;
  };
};

export default function VaultActivityLogPageContent() {
  const { user } = useUserStore();
  const { formatAmount } = useCurrencyFormat();
  
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  
  // Filters
  const [selectedCashier, setSelectedCashier] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('7d');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date } | undefined>();
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 50;

  const locationId = user?.assignedLocations?.[0];

  const fetchCashiers = async () => {
    if (!locationId) return;
    
    try {
      const res = await fetch(`/api/users?role=cashier&locationId=${locationId}`);
      const data = await res.json();
      if (data.success) {
        setCashiers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching cashiers:', error);
    }
  };

  const fetchActivities = async (page = 1) => {
    if (!locationId) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        locationId,
        limit: limit.toString(),
        skip: ((page - 1) * limit).toString(),
      });

      if (selectedCashier && selectedCashier !== 'all') {
        params.append('cashierId', selectedCashier);
      }
      if (selectedType && selectedType !== 'all') {
        params.append('type', selectedType);
      }
      
      // Calculate date range based on gaming day logic
      const { rangeStart, rangeEnd } = getGamingDayRangeForPeriod(
        timePeriod,
        8, // Default 8 AM offset if location config isn't specific
        customDateRange?.from,
        customDateRange?.to
      );

      params.append('startDate', rangeStart.toISOString());
      params.append('endDate', rangeEnd.toISOString());

      const res = await fetch(`/api/vault/activity-log?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setActivities(data.activities || []);
        setTotalCount(data.totalCount || 0);
        setTotalPages(Math.ceil((data.totalCount || 0) / limit));
      } else {
        toast.error('Failed to load activity log');
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
      toast.error('Error loading activity log');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // Effects
  // ============================================================================

  useEffect(() => {
    fetchCashiers();
  }, [locationId]);

  useEffect(() => {
    fetchActivities(1);
    setCurrentPage(1);
  }, [selectedCashier, selectedType, timePeriod, customDateRange]);

  useEffect(() => {
    fetchActivities(currentPage);
  }, [currentPage]);

  // ============================================================================
  // Helpers
  // ============================================================================
  const getActivityDescription = (activity: ActivityLog) => {
    const typeMap: Record<string, string> = {
      vault_open: 'Vault Shift Opened',
      vault_close: 'Vault Shift Closed',
      vault_reconciliation: 'Vault Reconciled',
      cashier_shift_open: 'Cashier Shift Started',
      cashier_shift_close: 'Cashier Shift Closed',
      float_increase: 'Float Increased',
      float_decrease: 'Float Decreased',
      payout: 'Payout',
      machine_collection: 'Machine Collection',
      soft_count: 'Soft Count',
      expense: 'Expense',
      add_cash: 'Cash Added',
      remove_cash: 'Cash Removed',
    };
    
    return typeMap[activity.type] || activity.type;
  };

  const getTypeStyle = (type: string) => {
    const styles: Record<string, { label: string; bg: string; text: string }> = {
      vault_open: { label: 'Shift Open', bg: 'bg-emerald-50', text: 'text-emerald-700' },
      vault_close: { label: 'Shift Close', bg: 'bg-slate-100', text: 'text-slate-700' },
      vault_reconciliation: { label: 'Audit', bg: 'bg-violet-50', text: 'text-violet-700' },
      cashier_shift_open: { label: 'Cashier Open', bg: 'bg-blue-50', text: 'text-blue-700' },
      cashier_shift_close: { label: 'Cashier Close', bg: 'bg-indigo-50', text: 'text-indigo-700' },
      float_increase: { label: 'Float Up', bg: 'bg-teal-50', text: 'text-teal-700' },
      float_decrease: { label: 'Float Down', bg: 'bg-orange-50', text: 'text-orange-700' },
      payout: { label: 'Payout', bg: 'bg-rose-50', text: 'text-rose-700' },
      machine_collection: { label: 'Collection', bg: 'bg-cyan-50', text: 'text-cyan-700' },
      soft_count: { label: 'Soft Count', bg: 'bg-amber-50', text: 'text-amber-700' },
      expense: { label: 'Expense', bg: 'bg-red-50', text: 'text-red-700' },
      add_cash: { label: 'Treasury In', bg: 'bg-green-50', text: 'text-green-700' },
      remove_cash: { label: 'Treasury Out', bg: 'bg-stone-50', text: 'text-stone-700' },
    };
    return styles[type] || { 
      label: type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '), 
      bg: 'bg-gray-50', 
      text: 'text-gray-700' 
    };
  };

  const formatTimestamp = (ts: string) => {
    const d = new Date(ts);
    return (
      <div className="flex flex-col">
        <span className="text-sm font-black text-gray-900 tracking-tight leading-none mb-1">
          {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
          <span className="h-1 w-1 rounded-full bg-gray-300" />
          {d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
        </span>
      </div>
    );
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      // Fetch all data for export (no pagination)
      const params = new URLSearchParams({ locationId: locationId!, limit: '10000' });
      
      if (selectedCashier && selectedCashier !== 'all') {
        params.append('cashierId', selectedCashier);
      }
      if (selectedType && selectedType !== 'all') {
        params.append('type', selectedType);
      }

      const { rangeStart, rangeEnd } = getGamingDayRangeForPeriod(
        timePeriod,
        8,
        customDateRange?.from,
        customDateRange?.to
      );

      params.append('startDate', rangeStart.toISOString());
      params.append('endDate', rangeEnd.toISOString());

      const res = await fetch(`/api/vault/activity-log?${params.toString()}`);
      const data = await res.json();

      if (data.success && data.activities) {
        // Convert to CSV
        const headers = ['Timestamp', 'Type', 'Description', 'Amount', 'Performed By', 'Notes'];
        const rows = data.activities.map((activity: ActivityLog) => [
          new Date(activity.timestamp).toLocaleString(),
          activity.type,
          getActivityDescription(activity),
          formatAmount(activity.amount || 0),
          activity.performerName || activity.performedBy,
          activity.notes || '',
        ]);

        const csvContent = [
          headers.join(','),
          ...rows.map((row: string[]) => row.map((cell: string) => `"${cell}"`).join(','))
        ].join('\n');

        // Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `vault-activity-log-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success('Activity log exported successfully');
      } else {
        toast.error('Failed to export activity log');
      }
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Error exporting activity log');
    } finally {
      setExporting(false);
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <PageLayout>
      <div className="space-y-6">
        {/* Header */}
        <VaultManagerHeader
          title="Activity Log"
          description="Comprehensive audit trail of all vault operations"
        >
          <div className="flex gap-2">
            <Button
              onClick={() => fetchActivities(currentPage)}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
              Refresh
            </Button>
            <Button
              onClick={handleExportCSV}
              disabled={exporting || activities.length === 0}
              variant="outline"
              size="sm"
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </VaultManagerHeader>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Cashier Filter */}
              <div className="space-y-2">
                <Label htmlFor="cashier-filter">Filter by Cashier</Label>
                <Select value={selectedCashier} onValueChange={setSelectedCashier}>
                  <SelectTrigger id="cashier-filter">
                    <SelectValue placeholder="All Cashiers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cashiers</SelectItem>
                    {cashiers.map((cashier: Cashier) => (
                      <SelectItem key={cashier._id} value={cashier._id}>
                        {cashier.profile
                          ? `${cashier.profile.firstName} ${cashier.profile.lastName}`
                          : cashier.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Type Filter */}
              <div className="space-y-2">
                <Label htmlFor="type-filter">Filter by Type</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger id="type-filter">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="payout">Payouts</SelectItem>
                    <SelectItem value="float_increase">Float Increase</SelectItem>
                    <SelectItem value="float_decrease">Float Decrease</SelectItem>
                    <SelectItem value="machine_collection">Machine Collection</SelectItem>
                    <SelectItem value="soft_count">Soft Count</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="add_cash">Add Cash</SelectItem>
                    <SelectItem value="remove_cash">Remove Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-6 border-t border-gray-100 pt-6">
               <Label className="mb-4 block text-xs font-bold uppercase tracking-widest text-gray-400">Date & Time Range</Label>
               <ActivityLogDateFilter 
                 onTimePeriodChange={setTimePeriod}
                 onDateRangeChange={(range) => {
                   if (range) {
                     setCustomDateRange({ from: range.from, to: range.to });
                   } else {
                     setCustomDateRange(undefined);
                   }
                 }}
               />
            </div>
          </CardContent>
        </Card>

        {/* Activity Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Activity Log</CardTitle>
              <span className="text-sm text-muted-foreground">
                {totalCount} total activities
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : activities.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                No activities found for the selected filters
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Performer</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activities.map((activity: ActivityLog) => {
                      const style = getTypeStyle(activity.type);
                      return (
                        <TableRow key={activity._id} className="group hover:bg-gray-50/50 transition-colors">
                          <TableCell className="py-4">
                            {formatTimestamp(activity.timestamp)}
                          </TableCell>
                          <TableCell>
                            <span className={cn(
                              "inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border",
                              style.bg,
                              style.text,
                              "border-current/10"
                            )}>
                              {style.label}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-gray-900">{activity.performerName || 'Unknown'}</span>
                              <span className="text-[10px] text-gray-400 font-mono tracking-tighter">{activity.performedBy}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold text-gray-700">{getActivityDescription(activity)}</TableCell>
                          <TableCell className="text-right py-4">
                             <div className="flex flex-col items-end">
                                <span className="font-mono font-black text-gray-900">{formatAmount(activity.amount || 0)}</span>
                                {activity.amount > 1000 && <span className="text-[8px] font-bold text-amber-600 uppercase tracking-tighter">High Value</span>}
                             </div>
                          </TableCell>
                          <TableCell className="max-w-xs truncate text-xs font-medium text-gray-500">
                            {activity.notes || '—'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-4">
                    <PaginationControls
                      currentPage={currentPage}
                      totalPages={totalPages}
                      setCurrentPage={setCurrentPage}
                    />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}