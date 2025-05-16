import React from "react";

export const AccountingDetailsSkeleton = () => (
  <div className="p-6 bg-white rounded-lg shadow-sm">
    <div className="h-8 w-48 mb-4 skeleton-bg"></div>
    <div className="grid grid-cols-3 gap-4">
      <div className="h-20 skeleton-bg"></div>
      <div className="h-20 skeleton-bg"></div>
      <div className="h-20 skeleton-bg"></div>
    </div>
    <div className="h-8 w-48 my-4 skeleton-bg"></div>
    <div className="h-40 skeleton-bg"></div>
  </div>
);

export default AccountingDetailsSkeleton;
