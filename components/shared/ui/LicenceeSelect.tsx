/**
 * Licencee Select Component
 * Dropdown select component for choosing a licencee with filtering support.
 *
 * Features:
 * - Licencee selection dropdown
 * - Licencee data fetching
 * - User licencee filtering (for non-admin users)
 * - Loading states
 * - Disabled state support
 * - "All Licencees" option
 *
 * @param selected - Currently selected licencee ID
 * @param onChange - Callback when licencee selection changes
 * @param disabled - Whether the select is disabled
 * @param userLicenceeIds - Array of licencee IDs user has access to (for filtering)
 */
'use client';

import { fetchLicencees } from '@/lib/helpers/client';
import type { Licencee } from '@/lib/types/common';
import { useEffect, useRef, useState } from 'react';

type LicenceeSelectProps = {
  selected: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  userLicenceeIds?: string[]; // If provided, only show these licencees (for non-admins)
};

export default function LicenceeSelect({
  selected,
  onChange,
  disabled = false,
  userLicenceeIds,
}: LicenceeSelectProps) {
  const [licencees, setLicencees] = useState<Licencee[]>([]);
  const [loading, setLoading] = useState(true);

  const lastLicenceeKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const normalizedUserLicenceeIds = userLicenceeIds
      ? [...userLicenceeIds].map(String)
      : undefined;
    const licenceeIdsKey = normalizedUserLicenceeIds
      ? normalizedUserLicenceeIds.slice().sort().join('|')
      : 'ALL';

    if (lastLicenceeKeyRef.current === licenceeIdsKey) {
      return;
    }

    lastLicenceeKeyRef.current = licenceeIdsKey;

    const loadLicencees = async () => {
      setLoading(true);
      try {
        const result = await fetchLicencees();

        // Extract licencees array from the result
        const allLicencees = Array.isArray(result.licencees)
          ? result.licencees
          : [];

        // Filter licencees if userLicenceeIds is provided (non-admin users)
        const filteredLicencees = normalizedUserLicenceeIds
          ? allLicencees.filter(lic =>
              normalizedUserLicenceeIds.includes(String(lic._id))
            )
          : allLicencees;

        setLicencees(filteredLicencees);
      } catch (error) {
        console.error('Failed to load licencees for select:', error);
      } finally {
        setLoading(false);
      }
    };

    void loadLicencees();
  }, [userLicenceeIds]);

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
      <option value="">All Licencees</option>

      {/* User's licencees or all licencees for admin */}
      {licencees.map(licencee => (
        <option key={licencee._id} value={String(licencee._id)}>
          {licencee.name}
        </option>
      ))}

      {loading && <option disabled>Loading...</option>}
    </select>
  );
}

