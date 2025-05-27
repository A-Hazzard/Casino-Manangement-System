import React from "react";
import type { LocationSelectItem } from "@/lib/types/location";

type Props = {
  locations: LocationSelectItem[];
  collectors: string[];
  selectedLocation: string;
  onLocationChange: (locationId: string) => void;
  selectedCollector: string;
  onCollectorChange: (collector: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  onReset: () => void;
  loading?: boolean;
};

export default function ManagerScheduleFilters({
  locations,
  collectors,
  selectedLocation,
  onLocationChange,
  selectedCollector,
  onCollectorChange,
  selectedStatus,
  onStatusChange,
  onReset,
  loading = false,
}: Props) {
  return (
    <div className="bg-buttonActive rounded-t-lg rounded-b-none p-4 flex flex-col gap-y-3 md:flex-row md:items-center md:gap-x-4 md:justify-between w-full">
      <div className="flex flex-col md:flex-row md:gap-x-4 flex-1">
        <select
          className="flex-1 min-w-0 px-4 py-2 rounded-md text-base w-full bg-white text-black border border-gray-200 focus:ring-2 focus:ring-buttonActive mb-1"
          value={selectedLocation}
          onChange={(e) => onLocationChange(e.target.value)}
          disabled={loading}
        >
          <option value="all">Select Location</option>
          {locations.map((loc) => (
            <option key={loc._id} value={loc._id}>
              {loc.name}
            </option>
          ))}
        </select>
        <select
          className="flex-1 min-w-0 px-4 py-2 rounded-md text-base w-full bg-white text-black border border-gray-200 focus:ring-2 focus:ring-buttonActive mb-1"
          value={selectedCollector}
          onChange={(e) => onCollectorChange(e.target.value)}
          disabled={loading}
        >
          <option value="all">Select Collector</option>
          {collectors.map((collector) => (
            <option key={collector} value={collector}>
              {collector}
            </option>
          ))}
        </select>
        <select
          className="flex-1 min-w-0 px-4 py-2 rounded-md text-base w-full bg-white text-black border border-gray-200 focus:ring-2 focus:ring-buttonActive"
          value={selectedStatus}
          onChange={(e) => onStatusChange(e.target.value)}
          disabled={loading}
        >
          <option value="all">Select Status</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="canceled">Canceled</option>
        </select>
      </div>
      <button
        className="bg-button text-white px-4 py-2 text-base rounded-md font-semibold w-full md:w-auto md:ml-auto mt-3 md:mt-0"
        onClick={onReset}
        disabled={loading}
      >
        Reset Filter
      </button>
    </div>
  );
}
