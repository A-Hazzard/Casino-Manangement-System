'use client';

import { useEffect, useState } from 'react';

/**
 * Fetches online/offline status for a list of machine IDs.
 * Only machines with a SMIB (relayId) will appear in the returned map.
 * Returns a stable empty object while loading or on error.
 */
export function useMachineOnlineStatus(
  machineIds: string[]
): Record<string, boolean> {
  const [statusMap, setStatusMap] = useState<Record<string, boolean>>({});

  // Deduplicate and sort so the joined string is stable between renders.
  const dedupedKey = [...new Set(machineIds.filter(Boolean))].sort().join(',');

  useEffect(() => {
    if (!dedupedKey) {
      setStatusMap({});
      return;
    }

    let cancelled = false;

    fetch(`/api/cabinets/online-status?ids=${encodeURIComponent(dedupedKey)}`)
      .then(res => (res.ok ? res.json() : {}))
      .then((data: Record<string, boolean>) => {
        if (!cancelled) setStatusMap(data);
      })
      .catch(() => {
        if (!cancelled) setStatusMap({});
      });

    return () => {
      cancelled = true;
    };
  }, [dedupedKey]);

  return statusMap;
}
