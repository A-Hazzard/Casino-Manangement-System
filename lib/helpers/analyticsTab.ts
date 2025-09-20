import { exportData } from "@/lib/utils/exportUtils";
import { toast } from "sonner";

/**
 * Generates sample predictive forecast data for analytics charts
 */
export const generateForecastData = () => {
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

/**
 * Generates performance radar chart data
 */
export const generatePerformanceData = () => [
  { metric: "Revenue Optimization", current: 85, target: 90, benchmark: 88 },
  { metric: "Player Retention", current: 78, target: 85, benchmark: 80 },
  { metric: "Machine Utilization", current: 92, target: 95, benchmark: 89 },
  { metric: "Hold Percentage", current: 88, target: 90, benchmark: 87 },
  { metric: "Customer Satisfaction", current: 82, target: 90, benchmark: 85 },
  {
    metric: "Operational Efficiency",
    current: 76,
    target: 85,
    benchmark: 79,
  },
];

/**
 * Generates anomaly detection data
 */
export const generateAnomalyData = () => [
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

/**
 * Generates monthly trend data
 */
export const generateTrendData = () => [
  { month: "Jan", revenue: 45000, players: 1200, efficiency: 78 },
  { month: "Feb", revenue: 48000, players: 1350, efficiency: 82 },
  { month: "Mar", revenue: 52000, players: 1400, efficiency: 85 },
  { month: "Apr", revenue: 49000, players: 1300, efficiency: 80 },
  { month: "May", revenue: 55000, players: 1500, efficiency: 88 },
  { month: "Jun", revenue: 58000, players: 1600, efficiency: 90 },
];

/**
 * Generates heatmap data for machine performance
 */
export const generateHeatmapData = () => {
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

/**
 * Handles analytics report export functionality
 */
export const handleAnalyticsExport = async (
  performanceData: Array<{
    metric: string;
    current: number;
    target: number;
    benchmark: number;
  }>,
  anomalyData: Array<{
    date: string;
    metric: string;
    severity: string;
    deviation: number;
    description: string;
  }>
) => {
  try {
    const analyticsExportData = {
      title: "Advanced Analytics Report",
      subtitle: "Predictive insights and performance forecasting",
      headers: ["Metric", "Current Value", "Target", "Benchmark", "Status"],
      data: performanceData.map((item) => [
        item.metric,
        `${item.current}%`,
        `${item.target}%`,
        `${item.benchmark}%`,
        item.current >= item.target ? "On Target" : "Below Target",
      ] as (string | number | undefined)[]),
      summary: [
        { label: "Metrics Analyzed", value: performanceData.length.toString() },
        {
          label: "On Target",
          value: performanceData.filter((m) => m.current >= m.target).length.toString(),
        },
        {
          label: "Average Performance",
          value: `${(() => {
            const percentage = (performanceData.reduce((sum, item) => sum + item.current, 0) / performanceData.length);
            const hasDecimals = percentage % 1 !== 0;
            const decimalPart = percentage % 1;
            const hasSignificantDecimals = hasDecimals && decimalPart >= 0.1;
            return percentage.toFixed(hasSignificantDecimals ? 1 : 0);
          })()}%`,
        },
        { label: "Anomalies Detected", value: anomalyData.length.toString() },
      ],
      metadata: {
        generatedBy: "Evolution1 CMS - Analytics Engine",
        generatedAt: new Date().toISOString(),
        dateRange: "Last 30 days",
      },
    };

    await exportData(analyticsExportData);
    toast.success("Analytics report exported successfully");
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    // Log error for debugging in development
    if (process.env.NODE_ENV === "development") {
      console.error("Failed to export analytics report:", errorMessage);
    }

    toast.error("Failed to export analytics report");
  }
};

/**
 * Handles timeframe change with data refresh simulation
 */
export const handleTimeframeChange = (
  timeframe: string,
  setSelectedTimeframe: (timeframe: string) => void,
  setIsLoading: (loading: boolean) => void
) => {
  setSelectedTimeframe(timeframe);
  // Simulate data refresh based on timeframe
  setIsLoading(true);
  setTimeout(() => setIsLoading(false), 1000);
};

/**
 * Gets performance color class based on performance level
 */
export function getPerformanceColor(performance: number): string {
  if (performance >= 80) return "text-green-500";
  if (performance >= 60) return "text-yellow-500";
  if (performance >= 40) return "text-orange-500";
  return "text-red-500";
}

/**
 * Gets performance background color class based on performance level
 */
export function getPerformanceBackground(performance: number): string {
  if (performance >= 80) return "bg-green-500";
  if (performance >= 60) return "bg-yellow-500";
  if (performance >= 40) return "bg-orange-500";
  return "bg-red-500";
}

/**
 * Gets severity color class for anomaly detection
 */
export function getSeverityColor(severity: string): string {
  switch (severity) {
    case "high":
      return "text-red-600 bg-red-50 border-red-200";
    case "medium":
      return "text-yellow-600 bg-yellow-50 border-yellow-200";
    case "low":
      return "text-blue-600 bg-blue-50 border-blue-200";
    default:
      return "text-gray-600 bg-gray-50 border-gray-200";
  }
}

/**
 * Formats date for display in charts
 */
export function formatChartDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString();
}

/**
 * Formats currency for chart tooltips
 */
export function formatChartCurrency(value: number): string {
  return `$${value.toLocaleString()}`;
}

/**
 * Chart configuration objects
 */
export const chartConfigs = {
  forecastChart: {
    margin: { top: 5, right: 30, left: 20, bottom: 5 },
    colors: {
      actual: "#10b981",
      predicted: "#3b82f6",
      confidenceInterval: "rgba(59, 130, 246, 0.1)",
    },
  },

  radarChart: {
    domain: [0, 100],
    colors: {
      current: "#3b82f6",
      target: "#10b981",
      benchmark: "#f59e0b",
    },
  },

  barChart: {
    margin: { top: 5, right: 30, left: 20, bottom: 5 },
    colors: {
      revenue: "#3b82f6",
      efficiency: "#10b981",
    },
  },
};

/**
 * Performance legend configuration
 */
export const performanceLegend = [
  { label: "Excellent (80-100%)", color: "bg-green-500" },
  { label: "Good (60-79%)", color: "bg-yellow-500" },
  { label: "Fair (40-59%)", color: "bg-orange-500" },
  { label: "Poor (0-39%)", color: "bg-red-500" },
];

/**
 * Chart configuration utilities
 */
export const chartConfig = {
  /**
   * Get performance color based on performance level
   */
  getPerformanceColor: (performance: string) => {
    switch (performance) {
      case "excellent":
        return "text-green-600";
      case "good":
        return "text-blue-600";
      case "average":
        return "text-yellow-600";
      case "poor":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  },

  /**
   * Get heatmap cell color based on performance value
   */
  getHeatmapCellColor: (performance: number) => {
    if (performance >= 80) return "bg-green-500 text-white";
    if (performance >= 60) return "bg-yellow-500 text-white";
    if (performance >= 40) return "bg-orange-500 text-white";
    return "bg-red-500 text-white";
  },

  /**
   * Format chart tooltips
   */
  formatTooltip: (value: number | string, name: string) => {
    if (name === "actual")
      return ["Historical", `$${Number(value).toLocaleString()}`];
    if (name === "predicted")
      return ["Predicted", `$${Number(value).toLocaleString()}`];
    if (name === "upperBound")
      return ["Upper Bound", `$${Number(value).toLocaleString()}`];
    if (name === "lowerBound")
      return ["Lower Bound", `$${Number(value).toLocaleString()}`];
    return [`$${Number(value).toLocaleString()}`, name];
  },

  /**
   * Format chart axis labels
   */
  formatAxisLabel: (
    value: number | string,
    type: "date" | "currency" | "percentage"
  ) => {
    switch (type) {
      case "date":
        return new Date(value).toLocaleDateString();
      case "currency":
        const thousands = Number(value) / 1000;
        return `$${thousands.toFixed(0)}K`;
      case "percentage":
        return `${value}%`;
      default:
        return value;
    }
  },
};
