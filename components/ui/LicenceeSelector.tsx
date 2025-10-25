'use client';

import { useEffect, useState } from 'react';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { fetchLicensees } from '@/lib/helpers/clientLicensees';

export function LicenceeSelector() {
  const {
    selectedLicencee,
    setSelectedLicencee,
    loadingChartData,
    refreshing,
  } = useDashBoardStore();

  const [licensees, setLicensees] = useState<{ _id: string; name: string }[]>(
    []
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLicensees = async () => {
      try {
        setLoading(true);
        const licenseesData = await fetchLicensees();
        setLicensees(licenseesData);
      } catch (error) {
        console.error('Failed to fetch licensees:', error);
        setLicensees([]);
      } finally {
        setLoading(false);
      }
    };

    loadLicensees();
  }, []);

  return (
    <div className="flex w-full items-center justify-between gap-4 sm:w-auto">
      <select
        className={`rounded-full bg-buttonActive px-4 py-2 text-sm text-white ${
          loadingChartData || refreshing || loading
            ? 'cursor-not-allowed opacity-50'
            : ''
        }`}
        value={selectedLicencee}
        onChange={e => setSelectedLicencee(e.target.value)}
        disabled={loadingChartData || refreshing || loading}
      >
        <option value="">All Licensees</option>
        {licensees.map(licensee => (
          <option key={licensee._id} value={licensee._id}>
            {licensee.name}
          </option>
        ))}
      </select>
    </div>
  );
}
