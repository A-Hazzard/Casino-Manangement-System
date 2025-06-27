"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Receipt,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  DollarSign,
  Percent,
  Clock,
  MapPin,
  Download,
  Filter,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Store
import { useReportsStore } from "@/lib/store/reportsStore";

// Utils
import { ExportUtils } from "@/lib/utils/exportUtils";

// Types
import type { VoucherMetrics } from "@/lib/types/reports";

// Sample data - would come from API in real implementation
const sampleVoucherMetrics: VoucherMetrics = {
  totalVouchersIssued: 25840,
  totalVouchersRedeemed: 23256,
  totalVoucherValue: 1284567.5,
  redemptionRate: 89.9,
  averageVoucherValue: 49.72,
  expiredVouchers: 1876,
  fraudulentVouchers: 42,
  vouchersByLocation: [
    {
      locationId: "LOC001",
      locationName: "Main Casino Floor",
      issued: 8456,
      redeemed: 7892,
      value: 420567.8,
    },
    {
      locationId: "LOC002",
      locationName: "VIP Gaming Area",
      issued: 3245,
      redeemed: 3156,
      value: 285432.1,
    },
    {
      locationId: "LOC003",
      locationName: "Sports Bar Gaming",
      issued: 4567,
      redeemed: 4123,
      value: 198765.4,
    },
    {
      locationId: "LOC004",
      locationName: "Hotel Gaming Lounge",
      issued: 5234,
      redeemed: 4876,
      value: 234567.9,
    },
    {
      locationId: "LOC005",
      locationName: "Poker Room",
      issued: 4338,
      redeemed: 3209,
      value: 145234.3,
    },
  ],
};

const recentVoucherActivity = [
  {
    id: "V001234",
    amount: 125.5,
    status: "redeemed",
    location: "Main Casino Floor",
    timestamp: "2 minutes ago",
    type: "cashout",
  },
  {
    id: "V001235",
    amount: 75.25,
    status: "issued",
    location: "VIP Gaming Area",
    timestamp: "5 minutes ago",
    type: "promotional",
  },
  {
    id: "V001236",
    amount: 200.0,
    status: "flagged",
    location: "Sports Bar Gaming",
    timestamp: "8 minutes ago",
    type: "cashout",
  },
  {
    id: "V001237",
    amount: 50.0,
    status: "redeemed",
    location: "Hotel Gaming Lounge",
    timestamp: "12 minutes ago",
    type: "cashout",
  },
  {
    id: "V001238",
    amount: 300.75,
    status: "expired",
    location: "Main Casino Floor",
    timestamp: "15 minutes ago",
    type: "promotional",
  },
];

const fraudAlerts = [
  {
    id: "FA001",
    voucherId: "V001236",
    amount: 200.0,
    reason: "Duplicate redemption attempt",
    severity: "high",
    location: "Sports Bar Gaming",
  },
  {
    id: "FA002",
    voucherId: "V001189",
    amount: 150.25,
    reason: "Invalid security code",
    severity: "medium",
    location: "Main Casino Floor",
  },
  {
    id: "FA003",
    voucherId: "V001145",
    amount: 75.5,
    reason: "Expired voucher redemption",
    severity: "low",
    location: "VIP Gaming Area",
  },
];

export default function VouchersTab() {
  const {
    voucherMetrics,
    updateVoucherMetrics,
    isLoading,
    setLoading,
    selectedDateRange,
  } = useReportsStore();

  const [activeSubTab, setActiveSubTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    // Load voucher metrics when component mounts
    setLoading(true);
    setTimeout(() => {
      updateVoucherMetrics(sampleVoucherMetrics);
      setLoading(false);
    }, 1000);
  }, [updateVoucherMetrics, setLoading, selectedDateRange]);

  const handleExportData = async () => {
    try {
      const exportData = {
        title: "Voucher Management Report",
        subtitle: "Voucher issuance, redemption, and fraud analysis",
        headers: [
          "Location",
          "Vouchers Issued",
          "Vouchers Redeemed",
          "Total Value",
          "Redemption Rate",
        ],
        data: metrics.vouchersByLocation.map((location) => [
          location.locationName,
          location.issued.toLocaleString(),
          location.redeemed.toLocaleString(),
          `$${location.value.toLocaleString()}`,
          `${((location.redeemed / location.issued) * 100).toFixed(1)}%`,
        ]),
        summary: [
          {
            label: "Total Vouchers Issued",
            value: metrics.totalVouchersIssued.toLocaleString(),
          },
          {
            label: "Total Vouchers Redeemed",
            value: metrics.totalVouchersRedeemed.toLocaleString(),
          },
          {
            label: "Total Voucher Value",
            value: `$${metrics.totalVoucherValue.toLocaleString()}`,
          },
          {
            label: "Overall Redemption Rate",
            value: `${metrics.redemptionRate.toFixed(1)}%`,
          },
          {
            label: "Average Voucher Value",
            value: `$${metrics.averageVoucherValue.toFixed(2)}`,
          },
          {
            label: "Expired Vouchers",
            value: metrics.expiredVouchers.toLocaleString(),
          },
          {
            label: "Fraudulent Vouchers",
            value: metrics.fraudulentVouchers.toLocaleString(),
          },
        ],
        metadata: {
          generatedBy: "Evolution1 CMS - Voucher Management",
          generatedAt: new Date().toISOString(),
          dateRange: selectedDateRange
            ? `${selectedDateRange.start?.toDateString()} - ${selectedDateRange.end?.toDateString()}`
            : "All time",
        },
      };

      await ExportUtils.exportData(exportData, "pdf");
      toast.success("Voucher management data exported successfully");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      console.error("Failed to export voucher data:", errorMessage);
      toast.error("Failed to export voucher data");
    }
  };

  const handleInvestigateFraud = (alertId: string) => {
    toast.info(`Investigating fraud alert ${alertId}`);
  };

  const metrics = voucherMetrics || sampleVoucherMetrics;

  const kpiCards = [
    {
      title: "Total Vouchers Issued",
      value: metrics.totalVouchersIssued.toLocaleString(),
      change: "+12.5%",
      trend: "up" as const,
      icon: Receipt,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Total Vouchers Redeemed",
      value: metrics.totalVouchersRedeemed.toLocaleString(),
      change: "+10.8%",
      trend: "up" as const,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Total Value",
      value: `$${metrics.totalVoucherValue.toLocaleString()}`,
      change: "+18.3%",
      trend: "up" as const,
      icon: DollarSign,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      title: "Redemption Rate",
      value: `${metrics.redemptionRate.toFixed(1)}%`,
      change: "-1.2%",
      trend: "down" as const,
      icon: Percent,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "Avg. Voucher Value",
      value: `$${metrics.averageVoucherValue.toFixed(2)}`,
      change: "+5.7%",
      trend: "up" as const,
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ];

  const alertCards = [
    {
      title: "Expired Vouchers",
      value: metrics.expiredVouchers.toLocaleString(),
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      severity: "medium",
    },
    {
      title: "Fraudulent Vouchers",
      value: metrics.fraudulentVouchers.toLocaleString(),
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-50",
      severity: "high",
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Loading skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-32 bg-gray-200 rounded-lg animate-pulse"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-64 bg-gray-200 rounded-lg animate-pulse" />
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
            Voucher Management
          </h2>
          <p className="text-gray-600">
            Track voucher issuance, redemption, and fraud detection
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpiCards.map((kpi, index) => (
          <motion.div
            key={kpi.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                    <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
                  </div>
                  <Badge
                    variant={kpi.trend === "up" ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {kpi.change}
                  </Badge>
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-bold text-gray-900">
                    {kpi.value}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">{kpi.title}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Alert Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {alertCards.map((alert, index) => (
          <motion.div
            key={alert.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
          >
            <Card
              className={`border-l-4 ${
                alert.severity === "high"
                  ? "border-l-red-500"
                  : "border-l-yellow-500"
              } hover:shadow-md transition-shadow`}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${alert.bgColor}`}>
                    <alert.icon className={`w-6 h-6 ${alert.color}`} />
                  </div>
                  <Badge
                    variant={
                      alert.severity === "high" ? "destructive" : "secondary"
                    }
                    className="text-xs"
                  >
                    {alert.severity}
                  </Badge>
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-bold text-gray-900">
                    {alert.value}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">{alert.title}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs
        value={activeSubTab}
        onValueChange={setActiveSubTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="locations">By Location</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          <TabsTrigger value="fraud">Fraud Detection</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Voucher Types Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="w-5 h-5" />
                  Voucher Types Distribution
                </CardTitle>
                <CardDescription>
                  Breakdown of voucher types issued
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    {
                      type: "Cashout Vouchers",
                      count: 18456,
                      percentage: 71.4,
                      value: 892345.2,
                    },
                    {
                      type: "Promotional Vouchers",
                      count: 5234,
                      percentage: 20.3,
                      value: 234567.8,
                    },
                    {
                      type: "Comp Vouchers",
                      count: 1456,
                      percentage: 5.6,
                      value: 87654.3,
                    },
                    {
                      type: "Jackpot Vouchers",
                      count: 694,
                      percentage: 2.7,
                      value: 70000.2,
                    },
                  ].map((item) => (
                    <div key={item.type} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{item.type}</span>
                        <span>
                          {item.count.toLocaleString()} ({item.percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-buttonActive h-2 rounded-full transition-all duration-300"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-600">
                        Total Value: ${item.value.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Hourly Voucher Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Hourly Activity Pattern
                </CardTitle>
                <CardDescription>
                  Voucher issuance and redemption by hour
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    {
                      hour: "6AM - 12PM",
                      issued: 2456,
                      redeemed: 2123,
                      percentage: 15,
                    },
                    {
                      hour: "12PM - 6PM",
                      issued: 8456,
                      redeemed: 7892,
                      percentage: 45,
                    },
                    {
                      hour: "6PM - 12AM",
                      issued: 12345,
                      redeemed: 11234,
                      percentage: 35,
                    },
                    {
                      hour: "12AM - 6AM",
                      issued: 2583,
                      redeemed: 2007,
                      percentage: 5,
                    },
                  ].map((period) => (
                    <div key={period.hour} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{period.hour}</span>
                        <span>
                          {period.issued} issued / {period.redeemed} redeemed
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-buttonActive h-2 rounded-full transition-all duration-300"
                          style={{ width: `${period.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="locations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Voucher Activity by Location
              </CardTitle>
              <CardDescription>
                Detailed breakdown of voucher metrics per location
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-semibold">Location</th>
                      <th className="text-right p-3 font-semibold">Issued</th>
                      <th className="text-right p-3 font-semibold">Redeemed</th>
                      <th className="text-right p-3 font-semibold">Rate</th>
                      <th className="text-right p-3 font-semibold">
                        Total Value
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.vouchersByLocation.map((location) => {
                      const redemptionRate =
                        (location.redeemed / location.issued) * 100;
                      return (
                        <tr
                          key={location.locationId}
                          className="border-b hover:bg-gray-50"
                        >
                          <td className="p-3 font-medium">
                            {location.locationName}
                          </td>
                          <td className="p-3 text-right">
                            {location.issued.toLocaleString()}
                          </td>
                          <td className="p-3 text-right">
                            {location.redeemed.toLocaleString()}
                          </td>
                          <td className="p-3 text-right">
                            <Badge
                              variant={
                                redemptionRate > 90
                                  ? "default"
                                  : redemptionRate > 80
                                  ? "secondary"
                                  : "destructive"
                              }
                            >
                              {redemptionRate.toFixed(1)}%
                            </Badge>
                          </td>
                          <td className="p-3 text-right font-semibold">
                            ${location.value.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Recent Voucher Activity
              </CardTitle>
              <CardDescription>
                Real-time voucher transactions and status updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search by voucher ID or location..."
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
                    <option value="issued">Issued</option>
                    <option value="redeemed">Redeemed</option>
                    <option value="expired">Expired</option>
                    <option value="flagged">Flagged</option>
                  </select>
                </div>

                <div className="space-y-3">
                  {recentVoucherActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`p-2 rounded-full ${
                            activity.status === "redeemed"
                              ? "bg-green-100"
                              : activity.status === "issued"
                              ? "bg-blue-100"
                              : activity.status === "flagged"
                              ? "bg-red-100"
                              : "bg-yellow-100"
                          }`}
                        >
                          {activity.status === "redeemed" ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : activity.status === "issued" ? (
                            <Receipt className="w-4 h-4 text-blue-600" />
                          ) : activity.status === "flagged" ? (
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-yellow-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold">{activity.id}</p>
                          <p className="text-sm text-gray-600">
                            {activity.location}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          ${activity.amount.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {activity.timestamp}
                        </p>
                      </div>
                      <Badge
                        variant={
                          activity.status === "redeemed"
                            ? "default"
                            : activity.status === "issued"
                            ? "secondary"
                            : activity.status === "flagged"
                            ? "destructive"
                            : "outline"
                        }
                      >
                        {activity.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fraud" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Fraud Detection Alerts
              </CardTitle>
              <CardDescription>
                Suspicious voucher activities requiring investigation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {fraudAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 border-l-4 rounded-lg ${
                      alert.severity === "high"
                        ? "border-l-red-500 bg-red-50"
                        : alert.severity === "medium"
                        ? "border-l-yellow-500 bg-yellow-50"
                        : "border-l-blue-500 bg-blue-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <AlertTriangle
                          className={`w-5 h-5 ${
                            alert.severity === "high"
                              ? "text-red-600"
                              : alert.severity === "medium"
                              ? "text-yellow-600"
                              : "text-blue-600"
                          }`}
                        />
                        <div>
                          <p className="font-semibold">
                            Voucher ID: {alert.voucherId}
                          </p>
                          <p className="text-sm text-gray-600">
                            {alert.location}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          ${alert.amount.toFixed(2)}
                        </p>
                        <Badge
                          variant={
                            alert.severity === "high"
                              ? "destructive"
                              : alert.severity === "medium"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {alert.severity} risk
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="text-sm text-gray-700 mb-3">
                        {alert.reason}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleInvestigateFraud(alert.id)}
                      >
                        Investigate
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
