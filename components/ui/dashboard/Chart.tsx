import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import localizedFormat from "dayjs/plugin/localizedFormat";
import { ChartProps } from "@/lib/types/componentProps";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(localizedFormat);

export default function Chart(props: ChartProps) {
    console.log(props.chartData, "is props chart data");

    return (
        <div className="bg-container p-6 rounded-lg shadow-md flex-1">
            {props.loadingChartData || props.chartData.length === 0 ? (
                <div className="h-[320px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-gray-500"></div>
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={320}>
                    <AreaChart data={props.chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            dataKey={
                                props.activeMetricsFilter === "Today" || props.activeMetricsFilter === "Yesterday"
                                    ? "time"
                                    : "day"
                            }
                            tickFormatter={(val, index) => {
                                if (props.activeMetricsFilter === "Today" || props.activeMetricsFilter === "Yesterday") {
                                    const day = props.chartData[index]?.day;
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
            )}
        </div>
    );
}