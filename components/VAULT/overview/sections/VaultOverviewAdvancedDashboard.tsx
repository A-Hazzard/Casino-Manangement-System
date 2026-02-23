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
    PieChart as PieChartIcon,
    RefreshCw,
    TrendingUp
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

export default function VaultOverviewAdvancedDashboard() {
  const { formatAmount } = useCurrencyFormat();
  const { user } = useUserStore();
  const [selectedView, setSelectedView] = useState<
    'balance' | 'transactions' | 'flow'
  >('balance');
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    fetchAdvancedDashboardData();
  }, [user?.assignedLocations]);

  const fetchAdvancedDashboardData = async () => {
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
          onClick={fetchAdvancedDashboardData}
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

      {/* Peak Hour Highlight */}
      {dashboardData?.peakHour && dashboardData.peakHour !== 'N/A' && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 p-4 rounded-xl animate-in slide-in-from-top-2 duration-500">
          <div className="bg-amber-500 p-2 rounded-lg">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Peak Transaction Activity</p>
            <p className="text-xl font-black text-amber-900">{dashboardData.peakHour}</p>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="space-y-6">
        {/* Main Chart */}
        <Card>
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
                        name === 'balance' || name === 'Vault Balance' ? 'Vault Balance' : 'Cumulative Cash Out'
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
      </div>
    </div>
  );
}
