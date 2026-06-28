'use client';

import { MoneyOutCell } from '@/components/shared/ui/financial/MoneyOutCell';
import { Progress } from '@/components/shared/ui/progress';
import { Skeleton } from '@/components/shared/ui/skeleton';
import {
  getGrossColorClass,
  getMoneyInColorClass,
  getMoneyOutColorClass,
} from '@/lib/utils/financial';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/shared/ui/card';

type ReportsLocationsSummaryMetricsProps = {
  gross: number;
  moneyIn: number;
  moneyOut: number;
  jackpot?: number;
  includeJackpot?: boolean;
  onlineMachines?: number;
  totalMachines?: number;
  formatCurrency: (value: number) => string;
  grossLabel?: string;
  loading?: boolean;
};

export function ReportsLocationsSummaryMetricsSkeleton() {
  return (
    <>
      <div className="space-y-3 md:hidden">
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex divide-x divide-gray-100">
            <div className="flex-1 space-y-2 pr-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-24" />
            </div>
            <div className="flex-1 space-y-2 pl-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-2 w-full" />
            </div>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex divide-x divide-gray-100">
            <div className="flex-1 space-y-2 pr-4">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-24" />
            </div>
            <div className="flex-1 space-y-2 pl-4">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
        </div>
      </div>
      <div className="hidden grid-cols-1 gap-4 md:grid md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <Skeleton className="mb-2 h-4 w-24" />
              <Skeleton className="h-8 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

export default function ReportsLocationsSummaryMetrics({
  gross,
  moneyIn,
  moneyOut,
  jackpot = 0,
  includeJackpot = false,
  onlineMachines = 0,
  totalMachines = 0,
  formatCurrency,
  grossLabel = 'Total Gross Revenue',
  loading = false,
}: ReportsLocationsSummaryMetricsProps) {
  const onlinePercentage =
    totalMachines > 0 ? (onlineMachines / totalMachines) * 100 : 0;

  if (loading) {
    return <ReportsLocationsSummaryMetricsSkeleton />;
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-orange-500 via-orange-500 to-blue-500" />
          <div className="flex divide-x divide-gray-100 p-4">
            <div className="min-w-0 flex-1 pr-3">
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-gray-500">
                {grossLabel}
              </p>
              <p
                className={`break-words text-base font-bold ${getGrossColorClass(gross)}`}
              >
                {formatCurrency(gross)}
              </p>
            </div>
            <div className="min-w-0 flex-1 pl-3">
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-gray-500">
                Online Machines
              </p>
              <p className="text-base font-bold text-blue-600">
                {onlineMachines}/{totalMachines}
              </p>
              <Progress value={onlinePercentage} className="mt-2 h-1.5" />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-purple-500 via-purple-500 to-blue-500" />
          <div className="flex divide-x divide-gray-100 p-4">
            <div className="min-w-0 flex-1 pr-3">
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-gray-500">
                Money In
              </p>
              <p
                className={`break-words text-base font-bold ${getMoneyInColorClass(moneyIn)}`}
              >
                {formatCurrency(moneyIn)}
              </p>
            </div>
            <div className="min-w-0 flex-1 pl-3">
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-gray-500">
                Money Out
              </p>
              <div
                className={`break-words text-base font-bold ${getMoneyOutColorClass(moneyOut, moneyIn)}`}
              >
                <MoneyOutCell
                  moneyOut={moneyOut}
                  moneyIn={moneyIn}
                  jackpot={jackpot}
                  displayValue={formatCurrency(moneyOut)}
                  includeJackpot={includeJackpot}
                  showInfoIcon={true}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden grid-cols-1 gap-4 md:grid md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{grossLabel}</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-xl font-bold md:text-2xl ${getGrossColorClass(gross)}`}
            >
              {formatCurrency(gross)}
            </div>
            <p className="text-xs text-muted-foreground">
              Gross revenue this period
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Money In</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-xl font-bold md:text-2xl ${getMoneyInColorClass(moneyIn)}`}
            >
              {formatCurrency(moneyIn)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total money in this period
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Money Out</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold md:text-2xl">
              <MoneyOutCell
                moneyOut={moneyOut}
                moneyIn={moneyIn}
                jackpot={jackpot}
                displayValue={formatCurrency(moneyOut)}
                includeJackpot={includeJackpot}
                showInfoIcon={true}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Total money out this period
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 pt-6">
            <div className="text-lg font-bold text-blue-600 sm:text-xl lg:text-2xl">
              {onlineMachines}/{totalMachines}
            </div>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Online Machines
            </p>
            <Progress value={onlinePercentage} className="mt-2" />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
