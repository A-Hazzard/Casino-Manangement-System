import React from "react";

export const CabinetCardsSkeleton: React.FC = () => (
  <div className="space-y-4 mt-4">
    {[...Array(5)].map((_, i) => (
      <div
        key={i}
        className="bg-white shadow rounded-lg p-4 w-full max-w-sm mx-auto relative border border-gray-200"
      >
        <div className="h-4 w-3/4 mb-2 bg-gray-200 rounded"></div>
        <div className="h-3 w-1/2 mb-4 bg-gray-200 rounded"></div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3">
          <div className="h-3 w-full bg-gray-200 rounded"></div>
          <div className="h-3 w-full bg-gray-200 rounded"></div>
          <div className="h-3 w-full bg-gray-200 rounded"></div>
          <div className="h-3 w-full bg-gray-200 rounded"></div>
        </div>
        <div className="border-t pt-2 mt-2 flex justify-end gap-2">
          <div className="h-6 w-6 rounded bg-gray-200 flex items-center justify-center">
            <div className="w-3 h-3 bg-gray-300 rounded"></div>
          </div>
          <div className="h-6 w-6 rounded bg-gray-200 flex items-center justify-center">
            <div className="w-3 h-3 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default CabinetCardsSkeleton;
