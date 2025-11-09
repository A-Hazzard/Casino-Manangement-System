'use client';

import { fetchLicensees } from '@/lib/helpers/clientLicensees';
import type { Licensee } from '@/lib/types/licensee';
import { useEffect, useState } from 'react';

type LicenceeSelectProps = {
  selected: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  userLicenseeIds?: string[]; // If provided, only show these licensees (for non-admins)
};

export default function LicenceeSelect({
  selected,
  onChange,
  disabled = false,
  userLicenseeIds,
}: LicenceeSelectProps) {
  const [licensees, setLicensees] = useState<Licensee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLicensees = async () => {
      setLoading(true);
      try {
        const allLicensees = await fetchLicensees();
        
        // Filter licensees if userLicenseeIds is provided (non-admin users)
        const filteredLicensees = userLicenseeIds
          ? allLicensees.filter(lic => userLicenseeIds.includes(String(lic._id)))
          : allLicensees;
        
        setLicensees(filteredLicensees);
      } catch (error) {
        console.error('Failed to load licensees for select:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLicensees();
  }, [userLicenseeIds]);

  return (
    <select
      value={selected}
      onChange={e => onChange(e.target.value)}
      disabled={disabled || loading}
      className={`block w-full rounded-md border border-gray-300 bg-white py-1 pl-2 pr-8 text-sm transition duration-150 ease-in-out focus:border-buttonActive focus:outline-none focus:ring-1 focus:ring-buttonActive ${
        disabled ? 'cursor-not-allowed opacity-50' : ''
      }`}
    >
      {/* "All" option - always shown */}
      <option value="">All Licensees</option>
      
      {/* User's licensees or all licensees for admin */}
      {licensees.map((licensee) => (
        <option key={licensee._id} value={String(licensee._id)}>
          {licensee.name}
        </option>
      ))}
      
      {loading && <option disabled>Loading...</option>}
    </select>
  );
}
