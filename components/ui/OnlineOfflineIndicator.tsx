"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashBoardStore } from "@/lib/store/dashboardStore";

type OnlineOfflineIndicatorProps = {
  showTitle?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export default function OnlineOfflineIndicator({
  showTitle = false,
  size = "md",
  className,
}: OnlineOfflineIndicatorProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    totalMachines: number;
    onlineMachines: number;
    offlineMachines: number;
  }>({
    totalMachines: 0,
    onlineMachines: 0,
    offlineMachines: 0,
  });

  const selectedLicencee = useDashBoardStore((state) => state.selectedLicencee);

  useEffect(() => {
    const fetchMachineStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/analytics/machines/stats?licensee=${selectedLicencee || "all"}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch machine stats");
        }
        const data = await response.json();
        setStats({
          totalMachines: data.totalMachines || 0,
          onlineMachines: data.onlineMachines || 0,
          offlineMachines: data.offlineMachines || 0,
        });
      } catch (err) {
        console.error("Error fetching machine stats:", err);
        setError("Failed to load machine status");
      } finally {
        setLoading(false);
      }
    };

    fetchMachineStats();
    // Fetch stats every minute
    const interval = setInterval(fetchMachineStats, 60000);
    return () => clearInterval(interval);
  }, [selectedLicencee]);

  if (loading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Skeleton className={cn(
          size === "sm" && "h-2 w-2",
          size === "md" && "h-3 w-3",
          size === "lg" && "h-4 w-4",
          "rounded-full"
        )} />
        {showTitle && (
          <Skeleton className="h-4 w-24" />
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("flex items-center gap-2 text-destructive", className)}>
        <div className={cn(
          size === "sm" && "h-2 w-2",
          size === "md" && "h-3 w-3",
          size === "lg" && "h-4 w-4",
          "rounded-full bg-destructive"
        )} />
        {showTitle && (
          <span className="text-sm font-medium">Error loading status</span>
        )}
      </div>
    );
  }

  const { totalMachines, onlineMachines } = stats;
  const allOffline = totalMachines > 0 && onlineMachines === 0;
  const someOnline = onlineMachines > 0;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn(
        size === "sm" && "h-2 w-2",
        size === "md" && "h-3 w-3",
        size === "lg" && "h-4 w-4",
        "rounded-full",
        allOffline && "bg-destructive",
        someOnline && "bg-success animate-pulse",
        !allOffline && !someOnline && "bg-muted"
      )} />
      {showTitle && (
        <span className="text-sm font-medium">
          {allOffline && "All Offline"}
          {someOnline && `${onlineMachines} Online`}
          {!allOffline && !someOnline && "No Machines"}
        </span>
      )}
    </div>
  );
}
