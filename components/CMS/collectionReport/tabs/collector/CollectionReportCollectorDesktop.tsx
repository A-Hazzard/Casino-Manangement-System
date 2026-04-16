/**
 * Collector Desktop UI Component
 * Desktop layout wrapper for collector schedules page.
 *
 * Features:
 * - Desktop-only display (hidden on mobile)
 * - Collector schedule filters
 * - Collector schedule table with edit/delete actions
 * - Loading states
 */
import CollectorScheduleFilters from '@/components/CMS/collectionReport/tabs/collector/CollectionReportCollectorScheduleFilters';
import CollectorScheduleTable from '@/components/CMS/collectionReport/tabs/collector/CollectionReportCollectorScheduleTable';
import { CollectionReportCollectorDesktopUIProps } from '@/lib/types/components';

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
  onEdit,
  onDelete,
  showActions,
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
            onEdit={onEdit}
            onDelete={onDelete}
            showActions={showActions}
          />
        </div>
      </div>
    </div>
  );
}
