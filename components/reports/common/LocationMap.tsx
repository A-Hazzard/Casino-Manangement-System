'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import MapLoader from '@/components/ui/MapLoader';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAbortableRequest } from '@/lib/hooks/useAbortableRequest';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import type { LocationMapProps } from '@/lib/types/components';
import { formatCurrency } from '@/lib/utils/formatting';
import { getMapCenterByLicensee } from '@/lib/utils/location';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import { MapPin, Search, TrendingUp } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

// Dynamically import react-leaflet components (SSR disabled)
const MapContainer = dynamic(
  () => import('react-leaflet').then(mod => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then(mod => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), {
  ssr: false,
});
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), {
  ssr: false,
});

// Component to access map instance using useMap hook
const MapController = dynamic(
  () =>
    Promise.all([import('react-leaflet'), import('react')]).then(
      ([leafletMod, reactMod]) => {
        const { useMap } = leafletMod;
        const { useEffect } = reactMod;
        return function MapController({
          onMapReady,
        }: {
          onMapReady: (map: ReturnType<typeof useMap>) => void;
        }) {
          const map = useMap();
          useEffect(() => {
            if (map && onMapReady) {
              onMapReady(map);
            }
          }, [map, onMapReady]);
          return null;
        };
      }
    ),
  { ssr: false }
);

// Helper function to get the valid longitude (checks both "longitude" and "longtitude")
const getValidLongitude = (geo: {
  longitude?: number;
  longtitude?: number;
}): number | undefined => {
  // Prioritize longitude over longtitude
  if (geo.longitude !== undefined && geo.longitude !== 0) {
    return geo.longitude;
  }
  if (geo.longtitude !== undefined && geo.longtitude !== 0) {
    return geo.longtitude;
  }
  return undefined;
};

// Helper function to get location stats from locationAggregation data
const getLocationStats = (
  location: Record<string, unknown>,
  locationAggregates: Record<string, unknown>[]
) => {
  // Try to find matching data in locationAggregates
  const stats = locationAggregates.find(d => d.location === location._id);

  return {
    moneyIn: (stats?.moneyIn as number) ?? 0,
    moneyOut: (stats?.moneyOut as number) ?? 0,
    gross: (stats?.gross as number) ?? 0,
    totalMachines:
      (stats?.totalMachines as number) ??
      (location.totalMachines as number) ??
      0,
    onlineMachines:
      (stats?.onlineMachines as number) ??
      (location.onlineMachines as number) ??
      0,
  };
};

// Helper functions using Revenue Performance (%) per documentation
// Revenue % = (gross / drop) * 100
const computeRevenuePercent = (gross: number, moneyIn: number) => {
  if (!moneyIn || moneyIn <= 0) return 0;
  return (gross / moneyIn) * 100;
};

const getPerformanceColor = (gross: number, moneyIn: number) => {
  const pct = computeRevenuePercent(gross, moneyIn);
  if (pct > 20) return 'text-green-600'; // Excellent
  if (pct >= 15) return 'text-blue-600'; // Good
  if (pct >= 10) return 'text-yellow-600'; // Average
  return 'text-red-600'; // Poor
};

// Helper function to get performance label from revenue % thresholds
const getPerformanceLabel = (gross: number, moneyIn: number) => {
  const pct = computeRevenuePercent(gross, moneyIn);
  if (pct > 20) return 'excellent';
  if (pct >= 15) return 'good';
  if (pct >= 10) return 'average';
  return 'poor';
};

// Component for location popup content with loading states
const LocationPopupContent = ({
  location,
  locationAggregates,
  isFinancialDataLoading,
}: {
  location: Record<string, unknown>;
  locationAggregates: Record<string, unknown>[];
  isFinancialDataLoading: boolean;
}) => {
  const stats = getLocationStats(location, locationAggregates);
  const performance = getPerformanceLabel(stats.gross, stats.moneyIn);
  const performanceColor = getPerformanceColor(stats.gross, stats.moneyIn);

  return (
    <div className="min-w-[280px] p-2">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-bold">
          {(location.name as string) || (location.locationName as string)}
        </h3>
        {isFinancialDataLoading ? (
          <Skeleton className="h-5 w-16 rounded-full" />
        ) : (
          <Badge
            variant={
              performance === 'excellent'
                ? 'default'
                : performance === 'good'
                  ? 'secondary'
                  : 'outline'
            }
            className={performanceColor}
          >
            {performance}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            {isFinancialDataLoading ? (
              <Skeleton className="h-4 w-16" />
            ) : (
              <span className="font-medium text-green-600">
                {formatCurrency(stats.gross)}
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">Gross Revenue</div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-blue-600" />
            {isFinancialDataLoading ? (
              <Skeleton className="h-4 w-12" />
            ) : (
              <span className="font-medium">
                {stats.moneyIn > 0
                  ? ((stats.gross / stats.moneyIn) * 100).toFixed(1)
                  : '0.0'}
                %
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            Revenue Performance (%)
          </div>
        </div>

        <div className="space-y-2">
          {isFinancialDataLoading ? (
            <Skeleton className="h-4 w-20" />
          ) : (
            <div className="font-medium text-yellow-600">
              {formatCurrency(stats.moneyIn)}
            </div>
          )}
          <div className="text-xs text-muted-foreground">Money In</div>
        </div>

        <div className="space-y-2">
          {isFinancialDataLoading ? (
            <Skeleton className="h-4 w-12" />
          ) : (
            <div className="font-medium">
              {stats.onlineMachines}/{stats.totalMachines}
            </div>
          )}
          <div className="text-xs text-muted-foreground">Machines Online</div>
        </div>
      </div>

      <div className="mt-3 border-t pt-2">
        <div className="flex items-center justify-between text-xs">
          {isFinancialDataLoading ? (
            <Skeleton className="h-3 w-24" />
          ) : (
            <span className="font-medium text-gray-500">
              {stats.totalMachines > 0 ? 'Active Location' : 'No Machines'}
            </span>
          )}
          <button
            onClick={() => window.location.assign(`/locations/${location._id}`)}
            className="rounded bg-blue-600 px-2 py-1 text-xs text-white transition-colors hover:bg-blue-700"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default function LocationMap({
  compact = false,
  aggregates,
  gamingLocations: propsGamingLocations,
  financialDataLoading = false,
}: LocationMapProps) {
  const [mapReady, setMapReady] = useState(false);
  const [mapInstanceReady, setMapInstanceReady] = useState(false);
  const [locationAggregates, setLocationAggregates] = useState<
    Record<string, unknown>[]
  >([]);
  const [gamingLocations, setGamingLocations] = useState<
    Record<string, unknown>[]
  >([]);
  const [loading, setLoading] = useState(true);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { selectedLicencee, activeMetricsFilter, customDateRange } =
    useDashBoardStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Record<string, unknown>[]>(
    []
  );
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [userDefaultCenter, setUserDefaultCenter] = useState<[number, number]>([
    10.6599, -61.5199,
  ]); // Trinidad center as initial map center (dynamically updated based on licensee)
  const mapRef = useRef<{
    setView: (coords: [number, number], zoom: number) => void;
    on: (event: string, callback: () => void) => void;
    _panes?: Record<string, HTMLElement>;
    getContainer?: () => HTMLElement | null;
  } | null>(null);

  // Abort controller for data fetching
  const makeLocationMapRequest = useAbortableRequest();

  // Helper function to safely check if map is ready for operations
  const isMapReadyForOperations = (map: typeof mapRef.current): boolean => {
    if (!map) return false;

    // Check if map panes exist (critical for _leaflet_pos)
    if (!map._panes) return false;

    const panes = map._panes;
    // Check for essential panes that Leaflet needs
    if (!panes.mapPane || !panes.markerPane || !panes.overlayPane) return false;

    // Verify panes are actual DOM elements
    if (!(panes.mapPane instanceof HTMLElement)) return false;
    if (!(panes.markerPane instanceof HTMLElement)) return false;

    // ENHANCED: Check that panes have _leaflet_pos property and are attached to DOM
    // @ts-expect-error - _leaflet_pos is a Leaflet internal property
    if (!panes.mapPane._leaflet_pos) return false;
    // @ts-expect-error - _leaflet_pos is a Leaflet internal property
    if (!panes.markerPane._leaflet_pos) return false;
    
    // Verify panes are attached to the DOM (have parent elements)
    if (!panes.mapPane.parentElement) return false;
    if (!panes.markerPane.parentElement) return false;

    // Check if container exists and has dimensions
    if (map.getContainer) {
      const container = map.getContainer();
      if (!container || !(container instanceof HTMLElement)) return false;
      
      // Verify container has dimensions (width > 0)
      if (container.offsetWidth <= 0) return false;
    }

    return true;
  };

  // Initialize Leaflet on client side
  useEffect(() => {
    import('leaflet').then(L => {
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: '/leaflet/marker-icon.png',
        iconUrl: '/leaflet/marker-icon-image.png',
        shadowUrl: '/leaflet/marker-shadow.png',
      });
      // Force iconUrl to be set on every render
      L.Marker.prototype.options.icon = new L.Icon.Default();
      setMapReady(true);
    });
  }, []);

  // Get default center based on selected licensee and zoom to actual location
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const updateMapCenter = async () => {
      // Wait a bit for locations to load
      await new Promise(resolve => setTimeout(resolve, 300));

      // Find valid locations for the selected licensee
      const validLocationsForLicensee = gamingLocations.filter(location => {
        if (!location.geoCoords) return false;
        const validLongitude = getValidLongitude(location.geoCoords);
        const lat = (location.geoCoords as Record<string, unknown>).latitude;
        return (
          lat &&
          lat !== 0 &&
          validLongitude !== undefined &&
          validLongitude !== 0
        );
      });

      // If we have valid locations, zoom to the first one
      if (
        validLocationsForLicensee.length > 0 &&
        selectedLicencee &&
        selectedLicencee !== 'all'
      ) {
        const firstLocation = validLocationsForLicensee[0];
        const lat = (firstLocation.geoCoords as Record<string, unknown>)
          .latitude as number;
        const lon = getValidLongitude(
          firstLocation.geoCoords as Record<string, unknown>
        );

        if (lat && lon) {
          const locationCenter: [number, number] = [lat, lon];
          console.warn(
            `📍 LocationMap: Found ${validLocationsForLicensee.length} valid locations, zooming to first location: ${JSON.stringify(locationCenter)}`
          );

          timeoutId = setTimeout(() => {
            if (
              mapRef.current &&
              mapInstanceReady &&
              isMapReadyForOperations(mapRef.current)
            ) {
              // Use zoom level 11 to show the location with more context
              const zoomLevel = 11;
              console.warn(
                `🗺️ LocationMap: Zooming to location ${JSON.stringify(locationCenter)} at zoom level ${zoomLevel} for licensee ${selectedLicencee}`
              );
              try {
                mapRef.current.setView(locationCenter, zoomLevel);
              } catch (error) {
                if (error instanceof Error && error.message.includes('_leaflet_pos')) {
                  console.warn('Map not fully initialized, deferring setView');
                  // Retry after longer delay
                  setTimeout(() => {
                    if (mapRef.current && isMapReadyForOperations(mapRef.current)) {
                      try {
                        mapRef.current.setView(locationCenter, zoomLevel);
                      } catch (e) {
                        console.error('Failed to set map view after retry:', e);
                      }
                    }
                  }, 1500);
                } else {
                  console.warn('LocationMap: Error setting view:', error);
                }
              }
            } else {
              console.warn(
                'LocationMap: Map not ready for operations, skipping setView'
              );
            }
          }, 1500);
          return;
        }
      }

      // Fallback to country center if no valid locations found
      let licenseeName: string | undefined = selectedLicencee;

      // If selectedLicencee is an ID (not 'all' or empty), fetch the licensee name
      if (
        selectedLicencee &&
        selectedLicencee !== 'all' &&
        selectedLicencee !== ''
      ) {
        try {
          // Check if it looks like an ID (24 character hex string)
          if (
            selectedLicencee.length === 24 &&
            /^[0-9a-fA-F]+$/.test(selectedLicencee)
          ) {
            const { fetchLicenseeById } = await import(
              '@/lib/helpers/clientLicensees'
            );
            const result = await fetchLicenseeById(selectedLicencee);
            if (result?.name) {
              licenseeName = result.name;
              console.warn(
                `📍 LocationMap: Resolved licensee ID ${selectedLicencee} to name: ${licenseeName}`
              );
            }
          }
        } catch (error) {
          console.warn(
            `📍 LocationMap: Failed to fetch licensee name for ${selectedLicencee}, using as-is:`,
            error
          );
        }
      }

      const defaultCenter = getMapCenterByLicensee(licenseeName);
      console.warn(
        `📍 LocationMap: No valid locations found, using country center for licensee ${selectedLicencee} (name: ${licenseeName}) to: ${JSON.stringify(defaultCenter)}`
      );
      setUserDefaultCenter(defaultCenter);

      // Zoom to the country center as fallback
      timeoutId = setTimeout(() => {
        if (
          mapRef.current &&
          mapInstanceReady &&
          isMapReadyForOperations(mapRef.current)
        ) {
          // Use higher zoom level (10) for country view when a specific licensee is selected
          const zoomLevel =
            selectedLicencee && selectedLicencee !== 'all' ? 10 : 7;
          console.warn(
            `🗺️ LocationMap: Zooming to country center ${JSON.stringify(defaultCenter)} at zoom level ${zoomLevel} for licensee ${selectedLicencee}`
          );
          try {
            mapRef.current.setView(defaultCenter, zoomLevel);
          } catch (error) {
            if (error instanceof Error && error.message.includes('_leaflet_pos')) {
              console.warn('Map not fully initialized, deferring setView');
              // Retry after longer delay
              setTimeout(() => {
                if (mapRef.current && isMapReadyForOperations(mapRef.current)) {
                  try {
                    mapRef.current.setView(defaultCenter, zoomLevel);
                  } catch (e) {
                    console.error('Failed to set map view after retry:', e);
                  }
                }
              }, 1500);
            } else {
              console.warn('LocationMap: Error setting view:', error);
            }
          }
        } else {
          console.warn(
            'LocationMap: Map not ready for operations, skipping setView'
          );
        }
      }, 1500);
    };

    void updateMapCenter();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [selectedLicencee, gamingLocations, mapInstanceReady]);

  // Handle external gaming locations
  useEffect(() => {
    if (propsGamingLocations) {
      setGamingLocations(propsGamingLocations);
      setLoading(false); // Don't wait for financial data to show map
    }
  }, [propsGamingLocations]);

  // Handle external aggregates
  useEffect(() => {
    if (aggregates) {
      setLocationAggregates(aggregates);
    }
  }, [aggregates]);

  // Fetch location aggregation data and gaming locations (only when not provided via props)
  useEffect(() => {
    // Skip fetch if external data is provided
    if (propsGamingLocations && aggregates) {
      return;
    }

    const fetchData = async () => {
      await makeLocationMapRequest(async (signal) => {
        setLoading(true);
        try {
          if (Array.isArray(aggregates)) {
            setLocationAggregates(aggregates);
          } else {
            // Build query parameters based on current filters
            const params = new URLSearchParams();

            // Add time period based on activeMetricsFilter
            if (activeMetricsFilter === 'Today') {
              params.append('timePeriod', 'Today');
            } else if (activeMetricsFilter === 'Yesterday') {
              params.append('timePeriod', 'Yesterday');
            } else if (
              activeMetricsFilter === 'last7days' ||
              activeMetricsFilter === '7d'
            ) {
              params.append('timePeriod', '7d');
            } else if (
              activeMetricsFilter === 'last30days' ||
              activeMetricsFilter === '30d'
            ) {
              params.append('timePeriod', '30d');
            } else if (activeMetricsFilter === 'Custom' && customDateRange) {
              // For custom range, use the date range directly
              if (customDateRange.startDate && customDateRange.endDate) {
                const sd =
                  customDateRange.startDate instanceof Date
                    ? customDateRange.startDate
                    : new Date(customDateRange.startDate as string);
                const ed =
                  customDateRange.endDate instanceof Date
                    ? customDateRange.endDate
                    : new Date(customDateRange.endDate as string);

                // Send dates in local format (YYYY-MM-DD) to avoid double timezone conversion
                // The API will treat these as Trinidad time and convert to UTC
                const startDateStr = sd.toISOString().split('T')[0];
                const endDateStr = ed.toISOString().split('T')[0];
                params.append('startDate', startDateStr);
                params.append('endDate', endDateStr);
              } else {
                // No valid timePeriod, skip the request
                return;
              }
            } else {
              // No valid timePeriod, skip the request
              return;
            }

            // Add licensee filter if selected
            if (selectedLicencee) {
              params.append('licencee', selectedLicencee);
            }

            // Fetch location aggregation data
            const aggResponse = await axios.get(
              `/api/locationAggregation?${params.toString()}`,
              { signal }
            );
            const aggData = aggResponse.data;
            // Handle both old array format and new paginated format
            const locationData = Array.isArray(aggData)
              ? aggData
              : aggData.data || [];
            setLocationAggregates(locationData);
          }

          // Fetch ALL gaming locations using search-all API (including those without coordinates)
          const searchAllParams = new URLSearchParams();
          if (selectedLicencee && selectedLicencee !== 'all') {
            searchAllParams.append('licencee', selectedLicencee);
          }

          const searchAllResponse = await axios.get(
            `/api/locations/search-all?${searchAllParams.toString()}`,
            { signal }
          );
          const locationsData = searchAllResponse.data;
          setGamingLocations(locationsData || []);
        } catch (err) {
          if (!axios.isCancel(err)) {
            console.error('Error fetching location data:', err);
            setLocationAggregates([]);
            setGamingLocations([]);
          }
        } finally {
          // Delay slightly to avoid flicker, but also guard with a hard cap
          if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = setTimeout(() => setLoading(false), 300);
          // Hard cap to ensure loading never lingers beyond 2s
          setTimeout(() => setLoading(false), 2000);
        }
      });
    };
    fetchData();
  }, [
    selectedLicencee,
    activeMetricsFilter,
    customDateRange,
    aggregates,
    propsGamingLocations,
    makeLocationMapRequest,
  ]);

  // Get locations without coordinates for user notification
  const locationsWithoutCoords = gamingLocations.filter(location => {
    if (!location.geoCoords) return true;

    const validLongitude = getValidLongitude(location.geoCoords);
    return (
      (location.geoCoords as Record<string, unknown>).latitude === 0 ||
      validLongitude === undefined ||
      validLongitude === 0
    );
  });

  // Filter valid locations with coordinates
  const validLocations = gamingLocations.filter(location => {
    if (!location.geoCoords) {
      return false;
    }

    const validLongitude = getValidLongitude(location.geoCoords);
    const hasValidCoords =
      (location.geoCoords as Record<string, unknown>).latitude !== 0 &&
      validLongitude !== undefined &&
      validLongitude !== 0;

    return hasValidCoords;
  });

  // Search functionality
  const handleSearch = (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    // Search through ALL locations, not just those with valid coordinates
    const filtered = gamingLocations.filter(location => {
      const locationName =
        (location.name as string) || (location.locationName as string) || '';
      return locationName.toLowerCase().includes(query.toLowerCase());
    });

    setSearchResults(filtered);
    setShowSearchResults(true);
  };

  // Zoom to location
  const zoomToLocation = (location: Record<string, unknown>) => {
    if (!mapRef.current || !mapInstanceReady) return;

    // Check if location has valid coordinates
    if (!location.geoCoords) {
      setSearchQuery(
        (location.name as string) || (location.locationName as string) || ''
      );
      setShowSearchResults(false);
      return;
    }

    const lat = (location.geoCoords as Record<string, unknown>).latitude;
    const lon = getValidLongitude(location.geoCoords);

    if (lat && lon && lat !== 0 && lon !== 0) {
      if (isMapReadyForOperations(mapRef.current)) {
        try {
          mapRef.current.setView([lat as number, lon as number], 15);
        } catch (error) {
          if (error instanceof Error && error.message.includes('_leaflet_pos')) {
            console.warn('Map not fully initialized, deferring setView');
            // Retry after longer delay
            setTimeout(() => {
              if (mapRef.current && isMapReadyForOperations(mapRef.current)) {
                try {
                  mapRef.current.setView([lat as number, lon as number], 15);
                } catch (e) {
                  console.error('Failed to set map view after retry:', e);
                }
              }
            }, 1500);
          } else {
            console.warn('LocationMap: Error zooming to location:', error);
          }
        }
      } else {
        console.warn(
          'LocationMap: Map not ready for operations, cannot zoom to location'
        );
      }
      setSearchQuery(
        (location.name as string) || (location.locationName as string) || ''
      );
      setShowSearchResults(false);
    } else {
      setSearchQuery(
        (location.name as string) || (location.locationName as string) || ''
      );
      setShowSearchResults(false);
    }
  };

  // Handle map instance from useMap hook
  const handleMapReady = (map: {
    setView: (coords: [number, number], zoom: number) => void;
    on: (event: string, callback: () => void) => void;
    whenReady?: (callback: () => void) => void;
    getContainer?: () => HTMLElement | null;
    _panes?: Record<string, HTMLElement>;
  }) => {
    mapRef.current = map;

    // Wait for map to be fully ready before allowing position updates
    if (typeof map.whenReady === 'function') {
      map.whenReady(() => {
        // Additional check after whenReady - wait a bit for DOM to settle
        setTimeout(() => {
          if (isMapReadyForOperations(mapRef.current)) {
            setMapInstanceReady(true);
            setLoading(false);
          } else {
            // Retry after more time
            setTimeout(() => {
              if (isMapReadyForOperations(mapRef.current)) {
                setMapInstanceReady(true);
                setLoading(false);
              } else {
                // Final fallback - set ready anyway but log warning
                console.warn(
                  'LocationMap: Map may not be fully ready, but setting ready state'
                );
                setMapInstanceReady(true);
                setLoading(false);
              }
            }, 300);
          }
        }, 200);
      });
    } else {
      // Fallback: wait longer and check readiness
      setTimeout(() => {
        if (isMapReadyForOperations(mapRef.current)) {
          setMapInstanceReady(true);
          setLoading(false);
        } else {
          // Retry
          setTimeout(() => {
            if (isMapReadyForOperations(mapRef.current)) {
              setMapInstanceReady(true);
              setLoading(false);
            } else {
              console.warn(
                'LocationMap: Map may not be fully ready, but setting ready state'
              );
              setMapInstanceReady(true);
              setLoading(false);
            }
          }, 500);
        }
      }, 800);
    }

    // When the map fires its load event, ensure loading is cleared
    if (typeof map.on === 'function') {
      map.on('load', () => {
        setTimeout(() => {
          if (isMapReadyForOperations(mapRef.current)) {
            setMapInstanceReady(true);
            setLoading(false);
          }
        }, 200);
      });
      // Also clear when first tile layer loads
      map.on('layeradd', () => {
        setTimeout(() => {
          if (isMapReadyForOperations(mapRef.current)) {
            setMapInstanceReady(true);
            setLoading(false);
          }
        }, 200);
      });
    }
  };

  // Show loading screen only while map is initializing, not while data loads
  if (!mapReady) {
    return <MapLoader />;
  }

  // Show loader if no data has loaded yet
  if (loading && gamingLocations.length === 0) {
    return <MapLoader />;
  }

  // Calculate bounds if locations have coordinates
  const mapCenter =
    validLocations.length > 0
      ? ([
          (validLocations[0].geoCoords as Record<string, unknown>).latitude,
          getValidLongitude(
            validLocations[0].geoCoords as Record<string, unknown>
          )!,
        ] as [number, number])
      : userDefaultCenter; // User's country center

  console.warn(
    `🗺️ LocationMap: Final map center: ${JSON.stringify(mapCenter)}, validLocations: ${validLocations.length}`
  ); // Debug log

  // Render a marker if valid latitude and a valid longitude are present.
  const renderMarker = (
    lat: number,
    geo: { longitude?: number; longtitude?: number },
    label: string,
    key: string | number,
    locationObj: Record<string, unknown>
  ) => {
    const lon = getValidLongitude(geo);
    if (!lon) return null;

    return (
      <Marker key={key} position={[lat, lon]}>
        <Popup>
          <LocationPopupContent
            location={locationObj}
            locationAggregates={locationAggregates}
            isFinancialDataLoading={financialDataLoading}
          />
        </Popup>
      </Marker>
    );
  };

  if (compact) {
    return (
      <div className="relative z-0 h-full w-full">
        <MapContainer
          key={`map-${selectedLicencee}`}
          center={mapCenter}
          zoom={selectedLicencee && selectedLicencee !== 'all' ? 10 : 6}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          <MapController onMapReady={handleMapReady} />
          {/* Grey map tiles similar to Google Analytics */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            className="grayscale"
          />

          {mapInstanceReady &&
            validLocations.map(location => {
              const locationName =
                (location.name as string) ||
                (location.locationName as string) ||
                'Unknown Location';
              const geoCoords = location.geoCoords as Record<string, unknown>;
              return renderMarker(
                geoCoords.latitude as number,
                geoCoords,
                locationName,
                location._id as string,
                location
              );
            })}
        </MapContainer>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Location Performance Map
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Interactive map showing casino location performance metrics
        </p>
      </CardHeader>
      <CardContent>
        {/* Notification for locations without coordinates */}
        {locationsWithoutCoords.length > 0 && (
          <div className="mb-4 rounded-md border border-yellow-200 bg-yellow-50 p-3">
            <div className="flex items-center gap-2 text-sm text-yellow-800">
              <MapPin className="h-4 w-4" />
              <span>
                <strong>{locationsWithoutCoords.length}</strong> location
                {locationsWithoutCoords.length !== 1 ? 's' : ''}
                {locationsWithoutCoords.length === 1 ? ' has' : ' have'} no
                coordinates and can&apos;t be displayed on the map
              </span>
            </div>
            {locationsWithoutCoords.length <= 5 && (
              <div className="mt-1 text-xs text-yellow-700">
                Missing:{' '}
                {locationsWithoutCoords
                  .map(loc => loc.name || loc.locationName)
                  .join(', ')}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-4 lg:flex-row">
          {/* Sidebar */}
          <div className="flex w-full flex-col lg:w-72">
            <div className="relative mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                <input
                  type="text"
                  placeholder="Search locations..."
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            {/* Dropdown always below input */}
            {showSearchResults && (
              <div className="z-10 max-h-60 overflow-y-auto rounded-lg border border-gray-300 bg-white shadow-lg">
                {searchResults.length > 0 ? (
                  searchResults.map(location => {
                    const locationName =
                      (location.name as string) ||
                      (location.locationName as string) ||
                      'Unknown Location';
                    const hasValidCoords =
                      location.geoCoords &&
                      (location.geoCoords as Record<string, unknown>)
                        .latitude !== 0 &&
                      getValidLongitude(
                        location.geoCoords as Record<string, unknown>
                      ) !== undefined &&
                      getValidLongitude(
                        location.geoCoords as Record<string, unknown>
                      ) !== 0;

                    return (
                      <button
                        key={location._id as string}
                        onClick={() => zoomToLocation(location)}
                        className="flex w-full items-center gap-2 border-b border-gray-200 px-4 py-2 text-left last:border-b-0 hover:bg-gray-100"
                      >
                        <MapPin
                          className={`h-4 w-4 ${
                            hasValidCoords ? 'text-gray-400' : 'text-yellow-500'
                          }`}
                        />
                        <span
                          className={hasValidCoords ? '' : 'text-yellow-600'}
                        >
                          {locationName}
                        </span>
                        {!hasValidCoords && (
                          <span className="ml-auto rounded bg-yellow-100 px-1 text-xs text-yellow-600">
                            No map
                          </span>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    No locations found matching &quot;{searchQuery}&quot;
                  </div>
                )}
              </div>
            )}
          </div>
          {/* Map */}
          <div className="relative z-0 min-h-[400px] flex-1 overflow-hidden rounded-lg lg:min-h-[32rem]">
            <TooltipProvider>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground lg:gap-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex cursor-help items-center gap-1">
                      <div className="h-3 w-3 rounded-full bg-green-500"></div>
                      <span className="hidden sm:inline">
                        Excellent Performance
                      </span>
                      <span className="sm:hidden">Excellent</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="max-w-[280px]">
                      Revenue % &gt; 20%. Calculated as (Gross / Drop) × 100.
                    </div>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex cursor-help items-center gap-1">
                      <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                      <span className="hidden sm:inline">Good Performance</span>
                      <span className="sm:hidden">Good</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="max-w-[280px]">
                      Revenue % between 15% and 20%.
                    </div>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex cursor-help items-center gap-1">
                      <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                      <span className="hidden sm:inline">
                        Average Performance
                      </span>
                      <span className="sm:hidden">Average</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="max-w-[280px]">
                      Revenue % between 10% and 15%.
                    </div>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex cursor-help items-center gap-1">
                      <div className="h-3 w-3 rounded-full bg-red-500"></div>
                      <span className="hidden sm:inline">Poor Performance</span>
                      <span className="sm:hidden">Poor</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="max-w-[280px]">Revenue % below 10%.</div>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
            <MapContainer
              center={mapCenter}
              zoom={selectedLicencee && selectedLicencee !== 'all' ? 10 : 6}
              scrollWheelZoom={true}
              style={{ height: '100%', width: '100%', minHeight: '400px' }}
            >
              <MapController onMapReady={handleMapReady} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                className="grayscale"
              />
              {mapInstanceReady &&
                validLocations.map(location => {
                  const locationName =
                    (location.name as string) ||
                    (location.locationName as string) ||
                    'Unknown Location';
                  const geoCoords = location.geoCoords as Record<
                    string,
                    unknown
                  >;
                  return renderMarker(
                    geoCoords.latitude as number,
                    geoCoords,
                    locationName,
                    location._id as string,
                    location
                  );
                })}
            </MapContainer>
            {/* Map Legend with tooltips */}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
