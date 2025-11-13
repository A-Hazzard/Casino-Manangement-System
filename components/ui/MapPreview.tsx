'use client';

import { Badge } from '@/components/ui/badge';
import MapSkeleton from '@/components/ui/MapSkeleton';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { Location } from '@/lib/types';
import { MapPreviewProps } from '@/lib/types/componentProps';
import { EnterFullScreenIcon, ExitFullScreenIcon } from '@radix-ui/react-icons';
import axios from 'axios';
import gsap from 'gsap';
import 'leaflet/dist/leaflet.css';
import { DollarSign, MapPin, Search, TrendingUp } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { getMapCenterByLicensee } from '@/lib/utils/location';

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
  location: Location,
  locationAggregates: Record<string, unknown>[]
) => {
  // Try to find matching data in locationAggregates
  const stats = Array.isArray(locationAggregates)
    ? locationAggregates.find(d => d.location === location._id)
    : undefined;

  return {
    moneyIn: stats?.moneyIn ?? 0,
    moneyOut: stats?.moneyOut ?? 0,
    gross: stats?.gross ?? 0,
    totalMachines: stats?.totalMachines ?? location.totalMachines ?? 0,
    onlineMachines: stats?.onlineMachines ?? location.onlineMachines ?? 0,
  };
};

// Helper function to get performance color based on gross revenue
const getPerformanceColor = (gross: number) => {
  if (gross >= 100000) return 'text-green-600';
  if (gross >= 50000) return 'text-blue-600';
  if (gross >= 10000) return 'text-yellow-600';
  return 'text-red-600';
};

// Helper function to get performance label
const getPerformanceLabel = (gross: number) => {
  if (gross >= 100000) return 'excellent';
  if (gross >= 50000) return 'good';
  if (gross >= 10000) return 'average';
  return 'poor';
};

// Component for location popup content with loading states
const LocationPopupContent = ({
  location,
  locationAggregates,
  isFinancialDataLoading,
  onViewDetails,
}: {
  location: Location;
  locationAggregates: Record<string, unknown>[];
  isFinancialDataLoading: boolean;
  onViewDetails: (locationId: string) => void;
}) => {
  const stats = getLocationStats(location, locationAggregates);
  const performance = getPerformanceLabel(stats.gross as number);
  const performanceColor = getPerformanceColor(stats.gross as number);

  return (
    <div className="min-w-[280px] p-2">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-bold">
          {location.name || location.locationName}
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
            <DollarSign className="h-3 w-3 text-green-600" />
            {isFinancialDataLoading ? (
              <Skeleton className="h-4 w-16" />
            ) : (
              <span className="font-medium text-green-600">
                {(stats.gross as number).toLocaleString()}
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
                {(stats.moneyIn as number) > 0
                  ? (
                      ((stats.gross as number) / (stats.moneyIn as number)) *
                      100
                    ).toFixed(1)
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
              ${(stats.moneyIn as number).toLocaleString()}
            </div>
          )}
          <div className="text-xs text-muted-foreground">Money In</div>
        </div>

        <div className="space-y-2">
          {isFinancialDataLoading ? (
            <Skeleton className="h-4 w-12" />
          ) : (
            <div className="font-medium">
              {stats.onlineMachines as number}/{stats.totalMachines as number}
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
              {(stats.totalMachines as number) > 0
                ? 'Active Location'
                : 'No Machines'}
            </span>
          )}
          <button
            onClick={() => onViewDetails(location._id)}
            className="rounded bg-blue-600 px-2 py-1 text-xs text-white transition-colors hover:bg-blue-700"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default function MapPreview(props: MapPreviewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const [mapReady, setMapReady] = useState(false);
  const [locationAggregates, setLocationAggregates] = useState<
    Record<string, unknown>[]
  >(props.locationAggregates || []);
  const [aggLoading, setAggLoading] = useState<boolean>(
    props.aggLoading ?? true
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Location[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [userDefaultCenter, setUserDefaultCenter] = useState<[number, number]>([
    10.6599, -61.5199,
  ]); // Trinidad center as initial map center (dynamically updated based on licensee)
  const mapRef = useRef<Record<string, unknown> | null>(null);
  const router = useRouter();

  // Get Zustand state for reactivity
  const { selectedLicencee, activeMetricsFilter, customDateRange } =
    useDashBoardStore();

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

  const normalizedSelected = (selectedLicencee || '').toLowerCase();

  const getLocationCenter = (location: Location): [number, number] | null => {
    if (!location?.geoCoords || !location.geoCoords.latitude) {
      return null;
    }
    const longitude = getValidLongitude(location.geoCoords);
    if (longitude === undefined) {
      return null;
    }
    return [location.geoCoords.latitude, longitude];
  };

  const matchesLicencee = (
    location: Location,
    licenceeKey: string
  ): boolean => {
    if (!licenceeKey) return false;

    const metadata = location as Location & {
      licenseeId?: string | null;
      rel?: { licencee?: string | string[] | null };
    };

    const licenseeCandidates: string[] = [];

    if (metadata.licenseeId) {
      licenseeCandidates.push(String(metadata.licenseeId).toLowerCase());
    }

    const relLicencee = metadata.rel?.licencee;
    if (Array.isArray(relLicencee)) {
      relLicencee.forEach(value => {
        if (value) {
          licenseeCandidates.push(String(value).toLowerCase());
        }
      });
    } else if (relLicencee) {
      licenseeCandidates.push(String(relLicencee).toLowerCase());
    }

    if (metadata.name) {
      licenseeCandidates.push(String(metadata.name).toLowerCase());
    }

    return licenseeCandidates.includes(licenceeKey);
  };

  const validLocations = useMemo(() => {
    return (
      props.gamingLocations?.filter(location => {
        if (!location.geoCoords) {
          return false;
        }

        const validLongitude = getValidLongitude(location.geoCoords);
        const hasValidCoords =
          location.geoCoords.latitude !== 0 &&
          validLongitude !== undefined &&
          validLongitude !== 0;

        return hasValidCoords;
      }) || []
    );
  }, [props.gamingLocations]);

  const filteredLocations = useMemo(() => {
    if (!normalizedSelected || normalizedSelected === 'all') {
      return validLocations;
    }
    return validLocations.filter(location =>
      matchesLicencee(location, normalizedSelected)
    );
  }, [normalizedSelected, validLocations]);

  const locationsWithoutCoords = useMemo(() => {
    return (
      props.gamingLocations?.filter(location => {
        if (!location.geoCoords) return true;

        const validLongitude = getValidLongitude(location.geoCoords);
        return (
          location.geoCoords.latitude === 0 ||
          validLongitude === undefined ||
          validLongitude === 0
        );
      }) || []
    );
  }, [props.gamingLocations]);

  const centersEqual = (a: [number, number], b: [number, number]): boolean =>
    a[0] === b[0] && a[1] === b[1];

  // Update map center when licensee or locations change
  useEffect(() => {
    const fallbackCenter = getMapCenterByLicensee(selectedLicencee);
    let nextCenter: [number, number] | null = null;

    if (normalizedSelected && normalizedSelected !== 'all') {
      if (filteredLocations.length > 0) {
        nextCenter = getLocationCenter(filteredLocations[0]) || null;
      }
    } else if (validLocations.length > 0) {
      nextCenter = getLocationCenter(validLocations[0]) || null;
    }

    const target = nextCenter ?? fallbackCenter;
    const resolved: [number, number] = [target[0], target[1]];

    setUserDefaultCenter(prev =>
      centersEqual(prev, resolved) ? prev : resolved
    );
  }, [selectedLicencee, normalizedSelected, filteredLocations, validLocations]);

  // Handle external props vs internal fetch
  useEffect(() => {
    if (props.locationAggregates) {
      // External data provided; use it instead of fetching
      setLocationAggregates(props.locationAggregates);
      setAggLoading(!!props.aggLoading);
    }
  }, [props.locationAggregates, props.aggLoading]);

  // Fetch location aggregation data only when no external props provided and filters change
  useEffect(() => {
    // Skip fetch if external data is provided
    if (props.locationAggregates) {
      return;
    }

    let aborted = false;
    const fetchLocationAggregation = async () => {
      setAggLoading(true);
      try {
        const params = new URLSearchParams();
        if (activeMetricsFilter === 'Today') {
          params.append('timePeriod', 'Today');
        } else if (activeMetricsFilter === 'Yesterday') {
          params.append('timePeriod', 'Yesterday');
        } else if (activeMetricsFilter === '7d') {
          params.append('timePeriod', '7d');
        } else if (activeMetricsFilter === '30d') {
          params.append('timePeriod', '30d');
        } else if (activeMetricsFilter === 'All Time') {
          params.append('timePeriod', 'All Time');
        } else if (activeMetricsFilter === 'Custom' && customDateRange) {
          if (customDateRange.startDate && customDateRange.endDate) {
            const sd =
              customDateRange.startDate instanceof Date
                ? customDateRange.startDate
                : new Date(customDateRange.startDate as unknown as string);
            const ed =
              customDateRange.endDate instanceof Date
                ? customDateRange.endDate
                : new Date(customDateRange.endDate as unknown as string);
            params.append('startDate', sd.toISOString());
            params.append('endDate', ed.toISOString());
          } else {
            // No valid timePeriod, skip the request
            return;
          }
        } else {
          // No valid timePeriod, skip the request
          return;
        }
        if (selectedLicencee) {
          params.append('licencee', selectedLicencee);
        }
        const response = await axios.get(
          `/api/locationAggregation?${params.toString()}`
        );
        if (!aborted) setLocationAggregates(response.data.data || []);
      } catch {
        if (!aborted) setLocationAggregates([]);
      } finally {
        if (!aborted) setAggLoading(false);
      }
    };
    fetchLocationAggregation();
    return () => {
      aborted = true;
    };
  }, [
    activeMetricsFilter,
    customDateRange,
    selectedLicencee,
    props.locationAggregates,
  ]);

  // Modal animation using GSAP
  useEffect(() => {
    if (isModalOpen && modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { opacity: 0, scale: 0.5 },
        { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(1.7)' }
      );
    }
  }, [isModalOpen]);

  const closeModal = () => {
    if (modalRef.current) {
      gsap.to(modalRef.current, {
        opacity: 0,
        scale: 0.5,
        duration: 0.2,
        ease: 'power2.in',
        onComplete: () => setIsModalOpen(false),
      });
    }
  };

  // Search functionality
  const handleSearch = (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    // Search through ALL locations, not just those with valid coordinates
    const filtered = (props.gamingLocations || []).filter(location => {
      const locationName = location.name || location.locationName || '';
      return locationName.toLowerCase().includes(query.toLowerCase());
    });

    setSearchResults(filtered);
    setShowSearchResults(true);
  };

  // Zoom to location
  const zoomToLocation = (location: Location) => {
    if (!mapRef.current) return;

    // Check if location has valid coordinates
    if (!location.geoCoords) {
      setSearchQuery(location.name || location.locationName || '');
      setShowSearchResults(false);
      return;
    }

    const lat = location.geoCoords.latitude;
    const lon = getValidLongitude(location.geoCoords);

    if (lat && lon && lat !== 0 && lon !== 0) {
      (
        mapRef.current as {
          setView: (coords: [number, number], zoom: number) => void;
        }
      ).setView([lat, lon], 15);
      setSearchQuery(location.name || location.locationName || '');
      setShowSearchResults(false);
    } else {
      setSearchQuery(location.name || location.locationName || '');
      setShowSearchResults(false);
    }
  };

  // Handle map instance
  const handleMapCreated = (map: unknown) => {
    if (map) {
      mapRef.current = map as {
        setView: (coords: [number, number], zoom: number) => void;
      };
    }
  };

  // Show skeleton only while map is initializing, not while financial data loads
  if (!mapReady) {
    return <MapSkeleton />;
  }

  // Debug logging for gaming locations data
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      `MapPreview - gamingLocations: ${JSON.stringify({
        count: validLocations.length,
        locations: validLocations.map(loc => ({
          id: loc._id,
          name: loc.name || loc.locationName,
          geoCoords: loc.geoCoords,
          hasValidCoords:
            loc.geoCoords &&
            loc.geoCoords.latitude !== 0 &&
            (loc.geoCoords.longitude !== 0 || loc.geoCoords.longtitude !== 0),
        })),
      })}`
    );
  }

  // Handle navigation to location details
  const handleLocationClick = (locationId: string) => {
    router.push(`/locations/${locationId}`);
  };

  const renderMarker = (
    lat: number,
    geo: { longitude?: number; longtitude?: number },
    label: string,
    key: string | number,
    locationObj: Location
  ) => {
    const lon = getValidLongitude(geo);
    if (!lon) return null;

    return (
      <Marker key={key} position={[lat, lon]}>
        <Popup>
          <LocationPopupContent
            location={locationObj}
            locationAggregates={locationAggregates}
            isFinancialDataLoading={aggLoading}
            onViewDetails={handleLocationClick}
          />
        </Popup>
      </Marker>
    );
  };

  return (
    <>
      {/* Small Map Preview */}
      <div className="relative w-full rounded-lg bg-container p-4 shadow-md">
        <h3 className="mb-3 text-sm font-medium text-gray-700">Map Preview</h3>

        {/* Notification for locations without coordinates */}
        {locationsWithoutCoords.length > 0 && (
          <div className="mb-3 rounded-md border border-yellow-200 bg-yellow-50 p-2">
            <div className="flex items-center gap-2 text-sm text-yellow-800">
              <MapPin className="h-4 w-4" />
              <span>
                <strong>{locationsWithoutCoords.length}</strong> location
                {locationsWithoutCoords.length !== 1 ? 's' : ''}
                {locationsWithoutCoords.length === 1 ? ' has' : ' have'} no
                coordinates and can&apos;t be displayed on the map
              </span>
            </div>
            {locationsWithoutCoords.length <= 3 && (
              <div className="mt-1 text-xs text-yellow-700">
                Missing:{' '}
                {locationsWithoutCoords
                  .map(loc => loc.name || loc.locationName)
                  .join(', ')}
              </div>
            )}
          </div>
        )}

        <button
          className="absolute right-5 top-8 z-[30] rounded-full bg-white p-2 shadow-lg transition-all duration-200 ease-in-out hover:scale-110"
          onClick={() => setIsModalOpen(true)}
        >
          <EnterFullScreenIcon className="h-5 w-5" />
        </button>
        <MapContainer
          center={userDefaultCenter} // Always use licensee-based center
          zoom={10}
          className="z-0 mt-2 h-48 w-full rounded-lg"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          {/* Render valid markers */}
          {filteredLocations.map(location => {
            const locationName =
              location.name || location.locationName || 'Unknown Location';
            return renderMarker(
              location.geoCoords!.latitude!,
              location.geoCoords!,
              locationName,
              location._id,
              location
            );
          })}
        </MapContainer>
      </div>

      {/* Modal for Expanded Map */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-md">
          <div
            ref={modalRef}
            className="relative w-[90vw] max-w-5xl rounded-lg bg-white p-4 shadow-lg"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                <MapPin className="h-5 w-5" />
                Casino Locations Map
              </h3>
              <button
                className="rounded-full bg-gray-200 p-2 shadow-md transition-all duration-200 ease-in-out hover:scale-110"
                onClick={closeModal}
              >
                <ExitFullScreenIcon className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Interactive map showing casino location performance metrics
            </p>

            {/* Notification for locations without coordinates in modal */}
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
            {/* Flex row: sidebar + map */}
            <div className="flex gap-4">
              {/* Sidebar */}
              <div className="flex w-72 flex-col">
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
                  <div className="max-h-60 overflow-y-auto rounded-lg border border-gray-300 bg-white shadow-lg">
                    {searchResults.length > 0 ? (
                      searchResults.map(location => {
                        const locationName =
                          location.name ||
                          location.locationName ||
                          'Unknown Location';
                        const hasValidCoords =
                          location.geoCoords &&
                          location.geoCoords.latitude !== 0 &&
                          getValidLongitude(location.geoCoords) !== undefined &&
                          getValidLongitude(location.geoCoords) !== 0;

                        return (
                          <button
                            key={location._id}
                            onClick={() => zoomToLocation(location)}
                            className="flex w-full items-center gap-2 border-b border-gray-200 px-4 py-2 text-left last:border-b-0 hover:bg-gray-100"
                          >
                            <MapPin
                              className={`h-4 w-4 ${
                                hasValidCoords
                                  ? 'text-gray-400'
                                  : 'text-yellow-500'
                              }`}
                            />
                            <span
                              className={
                                hasValidCoords ? '' : 'text-yellow-600'
                              }
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
              <div className="relative z-0 flex-1">
                <MapContainer
                  center={userDefaultCenter} // Always use licensee-based center
                  zoom={10}
                  className="h-[70vh] w-full rounded-lg"
                  ref={handleMapCreated}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  />
                  {filteredLocations.map(location => {
                    const locationName =
                      location.name ||
                      location.locationName ||
                      'Unknown Location';
                    return renderMarker(
                      location.geoCoords!.latitude!,
                      location.geoCoords!,
                      locationName,
                      `modal-${location._id}`,
                      location
                    );
                  })}
                </MapContainer>
                {/* Map Legend */}
                <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <div className="h-3 w-3 rounded-full bg-green-500"></div>
                    <span>Excellent Performance</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                    <span>Good Performance</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                    <span>Average Performance</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-3 w-3 rounded-full bg-red-500"></div>
                    <span>Poor Performance</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
