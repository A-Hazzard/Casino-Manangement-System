/**
 * Advanced Dashboard Component
 *
 * Enhanced VM dashboard with real-time metrics and charts.
 * Provides visual insights into vault operations and trends.
 *
 * @module components/VAULT/overview/AdvancedDashboard
 */

'use client';

import { Button } from '@/components/shared/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/shared/ui/card';
import { fetchAdvancedDashboardMetrics } from '@/lib/helpers/vaultHelpers';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useUserStore } from '@/lib/store/userStore';
import { formatTime12Hour } from '@/shared/utils/dateFormat';
import {
    Activity,
    DollarSign,
    PieChart as PieChartIcon,
    RefreshCw,
    TrendingUp,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import { toast } from 'sonner';

export default function AdvancedDashboard() {
  const { formatAmount } = useCurrencyFormat();
  const { user } = useUserStore();
  const [selectedView, setSelectedView] = useState<
    'balance' | 'transactions' | 'flow'
  >('balance');
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [user?.assignedLocations]);

  const fetchData = async () => {
    const locationId = user?.assignedLocations?.[0];
    if (!locationId) return;

    setLoading(true);
    try {
      const data = await fetchAdvancedDashboardMetrics(locationId);
      if (data) {
        setDashboardData(data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data', error);
      toast.error('Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  const metrics = dashboardData?.metrics || {
    totalCashIn: 0,
    totalCashOut: 0,
    netCashFlow: 0,
    payouts: 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Advanced Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Real-time metrics and trends for vault operations
          </p>
        </div>
        <Button
          onClick={fetchData}
          variant="outline"
          size="sm"
          disabled={loading}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
          />
          Refresh
        </Button>
      </div>

      {/* View Selector */}
      <div className="flex gap-2">
        <Button
          variant={selectedView === 'balance' ? 'default' : 'outline'}
          onClick={() => setSelectedView('balance')}
          className="flex items-center gap-2"
        >
          <TrendingUp className="h-4 w-4" />
          Vault Balance
        </Button>
        <Button
          variant={selectedView === 'transactions' ? 'default' : 'outline'}
          onClick={() => setSelectedView('transactions')}
          className="flex items-center gap-2"
        >
          <Activity className="h-4 w-4" />
          Transactions
        </Button>
        <Button
          variant={selectedView === 'flow' ? 'default' : 'outline'}
          onClick={() => setSelectedView('flow')}
          className="flex items-center gap-2"
        >
          <PieChartIcon className="h-4 w-4" />
          Cash Flow
        </Button>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Main Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {selectedView === 'balance' && <TrendingUp className="h-5 w-5" />}
              {selectedView === 'transactions' && (
                <Activity className="h-5 w-5" />
              )}
              {selectedView === 'flow' && <PieChartIcon className="h-5 w-5" />}
              {selectedView === 'balance' && 'Vault Balance Trend'}
              {selectedView === 'transactions' && 'Transaction Volume'}
              {selectedView === 'flow' && 'Cash Flow Distribution'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                {selectedView === 'balance' ? (
                  <AreaChart data={dashboardData?.balanceTrend || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="time"
                      tickFormatter={(time) => formatTime12Hour(time)}
                    />
                    <YAxis />
                    <Tooltip
                      formatter={(value, name) => [
                        formatAmount(Number(value)),
                        name === 'balance' ? 'Vault Balance' : 'Cumulative Cash Out'
                      ]}
                      labelFormatter={(label) => formatTime12Hour(label)}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="balance"
                      name="Vault Balance"
                      stroke="#5A69E7"
                      fill="#5A69E7"
                      fillOpacity={0.1}
                    />
                    <Area
                      type="monotone"
                      dataKey="cashOut"
                      name="Total Cash Out"
                      stroke="#FFA203"
                      fill="#FFA203"
                      fillOpacity={0.1}
                    />
                  </AreaChart>
                ) : selectedView === 'transactions' ? (
                  <BarChart data={dashboardData?.balanceTrend || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis allowDecimals={false} />
                    <Tooltip formatter={(val) => [val, 'Count']} />
                    <Bar dataKey="transactions" fill="#FFA203" name="Transaction Count" />
                  </BarChart>
                ) : (
                  <PieChart>
                    <Pie
                      data={dashboardData?.cashFlowData || []}
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      fill="#FFA203"
                      dataKey="amount"
                      nameKey="category"
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {dashboardData?.cashFlowData?.map((entry: any, index: number) => (
                         <Cell key={`cell-${index}`} fill={
                           index === 0 ? "#0AB40B" : // Cash In (Green)
                           index === 1 ? "#FFA203" : // Cash Out (Orange)
                           index === 2 ? "#5A69E7" : // Net Flow (Blue)
                           "#F9687D" // Payouts (Pink)
                         } />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={value => formatAmount(Number(value))}
                    />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Today's Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Cash In</span>
                <span className="text-sm font-semibold text-green-600">
                  {formatAmount(metrics.totalCashIn)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Cash Out</span>
                <span className="text-sm font-semibold text-red-600">
                  {formatAmount(metrics.totalCashOut)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Net Flow</span>
                <span className="text-sm font-semibold text-blue-600">
                  {formatAmount(metrics.netCashFlow)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Payouts</span>
                <span className="text-sm font-semibold">{metrics.payouts}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Peak Hour</span>
                <span className="text-sm font-semibold">12:00 PM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Accuracy Rate</span>
                <span className="text-sm font-semibold text-green-600">
                  100%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
