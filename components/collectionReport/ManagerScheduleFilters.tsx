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
    <div className="bg-buttonActive rounded-t-lg rounded-b-none p-4 flex flex-col md:flex-row md:flex-wrap md:items-center gap-2 md:gap-4 mb-0 w-full">
      <select
        className="px-4 py-2 rounded-md text-sm w-full md:w-auto bg-white text-black border-none focus:ring-2 focus:ring-buttonActive"
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
        className="px-4 py-2 rounded-md text-sm w-full md:w-auto bg-white text-black border-none focus:ring-2 focus:ring-buttonActive"
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
        className="px-4 py-2 rounded-md text-sm w-full md:w-auto bg-white text-black border-none focus:ring-2 focus:ring-buttonActive"
        value={selectedStatus}
        onChange={(e) => onStatusChange(e.target.value)}
        disabled={loading}
      >
        <option value="all">Select Status</option>
        <option value="pending">Pending</option>
        <option value="completed">Completed</option>
        <option value="canceled">Canceled</option>
      </select>

      <button
        className="bg-button text-white font-bold px-6 py-2 rounded-md w-full md:w-auto md:ml-auto md:mt-0 mt-2"
        onClick={onReset}
        disabled={loading}
      >
        Reset Filter
      </button>
    </div>
  );
}
