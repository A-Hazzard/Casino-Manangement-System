/**
 * Audit Trail Viewer Component
 *
 * Detailed transaction history with search and filtering capabilities.
 * Allows VM to review all vault operations and transactions.
 *
 * @module components/VAULT/reports/AuditTrailViewer
 */

'use client';

import { Button } from '@/components/shared/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/shared/ui/card';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
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
import { fetchAuditTrail } from '@/lib/helpers/vaultHelpers';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useUserStore } from '@/lib/store/userStore';
import {
    AlertTriangle,
    FileText,
    Filter,
    RefreshCw,
    Search,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const TRANSACTION_TYPES = [
  'all',
  'vault_open',
  'vault_close',
  'cashier_shift_open',
  'cashier_shift_close',
  'float_increase',
  'float_decrease',
  'payout',
  'machine_collection',
  'soft_count',
  'expense',
];

export default function AuditTrailViewer() {
  const { formatAmount } = useCurrencyFormat();
  const { user } = useUserStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [auditTrail, setAuditTrail] = useState<any[]>([]);
  const [totalEntries, setTotalEntries] = useState(0);

  useEffect(() => {
    fetchData();
  }, [user?.assignedLocations, typeFilter, statusFilter, dateFrom, dateTo]);

  const fetchData = async () => {
    const locationId = user?.assignedLocations?.[0];
    if (!locationId) return;

    setLoading(true);
    setError(null);
    try {
      const data = await fetchAuditTrail(locationId, {
        searchTerm,
        type: typeFilter,
        status: statusFilter,
        dateFrom,
        dateTo,
      });
      setAuditTrail(data.entries);
      setTotalEntries(data.total);
    } catch (err) {
      console.error('Failed to fetch audit trail', err);
      setError('Failed to load audit trail');
      toast.error('Failed to load transaction history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Audit Trail Viewer
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Detailed history of all vault operations and transactions
          </p>
        </div>
        <Button
          onClick={fetchData}
          variant="outline"
          size="sm"
          disabled={loading}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
          />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search notes..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && fetchData()}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="type">Transaction Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRANSACTION_TYPES.map(type => (
                    <SelectItem key={type} value={type}>
                      {type === 'all' ? 'All Types' : getTypeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="dateFrom">Date From</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4 flex gap-4">
            <div>
              <Label htmlFor="dateTo">Date To</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={fetchData} disabled={loading}>
                Apply Filters
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setTypeFilter('all');
                  setStatusFilter('all');
                  setDateFrom('');
                  setDateTo('');
                }}
              >
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Trail Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Audit Trail ({totalEntries} entries)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="mb-4 h-10 w-10 text-red-500" />
              <p className="mb-4 text-gray-600">{error}</p>
              <Button onClick={fetchData} variant="outline">
                Retry
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Performed By</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center">
                      <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin text-gray-400" />
                      Loading transactions...
                    </TableCell>
                  </TableRow>
                ) : auditTrail.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-8 text-center text-gray-500"
                    >
                      No audit trail entries found matching the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  auditTrail.map(entry => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-mono text-sm">
                        {entry.timestamp}
                      </TableCell>
                      <TableCell>
                        <span className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-800">
                          {getTypeLabel(entry.type)}
                        </span>
                      </TableCell>
                      <TableCell>{entry.description}</TableCell>
                      <TableCell>{entry.performedBy}</TableCell>
                      <TableCell className="font-mono">
                        {entry.type === 'vault_reconciliation' && entry.balanceBefore !== undefined ? (
                          <div className="flex flex-col text-[10px]">
                            <span className="text-gray-400">Shift:</span>
                            <span className="font-bold text-gray-900">
                              {formatAmount(entry.balanceBefore)} → {formatAmount(entry.balanceAfter)}
                            </span>
                            <span className={`mt-0.5 ${entry.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ({entry.amount >= 0 ? '+' : ''}{formatAmount(entry.amount)})
                            </span>
                          </div>
                        ) : (
                          entry.amount > 0 ? formatAmount(entry.amount) : '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(entry.status)}`}
                        >
                          {entry.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
