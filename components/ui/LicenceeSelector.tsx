"use client";

import { useDashBoardStore } from "@/lib/store/dashboardStore";

export function LicenceeSelector() {
  const {
    selectedLicencee,
    setSelectedLicencee,
    gamingLocations,
    loadingChartData,
    refreshing,
  } = useDashBoardStore();

  return (
    <div className="flex w-full items-center justify-between gap-4 sm:w-auto">
      <select
        className={`px-4 py-2 rounded-full text-sm bg-buttonActive text-white ${
          loadingChartData || refreshing
            ? "opacity-50 cursor-not-allowed"
            : ""
        }`}
        value={selectedLicencee}
        onChange={(e) => setSelectedLicencee(e.target.value)}
        disabled={loadingChartData || refreshing}
      >
        <option value="">All Licensees</option>
        {gamingLocations.map((location) => (
          <option key={location._id} value={location._id}>
            {location.name}
          </option>
        ))}
      </select>
    </div>
  );
} 