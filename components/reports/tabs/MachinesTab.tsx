"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  DollarSign,
  Wifi,
  WifiOff,
  ShieldCheck
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useDashBoardStore } from "@/lib/store/dashboardStore";
import { KpiCard } from "../charts/KpiCard";
import type { MachineAnalytics, MachineStats } from '@/lib/types/reports';

export default function MachinesTab() {
  const { selectedLicencee } = useDashBoardStore();
  
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [machines, setMachines] = useState<MachineAnalytics[]>([]);
  const [machineStats, setMachineStats] = useState<MachineStats>({
    totalMachines: 0,
    onlineMachines: 0,
    sasMachines: 0,
    totalDrop: 0,
    totalGross: 0,
    totalCancelledCredits: 0
  });

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!selectedLicencee) {
      console.log('No licensee selected');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/analytics/machines?licensee=${selectedLicencee}`);
      if (!response.ok) {
        throw new Error('Failed to fetch machines');
      }
      const data = await response.json();
      setMachines(data.machines || []);
      
      const statsResponse = await fetch(`/api/analytics/machines/stats?licensee=${selectedLicencee}`);
      if (!statsResponse.ok) {
        throw new Error('Failed to fetch machine stats');
      }
      const statsData = await statsResponse.json();
      setMachineStats(statsData.stats);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedLicencee]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Render loading state
  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Drop"
          value={machineStats.totalDrop}
          format="currency"
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
        />
        <KpiCard
          title="Total Machines"
          value={machineStats.totalMachines}
          format="number"
          icon={<Wifi className="h-4 w-4 text-muted-foreground" />}
        />
        <KpiCard
          title="Online Machines"
          value={machineStats.onlineMachines}
          format="number"
          icon={<Wifi className="h-4 w-4 text-green-500" />}
        />
        <KpiCard
          title="SAS Machines"
          value={machineStats.sasMachines}
          format="number"
          icon={<ShieldCheck className="h-4 w-4 text-blue-500" />}
        />
      </div>

      <Card>
        <CardContent className="pt-6">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left">Machine</th>
                <th className="text-right">Drop</th>
                <th className="text-right">Gross</th>
                <th className="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {machines.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center text-gray-400 py-4">
                    No machines data available
                  </td>
                </tr>
              ) : (
                machines.map((machine) => (
                  <tr key={machine._id} className="border-t">
                    <td className="py-2">{machine.name}</td>
                    <td className="text-right">${machine.totalDrop.toFixed(2)}</td>
                    <td className="text-right">${machine.gross.toFixed(2)}</td>
                    <td className="text-center">
                      <div className="flex justify-center items-center gap-2">
                        {machine.isOnline ? (
                          <Wifi className="text-green-500" />
                        ) : (
                          <WifiOff className="text-red-500" />
                        )}
                        {machine.hasSas && <ShieldCheck className="text-blue-500" />}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
