import React from 'react';
import { CollectorScheduleFiltersProps } from '@/lib/types/componentProps';

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
    <div className="flex w-full flex-col gap-y-3 rounded-b-none rounded-t-lg bg-buttonActive p-4 md:flex-row md:items-center md:justify-between md:gap-x-4">
      <div className="flex flex-1 flex-col md:flex-row md:gap-x-4">
        <select
          className="mb-1 w-full min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-4 py-2 text-base text-black focus:ring-2 focus:ring-buttonActive"
          value={selectedLocation}
          onChange={e => onLocationChange(e.target.value)}
          disabled={loading}
        >
          <option value="all">Select Location</option>
          {locations.map(loc => (
            <option key={loc._id} value={loc._id}>
              {loc.name}
            </option>
          ))}
        </select>
        <select
          className="mb-1 w-full min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-4 py-2 text-base text-black focus:ring-2 focus:ring-buttonActive"
          value={selectedCollector}
          onChange={e => onCollectorChange(e.target.value)}
          disabled={loading}
        >
          <option value="all">Select Collector</option>
          {collectors.map(collector => (
            <option key={collector} value={collector}>
              {collector}
            </option>
          ))}
        </select>
        <select
          className="w-full min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-4 py-2 text-base text-black focus:ring-2 focus:ring-buttonActive"
          value={selectedStatus}
          onChange={e => onStatusChange(e.target.value)}
          disabled={loading}
        >
          <option value="all">Select Status</option>
          <option value="scheduled">Scheduled</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      <button
        className="mt-3 w-full rounded-md bg-button px-4 py-2 text-base font-semibold text-white md:ml-auto md:mt-0 md:w-auto"
        onClick={onResetFilters}
        disabled={loading}
      >
        Reset Filter
      </button>
    </div>
  );
}
