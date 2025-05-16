import React from "react";

export const CollectionHistorySkeleton = () => (
  <div className="bg-container p-6 rounded-lg shadow w-full">
    <div className="h-8 w-64 mb-4 skeleton-bg"></div>
    <div className="w-full overflow-x-auto">
      <div className="h-10 w-full skeleton-bg mb-3"></div>
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-12 w-full skeleton-bg mb-2"></div>
      ))}
    </div>
  </div>
);

export default CollectionHistorySkeleton;
