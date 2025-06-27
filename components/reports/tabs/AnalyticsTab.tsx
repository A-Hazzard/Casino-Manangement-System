"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  BarChart3,
  Brain,
  Target,
  AlertTriangle,
  Download,
} from "lucide-react";
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { ExportUtils } from "@/lib/utils/exportUtils";
import { toast } from "sonner";

// Generate sample predictive data
const generateForecastData = () => {
  const data = [];
  const baseRevenue = 50000;
  const currentDate = new Date();

  // Historical data (last 30 days)
  for (let i = 30; i >= 0; i--) {
    const date = new Date(currentDate);
    date.setDate(date.getDate() - i);
    const trend = Math.sin(i * 0.1) * 5000 + Math.random() * 3000;
    data.push({
      date: date.toISOString().split("T")[0],
      actual: baseRevenue + trend,
      type: "historical",
    });
  }

  // Forecast data (next 30 days)
  for (let i = 1; i <= 30; i++) {
    const date = new Date(currentDate);
    date.setDate(date.getDate() + i);
    const trend = Math.sin(i * 0.1) * 5000 + Math.random() * 2000;
    const predicted = baseRevenue + trend + i * 100; // slight upward trend
    const confidence = Math.max(0.6, 1 - i * 0.01); // decreasing confidence over time

    data.push({
      date: date.toISOString().split("T")[0],
      predicted: predicted,
      upperBound: predicted * (1 + (1 - confidence) * 0.2),
      lowerBound: predicted * (1 - (1 - confidence) * 0.2),
      confidence: confidence * 100,
      type: "forecast",
    });
  }

  return data;
};

const generatePerformanceData = () => [
  { metric: "Revenue Optimization", current: 85, target: 90, benchmark: 88 },
  { metric: "Player Retention", current: 78, target: 85, benchmark: 80 },
  { metric: "Machine Utilization", current: 92, target: 95, benchmark: 89 },
  { metric: "Hold Percentage", current: 88, target: 90, benchmark: 87 },
  { metric: "Customer Satisfaction", current: 82, target: 90, benchmark: 85 },
  { metric: "Operational Efficiency", current: 76, target: 85, benchmark: 79 },
];

const generateAnomalyData = () => [
  {
    date: "2024-01-15",
    metric: "Revenue Drop",
    severity: "high",
    deviation: -15.2,
    description: "Significant revenue decrease in VIP area",
  },
  {
    date: "2024-01-14",
    metric: "Machine Downtime",
    severity: "medium",
    deviation: 8.7,
    description: "Higher than normal machine maintenance",
  },
  {
    date: "2024-01-13",
    metric: "Player Activity",
    severity: "low",
    deviation: 5.3,
    description: "Slight increase in off-peak hours",
  },
];

const generateTrendData = () => [
  { month: "Jan", revenue: 45000, players: 1200, efficiency: 78 },
  { month: "Feb", revenue: 48000, players: 1350, efficiency: 82 },
  { month: "Mar", revenue: 52000, players: 1400, efficiency: 85 },
  { month: "Apr", revenue: 49000, players: 1300, efficiency: 80 },
  { month: "May", revenue: 55000, players: 1500, efficiency: 88 },
  { month: "Jun", revenue: 58000, players: 1600, efficiency: 90 },
];

// Generate heatmap data for machine performance
const generateHeatmapData = () => {
  const locations = ["Main Floor", "VIP Area", "Sports Bar", "Hotel Lounge"];
  const machines = [
    "Slots",
    "Video Poker",
    "Blackjack",
    "Roulette",
    "Baccarat",
  ];
  const data = [];

  for (let i = 0; i < locations.length; i++) {
    for (let j = 0; j < machines.length; j++) {
      data.push({
        location: locations[i],
        machine: machines[j],
        performance: Math.floor(Math.random() * 100) + 1,
        revenue: Math.floor(Math.random() * 50000) + 10000,
        x: j,
        y: i,
      });
    }
  }
  return data;
};

export default function AnalyticsTab() {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState("30d");

  const forecastData = useMemo(() => generateForecastData(), []);
  const performanceData = useMemo(() => generatePerformanceData(), []);
  const anomalyData = useMemo(() => generateAnomalyData(), []);
  const trendData = useMemo(() => generateTrendData(), []);
  const heatmapData = useMemo(() => generateHeatmapData(), []);

  useEffect(() => {
    setTimeout(() => setIsLoading(false), 1500);
  }, []);

  const handleExportAnalytics = async () => {
    try {
      const exportData = {
        title: "Advanced Analytics Report",
        subtitle: "Predictive insights and performance forecasting",
        headers: ["Metric", "Current Value", "Target", "Benchmark", "Status"],
        data: performanceData.map((item) => [
          item.metric,
          `${item.current}%`,
          `${item.target}%`,
          `${item.benchmark}%`,
          item.current >= item.target ? "On Target" : "Below Target",
        ]),
        summary: [
          { label: "Metrics Analyzed", value: performanceData.length },
          {
            label: "On Target",
            value: performanceData.filter((m) => m.current >= m.target).length,
          },
          {
            label: "Average Performance",
            value: `${(
              performanceData.reduce((sum, m) => sum + m.current, 0) /
              performanceData.length
            ).toFixed(1)}%`,
          },
          { label: "Anomalies Detected", value: anomalyData.length },
        ],
        metadata: {
          generatedBy: "Evolution1 CMS - Analytics Engine",
          generatedAt: new Date().toISOString(),
          dateRange: "Last 30 days",
        },
      };

      await ExportUtils.exportData(exportData, "pdf");
      toast.success("Analytics report exported successfully");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      console.error("Failed to export analytics report:", errorMessage);
      toast.error("Failed to export analytics report");
    }
  };

  const handleTimeframeChange = (timeframe: string) => {
    setSelectedTimeframe(timeframe);
    // Simulate data refresh based on timeframe
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-64 bg-gray-200 rounded-lg animate-pulse"
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Advanced Analytics
          </h2>
          <p className="text-sm text-gray-600">
            Predictive insights and performance forecasting powered by AI
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            {["7d", "30d", "90d"].map((timeframe) => (
              <Button
                key={timeframe}
                variant={
                  selectedTimeframe === timeframe ? "default" : "outline"
                }
                size="sm"
                onClick={() => handleTimeframeChange(timeframe)}
              >
                {timeframe}
              </Button>
            ))}
          </div>
          <Badge variant="outline" className="text-green-600 border-green-600">
            <Brain className="w-3 h-3 mr-1" />
            AI Powered
          </Badge>
          <Button onClick={handleExportAnalytics} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Revenue Forecast */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Revenue Forecast (Next 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecastData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString()
                  }
                />
                <YAxis
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip
                  labelFormatter={(value) =>
                    new Date(value).toLocaleDateString()
                  }
                  formatter={(value, name) => [
                    `$${Number(value).toLocaleString()}`,
                    name === "actual"
                      ? "Historical"
                      : name === "predicted"
                      ? "Predicted"
                      : name === "upperBound"
                      ? "Upper Bound"
                      : "Lower Bound",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="upperBound"
                  stackId="1"
                  stroke="none"
                  fill="rgba(59, 130, 246, 0.1)"
                />
                <Area
                  type="monotone"
                  dataKey="lowerBound"
                  stackId="1"
                  stroke="none"
                  fill="white"
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Historical Data</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-blue-500 border-dashed rounded-full"></div>
              <span>Predicted Revenue</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-200 rounded-full"></div>
              <span>Confidence Interval</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Radar & Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-600" />
              Performance Radar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={performanceData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} />
                  <Radar
                    name="Current"
                    dataKey="current"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                  <Radar
                    name="Target"
                    dataKey="target"
                    stroke="#10b981"
                    fill="none"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />
                  <Radar
                    name="Benchmark"
                    dataKey="benchmark"
                    stroke="#f59e0b"
                    fill="none"
                    strokeWidth={1}
                  />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-green-600" />
              Monthly Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" orientation="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Bar
                    yAxisId="left"
                    dataKey="revenue"
                    fill="#3b82f6"
                    name="Revenue ($)"
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="efficiency"
                    fill="#10b981"
                    name="Efficiency (%)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Machine Performance Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-red-600" />
            Machine Performance Heatmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-6 gap-1">
              {/* Header row */}
              <div className="p-2 text-center font-medium text-sm">
                Location
              </div>
              {[
                "Slots",
                "Video Poker",
                "Blackjack",
                "Roulette",
                "Baccarat",
              ].map((machine) => (
                <div
                  key={machine}
                  className="p-2 text-center font-medium text-xs"
                >
                  {machine}
                </div>
              ))}

              {/* Data rows */}
              {["Main Floor", "VIP Area", "Sports Bar", "Hotel Lounge"].map(
                (location) => (
                  <div key={location} className="contents">
                    <div className="p-2 text-center font-medium text-sm">
                      {location}
                    </div>
                    {heatmapData
                      .filter((item) => item.location === location)
                      .map((item, index) => (
                        <div
                          key={`${location}-${index}`}
                          className={`p-2 text-center text-xs font-medium rounded cursor-pointer transition-all hover:scale-105 ${
                            item.performance >= 80
                              ? "bg-green-500 text-white"
                              : item.performance >= 60
                              ? "bg-yellow-500 text-white"
                              : item.performance >= 40
                              ? "bg-orange-500 text-white"
                              : "bg-red-500 text-white"
                          }`}
                          title={`${item.location} - ${item.machine}: ${
                            item.performance
                          }% performance, $${item.revenue.toLocaleString()} revenue`}
                        >
                          {item.performance}%
                        </div>
                      ))}
                  </div>
                )
              )}
            </div>

            {/* Legend */}
            <div className="flex justify-center gap-4 text-sm mt-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span>Excellent (80-100%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span>Good (60-79%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-500 rounded"></div>
                <span>Fair (40-59%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span>Poor (0-39%)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Anomaly Detection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Anomaly Detection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {anomalyData.map((anomaly, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      anomaly.severity === "high"
                        ? "bg-red-500"
                        : anomaly.severity === "medium"
                        ? "bg-yellow-500"
                        : "bg-blue-500"
                    }`}
                  />
                  <div>
                    <div className="font-medium">{anomaly.metric}</div>
                    <div className="text-sm text-gray-600">
                      {anomaly.description}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    {anomaly.deviation > 0 ? "+" : ""}
                    {anomaly.deviation}%
                  </div>
                  <div className="text-sm text-gray-600">{anomaly.date}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Key Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-blue-50">
                <Brain className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">94.2%</p>
                <p className="text-sm text-gray-600">Prediction Accuracy</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-green-50">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">+12.5%</p>
                <p className="text-sm text-gray-600">Projected Growth</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-orange-50">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">3</p>
                <p className="text-sm text-gray-600">Active Alerts</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
