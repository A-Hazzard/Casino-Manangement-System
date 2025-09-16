import React from "react";
import CollectorScheduleFilters from "@/components/collectionReport/CollectorScheduleFilters";
import CollectorScheduleTable from "@/components/collectionReport/CollectorScheduleTable";
import { CollectorScheduleDesktopUIProps } from "@/lib/types/componentProps";

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
    <div className="hidden md:block bg-white rounded-lg shadow-md">
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
      <div className="mt-4 px-4 pb-4 space-y-4">
        <CollectorScheduleTable
          data={collectorSchedules}
          loading={loadingCollectorSchedules}
        />
      </div>
    </div>
  );
};

export default CollectorDesktopUI;
