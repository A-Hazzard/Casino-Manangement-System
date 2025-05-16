import React from "react";

export default function MonthlyReportFilters() {
  return (
    <div className="bg-buttonActive rounded-t-lg rounded-b-none p-4 flex flex-col md:flex-row md:items-center gap-4 mb-0 w-full">
      <select className="px-4 py-2 rounded-md text-sm w-full md:w-auto bg-white text-black border-none focus:ring-2 focus:ring-buttonActive">
        <option>Select Location</option>
      </select>
      <div className="flex gap-2 ml-auto w-full md:w-auto justify-end">
        <button className="bg-lighterBlueHighlight text-white px-4 py-2 rounded-md font-semibold">
          EXPORT PDF
        </button>
        <button className="bg-lighterBlueHighlight text-white px-4 py-2 rounded-md font-semibold">
          EXPORT EXCEL
        </button>
      </div>
    </div>
  );
}
