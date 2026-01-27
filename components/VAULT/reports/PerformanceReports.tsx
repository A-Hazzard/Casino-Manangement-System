/**
 * Performance Reports Component
 *
 * Charts and analytics for vault and cashier performance metrics.
 * Provides insights into operational efficiency and trends.
 *
 * @module components/VAULT/reports/PerformanceReports
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/shared/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/shared/ui/card';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Users, Clock, DollarSign } from 'lucide-react';

// Mock performance data
const cashierPerformanceData = [
  {
    date: '2024-01-20',
    cashier: 'John Doe',
    transactions: 45,
    amount: 12500,
    accuracy: 99.5,
  },
  {
    date: '2024-01-20',
    cashier: 'Jane Smith',
    transactions: 52,
    amount: 15800,
    accuracy: 100,
  },
  {
    date: '2024-01-21',
    cashier: 'John Doe',
    transactions: 38,
    amount: 9800,
    accuracy: 98.8,
  },
  {
    date: '2024-01-21',
    cashier: 'Jane Smith',
    transactions: 48,
    amount: 14200,
    accuracy: 99.9,
  },
];

const vaultEfficiencyData = [
  { time: '08:00', processingTime: 2.5, transactionVolume: 120 },
  { time: '10:00', processingTime: 2.1, transactionVolume: 180 },
  { time: '12:00', processingTime: 2.8, transactionVolume: 250 },
  { time: '14:00', processingTime: 2.3, transactionVolume: 220 },
  { time: '16:00', processingTime: 2.6, transactionVolume: 190 },
  { time: '18:00', processingTime: 2.9, transactionVolume: 160 },
];

const monthlyTrendsData = [
  { month: 'Oct', revenue: 450000, payouts: 380000, profit: 70000 },
  { month: 'Nov', revenue: 480000, payouts: 410000, profit: 70000 },
  { month: 'Dec', revenue: 520000, payouts: 440000, profit: 80000 },
  { month: 'Jan', revenue: 490000, payouts: 420000, profit: 70000 },
];

export default function PerformanceReports() {
  const [selectedMetric, setSelectedMetric] = useState<
    'cashier' | 'vault' | 'monthly'
  >('cashier');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Performance Reports
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Analytics and insights for vault and cashier performance
        </p>
      </div>

      {/* Metric Selector */}
      <div className="flex gap-2">
        <Button
          variant={selectedMetric === 'cashier' ? 'default' : 'outline'}
          onClick={() => setSelectedMetric('cashier')}
          className="flex items-center gap-2"
        >
          <Users className="h-4 w-4" />
          Cashier Performance
        </Button>
        <Button
          variant={selectedMetric === 'vault' ? 'default' : 'outline'}
          onClick={() => setSelectedMetric('vault')}
          className="flex items-center gap-2"
        >
          <Clock className="h-4 w-4" />
          Vault Efficiency
        </Button>
        <Button
          variant={selectedMetric === 'monthly' ? 'default' : 'outline'}
          onClick={() => setSelectedMetric('monthly')}
          className="flex items-center gap-2"
        >
          <TrendingUp className="h-4 w-4" />
          Monthly Trends
        </Button>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Main Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {selectedMetric === 'cashier' && <Users className="h-5 w-5" />}
              {selectedMetric === 'vault' && <Clock className="h-5 w-5" />}
              {selectedMetric === 'monthly' && (
                <TrendingUp className="h-5 w-5" />
              )}
              {selectedMetric === 'cashier' && 'Cashier Performance Metrics'}
              {selectedMetric === 'vault' && 'Vault Processing Efficiency'}
              {selectedMetric === 'monthly' && 'Monthly Financial Trends'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <>
                  {selectedMetric === 'cashier' && (
                    <BarChart data={cashierPerformanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="cashier" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Bar
                        yAxisId="left"
                        dataKey="transactions"
                        fill="#3B82F6"
                        name="Transactions"
                      />
                      <Bar
                        yAxisId="right"
                        dataKey="accuracy"
                        fill="#10B981"
                        name="Accuracy %"
                      />
                    </BarChart>
                  )}
                  {selectedMetric === 'vault' && (
                    <LineChart data={vaultEfficiencyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="processingTime"
                        stroke="#EF4444"
                        name="Avg Processing Time (min)"
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="transactionVolume"
                        stroke="#3B82F6"
                        name="Transaction Volume"
                      />
                    </LineChart>
                  )}
                  {selectedMetric === 'monthly' && (
                    <BarChart data={monthlyTrendsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip
                        formatter={value => [
                          `$${Number(value).toLocaleString()}`,
                          '',
                        ]}
                      />
                      <Bar
                        dataKey="revenue"
                        stackId="a"
                        fill="#10B981"
                        name="Revenue"
                      />
                      <Bar
                        dataKey="payouts"
                        stackId="a"
                        fill="#EF4444"
                        name="Payouts"
                      />
                      <Bar
                        dataKey="profit"
                        stackId="a"
                        fill="#F59E0B"
                        name="Profit"
                      />
                    </BarChart>
                  )}
                </>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Revenue Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Revenue</span>
                <span className="text-sm font-semibold text-green-600">
                  $490,000
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Payouts</span>
                <span className="text-sm font-semibold text-red-600">
                  $420,000
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Net Profit</span>
                <span className="text-sm font-semibold text-blue-600">
                  $70,000
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Profit Margin</span>
                <span className="text-sm font-semibold text-purple-600">
                  14.3%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Operational Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">
                  Avg Transactions/Day
                </span>
                <span className="text-sm font-semibold">195</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">
                  Avg Processing Time
                </span>
                <span className="text-sm font-semibold">2.5 min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Cashier Accuracy</span>
                <span className="text-sm font-semibold text-green-600">
                  99.5%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">System Uptime</span>
                <span className="text-sm font-semibold text-green-600">
                  99.9%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Key Performance Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg bg-green-50 p-4">
              <h4 className="font-semibold text-green-800">Revenue Growth</h4>
              <p className="mt-1 text-sm text-green-600">
                8.9% increase in monthly revenue compared to last quarter
              </p>
            </div>
            <div className="rounded-lg bg-blue-50 p-4">
              <h4 className="font-semibold text-blue-800">
                Efficiency Improvement
              </h4>
              <p className="mt-1 text-sm text-blue-600">
                15% reduction in average transaction processing time
              </p>
            </div>
            <div className="rounded-lg bg-purple-50 p-4">
              <h4 className="font-semibold text-purple-800">High Accuracy</h4>
              <p className="mt-1 text-sm text-purple-600">
                Cashier accuracy rate consistently above 99%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
