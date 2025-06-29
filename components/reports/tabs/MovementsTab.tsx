"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowRightLeft,
  MapPin,
  Calendar,
  User,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  Download,
  Search,
} from "lucide-react";

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

// Store
import { useReportsStore } from "@/lib/store/reportsStore";

// Utils
import { ExportUtils } from "@/lib/utils/exportUtils";

// Types
import type { MachineMovementRecord } from "@/lib/types/reports";

// Modals
import NewMovementModal from "@/components/reports/modals/NewMovementModal";

// Sample data
const sampleMovements: MachineMovementRecord[] = [
  {
    id: "MOV001",
    machineId: "MAC001",
    machineName: "Lucky Stars Deluxe",
    fromLocationId: "LOC001",
    fromLocationName: "Main Casino Floor",
    toLocationId: "LOC002",
    toLocationName: "VIP Gaming Area",
    moveDate: "2024-01-15",
    reason: "Performance optimization",
    status: "completed",
    notes: "Machine moved to higher traffic area",
    movedBy: "John Smith",
    approvedBy: "Jane Doe",
    cost: 250.0,
    downtime: 2.5,
    performanceImpact: {
      beforeRevenue: 1250.0,
      afterRevenue: 1890.0,
      improvementPercentage: 51.2,
    },
    createdAt: "2024-01-15T08:00:00Z",
    updatedAt: "2024-01-15T14:30:00Z",
  },
  {
    id: "MOV002",
    machineId: "MAC002",
    machineName: "Diamond Rush Pro",
    fromLocationId: "LOC003",
    fromLocationName: "Sports Bar Gaming",
    toLocationId: "LOC001",
    toLocationName: "Main Casino Floor",
    moveDate: "2024-01-14",
    reason: "Maintenance relocation",
    status: "completed",
    movedBy: "Mike Johnson",
    cost: 180.0,
    downtime: 1.5,
    createdAt: "2024-01-14T10:00:00Z",
    updatedAt: "2024-01-14T12:30:00Z",
  },
  {
    id: "MOV003",
    machineId: "MAC003",
    machineName: "Golden Jackpot",
    fromLocationId: null,
    fromLocationName: null,
    toLocationId: "LOC004",
    toLocationName: "Hotel Gaming Lounge",
    moveDate: "2024-01-16",
    reason: "New installation",
    status: "in-progress",
    movedBy: "Sarah Wilson",
    cost: 450.0,
    createdAt: "2024-01-16T09:00:00Z",
    updatedAt: "2024-01-16T09:00:00Z",
  },
];

export default function MovementsTab() {
  const {
    machineMovements,
    updateMachineMovements,
    isLoading,
    setLoading,
    selectedDateRange,
  } = useReportsStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isNewMovementModalOpen, setIsNewMovementModalOpen] = useState(false);

  useEffect(() => {
    // Load movement data when component mounts
    setLoading(true);
    setTimeout(() => {
      updateMachineMovements(sampleMovements);
      setLoading(false);
    }, 1000);
  }, [updateMachineMovements, setLoading, selectedDateRange]);

  const handleExportData = async () => {
    try {
      const exportData = {
        title: "Machine Movement Report",
        subtitle: "Machine relocation tracking and performance analysis",
        headers: [
          "Movement ID",
          "Machine",
          "From Location",
          "To Location",
          "Move Date",
          "Reason",
          "Status",
          "Cost",
          "Downtime (hrs)",
        ],
        data: movements.map((movement) => [
          movement.id,
          movement.machineName,
          movement.fromLocationName || "New Installation",
          movement.toLocationName,
          movement.moveDate,
          movement.reason,
          movement.status,
          `$${movement.cost?.toFixed(2) || "0.00"}`,
          movement.downtime?.toFixed(1) || "0.0",
        ]),
        summary: [
          { label: "Total Movements", value: stats.totalMovements },
          { label: "Completed Movements", value: stats.completedMovements },
          { label: "In Progress", value: stats.inProgressMovements },
          { label: "Total Cost", value: `$${stats.totalCost.toFixed(2)}` },
          {
            label: "Average Downtime",
            value: `${stats.avgDowntime.toFixed(1)} hours`,
          },
          {
            label: "Average Performance Improvement",
            value: isNaN(stats.avgImprovement)
              ? "N/A"
              : `${stats.avgImprovement.toFixed(1)}%`,
          },
        ],
        metadata: {
          generatedBy: "Evolution1 CMS - Movement Tracking",
          generatedAt: new Date().toISOString(),
          dateRange: selectedDateRange
            ? `${selectedDateRange.start?.toDateString()} - ${selectedDateRange.end?.toDateString()}`
            : "All time",
        },
      };

      await ExportUtils.exportData(exportData, "pdf");
      toast.success("Machine movement data exported successfully");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      // Log error for debugging in development
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to export movement data:", errorMessage);
      }
      toast.error("Failed to export movement data");
    }
  };

  const handleNewMovement = () => {
    setIsNewMovementModalOpen(true);
  };

  const movements =
    machineMovements.length > 0 ? machineMovements : sampleMovements;

  // Calculate statistics
  const stats = {
    totalMovements: movements.length,
    completedMovements: movements.filter((m) => m.status === "completed")
      .length,
    inProgressMovements: movements.filter((m) => m.status === "in-progress")
      .length,
    pendingMovements: movements.filter((m) => m.status === "pending").length,
    avgDowntime:
      movements.reduce((acc, m) => acc + (m.downtime || 0), 0) /
      movements.length,
    totalCost: movements.reduce((acc, m) => acc + (m.cost || 0), 0),
    avgImprovement:
      movements
        .filter((m) => m.performanceImpact)
        .reduce(
          (acc, m) => acc + (m.performanceImpact?.improvementPercentage || 0),
          0
        ) / movements.filter((m) => m.performanceImpact).length,
  };

  const kpiCards = [
    {
      title: "Total Movements",
      value: stats.totalMovements.toString(),
      icon: ArrowRightLeft,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Completed",
      value: stats.completedMovements.toString(),
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "In Progress",
      value: stats.inProgressMovements.toString(),
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "Avg. Downtime",
      value: `${stats.avgDowntime.toFixed(1)}h`,
      icon: AlertCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-32 bg-gray-200 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Machine Movements
          </h2>
          <p className="text-gray-600">
            Track machine relocations and logistics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleNewMovement}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Movement
          </Button>
          <Button
            onClick={handleExportData}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Data
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, index) => (
          <motion.div
            key={kpi.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                    <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {kpi.value}
                    </p>
                    <p className="text-sm text-gray-600">{kpi.title}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Movement Records */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5" />
            Movement Records
          </CardTitle>
          <CardDescription>
            Complete history of machine movements and relocations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by machine name or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md bg-white"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="in-progress">In Progress</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="space-y-3">
              {movements.map((movement) => (
                <div
                  key={movement.id}
                  className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">
                          {movement.machineName}
                        </h3>
                        <Badge
                          variant={
                            movement.status === "completed"
                              ? "default"
                              : movement.status === "in-progress"
                              ? "secondary"
                              : movement.status === "pending"
                              ? "outline"
                              : "destructive"
                          }
                        >
                          {movement.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span>
                            {movement.fromLocationName
                              ? `${movement.fromLocationName} → ${movement.toLocationName}`
                              : `New → ${movement.toLocationName}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {new Date(movement.moveDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span>Moved by: {movement.movedBy}</span>
                        </div>
                        {movement.cost && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              Cost: ${movement.cost.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>

                      {movement.performanceImpact && (
                        <div className="mt-3 p-3 bg-green-50 rounded-lg">
                          <p className="text-sm font-medium text-green-800">
                            Performance Impact
                          </p>
                          <p className="text-sm text-green-600">
                            Revenue improved by{" "}
                            {movement.performanceImpact.improvementPercentage.toFixed(
                              1
                            )}
                            % (${movement.performanceImpact.beforeRevenue} → $
                            {movement.performanceImpact.afterRevenue})
                          </p>
                        </div>
                      )}

                      {movement.notes && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Notes:</span>{" "}
                            {movement.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* New Movement Modal */}
      <NewMovementModal
        open={isNewMovementModalOpen}
        onOpenChange={setIsNewMovementModalOpen}
      />
    </motion.div>
  );
}
