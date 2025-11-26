/**
 * Manager Schedule Filters Component
 * Filter bar for manager schedules with location, collector, and status filters.
 *
 * Features:
 * - Location selection dropdown
 * - Collector selection dropdown
 * - Status selection dropdown
 * - Reset filters button
 * - Loading states
 * - Responsive design
 *
 * @param locations - Available locations list
 * @param collectors - Available collectors list
 * @param selectedLocation - Currently selected location
 * @param onLocationChange - Callback when location changes
 * @param selectedCollector - Currently selected collector
 * @param onCollectorChange - Callback when collector changes
 * @param selectedStatus - Currently selected status
 * @param onStatusChange - Callback when status changes
 * @param onReset - Callback to reset all filters
 * @param loading - Whether data is loading
 */
import React from 'react';
import type { LocationSelectItem } from '@/lib/types/location';

type Props = {
  locations: LocationSelectItem[];
  collectors: string[];
  selectedLocation: string;
  onLocationChange: (locationId: string) => void;
  selectedCollector: string;
  onCollectorChange: (collector: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  onReset: () => void;
  loading?: boolean;
};

export default function ManagerScheduleFilters({
  locations,
  collectors,
  selectedLocation,
  onLocationChange,
  selectedCollector,
  onCollectorChange,
  selectedStatus,
  onStatusChange,
  onReset,
  loading = false,
}: Props) {
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
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="canceled">Canceled</option>
        </select>
      </div>
      <button
        className="mt-3 w-full rounded-md bg-button px-4 py-2 text-base font-semibold text-white md:ml-auto md:mt-0 md:w-auto"
        onClick={onReset}
        disabled={loading}
      >
        Reset Filter
      </button>
    </div>
  );
}
