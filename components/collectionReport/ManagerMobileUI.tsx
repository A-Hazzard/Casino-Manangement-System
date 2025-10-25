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
