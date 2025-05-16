import React from "react";

export const BillValidatorSkeleton = () => (
  <div className="bg-container p-6 rounded-lg shadow w-full">
    <div className="h-8 w-48 mb-4 skeleton-bg"></div>
    <div className="w-full">
      <div className="h-8 w-full skeleton-bg mb-2"></div>
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-10 skeleton-bg"></div>
        ))}
      </div>
    </div>
  </div>
);

export default BillValidatorSkeleton;
