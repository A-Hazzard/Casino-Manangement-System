'use client';

import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { type ReactNode } from 'react';
import { Skeleton } from '@/components/shared/ui/skeleton';

export type ReportsMachineCardMetric = {
  label: string;
  value: ReactNode;
  valueClassName?: string;
};

export type ReportsMachineCardProps = {
  title: ReactNode;
  machineHref?: string;
  subtitle?: ReactNode;
  locationName?: string;
  locationHref?: string;
  headerAdornment?: ReactNode;
  banner?: ReactNode;
  metrics: ReportsMachineCardMetric[];
  footer?: ReactNode;
  className?: string;
  highlighted?: boolean;
};

const METRIC_CELL_CLASS =
  'rounded-lg border border-gray-100 bg-gray-50/50 px-2 py-1.5';
const METRIC_LABEL_CLASS = 'block text-[10px] text-gray-500';
const METRIC_VALUE_CLASS = 'text-xs font-medium';

function chunkMetrics(
  metrics: ReportsMachineCardMetric[]
): ReportsMachineCardMetric[][] {
  const rows: ReportsMachineCardMetric[][] = [];

  for (let index = 0; index < metrics.length; index += 2) {
    rows.push(metrics.slice(index, index + 2));
  }

  return rows;
}

export default function ReportsMachineCard({
  title,
  machineHref,
  subtitle,
  locationName,
  locationHref,
  headerAdornment,
  banner,
  metrics,
  footer,
  className = '',
  highlighted = false,
}: ReportsMachineCardProps) {
  const metricRows = chunkMetrics(metrics);

  return (
    <div
      className={`relative w-full rounded-lg border p-3 shadow-sm transition-shadow hover:shadow-md md:p-4 ${
        highlighted
          ? 'border-orangeHighlight/50 bg-orangeHighlight/10'
          : 'border-gray-100 bg-white'
      } ${className}`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-start gap-1.5">
          {headerAdornment}
          <div className="min-w-0 flex-1">
            {machineHref ? (
              <Link href={machineHref} className="group block">
                <div className="break-words text-base font-semibold text-gray-900 group-hover:text-blue-600 group-hover:underline">
                  {title}
                </div>
              </Link>
            ) : (
              <div className="break-words text-base font-semibold text-gray-900">
                {title}
              </div>
            )}
            {subtitle ? (
              <div className="mt-0.5 break-words text-sm text-gray-600">
                {subtitle}
              </div>
            ) : null}
          </div>
        </div>
        {machineHref ? (
          <Link
            href={machineHref}
            className="flex-shrink-0"
            title="View machine details"
          >
            <ExternalLink className="h-3.5 w-3.5 text-buttonActive" />
          </Link>
        ) : null}
      </div>

      {banner}

      {locationName ? (
        <div className="mb-3 flex items-center gap-1.5">
          {locationHref ? (
            <>
              <Link
                href={locationHref}
                className="break-words text-sm font-medium text-gray-900 hover:text-blue-600 hover:underline"
              >
                {locationName}
              </Link>
              <Link href={locationHref} title="View location details">
                <ExternalLink className="h-3 w-3 text-gray-500 transition-transform hover:scale-110 hover:text-blue-600" />
              </Link>
            </>
          ) : (
            <p className="break-words text-sm font-medium text-gray-900">
              {locationName}
            </p>
          )}
        </div>
      ) : null}

      {metrics.length > 0 ? (
        <div className="border-t border-gray-200 pt-2">
          <div className="space-y-1">
            {metricRows.map((row, rowIndex) => (
              <div key={rowIndex} className="grid grid-cols-2 gap-1">
                {row.map(metric => (
                  <div key={metric.label} className={METRIC_CELL_CLASS}>
                    <span className={METRIC_LABEL_CLASS}>{metric.label}</span>
                    <div
                      className={`${METRIC_VALUE_CLASS} ${metric.valueClassName ?? 'text-gray-900'}`}
                    >
                      {metric.value}
                    </div>
                  </div>
                ))}
                {row.length === 1 ? <div aria-hidden="true" /> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {footer ? (
        <div className="mt-3 border-t border-gray-200 pt-3">{footer}</div>
      ) : null}
    </div>
  );
}

export function ReportsMachineCardSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm"
        >
          <div className="mb-2 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <div className="space-y-1 border-t border-gray-200 pt-2">
            <div className="grid grid-cols-2 gap-1">
              <Skeleton className="h-10 rounded-lg" />
              <Skeleton className="h-10 rounded-lg" />
            </div>
            <div className="grid grid-cols-2 gap-1">
              <Skeleton className="h-10 rounded-lg" />
              <Skeleton className="h-10 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
