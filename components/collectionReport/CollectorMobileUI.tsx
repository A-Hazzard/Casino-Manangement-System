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
import React from 'react';
import CollectorScheduleFilters from '@/components/collectionReport/CollectorScheduleFilters';
import CollectorScheduleCards from '@/components/collectionReport/CollectorScheduleCards';
import { CollectorScheduleMobileUIProps } from '@/lib/types/componentProps';

const CollectorMobileUI: React.FC<CollectorScheduleMobileUIProps> = ({
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
};

export default CollectorMobileUI;
