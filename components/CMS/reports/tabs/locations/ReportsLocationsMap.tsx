/**
 * Reports Locations Map Component
 *
 * Displays gaming locations on an interactive map using Leaflet.
 * Features search, detailed popups, and performance indicators.
 *
 * @module components/reports/tabs/locations/ReportsLocationsMap
 */

'use client';

import { LocationMapSkeleton } from '@/components/shared/ui/skeletons/ReportsSkeletons';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

type LocationData = {
  id: string;
  name: string;
  coordinates?: [number, number];
  metrics?: {
    gross: number;
    moneyIn: number;
    moneyOut: number;
  };
};

type ReportsLocationsMapProps = {
  locations: LocationData[];
  center?: [number, number];
  zoom?: number;
  compact?: boolean;
  financialDataLoading?: boolean;
  loading?: boolean;
};

// ============================================================================
// Dynamic Leaflet Imports
// ============================================================================

// We import the entire map implementation dynamically to avoid SSR issues with Leaflet
const MapImplementation = dynamic(() => import('./ReportsLocationsMapImplementation'), {
  ssr: false,
  loading: () => <LocationMapSkeleton />,
});

// ============================================================================
// Main Component
// ============================================================================

/**
 * Main ReportsLocationsMap Component
 * This is a thin wrapper that loads the actual map implementation only on the client
 */
export default function ReportsLocationsMap(props: ReportsLocationsMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || props.loading) {
    return <LocationMapSkeleton />;
  }

  return <MapImplementation {...props} />;
}

