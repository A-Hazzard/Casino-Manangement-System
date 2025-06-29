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
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import localizedFormat from "dayjs/plugin/localizedFormat";
import { ChartProps } from "@/lib/types/componentProps";
import { ChartSkeleton } from "@/components/ui/SkeletonLoader";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(localizedFormat);

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

  return (
    <div className="bg-container p-6 rounded-lg shadow-md">
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={chartData}>
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
                const day = chartData[index]?.day;
                const fullUTCDate = `${day}T${val}:00Z`;
                return dayjs.utc(fullUTCDate).local().format("hh:mm A");
              } else {
                return dayjs.utc(val).local().format("MMM D");
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
