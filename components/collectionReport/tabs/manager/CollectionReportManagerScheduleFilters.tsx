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
import type { CollectionReportManagerScheduleFiltersProps } from '@/lib/types/componentProps';
import type { LocationSelectItem } from '@/lib/types/location';

export default function CollectionReportManagerScheduleFilters({
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
}: CollectionReportManagerScheduleFiltersProps) {
  return (
    <div className="flex w-full flex-col gap-3 rounded-t-lg bg-buttonActive p-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        <select
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-buttonActive focus:outline-none focus:ring-2 focus:ring-buttonActive/20 md:w-auto md:min-w-[160px]"
          value={selectedLocation}
          onChange={e => onLocationChange(e.target.value)}
          disabled={loading}
        >
          <option value="all">All Locations</option>
          {locations.map((loc: LocationSelectItem) => (
            <option key={loc._id} value={loc._id}>
              {loc.name}
            </option>
          ))}
        </select>
        <select
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-buttonActive focus:outline-none focus:ring-2 focus:ring-buttonActive/20 md:w-auto md:min-w-[160px]"
          value={selectedCollector}
          onChange={e => onCollectorChange(e.target.value)}
          disabled={loading}
        >
          <option value="all">All Collectors</option>
          {collectors.map((collector: string) => (
            <option key={collector} value={collector}>
              {collector}
            </option>
          ))}
        </select>
        <select
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-buttonActive focus:outline-none focus:ring-2 focus:ring-buttonActive/20 md:w-auto md:min-w-[160px]"
          value={selectedStatus}
          onChange={e => onStatusChange(e.target.value)}
          disabled={loading}
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="canceled">Canceled</option>
        </select>
      </div>
      <button
        className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 md:w-auto"
        onClick={onReset}
        disabled={loading}
      >
        Reset
      </button>
    </div>
  );
}
