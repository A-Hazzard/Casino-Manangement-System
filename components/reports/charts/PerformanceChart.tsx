import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { AnalyticsChartDataPoint } from '@/lib/types/reports';
// import { formatCurrency } from '@/lib/utils';

type PerformanceChartProps = {
  data: AnalyticsChartDataPoint[];
};

export const PerformanceChart = ({ data }: PerformanceChartProps) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="totalDrop" stroke="#8884d8" />
        <Line type="monotone" dataKey="cancelledCredits" stroke="#82ca9d" />
        <Line type="monotone" dataKey="gross" stroke="#ffc658" />
      </LineChart>
    </ResponsiveContainer>
  );
};
