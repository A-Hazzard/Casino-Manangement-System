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
import React from 'react';
import ManagerScheduleFilters from '@/components/collectionReport/ManagerScheduleFilters';
import ManagerScheduleCards from '@/components/collectionReport/ManagerScheduleCards';
import type { ManagerMobileUIProps } from '@/lib/types/componentProps';

const ManagerMobileUI: React.FC<ManagerMobileUIProps> = ({
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
    // Mobile container for Manager Schedule, adjust styling as needed for card appearance
    <div className="w-full px-4 md:hidden">
      <div className="mx-auto max-w-xl space-y-4 rounded-lg bg-white p-4 shadow-md">
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
          loading={loadingSchedulers} // Pass loading state to filters if it has loading indicators
        />
        <ManagerScheduleCards data={schedulers} loading={loadingSchedulers} />
      </div>
    </div>
  );
};

export default ManagerMobileUI;
