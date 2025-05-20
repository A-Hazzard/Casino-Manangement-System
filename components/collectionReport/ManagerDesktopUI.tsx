import React from "react";
import ManagerScheduleFilters from "@/components/collectionReport/ManagerScheduleFilters";
import ManagerScheduleTable from "@/components/collectionReport/ManagerScheduleTable";
import type { ManagerDesktopUIProps } from "@/lib/types/componentProps";

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
    <div className="hidden md:block bg-white rounded-lg shadow-md">
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
      <div className="mt-4 px-4 pb-4 space-y-4">
        <ManagerScheduleTable data={schedulers} loading={loadingSchedulers} />
        {/* ManagerScheduleCards was also here, but typically desktop uses table primarily */}
        {/* If cards are also needed on desktop, they can be added back here */}
      </div>
    </div>
  );
};

export default ManagerDesktopUI;
