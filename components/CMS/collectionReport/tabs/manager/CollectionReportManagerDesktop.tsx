/**
 * Manager Desktop UI Component
 * Desktop layout wrapper for manager schedules page.
 *
 * Features:
 * - Desktop-only display (hidden on mobile)
 * - Manager schedule filters
 * - Manager schedule table with edit/delete actions
 * - Loading states
 */
import ManagerScheduleFilters from '@/components/CMS/collectionReport/tabs/manager/CollectionReportManagerScheduleFilters';
import ManagerScheduleTable from '@/components/CMS/collectionReport/tabs/manager/CollectionReportManagerScheduleTable';
import type { CollectionReportManagerDesktopUIProps } from '@/lib/types/components';

export default function CollectionReportManagerDesktop({
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
}: CollectionReportManagerDesktopUIProps) {
  return (
    <div className="hidden space-y-4 lg:block">
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
      <div className="rounded-lg bg-white shadow-md">
        <div className="px-4 py-4">
          <ManagerScheduleTable
            data={paginatedSchedulers}
            loading={loadingSchedulers}
            onEdit={onEdit}
            onDelete={onDelete}
            showActions={showActions}
          />
        </div>
      </div>
    </div>
  );
}
