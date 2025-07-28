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
import { ChartSkeleton } from "@/components/ui/SkeletonLoader";

export default function Chart({
  loadingChartData,
  chartData,
  activeMetricsFilter,
}: ChartProps) {
  // Chart data received for rendering

  if (loadingChartData) {
    return <ChartSkeleton />;
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

  // For hourly charts, filter to only the most common day
  let filteredChartData = chartData;
  if (activeMetricsFilter === "Today" || activeMetricsFilter === "Yesterday") {
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
    // If filtering by hour (Today/Yesterday), sort by day then time
    if (
      activeMetricsFilter === "Today" ||
      activeMetricsFilter === "Yesterday"
    ) {
      const dayDiff = parseDay(a.day) - parseDay(b.day);
      if (dayDiff !== 0) return dayDiff;
      return parseTime(a.time, a.day) - parseTime(b.time, b.day);
    }
    // Otherwise, sort by day (could be string or date)
    return parseDay(a.day) - parseDay(b.day);
  });

  return (
    <div className="bg-container p-6 rounded-lg shadow-md">
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={sortedChartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey={
              activeMetricsFilter === "Today" ||
              activeMetricsFilter === "Yesterday"
                ? "time"
                : "day"
            }
            tickFormatter={(val, index) => {
              if (
                activeMetricsFilter === "Today" ||
                activeMetricsFilter === "Yesterday"
              ) {
                const day = sortedChartData[index]?.day;
                const fullUTCDate = `${day}T${val}:00Z`;
                return formatTime(fullUTCDate);
              } else {
                return formatDisplayDate(val);
              }
            }}
          />
          <YAxis />
          <Tooltip />
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
