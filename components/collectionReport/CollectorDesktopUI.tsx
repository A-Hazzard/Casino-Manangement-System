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
import React from 'react';
import CollectorScheduleFilters from '@/components/collectionReport/CollectorScheduleFilters';
import CollectorScheduleTable from '@/components/collectionReport/CollectorScheduleTable';
import { CollectorScheduleDesktopUIProps } from '@/lib/types/componentProps';

const CollectorDesktopUI: React.FC<CollectorScheduleDesktopUIProps> = ({
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
}) => {
  return (
    <div className="hidden rounded-lg bg-white shadow-md md:block">
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
      <div className="mt-4 space-y-4 px-4 pb-4">
        <CollectorScheduleTable
          data={collectorSchedules}
          loading={loadingCollectorSchedules}
        />
      </div>
    </div>
  );
};

export default CollectorDesktopUI;
