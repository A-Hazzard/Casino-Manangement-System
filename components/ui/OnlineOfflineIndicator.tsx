"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { useDashBoardStore } from "@/lib/store/dashboardStore";
import type { OnlineOfflineIndicatorProps } from "@/lib/types/components";
import { fetchMachineStats } from "@/lib/helpers/machines";

export default function OnlineOfflineIndicator({
  className = "",
  showTitle = false,
  size = "md",
}: OnlineOfflineIndicatorProps) {
  const [onlineMachines, setOnlineMachines] = useState(0);
  const [offlineMachines, setOfflineMachines] = useState(0);
  const [loading, setLoading] = useState(true);
  const { selectedLicencee } = useDashBoardStore();

  useEffect(() => {
    const getMachineStats = async () => {
      setLoading(true);
      try {
        const stats = await fetchMachineStats(selectedLicencee);
        setOnlineMachines(stats.onlineMachines);
        setOfflineMachines(stats.offlineMachines);
      } catch (error) {
        console.error("Error fetching machine stats:", error);
        setOnlineMachines(0);
        setOfflineMachines(0);
      } finally {
        setLoading(false);
      }
    };

    if (selectedLicencee) {
      getMachineStats();
    }
  }, [selectedLicencee]);

  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return {
          container: "gap-1",
          badge: "px-2 py-0.5 text-xs",
          dot: "w-1.5 h-1.5",
          loading: "h-6 w-16",
        };
      case "lg":
        return {
          container: "gap-3",
          badge: "px-4 py-2 text-base",
          dot: "w-3 h-3",
          loading: "h-10 w-24",
        };
      default: // md
        return {
          container: "gap-2",
          badge: "px-3 py-1 text-sm",
          dot: "w-2 h-2",
          loading: "h-8 w-20",
        };
    }
  };

  const sizeClasses = getSizeClasses();

  if (loading) {
    return (
      <div
        className={`flex items-center ${sizeClasses.container} ${className}`}
      >
        <div
          className={`${sizeClasses.loading} bg-gray-200 rounded-full animate-pulse`}
        ></div>
        <div
          className={`${sizeClasses.loading} bg-gray-200 rounded-full animate-pulse`}
        ></div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${className}`}>
      <div className={`flex items-center gap-4 ${sizeClasses.container}`}>
        {showTitle && (
          <div className="flex items-center gap-2">
            <Image
              src="/cabinetsIcon.svg"
              alt="Cabinets Icon"
              width={28}
              height={28}
            />
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Machine Status
            </h3>
          </div>
        )}
        <div className={`flex items-center ${sizeClasses.container}`}>
          <Badge
            variant="outline"
            className={`bg-green-50 text-green-700 border-green-300 font-medium ${sizeClasses.badge}`}
          >
            <div
              className={`${sizeClasses.dot} bg-green-500 rounded-full mr-2`}
            ></div>
            {onlineMachines.toLocaleString()} Online
          </Badge>
          <Badge
            variant="outline"
            className={`bg-red-50 text-red-700 border-red-300 font-medium ${sizeClasses.badge}`}
          >
            <div
              className={`${sizeClasses.dot} bg-red-500 rounded-full mr-2`}
            ></div>
            {offlineMachines.toLocaleString()} Offline
          </Badge>
        </div>
      </div>
    </div>
  );
}
