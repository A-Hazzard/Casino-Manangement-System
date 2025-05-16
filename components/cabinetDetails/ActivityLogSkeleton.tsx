import React from "react";

export const ActivityLogSkeleton = () => (
  <div className="bg-container p-6 rounded-lg shadow w-full">
    <div className="h-8 w-48 mb-4 skeleton-bg"></div>
    <div className="w-full overflow-x-auto">
      <div className="h-10 w-full skeleton-bg mb-3"></div>
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="h-14 w-full skeleton-bg mb-2"></div>
      ))}
    </div>
  </div>
);

export default ActivityLogSkeleton;
