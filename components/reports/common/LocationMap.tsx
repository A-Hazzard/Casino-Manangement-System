/**
 * Location Map Component
 *
 * Displays gaming locations on an interactive map using Leaflet.
 * Features search, detailed popups, and performance indicators.
 *
 * @module components/reports/common/LocationMap
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { LocationMapSkeleton } from '@/components/ui/skeletons/ReportsSkeletons';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    PERFORMANCE_CONFIG,
    PerformanceLevel,
    getPerformanceLevel as getCommonPerformanceLevel,
} from '@/lib/utils/financialColors';
import { formatCurrency } from '@/lib/utils/formatting';
import { MapPin, Search, TrendingUp } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';

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
          const onMapReadyRef = useRef(onMapReady);
          const lastMapRef = useRef<ReturnType<typeof useMap> | null>(null);

          // Keep callback ref up to date
          useEffect(() => {
            onMapReadyRef.current = onMapReady;
          }, [onMapReady]);

          // Call onMapReady when map instance changes
          useEffect(() => {
            if (map && onMapReadyRef.current && lastMapRef.current !== map) {
              lastMapRef.current = map;
              onMapReadyRef.current(map);
            }
          }, [map]); // Only depend on map, not onMapReady

          return null;
        };
      }
    ),
  { ssr: false }
);

/**
 * Component to automatically adjust map bounds to show all markers
 */
const MapAutoBounds = dynamic(
  () =>
    Promise.all([import('react-leaflet'), import('leaflet')]).then(
      ([leafletMod, L]) => {
        const { useMap } = leafletMod;
        return function MapAutoBounds({
          locations,
        }: {
          locations: LocationData[];
        }) {
          const map = useMap();

          useEffect(() => {
            if (!map || locations.length === 0) return;

            const bounds = L.latLngBounds(
              locations
                .filter(l => l.coordinates)
                .map(l => l.coordinates as [number, number])
            );

            if (bounds.isValid()) {
              map.fitBounds(bounds, {
                padding: [50, 50],
                maxZoom: 15,
                animate: true,
              });
            }
          }, [map, locations]);

          return null;
        };
      }
    ),
  { ssr: false }
);

const PerformanceLegend = () => {
  const [openTooltip, setOpenTooltip] = useState<string | null>(null);

  return (
    <div className="absolute bottom-4 right-4 z-[1000] flex flex-col gap-1.5 rounded-lg bg-white/95 px-2 py-2 text-xs text-muted-foreground shadow-lg backdrop-blur-sm sm:px-3 sm:py-2 md:flex-col lg:flex-row lg:flex-wrap lg:gap-4">
      {(
        Object.entries(PERFORMANCE_CONFIG) as [
          PerformanceLevel,
          (typeof PERFORMANCE_CONFIG)['excellent'],
        ][]
      ).map(([key, config]) => (
        <Tooltip
          key={key}
          open={openTooltip === key}
          onOpenChange={open => {
            if (open) {
              setOpenTooltip(key);
            } else if (openTooltip === key) {
              setOpenTooltip(null);
            }
          }}
        >
          <TooltipTrigger
            asChild
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              setOpenTooltip(openTooltip === key ? null : key);
            }}
          >
            <div className="flex cursor-help items-center gap-1 transition-opacity hover:opacity-80">
              <div className={`h-3 w-3 rounded-full ${config.dotColor}`}></div>
              <span className="hidden sm:inline">{config.label}</span>
              <span className="sm:hidden">{config.label.split(' ')[0]}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="z-[10000]">
            <p>{config.description}</p>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
};

// Helper functions using centralized Performance logic
const getPerformanceColor = (gross: number, moneyIn: number) => {
  const level = getCommonPerformanceLevel(gross, moneyIn);
  return PERFORMANCE_CONFIG[level].textColor;
};

// Helper function to get performance label from centralized config
const getPerformanceLabel = (gross: number, moneyIn: number) => {
  return getCommonPerformanceLevel(gross, moneyIn);
};

type LocationData = {
  id: string;
  name: string;
  coordinates?: [number, number];
  performance?: 'excellent' | 'good' | 'average' | 'poor';
  revenue?: number;
  moneyIn?: number;
  moneyOut?: number;
  totalMachines?: number;
  onlineMachines?: number;
};

type LocationMapProps = {
  locations: LocationData[];
  center?: [number, number];
  zoom?: number;
  compact?: boolean;
  financialDataLoading?: boolean;
  loading?: boolean;
};

// Component for location popup content with loading states
const LocationPopupContent = ({
  location,
  isFinancialDataLoading,
}: {
  location: LocationData;
  isFinancialDataLoading: boolean;
}) => {
  const gross = location.revenue || 0;
  const moneyIn = location.moneyIn || 0;
  const performance =
    location.performance || getPerformanceLabel(gross, moneyIn);
  const performanceColor = getPerformanceColor(gross, moneyIn);

  return (
    <div className="min-w-[280px] p-2">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-bold">{location.name}</h3>
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
                {formatCurrency(gross)}
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
                {moneyIn > 0 ? ((gross / moneyIn) * 100).toFixed(1) : '0.0'}%
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
              {formatCurrency(moneyIn)}
            </div>
          )}
          <div className="text-xs text-muted-foreground">Money In</div>
        </div>

        <div className="space-y-2">
          {isFinancialDataLoading ? (
            <Skeleton className="h-4 w-12" />
          ) : (
            <div className="font-medium">
              {location.onlineMachines || 0}/{location.totalMachines || 0}
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
              {(location.totalMachines || 0) > 0
                ? 'Active Location'
                : 'No Machines'}
            </span>
          )}
          <button
            onClick={() => {
              // Navigate to location details page
              if (typeof window !== 'undefined') {
                window.location.href = `/locations/${location.id}`;
              }
            }}
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
  locations,
  center = [10.6918, -61.2225], // Default to Trinidad
  zoom = 10,
  compact = false,
  financialDataLoading = false,
  loading = false,
}: LocationMapProps) {
  const [mapReady, setMapReady] = useState(false);
  const [mapInstanceReady, setMapInstanceReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationData[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const mapRef = useRef<{
    setView: (coords: [number, number], zoom: number) => void;
    on: (event: string, callback: () => void) => void;
    _panes?: Record<string, HTMLElement>;
    getContainer?: () => HTMLElement | null;
    whenReady?: (callback: () => void) => void;
  } | null>(null);

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

  // Filter valid locations with coordinates
  const validLocations = locations.filter(location => {
    if (!location.coordinates) return false;

    // Validate coordinates array
    if (
      !Array.isArray(location.coordinates) ||
      location.coordinates.length !== 2
    ) {
      return false;
    }

    const [lat, lon] = location.coordinates;

    // Validate lat and lon are numbers and not zero
    return (
      typeof lat === 'number' &&
      typeof lon === 'number' &&
      !isNaN(lat) &&
      !isNaN(lon) &&
      lat !== 0 &&
      lon !== 0
    );
  });

  // Get locations without coordinates for user notification
  const locationsWithoutCoords = locations.filter(location => {
    if (!location.coordinates) return true;

    // Check if coordinates array is invalid
    if (
      !Array.isArray(location.coordinates) ||
      location.coordinates.length !== 2
    ) {
      return true;
    }

    const [lat, lon] = location.coordinates;

    // Check if coordinates are invalid numbers or zero
    return (
      typeof lat !== 'number' ||
      typeof lon !== 'number' ||
      isNaN(lat) ||
      isNaN(lon) ||
      lat === 0 ||
      lon === 0
    );
  });

  // Search functionality
  // CRITICAL: Search only through validLocations (already filtered by licensee and coordinates)
  // This ensures search results match what's shown on the map
  const handleSearch = (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    // Search through validLocations (already filtered by licensee and coordinates)
    // This ensures search results only show locations from the selected licensee
    const filtered = validLocations.filter(location => {
      const locationName = location.name || '';
      return locationName.toLowerCase().includes(query.toLowerCase());
    });

    setSearchResults(filtered);
    setShowSearchResults(true);
  };

  // Zoom to location
  const zoomToLocation = (location: LocationData) => {
    if (!mapRef.current || !mapInstanceReady) return;

    // Check if location has valid coordinates
    if (!location.coordinates) {
      setSearchQuery(location.name);
      setShowSearchResults(false);
      return;
    }

    // Validate coordinates array
    if (
      !Array.isArray(location.coordinates) ||
      location.coordinates.length !== 2
    ) {
      setSearchQuery(location.name);
      setShowSearchResults(false);
      return;
    }

    const [lat, lon] = location.coordinates;

    // Validate lat and lon are numbers and not zero
    if (
      typeof lat === 'number' &&
      typeof lon === 'number' &&
      !isNaN(lat) &&
      !isNaN(lon) &&
      lat !== 0 &&
      lon !== 0
    ) {
      try {
        if (mapRef.current && mapInstanceReady) {
          mapRef.current.setView([lat, lon], 15);
        }
      } catch (error) {
        console.warn('LocationMap: Error zooming to location:', error);
      }
      setSearchQuery(location.name);
      setShowSearchResults(false);
    } else {
      setSearchQuery(location.name);
      setShowSearchResults(false);
    }
  };

  // Handle map instance from useMap hook - memoized to prevent flickering
  const handleMapReady = useCallback(
    (map: {
      setView: (coords: [number, number], zoom: number) => void;
      on: (event: string, callback: () => void) => void;
      whenReady?: (callback: () => void) => void;
      getContainer?: () => HTMLElement | null;
      _panes?: Record<string, HTMLElement>;
    }) => {
      // Set map ref
      mapRef.current = map;

      // Set ready immediately - the map instance from useMap is already ready
      setMapInstanceReady(true);

      // Also listen for load event as a fallback
      if (typeof map.on === 'function') {
        map.on('load', () => {
          setMapInstanceReady(true);
        });
      }
    },
    []
  );

  // Calculate map center from valid locations
  const mapCenter =
    validLocations.length > 0 && validLocations[0].coordinates
      ? validLocations[0].coordinates
      : center;

  // Render a marker if valid latitude and a valid longitude are present.
  const renderMarker = (location: LocationData, key: string) => {
    if (!location.coordinates) return null;

    // Validate coordinates array
    if (
      !Array.isArray(location.coordinates) ||
      location.coordinates.length !== 2
    ) {
      return null;
    }

    const [lat, lon] = location.coordinates;

    // Validate lat and lon are numbers and not zero
    if (
      typeof lat !== 'number' ||
      typeof lon !== 'number' ||
      isNaN(lat) ||
      isNaN(lon) ||
      lat === 0 ||
      lon === 0
    ) {
      return null;
    }

    return (
      <Marker key={key} position={[lat, lon]}>
        <Popup>
          <LocationPopupContent
            location={location}
            isFinancialDataLoading={financialDataLoading}
          />
        </Popup>
      </Marker>
    );
  };

  // Show loading screen while map is initializing OR locations are loading
  if (!mapReady || loading) {
    return <LocationMapSkeleton />;
  }

  if (compact) {
    return (
      <TooltipProvider>
        <div className="relative z-0 h-full w-full">
          <MapContainer
            center={mapCenter}
            zoom={zoom}
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
              validLocations.map(location =>
                renderMarker(location, location.id)
              )}
          </MapContainer>
          {/* Performance Legend - Positioned over map */}
          <PerformanceLegend />
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
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
                  {locationsWithoutCoords.map(loc => loc.name).join(', ')}
                </div>
              )}
            </div>
          )}

          {/* Map - Full Width with Search Overlay */}
          <div className="relative z-0 h-[500px] w-full overflow-hidden rounded-lg lg:h-[45rem]">
            {/* Search Bar Overlay - Top Left */}
            <div className="absolute left-3 top-3 z-[1000] w-[calc(100%-1.5rem)] max-w-xs">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                <input
                  type="text"
                  placeholder="Search locations..."
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white/95 py-2 pl-10 pr-4 text-sm shadow-lg backdrop-blur-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onClick={e => e.stopPropagation()}
                />
                {/* Search Results Dropdown */}
                {showSearchResults && (
                  <div className="absolute top-full z-[1001] mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-300 bg-white shadow-lg">
                    {searchResults.length > 0 ? (
                      searchResults.map(location => {
                        const hasValidCoords =
                          location.coordinates &&
                          location.coordinates[0] !== 0 &&
                          location.coordinates[1] !== 0;

                        return (
                          <button
                            key={location.id}
                            onClick={e => {
                              e.stopPropagation();
                              zoomToLocation(location);
                            }}
                            className="flex w-full items-center gap-2 border-b border-gray-200 px-4 py-2 text-left text-sm last:border-b-0 hover:bg-gray-100"
                          >
                            <MapPin
                              className={`h-4 w-4 flex-shrink-0 ${
                                hasValidCoords
                                  ? 'text-gray-400'
                                  : 'text-yellow-500'
                              }`}
                            />
                            <span
                              className={`truncate ${
                                hasValidCoords ? '' : 'text-yellow-600'
                              }`}
                            >
                              {location.name}
                            </span>
                            {!hasValidCoords && (
                              <span className="ml-auto flex-shrink-0 rounded bg-yellow-100 px-1 text-xs text-yellow-600">
                                No map
                              </span>
                            )}
                          </button>
                        );
                      })
                    ) : (
                      <div className="p-4 text-center text-sm text-gray-500">
                        No locations found matching &quot;{searchQuery}&quot;
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <MapContainer
              center={mapCenter}
              zoom={zoom}
              scrollWheelZoom={true}
              style={{ height: '100%', width: '100%' }}
            >
              <MapController onMapReady={handleMapReady} />
              <MapAutoBounds locations={validLocations} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                className="grayscale"
              />
              {mapInstanceReady &&
                validLocations.map(location =>
                  renderMarker(location, location.id)
                )}
            </MapContainer>
            {/* Performance Legend - Positioned over map */}
            <PerformanceLegend />
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
