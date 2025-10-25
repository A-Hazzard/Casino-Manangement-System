import { useAnalyticsDataStore } from '@/lib/store/reportsDataStore';
import { useState } from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, ArrowRight, Truck } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LogisticsEntry } from '@/lib/types/reports';
import { format } from 'date-fns';

const StatusBadge = ({ status }: { status: LogisticsEntry['status'] }) => {
  const statusStyles = {
    completed: 'bg-green-100 text-green-800 border-green-200',
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'in-progress': 'bg-blue-100 text-blue-800 border-blue-200',
    cancelled: 'bg-red-100 text-red-800 border-red-200',
  };
  return (
    <Badge variant="outline" className={`capitalize ${statusStyles[status]}`}>
      {status}
    </Badge>
  );
};

export default function LogisticsTab() {
  const { logisticsEntries } = useAnalyticsDataStore();
  // TODO: Add logistics filtering state to reports store
  const isLoading = false;
  const [logisticsSearchTerm, setLogisticsSearchTerm] = useState('');
  const [logisticsStatusFilter, setLogisticsStatusFilter] = useState('all');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col items-start justify-between space-y-4 sm:flex-row sm:items-center sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Machine Logistics
          </h2>
          <p className="text-sm text-grayHighlight">
            Track and audit all gaming machine movements.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Select
            value={logisticsStatusFilter}
            onValueChange={setLogisticsStatusFilter}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
            <Input
              placeholder="Search machine, location, user..."
              value={logisticsSearchTerm}
              onChange={e => setLogisticsSearchTerm(e.target.value)}
              className="w-64 pl-10"
            />
          </div>
        </div>
      </div>

      {/* Logistics Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Machine
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Movement
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Date
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Moved By
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Reason
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-buttonActive" />
                    </td>
                  </tr>
                ) : logisticsEntries.length > 0 ? (
                  logisticsEntries.map(entry => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="font-medium text-gray-900">
                          {entry.machineName}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {entry.machineId}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-600">
                            {entry.fromLocationName || 'Warehouse'}
                          </span>
                          <ArrowRight className="h-4 w-4 text-gray-400" />
                          <span className="font-semibold text-gray-900">
                            {entry.toLocationName}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {format(new Date(entry.moveDate), 'MMM dd, yyyy')}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <StatusBadge status={entry.status} />
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {entry.movedBy}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {entry.reason}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <Truck className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                      <h3 className="text-lg font-medium text-gray-900">
                        No Logistics Entries Found
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Try adjusting your search or filter.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
