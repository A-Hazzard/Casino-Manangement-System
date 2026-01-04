/**
 * Collector Mobile UI Component
 * Mobile layout wrapper for collector schedules page.
 *
 * Features:
 * - Mobile-only display (hidden on desktop)
 * - Collector schedule filters
 * - Collector schedule cards
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
import CollectorScheduleFilters from '@/components/collectionReport/tabs/collector/CollectionReportCollectorScheduleFilters';
import CollectorScheduleCards from '@/components/collectionReport/tabs/collector/CollectionReportCollectorScheduleCards';
import { CollectionReportCollectorMobileUIProps } from '@/lib/types/componentProps';

/**
 * CollectionReportCollectorMobile Component
 * Mobile layout wrapper for collector schedules page.
 */
export default function CollectionReportCollectorMobile({
  selectedLocation,
  onLocationChange,
  selectedStatus,
  onStatusChange,
  selectedCollector,
  onCollectorChange,
  collectors,
  locations,
  onResetFilters,
  collectorSchedules,
  loadingCollectorSchedules,
}: CollectionReportCollectorMobileUIProps) {
  return (
    <div className="w-full md:hidden">
      <div className="space-y-4">
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
        <CollectorScheduleCards
          data={collectorSchedules}
          loading={loadingCollectorSchedules}
        />
      </div>
    </div>
  );
}
