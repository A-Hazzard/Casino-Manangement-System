/**
 * Stacked Chart Component
 * Stacked bar chart component for displaying location/machine data over time.
 *
 * Features:
 * - Stacked bar chart visualization
 * - Multiple location/machine support
 * - Configurable data keys
 * - Hourly time series
 * - Recharts bar chart
 * - Responsive design
 * - Custom formatters
 *
 * @param title - Chart title
 * @param icon - Icon element
 * @param data - Array of chart data
 * @param dataKey - Data key to display
 * @param machines - Array of machine/location IDs
 * @param colors - Array of colors
 * @param formatter - Value formatter function
 * @param locationNames - Mapping of location IDs to names
 */
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { StackedChartProps } from '@/lib/types/components';
import { Search } from 'lucide-react';
import { useRef, useState } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ReferenceArea,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';

export function StackedChart({
  title,
  icon,
  data,
  dataKey,
  machines,
  colors,
  formatter,
  locationNames,
}: StackedChartProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Transform data for stacked chart
  const chartData = data.map(item => {
    const transformed: Record<string, string | number> = { hour: item.hour };
    machines.forEach(locationId => {
      const locationData = item[locationId];
      if (typeof locationData === 'object' && locationData !== null) {
        // Use location name if available, otherwise use location ID
        const displayName = locationNames?.[locationId] || locationId;
        transformed[displayName] = locationData[dataKey];
      } else {
        const displayName = locationNames?.[locationId] || locationId;
        transformed[displayName] = 0;
      }
    });
    return transformed;
  });

  // Calculate width based on data length to ensure bars have enough space
  // 60px per hour gives enough room for labels and bars
  const minWidth = Math.max(600, chartData.length * 60);

  const handleFocus = () => {
    if (!searchTerm || !scrollRef.current) return;

    const index = chartData.findIndex(item =>
      String(item.hour).toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (index !== -1) {
      setFocusedIndex(index);
      const containerWidth = scrollRef.current.clientWidth;
      const slotWidth = minWidth / chartData.length;
      const targetScroll = (index + 0.5) * slotWidth - (containerWidth / 2);
      
      scrollRef.current.scrollTo({
        left: Math.max(0, targetScroll),
        behavior: 'smooth'
      });
    } else {
      setFocusedIndex(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {icon}
          {title}
        </CardTitle>
        <div className="flex w-full max-w-sm items-center space-x-2">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="text"
              placeholder="Search hour..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setFocusedIndex(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleFocus();
              }}
            />
          </div>
          <Button onClick={handleFocus} variant="secondary">
            Focus
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Fixed Legend outside scroll container */}
        <div className="mb-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-b pb-4">
          {machines.map((locationId, index) => {
            const displayName = locationNames?.[locationId] || locationId;
            const color = colors[index % colors.length];
            return (
              <div key={locationId} className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-sm"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs font-medium text-gray-700">
                  {displayName}
                </span>
              </div>
            );
          })}
        </div>

        {/* Scrollable Container for both Mobile and Desktop */}
        <div ref={scrollRef} className="touch-pan-x overflow-x-auto overflow-y-hidden">
          <div style={{ minWidth: `${minWidth}px`, width: '100%' }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => [formatter(value), 'Value']}
                  labelFormatter={label => `Hour: ${label}`}
                />
                {focusedIndex !== null && chartData[focusedIndex] && (
                  <ReferenceArea
                    x1={chartData[focusedIndex].hour}
                    x2={chartData[focusedIndex].hour}
                    fill="#3b82f6"
                    fillOpacity={0.15}
                    stroke="#3b82f6"
                    strokeDasharray="3 3"
                    strokeOpacity={0.5}
                  />
                )}
                {machines.map((locationId, index) => {
                  const displayName = locationNames?.[locationId] || locationId;
                  return (
                    <Bar
                      key={locationId}
                      dataKey={displayName}
                      stackId="a"
                      fill={colors[index % colors.length]}
                      name={displayName}
                    />
                  );
                })}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
