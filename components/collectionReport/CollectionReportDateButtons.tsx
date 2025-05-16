import React from "react";

export default function CollectionReportDateButtons() {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <button className="bg-buttonActive text-white px-3 py-1 rounded-full text-xs">
        Today
      </button>
      <button className="bg-button text-white px-3 py-1 rounded-full text-xs">
        Yesterday
      </button>
      <button className="bg-button text-white px-3 py-1 rounded-full text-xs">
        Last 7 days
      </button>
      <button className="bg-button text-white px-3 py-1 rounded-full text-xs">
        30 days
      </button>
      <button className="bg-button text-white px-3 py-1 rounded-full text-xs">
        Custom
      </button>
    </div>
  );
}
