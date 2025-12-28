/**
 * Manager Desktop UI Component
 * Desktop layout wrapper for manager schedules page.
 *
 * Features:
 * - Desktop-only display (hidden on mobile)
 * - Manager schedule filters
 * - Manager schedule table
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
import React from 'react';
import ManagerScheduleFilters from '@/components/collectionReport/ManagerScheduleFilters';
import ManagerScheduleTable from '@/components/collectionReport/ManagerScheduleTable';
import type { ManagerDesktopUIProps } from '@/lib/types/componentProps';

const ManagerDesktopUI: React.FC<ManagerDesktopUIProps> = ({
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
}) => {
  return (
    <div className="hidden space-y-4 md:block">
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
          <ManagerScheduleTable data={schedulers} loading={loadingSchedulers} />
        </div>
      </div>
    </div>
  );
};

export default ManagerDesktopUI;
