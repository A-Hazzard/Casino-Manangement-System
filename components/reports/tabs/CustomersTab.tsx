"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Users,
  TrendingUp,
  Clock,
  DollarSign,
  UserCheck,
  UserPlus,
  Activity,
  PieChart,
  BarChart3,
  Download,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Store
import { useReportsStore } from "@/lib/store/reportsStore";

// Utils
import { exportData } from "@/lib/utils/exportUtils";

// Types
import type { CustomerMetrics } from "@/lib/types/reports";

// Sample data - would come from API in real implementation
const sampleCustomerMetrics: CustomerMetrics = {
  totalCustomers: 15420,
  activeCustomers: 8765,
  newCustomers: 324,
  returningCustomers: 8441,
  averageSessionTime: 45.6,
  averageSpend: 127.5,
  topSpenders: [
    { customerId: "C001", totalSpend: 15420, visits: 45 },
    { customerId: "C002", totalSpend: 12350, visits: 32 },
    { customerId: "C003", totalSpend: 9876, visits: 28 },
    { customerId: "C004", totalSpend: 8765, visits: 23 },
    { customerId: "C005", totalSpend: 7654, visits: 19 },
  ],
};

const customerDemographics = [
  { ageGroup: "18-25", count: 1542, percentage: 10 },
  { ageGroup: "26-35", count: 4626, percentage: 30 },
  { ageGroup: "36-45", count: 4626, percentage: 30 },
  { ageGroup: "46-55", count: 3084, percentage: 20 },
  { ageGroup: "56+", count: 1542, percentage: 10 },
];

const loyaltyTiers = [
  { tier: "Bronze", count: 9252, percentage: 60, color: "bg-orange-500" },
  { tier: "Silver", count: 3084, percentage: 20, color: "bg-gray-400" },
  { tier: "Gold", count: 1542, percentage: 10, color: "bg-yellow-500" },
  { tier: "Platinum", count: 1542, percentage: 10, color: "bg-purple-500" },
];

export default function CustomersTab() {
  const {
    customerMetrics,
    updateCustomerMetrics,
    isLoading,
    setLoading,
    selectedDateRange,
  } = useReportsStore();

  const [activeSubTab, setActiveSubTab] = useState("overview");

  useEffect(() => {
    // Load customer metrics when component mounts
    setLoading(true);
    setTimeout(() => {
      updateCustomerMetrics(sampleCustomerMetrics);
      setLoading(false);
    }, 1000);
  }, [updateCustomerMetrics, setLoading, selectedDateRange]);

  const handleExportData = async () => {
    try {
      const exportDataObj = {
        title: "Customer Analytics Report",
        subtitle: "Customer activity, demographics, and behavior analysis",
        headers: [
          "Customer ID",
          "Total Spend",
          "Visits",
          "Avg Spend per Visit",
          "Status",
        ],
        data: metrics.topSpenders.map((customer) => [
          customer.customerId,
          `$${customer.totalSpend.toLocaleString()}`,
          customer.visits.toString(),
          `$${(customer.totalSpend / customer.visits).toFixed(2)}`,
          "Active",
        ]),
        summary: [
          {
            label: "Total Customers",
            value: metrics.totalCustomers.toLocaleString(),
          },
          {
            label: "Active Customers",
            value: metrics.activeCustomers.toLocaleString(),
          },
          {
            label: "New Customers",
            value: metrics.newCustomers.toLocaleString(),
          },
          {
            label: "Returning Customers",
            value: metrics.returningCustomers.toLocaleString(),
          },
          {
            label: "Average Session Time",
            value: `${metrics.averageSessionTime} minutes`,
          },
          {
            label: "Average Spend",
            value: `$${metrics.averageSpend.toFixed(2)}`,
          },
        ],
        metadata: {
          generatedBy: "Evolution1 CMS - Customer Analytics",
          generatedAt: new Date().toISOString(),
          dateRange: selectedDateRange
            ? `${selectedDateRange.start?.toDateString()} - ${selectedDateRange.end?.toDateString()}`
            : "All time",
        },
      };

      await exportData(exportDataObj, "pdf");
      toast.success("Customer analytics data exported successfully");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      console.error("Failed to export customer data:", errorMessage);
      toast.error("Failed to export customer data");
    }
  };

  const metrics = customerMetrics || sampleCustomerMetrics;

  const kpiCards = [
    {
      title: "Total Customers",
      value: metrics.totalCustomers.toLocaleString(),
      change: "+5.2%",
      trend: "up" as const,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Active Customers",
      value: metrics.activeCustomers.toLocaleString(),
      change: "+12.3%",
      trend: "up" as const,
      icon: UserCheck,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "New Customers",
      value: metrics.newCustomers.toLocaleString(),
      change: "+8.7%",
      trend: "up" as const,
      icon: UserPlus,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Avg. Session Time",
      value: `${metrics.averageSessionTime} min`,
      change: "-2.1%",
      trend: "down" as const,
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "Avg. Spend",
      value: `$${metrics.averageSpend.toFixed(2)}`,
      change: "+15.4%",
      trend: "up" as const,
      icon: DollarSign,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
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
            Customer Analytics
          </h2>
          <p className="text-gray-600">
            Track customer activity, demographics, and behavior patterns
          </p>
        </div>
        <Button onClick={handleExportData} className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export Data
        </Button>
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

      {/* Detailed Analytics Tabs */}
      <Tabs
        value={activeSubTab}
        onValueChange={setActiveSubTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="demographics">Demographics</TabsTrigger>
          <TabsTrigger value="loyalty">Loyalty Tiers</TabsTrigger>
          <TabsTrigger value="behavior">Behavior</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Spenders */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Top Spenders
                </CardTitle>
                <CardDescription>
                  Highest spending customers in the selected period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics.topSpenders.map((customer, index) => (
                    <div
                      key={customer.customerId}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-buttonActive text-white rounded-full flex items-center justify-center text-sm font-semibold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{customer.customerId}</p>
                          <p className="text-sm text-gray-600">
                            {customer.visits} visits
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">
                          ${customer.totalSpend.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Customer Activity Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Activity Timeline
                </CardTitle>
                <CardDescription>
                  Customer activity patterns throughout the day
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { time: "6AM - 12PM", customers: 1234, percentage: 20 },
                    { time: "12PM - 6PM", customers: 3456, percentage: 45 },
                    { time: "6PM - 12AM", customers: 2345, percentage: 30 },
                    { time: "12AM - 6AM", customers: 385, percentage: 5 },
                  ].map((period) => (
                    <div key={period.time} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{period.time}</span>
                        <span>{period.customers} customers</span>
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

        <TabsContent value="demographics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Age Demographics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  Age Demographics
                </CardTitle>
                <CardDescription>
                  Customer distribution by age groups
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {customerDemographics.map((demo) => (
                    <div
                      key={demo.ageGroup}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-buttonActive rounded" />
                        <span className="font-medium">{demo.ageGroup}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {demo.count.toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-600">
                          {demo.percentage}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Gender Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Gender Distribution</CardTitle>
                <CardDescription>Customer breakdown by gender</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { gender: "Male", count: 8456, percentage: 55 },
                    { gender: "Female", count: 6234, percentage: 40 },
                    {
                      gender: "Other/Prefer not to say",
                      count: 730,
                      percentage: 5,
                    },
                  ].map((item) => (
                    <div
                      key={item.gender}
                      className="flex items-center justify-between"
                    >
                      <span className="font-medium">{item.gender}</span>
                      <div className="text-right">
                        <p className="font-semibold">
                          {item.count.toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-600">
                          {item.percentage}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="loyalty" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Loyalty Tier Distribution
              </CardTitle>
              <CardDescription>
                Customer distribution across loyalty tiers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {loyaltyTiers.map((tier) => (
                  <div
                    key={tier.tier}
                    className="text-center p-4 border rounded-lg"
                  >
                    <div
                      className={`w-16 h-16 ${tier.color} rounded-full mx-auto mb-3 flex items-center justify-center`}
                    >
                      <span className="text-white font-bold text-lg">
                        {tier.tier[0]}
                      </span>
                    </div>
                    <h3 className="font-semibold text-lg">{tier.tier}</h3>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {tier.count.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      {tier.percentage}% of customers
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="behavior" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Visit Frequency */}
            <Card>
              <CardHeader>
                <CardTitle>Visit Frequency</CardTitle>
                <CardDescription>
                  How often customers visit the casino
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { frequency: "Daily", customers: 1542, percentage: 10 },
                    { frequency: "Weekly", customers: 4626, percentage: 30 },
                    { frequency: "Monthly", customers: 6168, percentage: 40 },
                    {
                      frequency: "Occasionally",
                      customers: 3084,
                      percentage: 20,
                    },
                  ].map((item) => (
                    <div key={item.frequency} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{item.frequency}</span>
                        <span>
                          {item.customers.toLocaleString()} customers (
                          {item.percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-buttonActive h-2 rounded-full transition-all duration-300"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Preferred Games */}
            <Card>
              <CardHeader>
                <CardTitle>Preferred Game Types</CardTitle>
                <CardDescription>
                  Most popular game categories among customers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { game: "Slot Machines", players: 12336, percentage: 80 },
                    { game: "Table Games", players: 1854, percentage: 12 },
                    { game: "Video Poker", players: 926, percentage: 6 },
                    { game: "Other", players: 304, percentage: 2 },
                  ].map((item) => (
                    <div
                      key={item.game}
                      className="flex items-center justify-between"
                    >
                      <span className="font-medium">{item.game}</span>
                      <div className="text-right">
                        <p className="font-semibold">
                          {item.players.toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-600">
                          {item.percentage}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
