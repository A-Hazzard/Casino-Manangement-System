/**
 * useLocationMapData Hook
 *
 * Encapsulates state and logic for the Location Map component.
 * Handles location data processing and map markers.
 */

'use client';

import { useMemo, useState } from 'react';

type LocationData = {
  id: string;
  name: string;
  coordinates?: [number, number];
  performance?: string;
  revenue?: number;
};

type UseLocationMapDataProps = {
  locations: LocationData[];
};

export function useLocationMapData({ locations }: UseLocationMapDataProps) {
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [mapZoom, setMapZoom] = useState(13);

  const markers = useMemo(() => {
    return locations.filter(loc => loc.coordinates).map(loc => ({
      position: loc.coordinates as [number, number],
      title: loc.name,
      id: loc.id,
      performance: loc.performance,
      revenue: loc.revenue,
    }));
  }, [locations]);

  const selectedLocation = useMemo(() => 
    locations.find(l => l.id === selectedLocationId), 
  [locations, selectedLocationId]);

  return {
    selectedLocationId,
    setSelectedLocationId,
    mapZoom,
    setMapZoom,
    markers,
    selectedLocation,
  };
}

