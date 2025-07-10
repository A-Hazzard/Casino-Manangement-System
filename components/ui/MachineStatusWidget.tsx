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
      <div className="flex items-center gap-3 bg-white rounded-lg border border-gray-100 px-4 py-2.5">
        <Skeleton className="w-5 h-5 rounded" />
        <Skeleton className="w-24 h-4" />
        <div className="flex gap-3">
          <Skeleton className="w-24 h-6 rounded-full" />
          <Skeleton className="w-24 h-6 rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 bg-white rounded-lg border border-gray-100 px-4 py-2.5">
      <Image
        src={cabinetsIcon}
        alt="Cabinets"
        width={24}
        height={24}
      />
      <span className="text-gray-600 text-sm">
        Machine Status
      </span>
      <div className="flex gap-3">
        <span className="flex items-center gap-1.5 bg-green-50 text-green-700 rounded-full px-4 py-1 text-sm">
          <span className="w-2 h-2 bg-green-500 rounded-full" />
          {onlineCount.toLocaleString()} Online
        </span>
        <span className="flex items-center gap-1.5 bg-red-50 text-red-700 rounded-full px-4 py-1 text-sm">
          <span className="w-2 h-2 bg-red-500 rounded-full" />
          {offlineCount.toLocaleString()} Offline
        </span>
      </div>
    </div>
  );
}
