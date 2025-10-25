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
    <div className="w-full px-4 md:hidden">
      <div className="mx-auto max-w-xl space-y-4 rounded-lg bg-white p-4 shadow-md">
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
