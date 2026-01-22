/**
 * Collector Desktop UI Component
 * Desktop layout wrapper for collector schedules page.
 *
 * Features:
 * - Desktop-only display (hidden on mobile)
 * - Collector schedule filters
 * - Collector schedule table
 * - Loading states
 *
 * @param locations - Available locations list
 * @param collectors - Available collectors list
 * @param selectedLocation - Currently selected location
 * @param onLocationChange - Callback when location changes
 * @param selectedCollector - Currently selected collector
 * @param onCollectorChange - Callback when collector changes
 * @param selectedStatus - Currently selected status
 * @param onStatusChange - Callback when status changes
 * @param onResetFilters - Callback to reset all filters
 * @param collectorSchedules - Collector schedule data
 * @param loadingCollectorSchedules - Whether data is loading
 */
import CollectorScheduleFilters from '@/components/CMS/collectionReport/tabs/collector/CollectionReportCollectorScheduleFilters';
import CollectorScheduleTable from '@/components/CMS/collectionReport/tabs/collector/CollectionReportCollectorScheduleTable';
import { CollectionReportCollectorDesktopUIProps } from '@/lib/types/components';

/**
 * CollectionReportCollectorDesktop Component
 * Desktop layout wrapper for collector schedules page.
 */
export default function CollectionReportCollectorDesktop({
  selectedLocation,
  onLocationChange,
  selectedStatus,
  onStatusChange,
  selectedCollector,
  onCollectorChange,
  collectors,
  locations,
  onResetFilters,
  paginatedSchedules,
  loadingCollectorSchedules,
}: CollectionReportCollectorDesktopUIProps) {
  return (
    <div className="hidden space-y-4 lg:block">
      <CollectorScheduleFilters
        selectedLocation={selectedLocation}
        onLocationChange={onLocationChange}
        selectedStatus={selectedStatus}
        onStatusChange={onStatusChange}
        selectedCollector={selectedCollector}
        onCollectorChange={onCollectorChange}
        collectors={collectors}
        locations={locations}
        onResetFilters={onResetFilters}
        loading={loadingCollectorSchedules}
      />
      <div className="rounded-lg bg-white shadow-md">
        <div className="px-4 py-4">
          <CollectorScheduleTable
            data={paginatedSchedules}
            loading={loadingCollectorSchedules}
          />
        </div>
      </div>
    </div>
  );
}

