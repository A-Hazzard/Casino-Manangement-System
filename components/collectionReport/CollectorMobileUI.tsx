import React from "react";
import CollectorScheduleFilters from "@/components/collectionReport/CollectorScheduleFilters";
import CollectorScheduleCards from "@/components/collectionReport/CollectorScheduleCards";
import { CollectorScheduleMobileUIProps } from "@/lib/types/componentProps";

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
  // Mobile container for Collector Schedule, adjust styling as needed for card appearance
  return (
    <div className="md:hidden w-full absolute left-0 right-0 px-4">
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
        loading={loadingCollectorSchedules} // Pass loading state to filters if it has loading indicators
      />
      
      <CollectorScheduleCards data={collectorSchedules} loading={loadingCollectorSchedules} />
    </div>
  );
};

export default CollectorMobileUI;
