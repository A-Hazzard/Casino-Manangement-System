/**
 * Manager Mobile UI Component
 * Mobile layout wrapper for manager schedules page.
 *
 * Features:
 * - Mobile-only display (hidden on desktop)
 * - Manager schedule filters
 * - Manager schedule cards with edit/delete actions
 * - Loading states
 */
import ManagerScheduleCards from '@/components/CMS/collectionReport/tabs/manager/CollectionReportManagerScheduleCards';
import ManagerScheduleFilters from '@/components/CMS/collectionReport/tabs/manager/CollectionReportManagerScheduleFilters';
import type { CollectionReportManagerMobileUIProps } from '@/lib/types/components';

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
  paginatedSchedulers,
  loadingSchedulers,
  onEdit,
  onDelete,
  showActions,
}: CollectionReportManagerMobileUIProps) {
  return (
    <div className="w-full lg:hidden">
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
        <ManagerScheduleCards
          data={paginatedSchedulers}
          loading={loadingSchedulers}
          onEdit={onEdit}
          onDelete={onDelete}
          showActions={showActions}
        />
      </div>
    </div>
  );
}
