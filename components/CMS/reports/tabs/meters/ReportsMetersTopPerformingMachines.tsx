'use client';

import ReportsMachineCard from '@/components/CMS/reports/common/ReportsMachineCard';
import CopyMachineFieldsButtons from '@/components/shared/ui/CopyMachineFieldsButtons';
import { Skeleton } from '@/components/shared/ui/skeleton';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import type { TopPerformingItem } from '@/lib/types';
import { formatCurrencyWithCodeString } from '@/lib/utils/currency';
import { getMoneyInColorClass } from '@/lib/utils/financial';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

type ReportsMetersTopPerformingMachinesProps = {
  data: TopPerformingItem[];
  loading: boolean;
};

function TopPerformingMachinesSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex justify-center">
        <Skeleton className="h-[180px] w-[180px] rounded-full md:h-[200px] md:w-[200px]" />
      </div>
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm"
        >
          <Skeleton className="mb-2 h-4 w-3/4" />
          <Skeleton className="mb-3 h-3 w-1/2" />
          <div className="grid grid-cols-2 gap-1">
            <Skeleton className="h-12 rounded-lg" />
            <Skeleton className="h-12 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

function TopPerformingPieChart({
  data,
  activePieIndex,
  onActiveIndexChange,
  formatCurrency,
}: {
  data: TopPerformingItem[];
  activePieIndex: number | null;
  onActiveIndexChange: (index: number | null) => void;
  formatCurrency: (amount: number | null | undefined) => string;
}) {
  return (
    <div className="flex justify-center">
      <ResponsiveContainer width={200} height={200}>
        <PieChart>
          <Pie
            data={data}
            dataKey="totalDrop"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={80}
            innerRadius={30}
            paddingAngle={2}
            activeIndex={activePieIndex ?? undefined}
            onMouseEnter={(_, index) => onActiveIndexChange(index)}
            onMouseLeave={() => onActiveIndexChange(null)}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
                stroke={activePieIndex === index ? '#7c3aed' : '#fff'}
                strokeWidth={activePieIndex === index ? 2 : 1}
              />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const tooltipData = payload[0].payload as TopPerformingItem;
                return (
                  <div className="max-w-[220px] rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
                    <p className="break-words font-semibold text-gray-900">
                      {tooltipData.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      Total: {formatCurrency(tooltipData.totalDrop)}
                    </p>
                    {tooltipData.location ? (
                      <p className="break-words text-xs text-gray-500">
                        {tooltipData.location}
                      </p>
                    ) : null}
                  </div>
                );
              }
              return null;
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function ReportsMetersTopPerformingMachines({
  data,
  loading,
}: ReportsMetersTopPerformingMachinesProps) {
  const { displayCurrency } = useCurrencyFormat();
  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);

  const formatCurrency = (amount: number | null | undefined) =>
    formatCurrencyWithCodeString(amount, displayCurrency);

  if (loading) {
    return <TopPerformingMachinesSkeleton />;
  }

  if (data.length === 0) {
    return (
      <div className="flex min-h-[120px] items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-400">
        No top performing machines data available
      </div>
    );
  }

  return (
    <>
      {/* Mobile: pie chart above cabinet-style cards */}
      <div className="flex flex-col gap-4 md:hidden">
        <TopPerformingPieChart
          data={data}
          activePieIndex={activePieIndex}
          onActiveIndexChange={setActivePieIndex}
          formatCurrency={formatCurrency}
        />

        <div className="space-y-3">
          {data.map((item, index) => (
            <div
              key={item._id ?? `${item.name}-${index}`}
              onMouseEnter={() => setActivePieIndex(index)}
              onMouseLeave={() => setActivePieIndex(null)}
            >
              <ReportsMachineCard
                title={item.name}
                machineHref={item._id ? `/cabinets/${item._id}` : undefined}
                locationName={item.location}
                headerAdornment={
                  <div className="flex items-center gap-1.5">
                    <div
                      className="h-3 w-3 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <CopyMachineFieldsButtons
                      machineId={item._id ?? item.machineId ?? item.id}
                      gmNumber={item.customName}
                    />
                  </div>
                }
                metrics={[
                  {
                    label: 'Drop',
                    value: formatCurrency(item.totalDrop),
                    valueClassName: getMoneyInColorClass(item.totalDrop),
                  },
                ]}
                className={
                  activePieIndex === index
                    ? 'border-buttonActive/40 ring-1 ring-buttonActive/30'
                    : ''
                }
              />
            </div>
          ))}
        </div>
      </div>

      {/* Desktop: legend list beside pie chart */}
      <div className="hidden min-w-0 flex-col gap-4 md:flex lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 space-y-2">
          {data.map((item, index) => (
            <div
              key={item._id ?? `${item.name}-${index}`}
              className={`flex items-start gap-2 rounded-md border border-gray-100 px-2 py-1.5 text-sm transition-colors ${
                activePieIndex === index
                  ? 'border-buttonActive/40 bg-buttonActive/5 ring-1 ring-buttonActive/30'
                  : 'hover:bg-gray-50'
              }`}
              onMouseEnter={() => setActivePieIndex(index)}
              onMouseLeave={() => setActivePieIndex(null)}
            >
              <div
                className="mt-1 h-3 w-3 flex-shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  {item._id ? (
                    <Link
                      href={`/cabinets/${item._id}`}
                      className="group min-w-0 flex-1"
                    >
                      <p className="break-words font-semibold leading-snug text-gray-900 group-hover:text-buttonActive">
                        {item.name}
                      </p>
                    </Link>
                  ) : (
                    <p className="min-w-0 flex-1 break-words font-semibold leading-snug text-gray-900">
                      {item.name}
                    </p>
                  )}
                  <div className="flex flex-shrink-0 items-center gap-1">
                    <CopyMachineFieldsButtons
                      machineId={item._id ?? item.machineId ?? item.id}
                      gmNumber={item.customName}
                    />
                    {item._id ? (
                      <Link
                        href={`/cabinets/${item._id}`}
                        title="View machine details"
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-buttonActive" />
                      </Link>
                    ) : null}
                  </div>
                </div>
                {item.location ? (
                  <p className="mt-0.5 break-words text-xs text-gray-500">
                    {item.location}
                  </p>
                ) : null}
                <p
                  className={`mt-1 text-sm font-semibold tabular-nums ${getMoneyInColorClass(item.totalDrop)}`}
                >
                  {formatCurrency(item.totalDrop)}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-shrink-0 justify-center lg:justify-end">
          <TopPerformingPieChart
            data={data}
            activePieIndex={activePieIndex}
            onActiveIndexChange={setActivePieIndex}
            formatCurrency={formatCurrency}
          />
        </div>
      </div>
    </>
  );
}
