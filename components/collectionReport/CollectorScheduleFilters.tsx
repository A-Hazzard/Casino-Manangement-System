import React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw } from "lucide-react";
import { CollectorScheduleFiltersProps } from "@/lib/types/componentProps";

export default function CollectorScheduleFilters({
  selectedLocation,
  onLocationChange,
  selectedStatus,
  onStatusChange,
  selectedCollector,
  onCollectorChange,
  collectors,
  locations,
  onResetFilters,
  loading,
}: CollectorScheduleFiltersProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        {/* Location Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Location
          </label>
          <Select value={selectedLocation} onValueChange={onLocationChange} disabled={loading}>
            <SelectTrigger>
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations.map((location) => (
                <SelectItem key={location._id} value={location._id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Collector Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Collector
          </label>
          <Select value={selectedCollector} onValueChange={onCollectorChange} disabled={loading}>
            <SelectTrigger>
              <SelectValue placeholder="All Collectors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Collectors</SelectItem>
              {collectors.map((collector) => (
                <SelectItem key={collector} value={collector}>
                  {collector}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <Select value={selectedStatus} onValueChange={onStatusChange} disabled={loading}>
            <SelectTrigger>
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Reset Button */}
        <div className="flex items-end">
          <Button
            onClick={onResetFilters}
            variant="outline"
            className="w-full flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Reset Filters
          </Button>
        </div>
      </div>
    </div>
  );
}
