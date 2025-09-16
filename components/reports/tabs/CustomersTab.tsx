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
import type { CustomerMetrics, CustomerDemographic, LoyaltyTier } from "@/lib/types/reports";

// TODO: Replace with MongoDB data fetching
const sampleCustomerMetrics: CustomerMetrics = {
  totalCustomers: 0,
  activeCustomers: 0,
  newCustomers: 0,
  returningCustomers: 0,
  averageSessionTime: 0,
  averageSpend: 0,
  topSpenders: [],
};


const customerDemographics: CustomerDemographic[] = [];
const loyaltyTiers: LoyaltyTier[] = [];

const customerDemographics: unknown[] = [];
const loyaltyTiers: unknown[] = [];

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
    // TODO: Implement MongoDB data fetching
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

      await exportData(exportDataObj);
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
        {/* Desktop Navigation */}
        <TabsList className="hidden md:grid w-full grid-cols-4 mb-6 bg-gray-100 p-2 rounded-lg shadow-sm">
          <TabsTrigger
            value="overview"
            className="flex-1 bg-white rounded px-4 py-3 text-sm font-medium transition-all hover:bg-gray-50 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="demographics"
            className="flex-1 bg-white rounded px-4 py-3 text-sm font-medium transition-all hover:bg-gray-50 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md"
          >
            Demographics
          </TabsTrigger>
          <TabsTrigger
            value="loyalty"
            className="flex-1 bg-white rounded px-4 py-3 text-sm font-medium transition-all hover:bg-gray-50 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md"
          >
            Loyalty Tiers
          </TabsTrigger>
          <TabsTrigger
            value="behavior"
            className="flex-1 bg-white rounded px-4 py-3 text-sm font-medium transition-all hover:bg-gray-50 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md"
          >
            Behavior
          </TabsTrigger>
        </TabsList>

        {/* Mobile Navigation */}
        <div className="md:hidden mb-6">
          <select
            value={activeSubTab}
            onChange={(e) => setActiveSubTab(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base font-semibold bg-white shadow-sm text-gray-700 focus:ring-buttonActive focus:border-buttonActive"
          >
            <option value="overview">Overview</option>
            <option value="demographics">Demographics</option>
            <option value="loyalty">Loyalty Tiers</option>
            <option value="behavior">Behavior</option>
          </select>
        </div>

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
                  {metrics.topSpenders.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">
                      No customer data available - MongoDB implementation pending
                    </p>
                  ) : (
                    metrics.topSpenders.map((customer, index) => (
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
                    ))
                  )}
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
                  {customerDemographics.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">
                      No demographic data available - MongoDB implementation pending
                    </p>
                  ) : (

                    customerDemographics.map((d: CustomerDemographic) => {

                    customerDemographics.map((demo: unknown) => {
                      const d = demo as any; // eslint-disable-line @typescript-eslint/no-explicit-any
                      return (
                        <div
                          key={d.ageGroup}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-4 h-4 bg-buttonActive rounded" />
                            <span className="font-medium">{d.ageGroup}</span>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">
                              {d.count.toLocaleString()}
                            </p>
                            <p className="text-sm text-gray-600">
                              {d.percentage}%
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
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
                {loyaltyTiers.length === 0 ? (
                  <div className="col-span-full text-center py-8">
                    <p className="text-gray-500">
                      No loyalty tier data available - MongoDB implementation pending
                    </p>
                  </div>
                ) : (

                  loyaltyTiers.map((t: LoyaltyTier) => {

                  loyaltyTiers.map((tier: unknown) => {
                    const t = tier as any; // eslint-disable-line @typescript-eslint/no-explicit-any
                    return (
                      <div
                        key={t.tier}
                        className="text-center p-4 border rounded-lg"
                      >
                        <div
                          className={`w-16 h-16 ${t.color} rounded-full mx-auto mb-3 flex items-center justify-center`}
                        >
                          <span className="text-white font-bold text-lg">
                            {t.tier[0]}
                          </span>
                        </div>
                        <h3 className="font-semibold text-lg">{t.tier}</h3>
                        <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mt-1 break-words">
                          {t.count.toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-600">
                          {t.percentage}% of customers
                        </p>
                      </div>
                    );
                  })
                )}
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
