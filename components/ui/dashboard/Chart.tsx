import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatTime, formatDisplayDate } from "@/shared/utils/dateFormat";
import { ChartProps } from "@/lib/types/componentProps";
import { DashboardChartSkeleton } from "@/components/ui/skeletons/DashboardSkeletons";

import type { dashboardData } from "@/lib/types";


export default function Chart({
  loadingChartData,
  chartData,
  activeMetricsFilter,
}: ChartProps) {
  // Chart data received for rendering
  
  // Debug: Log the chart data to see what values we're getting
  if (process.env.NODE_ENV === "development" && chartData && chartData.length > 0) {
    console.warn("Chart data received:", chartData);
  }

  if (loadingChartData) {
    return <DashboardChartSkeleton />;
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-container rounded-lg shadow-md">
        <div className="text-gray-500 text-lg mb-2">No Metrics Data</div>
        <div className="text-gray-400 text-sm text-center">
          No metrics data available for the selected time period
        </div>
      </div>
    );
  }

  // --- Robust sorting for both string and date types ---
  const parseTime = (val?: string, day?: string) => {
    if (!val || !day) return 0;
    try {
      const date = new Date(`${day}T${val}:00Z`);
      return date.getHours() * 60 + date.getMinutes();
    } catch {
      return 0;
    }
  };

  const parseDay = (val?: string) => {
    if (!val) return 0;
    try {
      return new Date(val).getTime();
    } catch {
      return 0;
    }
  };

  // Determine if we should use hourly or daily formatting
  const shouldUseHourlyFormat = () => {
    if (activeMetricsFilter === "Today" || activeMetricsFilter === "Yesterday") {
      return true;
    }
    
    if (activeMetricsFilter === "Custom") {
      // Check if custom range spans only one day
      const uniqueDays = new Set(chartData.map(d => d.day).filter(Boolean));
      return uniqueDays.size === 1;
    }
    
    return false;
  };

  const isHourlyChart = shouldUseHourlyFormat();

  // For hourly charts, filter to only the most common day
  let filteredChartData = chartData;
  if (isHourlyChart) {
    const dayCounts: Record<string, number> = {};
    chartData.forEach((d) => {
      if (d.day) dayCounts[d.day] = (dayCounts[d.day] || 0) + 1;
    });
    const [mostCommonDay] =
      Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0] || [];
    if (mostCommonDay) {
      filteredChartData = chartData.filter((d) => d.day === mostCommonDay);
    }
  }

  const sortedChartData = filteredChartData.slice().sort((a, b) => {
    // If using hourly format, sort by day then time
    if (isHourlyChart) {
      const dayDiff = parseDay(a.day) - parseDay(b.day);
      if (dayDiff !== 0) return dayDiff;
      return parseTime(a.time, a.day) - parseTime(b.time, b.day);
    }
    // Otherwise, sort by day (could be string or date)
    return parseDay(a.day) - parseDay(b.day);
  });

  // For hourly charts, we need to aggregate the data by hour to avoid showing individual meter readings
  let finalChartData = sortedChartData;
  if (isHourlyChart) {
    // Group by hour and sum the values
    const hourlyData: Record<string, dashboardData> = {};
    
    sortedChartData.forEach((item) => {
      if (!item.time) return;
      
      // Extract hour from time (e.g., "22:40" -> "22:00", "00:50" -> "00:00")
      const hour = item.time.split(':')[0] + ':00';
      const key = `${item.day}_${hour}`;
      
      if (!hourlyData[key]) {
        hourlyData[key] = {
          xValue: `${item.day}_${hour}`,
          day: item.day,
          time: hour,
          moneyIn: 0,
          moneyOut: 0,
          gross: 0,
          location: item.location,
          geoCoords: item.geoCoords,
        };
      }
      
      // Debug: Log what we're aggregating
      if (process.env.NODE_ENV === "development") {
        console.warn(`Aggregating ${item.day} ${item.time} -> ${hour}:`, {
          moneyIn: item.moneyIn,
          moneyOut: item.moneyOut,
          gross: item.gross
        });
      }
      
      hourlyData[key].moneyIn += item.moneyIn || 0;
      hourlyData[key].moneyOut += item.moneyOut || 0;
      hourlyData[key].gross += item.gross || 0;
    });
    
    // Convert back to array and sort
    finalChartData = Object.values(hourlyData).sort((a, b) => {
      const dayDiff = parseDay(a.day) - parseDay(b.day);
      if (dayDiff !== 0) return dayDiff;
      return parseTime(a.time, a.day) - parseTime(b.time, b.day);
    });
    
    // Debug: Log the final aggregated data
    if (process.env.NODE_ENV === "development") {
      console.warn("Hourly aggregation result:", finalChartData);
    }
  }

  // Debug: Log the final aggregated data
  if (process.env.NODE_ENV === "development" && finalChartData && finalChartData.length > 0) {
    console.warn("Final chart data (aggregated):", finalChartData);
  }

  return (
    <div className="bg-container p-6 rounded-lg shadow-md">
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={finalChartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey={isHourlyChart ? "time" : "day"}
            tickFormatter={(val, index) => {
              if (isHourlyChart) {
                const day = finalChartData[index]?.day;
                const fullUTCDate = `${day}T${val}:00Z`;
                return formatTime(fullUTCDate);
              } else {
                return formatDisplayDate(val);
              }
            }}
          />
          <YAxis />
          <Tooltip 
            formatter={(value, name) => {
              // Debug: Log the tooltip values
              if (process.env.NODE_ENV === "development") {
                console.warn("Tooltip value:", value, "name:", name);
              }
              // Ensure values are displayed correctly without scaling
              return [value, name];
            }}
            labelFormatter={(label) => {
              // Format the date label properly
              return label;
            }}
          />
          <Legend
            formatter={(value) => {
              if (value === "moneyIn") return "Money In";
              if (value === "moneyOut") return "Money Out";
              if (value === "gross") return "Gross";
              return value;
            }}
            payload={[
              { value: "moneyIn", type: "line", color: "#8884d8" },
              { value: "moneyOut", type: "line", color: "#4EA7FF" },
              { value: "gross", type: "line", color: "#FFA203" },
            ]}
          />
          <defs>
            <linearGradient id="colorGross" x1="0" y1="0" x2="0" y2="1">
              <stop offset="67%" stopColor="#FFA203" stopOpacity={1} />
              <stop offset="100%" stopColor="#ECF0F9" stopOpacity={1} />
            </linearGradient>
          </defs>
          <defs>
            <linearGradient id="colorGamesWon" x1="0" y1="0" x2="0" y2="1">
              <stop offset="56%" stopColor="#4EA7FF" stopOpacity={1} />
              <stop offset="100%" stopColor="#ECF0F9" stopOpacity={1} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="moneyOut"
            stroke="#4EA7FF"
            strokeWidth={3}
            fill="url(#colorGamesWon)"
            stackId="2"
          />
          <defs>
            <linearGradient id="colorWager" x1="0" y1="0" x2="0" y2="1">
              <stop offset="49%" stopColor="#8A7FFF" stopOpacity={1} />
              <stop offset="100%" stopColor="#ECF0F9" stopOpacity={1} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="moneyIn"
            stroke="#8A7FFF"
            strokeWidth={3}
            fill="url(#colorWager)"
            stackId="3"
          />
          <Area
            type="monotone"
            dataKey="gross"
            stroke="#FFA203"
            strokeWidth={3}
            fill="url(#colorGross)"
            stackId="1"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
