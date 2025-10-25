'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Receipt,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  // XCircle,
  DollarSign,
  Percent,
  Clock,
  MapPin,
  Download,
  Filter,
  Search,
} from 'lucide-react';

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Store
import { useReportsStore } from '@/lib/store/reportsStore';

// Utils
import { exportData } from '@/lib/utils/exportUtils';
import { getFinancialColorClass } from '@/lib/utils/financialColors';

// Types
import type { VoucherMetrics } from '@/lib/types/reports';

export default function VouchersTab() {
  const {
    voucherMetrics,
    updateVoucherMetrics,
    isLoading,
    setLoading,
    selectedDateRange,
  } = useReportsStore();

  const [activeSubTab, setActiveSubTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    // TODO: Implement actual API call to fetch voucher metrics from MongoDB
    // This should fetch real voucher data from the database
    setLoading(true);
    // Placeholder for actual API call
    // fetchVoucherMetrics().then(data => {
    //   updateVoucherMetrics(data);
    //   setLoading(false);
    // }).catch(error => {
    //   console.error('Error fetching voucher metrics:', error);
    //   setLoading(false);
    // });
    setLoading(false);
  }, [updateVoucherMetrics, setLoading, selectedDateRange]);

  const handleExportData = async () => {
    try {
      const voucherExportData = {
        title: 'Voucher Management Report',
        subtitle: 'Voucher issuance, redemption, and fraud analysis',
        headers: [
          'Location',
          'Vouchers Issued',
          'Vouchers Redeemed',
          'Total Value',
          'Redemption Rate',
        ],
        data: [], // TODO: Replace with actual voucher location data from MongoDB
        summary: [
          {
            label: 'Total Vouchers Issued',
            value: metrics.totalVouchersIssued.toLocaleString(),
          },
          {
            label: 'Total Vouchers Redeemed',
            value: metrics.totalVouchersRedeemed.toLocaleString(),
          },
          {
            label: 'Total Value',
            value: `$${metrics.totalVoucherValue.toLocaleString()}`,
          },
          {
            label: 'Redemption Rate',
            value: `${metrics.redemptionRate.toFixed(1)}%`,
          },
          {
            label: 'Avg. Voucher Value',
            value: `$${metrics.averageVoucherValue.toFixed(2)}`,
          },
        ],
        metadata: {
          generatedBy: 'Evolution1 CMS - Vouchers Export',
          generatedAt: new Date().toISOString(),
          dateRange: selectedDateRange
            ? `${selectedDateRange.start?.toDateString()} - ${selectedDateRange.end?.toDateString()}`
            : 'All time',
        },
      };

      await exportData(voucherExportData);
      toast.success('Voucher management data exported successfully');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Failed to export voucher data:', errorMessage);
      toast.error('Failed to export voucher data');
    }
  };

  // const handleInvestigateFraud = (alertId: string) => {
  //   toast.info(`Investigating fraud alert ${alertId}`);
  // };

  const metrics = voucherMetrics || {
    totalVouchersIssued: 0,
    totalVouchersRedeemed: 0,
    totalVoucherValue: 0,
    redemptionRate: 0,
    averageVoucherValue: 0,
    expiredVouchers: 0,
    fraudulentVouchers: 0,
    vouchersByLocation: [],
  };

  const kpiCards = [
    {
      title: 'Total Vouchers Issued',
      value: metrics.totalVouchersIssued.toLocaleString(),
      change: '+12.5%',
      trend: 'up' as const,
      icon: Receipt,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Total Vouchers Redeemed',
      value: metrics.totalVouchersRedeemed.toLocaleString(),
      change: '+10.8%',
      trend: 'up' as const,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Total Value',
      value: `$${metrics.totalVoucherValue.toLocaleString()}`,
      change: '+18.3%',
      trend: 'up' as const,
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'Redemption Rate',
      value: `${metrics.redemptionRate.toFixed(1)}%`,
      change: '-1.2%',
      trend: 'down' as const,
      icon: Percent,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Avg. Voucher Value',
      value: `$${metrics.averageVoucherValue.toFixed(2)}`,
      change: '+5.7%',
      trend: 'up' as const,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  const alertCards = [
    {
      title: 'Expired Vouchers',
      value: metrics.expiredVouchers.toLocaleString(),
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      severity: 'medium',
    },
    {
      title: 'Fraudulent Vouchers',
      value: metrics.fraudulentVouchers.toLocaleString(),
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      severity: 'high',
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Loading skeleton */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-lg bg-gray-200"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="h-64 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-64 animate-pulse rounded-lg bg-gray-200" />
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
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
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
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          <Button
            onClick={handleExportData}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export Data
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        {kpiCards.map((kpi, index) => (
          <motion.div
            key={kpi.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className={`rounded-lg p-2 ${kpi.bgColor}`}>
                    <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
                  </div>
                  <Badge
                    variant={kpi.trend === 'up' ? 'default' : 'destructive'}
                    className="text-xs"
                  >
                    {kpi.change}
                  </Badge>
                </div>
                <div className="mt-4">
                  <p className="break-words text-lg font-bold text-gray-900 sm:text-xl lg:text-2xl">
                    {kpi.value}
                  </p>
                  <p className="mt-1 break-words text-xs text-gray-600 sm:text-sm">
                    {kpi.title}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Alert Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {alertCards.map((alert, index) => (
          <motion.div
            key={alert.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
          >
            <Card
              className={`border-l-4 ${
                alert.severity === 'high'
                  ? 'border-l-red-500'
                  : 'border-l-yellow-500'
              } transition-shadow hover:shadow-md`}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className={`rounded-lg p-2 ${alert.bgColor}`}>
                    <alert.icon className={`h-6 w-6 ${alert.color}`} />
                  </div>
                  <Badge
                    variant={
                      alert.severity === 'high' ? 'destructive' : 'secondary'
                    }
                    className="text-xs"
                  >
                    {alert.severity}
                  </Badge>
                </div>
                <div className="mt-4">
                  <p className="break-words text-lg font-bold text-gray-900 sm:text-xl lg:text-2xl">
                    {alert.value}
                  </p>
                  <p className="mt-1 break-words text-xs text-gray-600 sm:text-sm">
                    {alert.title}
                  </p>
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
        <TabsList className="mb-6 hidden w-full grid-cols-4 rounded-lg bg-gray-100 p-2 shadow-sm md:grid">
          <TabsTrigger
            value="overview"
            className="flex-1 rounded bg-white px-4 py-3 text-sm font-medium transition-all hover:bg-gray-50 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="locations"
            className="flex-1 rounded bg-white px-4 py-3 text-sm font-medium transition-all hover:bg-gray-50 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md"
          >
            By Location
          </TabsTrigger>
          <TabsTrigger
            value="activity"
            className="flex-1 rounded bg-white px-4 py-3 text-sm font-medium transition-all hover:bg-gray-50 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md"
          >
            Recent Activity
          </TabsTrigger>
          <TabsTrigger
            value="fraud"
            className="flex-1 rounded bg-white px-4 py-3 text-sm font-medium transition-all hover:bg-gray-50 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md"
          >
            Fraud Detection
          </TabsTrigger>
        </TabsList>

        {/* Mobile Navigation */}
        <div className="mb-6 md:hidden">
          <select
            value={activeSubTab}
            onChange={e => setActiveSubTab(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base font-semibold text-gray-700 shadow-sm focus:border-buttonActive focus:ring-buttonActive"
          >
            <option value="overview">Overview</option>
            <option value="locations">By Location</option>
            <option value="activity">Recent Activity</option>
            <option value="fraud">Fraud Detection</option>
          </select>
        </div>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Voucher Types Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
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
                      type: 'Cashout Vouchers',
                      count: 18456,
                      percentage: 71.4,
                      value: 892345.2,
                    },
                    {
                      type: 'Promotional Vouchers',
                      count: 5234,
                      percentage: 20.3,
                      value: 234567.8,
                    },
                    {
                      type: 'Comp Vouchers',
                      count: 1456,
                      percentage: 5.6,
                      value: 87654.3,
                    },
                    {
                      type: 'Jackpot Vouchers',
                      count: 694,
                      percentage: 2.7,
                      value: 70000.2,
                    },
                  ].map(item => (
                    <div key={item.type} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{item.type}</span>
                        <span>
                          {item.count.toLocaleString()} ({item.percentage}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-200">
                        <div
                          className="h-2 rounded-full bg-buttonActive transition-all duration-300"
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
                  <Clock className="h-5 w-5" />
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
                      hour: '6AM - 12PM',
                      issued: 2456,
                      redeemed: 2123,
                      percentage: 15,
                    },
                    {
                      hour: '12PM - 6PM',
                      issued: 8456,
                      redeemed: 7892,
                      percentage: 45,
                    },
                    {
                      hour: '6PM - 12AM',
                      issued: 12345,
                      redeemed: 11234,
                      percentage: 35,
                    },
                    {
                      hour: '12AM - 6AM',
                      issued: 2583,
                      redeemed: 2007,
                      percentage: 5,
                    },
                  ].map(period => (
                    <div key={period.hour} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{period.hour}</span>
                        <span>
                          {period.issued} issued / {period.redeemed} redeemed
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-200">
                        <div
                          className="h-2 rounded-full bg-buttonActive transition-all duration-300"
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
                <MapPin className="h-5 w-5" />
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
                      <th className="p-3 text-center font-semibold">
                        Location
                      </th>
                      <th className="p-3 text-right font-semibold">Issued</th>
                      <th className="p-3 text-right font-semibold">Redeemed</th>
                      <th className="p-3 text-right font-semibold">Rate</th>
                      <th className="p-3 text-right font-semibold">
                        Total Value
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.vouchersByLocation.map(
                      (
                        location: VoucherMetrics['vouchersByLocation'][number]
                      ) => {
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
                                    ? 'default'
                                    : redemptionRate > 80
                                      ? 'secondary'
                                      : 'destructive'
                                }
                              >
                                {redemptionRate.toFixed(1)}%
                              </Badge>
                            </td>
                            <td
                              className={`p-3 text-right font-semibold ${getFinancialColorClass(location.value)}`}
                            >
                              ${location.value.toLocaleString()}
                            </td>
                          </tr>
                        );
                      }
                    )}
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
                <Clock className="h-5 w-5" />
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
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                    <Input
                      placeholder="Search by voucher ID or location..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className="rounded-md border border-gray-300 bg-white px-3 py-2"
                  >
                    <option value="all">All Status</option>
                    <option value="issued">Issued</option>
                    <option value="redeemed">Redeemed</option>
                    <option value="expired">Expired</option>
                    <option value="flagged">Flagged</option>
                  </select>
                </div>

                <div className="space-y-3">
                  {/* TODO: Replace with actual voucher activity data from MongoDB */}
                  <div className="py-8 text-center text-muted-foreground">
                    No voucher activity data available - MongoDB implementation
                    pending
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fraud" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Fraud Detection Alerts
              </CardTitle>
              <CardDescription>
                Suspicious voucher activities requiring investigation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* TODO: Replace with actual fraud alert data from MongoDB */}
                <div className="py-8 text-center text-muted-foreground">
                  No fraud alerts available - MongoDB implementation pending
                </div>
                {/* {[].map((alert) => (
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
                ))} */}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
