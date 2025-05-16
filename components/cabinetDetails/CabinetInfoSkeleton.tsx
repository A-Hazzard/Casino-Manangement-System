import React from "react";

export const CabinetInfoSkeleton = () => (
  <div className="p-6 bg-white rounded-lg shadow-sm">
    <div className="h-8 w-48 mb-4 skeleton-bg"></div>
    <div className="grid grid-cols-2 gap-4">
      <div className="h-6 skeleton-bg"></div>
      <div className="h-6 skeleton-bg"></div>
      <div className="h-6 skeleton-bg"></div>
      <div className="h-6 skeleton-bg"></div>
      <div className="h-6 skeleton-bg"></div>
      <div className="h-6 skeleton-bg"></div>
    </div>
  </div>
);

export default CabinetInfoSkeleton;
