import React from "react";
import Image from "next/image";

interface MachineStatusWidgetProps {
  onlineCount: number;
  offlineCount: number;
}

export default function MachineStatusWidget({
  onlineCount,
  offlineCount,
}: MachineStatusWidgetProps) {
  return (
    <div className="flex items-center bg-white rounded-xl shadow px-4 py-2 space-x-4">
      <div className="flex items-center mr-2">
        <Image
          src="/cabinetsIcon.svg"
          alt="Machine"
          className="w-7 h-7 mr-2"
          width={28}
          height={28}
        />
        <span className="text-gray-700 font-medium text-base">
          Machine Status
        </span>
      </div>
      <div className="flex items-center">
        <span className="flex items-center bg-green-50 border border-green-400 text-green-700 rounded-full px-4 py-1 font-semibold text-base mr-2">
          <span className="w-3 h-3 bg-green-500 rounded-full mr-2 inline-block" />
          {onlineCount.toLocaleString()} Online
        </span>
        <span className="flex items-center bg-red-50 border border-red-400 text-red-700 rounded-full px-4 py-1 font-semibold text-base">
          <span className="w-3 h-3 bg-red-500 rounded-full mr-2 inline-block" />
          {offlineCount.toLocaleString()} Offline
        </span>
      </div>
    </div>
  );
}
