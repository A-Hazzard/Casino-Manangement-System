'use client';

import { useEffect, useState } from 'react';

type TopPerformingItem = {
  locationId?: string;
  location?: string;
  name?: string;
  color?: string;
  value?: number;
  machineId?: string;
  game?: string;
  [key: string]: any;
};

type Props = {
  locationId?: string;
};

function TopPerformingSkeleton() {
  return (
    <section
      aria-label="Top Performing Skeleton"
      className="animate-pulse rounded-lg bg-container p-6 shadow-md"
    >
      <div className="mb-4 h-4 w-1/3 rounded bg-gray-300" />
      <div className="h-4 w-1/2 rounded bg-gray-300" />
    </section>
  );
}

export default function DashboardTopPerforming({ locationId }: Props) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TopPerformingItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const url = locationId
          ? `/api/metrics/top-performing?locationId=${encodeURIComponent(locationId)}`
          : '/api/metrics/top-performing';
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const items: TopPerformingItem[] = Array.isArray(json)
          ? json
          : (json?.topPerformers ?? []);
        if (mounted) setData(items);
      } catch (err: any) {
        if (mounted) setError(err?.message ?? 'Failed to load top performers');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchData();
    return () => {
      mounted = false;
    };
  }, [locationId]);

  if (loading) return <TopPerformingSkeleton />;
  if (error)
    return (
      <div role="alert" className="text-sm text-red-600">
        {error}
      </div>
    );

  const top = data ?? [];

  return (
    <section
      aria-label="Top Performing"
      className="rounded-lg bg-container p-6 shadow-md"
    >
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Top Performing</h2>
      </div>
      {top.length === 0 ? (
        <div>No data</div>
      ) : (
        <div className="space-y-4">
          <ul className="space-y-2">
            {top.map((item, idx) => (
              <li key={idx} className="flex items-center gap-2 text-sm">
                <span
                  className="h-4 w-4 rounded-full"
                  style={{ backgroundColor: item.color ?? '#999' }}
                />
                <span>{item.name ?? item.location ?? 'Unknown'}</span>
                <span className="ml-auto text-gray-500">
                  {item.value ?? ''}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex h-28 items-center justify-center rounded-md bg-white/5 text-xs text-gray-500">
            Pie chart would render here
          </div>
        </div>
      )}
    </section>
  );
}
