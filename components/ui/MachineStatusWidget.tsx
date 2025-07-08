import React from "react";
import Image from "next/image";
import type { MachineStatusWidgetProps } from "@/lib/types/components";

export default function MachineStatusWidget({
  onlineCount,
  offlineCount,
}: MachineStatusWidgetProps) {
  return (
    <div className="flex items-center gap-3 bg-white rounded-lg border border-gray-100 px-4 py-2.5">
        <Image
          src="/cabinetsIcon.svg"
          alt="Machine"
        className="w-5 h-5"
        width={20}
        height={20}
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
