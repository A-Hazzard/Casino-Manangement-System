/**
 * Collector Mobile UI Component
 * Mobile layout wrapper for collector schedules page.
 *
 * Features:
 * - Mobile-only display (hidden on desktop)
 * - Collector schedule filters
 * - Collector schedule cards with edit/delete actions
 * - Loading states
 */
import CollectorScheduleCards from '@/components/CMS/collectionReport/tabs/collector/CollectionReportCollectorScheduleCards';
import CollectorScheduleFilters from '@/components/CMS/collectionReport/tabs/collector/CollectionReportCollectorScheduleFilters';
import { CollectionReportCollectorMobileUIProps } from '@/lib/types/components';

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
  paginatedSchedules,
  loadingCollectorSchedules,
  onEdit,
  onDelete,
  showActions,
}: CollectionReportCollectorMobileUIProps) {
  return (
    <div className="w-full lg:hidden">
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
          data={paginatedSchedules}
          loading={loadingCollectorSchedules}
          onEdit={onEdit}
          onDelete={onDelete}
          showActions={showActions}
        />
      </div>
    </div>
  );
}
