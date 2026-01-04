/**
 * Manager Mobile UI Component
 * Mobile layout wrapper for manager schedules page.
 *
 * Features:
 * - Mobile-only display (hidden on desktop)
 * - Manager schedule filters
 * - Manager schedule cards
 * - Loading states
 *
 * @param locations - Available locations list
 * @param collectors - Available collectors list
 * @param selectedSchedulerLocation - Currently selected location
 * @param onSchedulerLocationChange - Callback when location changes
 * @param selectedCollector - Currently selected collector
 * @param onCollectorChange - Callback when collector changes
 * @param selectedStatus - Currently selected status
 * @param onStatusChange - Callback when status changes
 * @param onResetSchedulerFilters - Callback to reset all filters
 * @param schedulers - Manager schedule data
 * @param loadingSchedulers - Whether data is loading
 */
import ManagerScheduleFilters from '@/components/collectionReport/tabs/manager/CollectionReportManagerScheduleFilters';
import ManagerScheduleCards from '@/components/collectionReport/tabs/manager/CollectionReportManagerScheduleCards';
import type { CollectionReportManagerMobileUIProps } from '@/lib/types/componentProps';

/**
 * CollectionReportManagerMobile Component
 * Mobile layout wrapper for manager schedules page.
 */
export default function CollectionReportManagerMobile({
  locations,
  collectors,
  selectedSchedulerLocation,
  onSchedulerLocationChange,
  selectedCollector,
  onCollectorChange,
  selectedStatus,
  onStatusChange,
  onResetSchedulerFilters,
  schedulers,
  loadingSchedulers,
}: CollectionReportManagerMobileUIProps) {
  return (
    <div className="w-full md:hidden">
      <div className="space-y-4">
        <ManagerScheduleFilters
          locations={locations}
          collectors={collectors}
          selectedLocation={selectedSchedulerLocation}
          onLocationChange={onSchedulerLocationChange}
          selectedCollector={selectedCollector}
          onCollectorChange={onCollectorChange}
          selectedStatus={selectedStatus}
          onStatusChange={onStatusChange}
          onReset={onResetSchedulerFilters}
          loading={loadingSchedulers}
        />
        <ManagerScheduleCards data={schedulers} loading={loadingSchedulers} />
      </div>
    </div>
  );
}
