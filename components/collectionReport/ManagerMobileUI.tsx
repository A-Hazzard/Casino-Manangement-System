import React from "react";
import ManagerScheduleFilters from "@/components/collectionReport/ManagerScheduleFilters";
import ManagerScheduleCards from "@/components/collectionReport/ManagerScheduleCards";
import type { ManagerMobileUIProps } from "@/lib/types/componentProps";

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
    <div className="md:hidden w-full absolute left-0 right-0 px-4">
      <div className="mx-auto max-w-xl bg-white p-4 rounded-lg shadow-md space-y-4">
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
