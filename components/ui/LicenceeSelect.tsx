/**
 * Licencee Select Component
 * Dropdown select component for choosing a licensee with filtering support.
 *
 * Features:
 * - Licensee selection dropdown
 * - Licensee data fetching
 * - User licensee filtering (for non-admin users)
 * - Loading states
 * - Disabled state support
 * - "All Licensees" option
 *
 * @param selected - Currently selected licensee ID
 * @param onChange - Callback when licensee selection changes
 * @param disabled - Whether the select is disabled
 * @param userLicenseeIds - Array of licensee IDs user has access to (for filtering)
 */
'use client';

import { fetchLicensees } from '@/lib/helpers/clientLicensees';
import type { Licensee } from '@/lib/types/licensee';
import { useEffect, useRef, useState } from 'react';

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

  const lastLicenseeKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const normalizedUserLicenseeIds = userLicenseeIds
      ? [...userLicenseeIds].map(String)
      : undefined;
    const licenseeIdsKey = normalizedUserLicenseeIds
      ? normalizedUserLicenseeIds.slice().sort().join('|')
      : 'ALL';

    if (lastLicenseeKeyRef.current === licenseeIdsKey) {
      return;
    }

    lastLicenseeKeyRef.current = licenseeIdsKey;

    const loadLicensees = async () => {
      setLoading(true);
      try {
        const result = await fetchLicensees();
        
        // Extract licensees array from the result
        const allLicensees = Array.isArray(result.licensees) ? result.licensees : [];
        
        // Filter licensees if userLicenseeIds is provided (non-admin users)
        const filteredLicensees = normalizedUserLicenseeIds
          ? allLicensees.filter(lic =>
              normalizedUserLicenseeIds.includes(String(lic._id))
            )
          : allLicensees;
        
        setLicensees(filteredLicensees);
      } catch (error) {
        console.error('Failed to load licensees for select:', error);
      } finally {
        setLoading(false);
      }
    };

    void loadLicensees();
  }, [userLicenseeIds]);

  return (
    <select
      value={selected}
      onChange={e => onChange(e.target.value)}
      disabled={disabled || loading}
      className={`block w-full rounded-md border border-gray-300 bg-white py-1 pl-2 pr-8 text-sm transition duration-150 ease-in-out focus:border-buttonActive focus:outline-none focus:ring-1 focus:ring-buttonActive ${
        disabled ? 'cursor-not-allowed opacity-50' : ''
      }`}
      style={{
        textOverflow: 'ellipsis',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        maxWidth: '100%',
      }}
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
