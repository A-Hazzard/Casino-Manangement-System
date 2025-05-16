import React from "react";

const CabinetInfoSkeleton = () => (
  <div className="p-6 bg-container rounded-lg shadow-sm">
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

const SmibConfigSkeleton = () => (
  <div className="p-6 bg-container rounded-lg shadow-sm">
    <div className="h-8 w-48 mb-4 skeleton-bg"></div>
    <div className="grid grid-cols-2 gap-4">
      <div className="h-6 skeleton-bg"></div>
      <div className="h-6 skeleton-bg"></div>
      <div className="h-6 skeleton-bg"></div>
      <div className="h-6 skeleton-bg"></div>
    </div>
  </div>
);

const AccountingDetailsSkeleton = () => (
  <div className="p-6 bg-container rounded-lg shadow-sm">
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

const CabinetDetailsSkeleton = () => (
  <div className="space-y-8 mt-6">
    <div className="flex items-center justify-between">
      <div></div>
      <div className="flex gap-2">
        <div className="h-8 w-24 skeleton-bg rounded" />
      </div>
    </div>
    <CabinetInfoSkeleton />
    <SmibConfigSkeleton />
    <AccountingDetailsSkeleton />
  </div>
);

export default CabinetDetailsSkeleton;
