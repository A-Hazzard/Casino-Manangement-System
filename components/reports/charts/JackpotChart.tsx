"use client";

import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap } from "lucide-react";

interface JackpotChartData {
  time: string;
  jackpot: number;
}

interface JackpotChartProps {
  timePeriod: string;
  locationIds?: string[];
  licencee?: string;
  className?: string;
}

export default function JackpotChart({
  timePeriod,
  locationIds,
  licencee,
  className = "",
}: JackpotChartProps) {
  const [data, setData] = useState<JackpotChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const params = new URLSearchParams({
          timePeriod,
          ...(licencee && { licencee }),
          ...(locationIds && locationIds.length > 0 && { locationIds: locationIds.join(",") }),
        });

        const response = await fetch(`/api/analytics/jackpot-trends?${params}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch jackpot data');
        }

        const result = await response.json();
        setData(result.data || []);
      } catch (err) {
        console.error('Error fetching jackpot data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [timePeriod, locationIds, licencee]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatTime = (time: string) => {
    if (timePeriod === "Today" || timePeriod === "Yesterday") {
      // Format as hour (e.g., "14:00" -> "2 PM")
      const hour = parseInt(time.split(':')[0]);
      return `${hour === 0 ? 12 : hour > 12 ? hour - 12 : hour} ${hour >= 12 ? 'PM' : 'AM'}`;
    } else {
      // Format as date (e.g., "2024-01-15" -> "Jan 15")
      const date = new Date(time);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Jackpot Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-100 rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Jackpot Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="text-sm font-medium">Error loading data</div>
              <div className="text-xs">{error}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Jackpot Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="text-sm font-medium">No data available</div>
              <div className="text-xs">No jackpot data for the selected time period</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalJackpot = data.reduce((sum, item) => sum + item.jackpot, 0);
  const maxJackpot = Math.max(...data.map(item => item.jackpot));

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Jackpot Trends
        </CardTitle>
        <div className="text-sm text-gray-600">
          Total: {formatCurrency(totalJackpot)} | Peak: {formatCurrency(maxJackpot)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="jackpotGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="time"
                tickFormatter={formatTime}
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={formatCurrency}
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), 'Jackpot']}
                labelFormatter={formatTime}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
              />
              <Area
                type="monotone"
                dataKey="jackpot"
                stroke="#f59e0b"
                strokeWidth={3}
                fill="url(#jackpotGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
} 