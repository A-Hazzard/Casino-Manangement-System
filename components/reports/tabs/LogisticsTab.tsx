import { useAnalyticsDataStore } from "@/lib/store/reportsDataStore";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, ArrowRight, Truck } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LogisticsEntry } from "@/lib/types/reports";
import { format } from "date-fns";

const StatusBadge = ({ status }: { status: LogisticsEntry["status"] }) => {
  const statusStyles = {
    completed: "bg-green-100 text-green-800 border-green-200",
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    "in-progress": "bg-blue-100 text-blue-800 border-blue-200",
    cancelled: "bg-red-100 text-red-800 border-red-200",
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
  const logisticsSearchTerm = "";
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const setLogisticsSearchTerm = (_: string) => {};
  const logisticsStatusFilter = "all";
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const setLogisticsStatusFilter = (_: string) => {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
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
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search machine, location, user..."
              value={logisticsSearchTerm}
              onChange={(e) => setLogisticsSearchTerm(e.target.value)}
              className="pl-10 w-64"
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
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Machine
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Movement
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Date
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Moved By
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Reason
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-buttonActive mx-auto" />
                    </td>
                  </tr>
                ) : logisticsEntries.length > 0 ? (
                  logisticsEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">
                          {entry.machineName}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {entry.machineId}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-600">
                            {entry.fromLocationName || "Warehouse"}
                          </span>
                          <ArrowRight className="w-4 h-4 text-gray-400" />
                          <span className="font-semibold text-gray-900">
                            {entry.toLocationName}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(entry.moveDate), "MMM dd, yyyy")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={entry.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {entry.movedBy}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {entry.reason}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-12">
                      <Truck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900">
                        No Logistics Entries Found
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
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
