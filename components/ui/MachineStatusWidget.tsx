import React from "react";
import Image from "next/image";
import cabinetsIcon from "@/public/cabinetsIcon.svg";
import { Skeleton } from "@/components/ui/skeleton";

type MachineStatusWidgetProps = {
  isLoading?: boolean;
  onlineCount: number;
  offlineCount: number;
};

export default function MachineStatusWidget({
  isLoading = false,
  onlineCount = 0,
  offlineCount = 0,
}: MachineStatusWidgetProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 sm:gap-3 bg-white rounded-lg border border-gray-100 px-3 sm:px-4 py-2.5 min-w-0">
        <Skeleton className="w-4 h-4 sm:w-5 sm:h-5 rounded flex-shrink-0" />
        <Skeleton className="w-16 sm:w-24 h-4 flex-shrink-0" />
        <div className="flex gap-2 sm:gap-3 min-w-0 flex-1">
          <Skeleton className="w-16 sm:w-24 h-6 rounded-full flex-shrink-0" />
          <Skeleton className="w-16 sm:w-24 h-6 rounded-full flex-shrink-0" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3 bg-white rounded-lg border border-gray-100 px-3 sm:px-4 py-2.5 min-w-0 overflow-hidden">
      <Image
        src={cabinetsIcon}
        alt="Cabinets"
        width={24}
        height={24}
        className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0"
      />
      <span className="text-gray-600 text-xs sm:text-sm flex-shrink-0 hidden sm:block">
        Machine Status
      </span>
      <span className="text-gray-600 text-xs flex-shrink-0 sm:hidden">
        Status
      </span>
      <div className="flex gap-1 sm:gap-2 min-w-0 flex-1 overflow-hidden">
        <span className="flex items-center gap-1 bg-green-50 text-green-700 rounded-full px-1.5 sm:px-2 py-1 text-xs whitespace-nowrap flex-shrink-0 min-w-0">
          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full flex-shrink-0" />
          <span className="truncate">{onlineCount.toLocaleString()} Online</span>
        </span>
        <span className="flex items-center gap-1 bg-red-50 text-red-700 rounded-full px-1.5 sm:px-2 py-1 text-xs whitespace-nowrap flex-shrink-0 min-w-0">
          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full flex-shrink-0" />
          <span className="truncate">{offlineCount.toLocaleString()} Offline</span>
        </span>
      </div>
    </div>
  );
}
