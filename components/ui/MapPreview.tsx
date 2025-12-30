/**
 * Map Preview Component
 * Interactive map component displaying location performance metrics with Leaflet.
 *
 * Features:
 * - Interactive map with markers
 * - Location performance data display
 * - Search functionality
 * - Fullscreen mode
 * - GSAP animations
 * - Location popups with metrics
 * - Licensee filtering
 * - Dynamic Leaflet imports (SSR disabled)
 *
 * Very large component (~795 lines) handling map display and interactions.
 *
 * @param locations - Array of location data
 * @param loading - Whether data is loading
 * @param onLocationClick - Callback when location is clicked
 */
'use client';

import { Badge } from '@/components/ui/badge';
import MapSkeleton from '@/components/ui/MapSkeleton';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { Location } from '@/lib/types';
import { MapPreviewProps } from '@/lib/types/componentProps';
import { deduplicateRequest } from '@/lib/utils/requestDeduplication';
import { isAbortError } from '@/lib/utils/errorHandling';
import { EnterFullScreenIcon, ExitFullScreenIcon } from '@radix-ui/react-icons';
import axios from 'axios';
import gsap from 'gsap';
import 'leaflet/dist/leaflet.css';
import { DollarSign, MapPin, Search, TrendingUp } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
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
  location: any,
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

// Helper function to get performance color based on revenue %
const getPerformanceColor = (gross: number, moneyIn: number) => {
  const level = getCommonPerformanceLevel(gross, moneyIn);
  return PERFORMANCE_CONFIG[level].textColor;
};

// Helper function to get performance label
const getPerformanceLabel = (gross: number, moneyIn: number) => {
  return getCommonPerformanceLevel(gross, moneyIn);
};

// Component for location popup content with loading states
const LocationPopupContent = ({
  location,
  locationAggregates,
  isFinancialDataLoading,
  onViewDetails,
  isMinimized = false,
}: {
  location: any;
  locationAggregates: Record<string, unknown>[];
  isFinancialDataLoading: boolean;
  onViewDetails: (locationId: string) => void;
  isMinimized?: boolean;
}) => {
  const stats = getLocationStats(location, locationAggregates);
  const performance = getPerformanceLabel(
    stats.gross as number,
    stats.moneyIn as number
  );
  const performanceColor = getPerformanceColor(
    stats.gross as number,
    stats.moneyIn as number
  );

  // Conditional classes based on minimized state
  const containerClass = isMinimized
    ? 'min-w-[200px] p-1.5'
    : 'min-w-[280px] p-2';
  const headerMarginClass = isMinimized ? 'mb-2' : 'mb-3';
  const titleClass = isMinimized
    ? 'text-sm font-semibold'
    : 'text-lg font-bold';
  const badgeSkeletonClass = isMinimized ? 'h-4 w-12' : 'h-5 w-16';
  const gridGapClass = isMinimized ? 'gap-2' : 'gap-3';
  const gridTextClass = isMinimized ? 'text-xs' : 'text-sm';
  const spaceYClass = isMinimized ? 'space-y-1' : 'space-y-2';
  const iconClass = isMinimized ? 'h-2.5 w-2.5' : 'h-3 w-3';
  const labelTextClass = isMinimized ? 'text-[10px]' : 'text-xs';
  const footerMarginClass = isMinimized ? 'mt-2 pt-1.5' : 'mt-3 pt-2';
  const footerTextClass = isMinimized ? 'text-[10px]' : 'text-xs';
  const buttonClass = isMinimized
    ? 'rounded bg-blue-600 px-1.5 py-0.5 text-[10px] text-white transition-colors hover:bg-blue-700'
    : 'rounded bg-blue-600 px-2 py-1 text-xs text-white transition-colors hover:bg-blue-700';

  return (
    <div className={containerClass}>
      <div className={`${headerMarginClass} flex items-center justify-between`}>
        <h3 className={titleClass}>{location.name || location.locationName}</h3>
        {isFinancialDataLoading ? (
          <Skeleton className={`${badgeSkeletonClass} rounded-full`} />
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

      <div className={`grid grid-cols-2 ${gridGapClass} ${gridTextClass}`}>
        <div className={spaceYClass}>
          <div className="flex items-center gap-1">
            <DollarSign className={`${iconClass} text-green-600`} />
            {isFinancialDataLoading ? (
              <Skeleton className={isMinimized ? 'h-3 w-12' : 'h-4 w-16'} />
            ) : (
              <span className="font-medium text-green-600">
                {(stats.gross as number).toLocaleString()}
              </span>
            )}
          </div>
          <div className={`${labelTextClass} text-muted-foreground`}>
            Gross Revenue
          </div>
        </div>

        <div className={spaceYClass}>
          <div className="flex items-center gap-1">
            <TrendingUp className={`${iconClass} text-blue-600`} />
            {isFinancialDataLoading ? (
              <Skeleton className={isMinimized ? 'h-3 w-10' : 'h-4 w-12'} />
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
          <div className={`${labelTextClass} text-muted-foreground`}>
            Revenue Performance (%)
          </div>
        </div>

        <div className={spaceYClass}>
          {isFinancialDataLoading ? (
            <Skeleton className={isMinimized ? 'h-3 w-16' : 'h-4 w-20'} />
          ) : (
            <div className="font-medium text-yellow-600">
              ${(stats.moneyIn as number).toLocaleString()}
            </div>
          )}
          <div className={`${labelTextClass} text-muted-foreground`}>
            Money In
          </div>
        </div>

        <div className={spaceYClass}>
          {isFinancialDataLoading ? (
            <Skeleton className={isMinimized ? 'h-3 w-10' : 'h-4 w-12'} />
          ) : (
            <div className="font-medium">
              {stats.onlineMachines as number}/{stats.totalMachines as number}
            </div>
          )}
          <div className={`${labelTextClass} text-muted-foreground`}>
            Machines Online
          </div>
        </div>
      </div>

      <div className={`${footerMarginClass} border-t`}>
        <div className={`flex items-center justify-between ${footerTextClass}`}>
          {isFinancialDataLoading ? (
            <Skeleton className={isMinimized ? 'h-2.5 w-20' : 'h-3 w-24'} />
          ) : (
            <span className="font-medium text-gray-500">
              {(stats.totalMachines as number) > 0
                ? 'Active Location'
                : 'No Machines'}
            </span>
          )}
          <button
            onClick={() => onViewDetails(location._id)}
            className={buttonClass}
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
};

const PerformanceLegend = () => {
  const [openTooltip, setOpenTooltip] = useState<string | null>(null);

  return (
    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground sm:mt-4 sm:gap-4">
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
              <div
                className={`h-2 w-2 rounded-full sm:h-3 sm:w-3 ${config.dotColor}`}
              ></div>
              <span className="text-xs">{config.label}</span>
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
  const previewMapRef = useRef<Record<string, unknown> | null>(null);
  const modalMapRef = useRef<Record<string, unknown> | null>(null);
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

  // Ensure Leaflet popup pane has correct z-index (higher than search bar but lower than custom range filter)
  useEffect(() => {
    if (!mapReady) return;

    const setPopupPaneZIndex = () => {
      // Find the popup pane and set its z-index
      const popupPane = document.querySelector('.leaflet-popup-pane');
      if (popupPane instanceof HTMLElement) {
        popupPane.style.zIndex = '900';
      }

      // Also set z-index on individual popups
      const popups = document.querySelectorAll('.leaflet-popup');
      popups.forEach(popup => {
        if (popup instanceof HTMLElement) {
          popup.style.zIndex = '900';
        }
      });
    };

    // Set z-index immediately
    setPopupPaneZIndex();

    // Use MutationObserver to catch dynamically created popups
    const observer = new MutationObserver(() => {
      setPopupPaneZIndex();
    });

    // Observe the document body for new popup elements
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, [mapReady]);

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
      (props.gamingLocations as any[])?.filter(location => {
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
    return validLocations.filter((location: any) =>
      matchesLicencee(location, normalizedSelected)
    );
  }, [normalizedSelected, validLocations]);

  const locationsWithoutCoords = useMemo(() => {
    return (
      (props.gamingLocations as any[])?.filter(location => {
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

      const requestKey = `/api/locationAggregation?${params.toString()}`;

      setAggLoading(true);
      try {
        // Use deduplication to prevent duplicate requests
        const response = await deduplicateRequest(requestKey, async signal => {
          const res = await axios.get(requestKey, { signal });
          return res.data;
        });

        if (!aborted) setLocationAggregates(response.data || []);
      } catch (error) {
        // Silently handle aborted requests - this is expected behavior when switching filters
        if (isAbortError(error) || aborted) {
          return;
        }
        setLocationAggregates([]);
      } finally {
        if (!aborted) {
          setAggLoading(false);
        }
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
      try {
        // Ensure element is in DOM before animating
        if (modalRef.current.parentElement) {
          gsap.fromTo(
            modalRef.current,
            { opacity: 0, scale: 0.5 },
            { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(1.7)' }
          );
        }
      } catch (error) {
        console.error('Error animating modal:', error);
      }
    }
  }, [isModalOpen]);

  const closeModal = () => {
    if (modalRef.current) {
      try {
        // Ensure element is in DOM before animating
        if (modalRef.current.parentElement) {
          gsap.to(modalRef.current, {
            opacity: 0,
            scale: 0.5,
            duration: 0.2,
            ease: 'power2.in',
            onComplete: () => setIsModalOpen(false),
          });
        } else {
          // If element is not in DOM, just close the modal
          setIsModalOpen(false);
        }
      } catch (error) {
        console.error('Error closing modal:', error);
        // Fallback: just close the modal
        setIsModalOpen(false);
      }
    } else {
      setIsModalOpen(false);
    }
  };

  // Search functionality
  // CRITICAL: Search only through filteredLocations (already filtered by licensee)
  // This ensures search results match what's shown on the map
  const handleSearch = (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    // Search through filteredLocations (already filtered by licensee and coordinates)
    // This ensures search results only show locations from the selected licensee
    const filtered = filteredLocations.filter((location: any) => {
      const locationName = location.name || location.locationName || '';
      return locationName.toLowerCase().includes(query.toLowerCase());
    });

    setSearchResults(filtered);
    setShowSearchResults(true);
  };

  // Zoom to location
  const zoomToLocation = (location: any) => {
    try {
      // Use preview map ref if modal is not open, otherwise use modal map ref
      const activeMapRef = isModalOpen ? modalMapRef : previewMapRef;

      if (!activeMapRef.current) {
        console.warn('Map ref not available for zooming');
        return;
      }

      // Check if location has valid coordinates
      if (!location.geoCoords) {
        setSearchQuery(location.name || location.locationName || '');
        setShowSearchResults(false);
        return;
      }

      const lat = location.geoCoords.latitude;
      const lon = getValidLongitude(location.geoCoords);

      if (lat && lon && lat !== 0 && lon !== 0) {
        const mapInstance = activeMapRef.current as {
          setView?: (coords: [number, number], zoom: number) => void;
        };
        if (mapInstance.setView && typeof mapInstance.setView === 'function') {
          mapInstance.setView([lat, lon], 15);
          setSearchQuery(location.name || location.locationName || '');
          setShowSearchResults(false);
        } else {
          console.warn('Map setView method not available');
        }
      } else {
        setSearchQuery(location.name || location.locationName || '');
        setShowSearchResults(false);
      }
    } catch (error) {
      console.error('Error zooming to location:', error);
      setSearchQuery(location.name || location.locationName || '');
      setShowSearchResults(false);
    }
  };

  // Handle preview map instance
  const handlePreviewMapCreated = (map: unknown) => {
    try {
      if (map && typeof map === 'object') {
        const mapInstance = map as {
          setView?: (coords: [number, number], zoom: number) => void;
          getContainer?: () => HTMLElement | null;
        };
        // Verify map instance has required methods
        if (mapInstance.setView && typeof mapInstance.setView === 'function') {
          previewMapRef.current = mapInstance as {
            setView: (coords: [number, number], zoom: number) => void;
          };
        }
      }
    } catch (error) {
      console.warn('Error setting preview map ref:', error);
    }
  };

  // Handle modal map instance
  const handleModalMapCreated = (map: unknown) => {
    try {
      if (map && typeof map === 'object') {
        const mapInstance = map as {
          setView?: (coords: [number, number], zoom: number) => void;
          getContainer?: () => HTMLElement | null;
        };
        // Verify map instance has required methods
        if (mapInstance.setView && typeof mapInstance.setView === 'function') {
          modalMapRef.current = mapInstance as {
            setView: (coords: [number, number], zoom: number) => void;
          };
        }
      }
    } catch (error) {
      console.warn('Error setting modal map ref:', error);
    }
  };

  // Show skeleton only while map is initializing, not while financial data loads
  if (!mapReady) {
    return <MapSkeleton />;
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
    locationObj: Location,
    isMinimized: boolean = false
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
            isMinimized={isMinimized}
          />
        </Popup>
      </Marker>
    );
  };

  return (
    <TooltipProvider>
      {/* Small Map Preview */}
      <div className="relative w-full rounded-lg bg-container p-2 shadow-md sm:p-3">
        <div className="mb-1.5 flex items-center justify-between sm:mb-2">
          <h3 className="text-[10px] font-medium text-gray-700 sm:text-xs">
            Map Preview
          </h3>
          <button
            className="z-[30] flex-shrink-0 rounded-full bg-white p-1 shadow-lg transition-all duration-200 ease-in-out hover:scale-110 active:scale-95 sm:p-1.5"
            onClick={() => setIsModalOpen(true)}
            aria-label="Open map in fullscreen"
          >
            <EnterFullScreenIcon className="h-3 w-3 sm:h-4 sm:w-4" />
          </button>
        </div>

        {/* Notification for locations without coordinates */}
        {locationsWithoutCoords.length > 0 && (
          <div className="mb-1.5 rounded-md border border-yellow-200 bg-yellow-50 p-1.5 sm:mb-2 sm:p-2">
            <div className="flex items-center gap-1.5 text-[10px] text-yellow-800 sm:gap-2 sm:text-xs">
              <MapPin className="h-2.5 w-2.5 flex-shrink-0 sm:h-3 sm:w-3" />
              <span>
                <strong>{locationsWithoutCoords.length}</strong> location
                {locationsWithoutCoords.length !== 1 ? 's' : ''}
                {locationsWithoutCoords.length === 1 ? ' has' : ' have'} no
                coordinates and can&apos;t be displayed on the map
              </span>
            </div>
            {locationsWithoutCoords.length <= 3 && (
              <div className="mt-0.5 text-[10px] text-yellow-700 sm:mt-1 sm:text-xs">
                Missing:{' '}
                {locationsWithoutCoords
                  .map(loc => loc.name || loc.locationName)
                  .join(', ')}
              </div>
            )}
          </div>
        )}

        {/* Search Bar - Outside map container but positioned above it */}
        <div className="relative z-[800] mb-2 w-full">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 transform text-gray-400 sm:h-4 sm:w-4" />
            <input
              type="text"
              placeholder="Search locations..."
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-1.5 pl-8 pr-3 text-[10px] shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:py-2 sm:pl-10 sm:text-xs"
              onClick={e => e.stopPropagation()}
            />
            {/* Search Results Dropdown - Positioned as absolute to show over the map */}
            {showSearchResults && (
              <div className="absolute left-0 top-full z-[801] mt-1 max-h-40 w-full overflow-y-auto rounded-lg border border-gray-300 bg-white shadow-xl sm:max-h-48">
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
                        onClick={e => {
                          e.stopPropagation();
                          zoomToLocation(location);
                        }}
                        className="flex w-full items-center gap-1.5 border-b border-gray-200 px-3 py-2 text-left text-[10px] last:border-b-0 hover:bg-gray-100 sm:gap-2 sm:text-xs"
                      >
                        <MapPin
                          className={`h-2.5 w-2.5 flex-shrink-0 sm:h-3 sm:w-3 ${
                            hasValidCoords ? 'text-gray-400' : 'text-yellow-500'
                          }`}
                        />
                        <span
                          className={`truncate ${
                            hasValidCoords ? '' : 'text-yellow-600'
                          }`}
                        >
                          {locationName}
                        </span>
                        {!hasValidCoords && (
                          <span className="ml-auto flex-shrink-0 rounded bg-yellow-100 px-1 text-[10px] text-yellow-600 sm:text-xs">
                            No map
                          </span>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <div className="p-3 text-center text-[10px] text-gray-500 sm:text-xs">
                    No locations found matching &quot;{searchQuery}&quot;
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="relative h-48 w-full rounded-lg sm:h-56">
          {mapReady && (
            <MapContainer
              center={userDefaultCenter} // Always use licensee-based center
              zoom={10}
              className="z-0 h-full w-full rounded-lg"
              ref={handlePreviewMapCreated}
              key="preview-map"
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
                  location,
                  true // isMinimized = true for preview map
                );
              })}
            </MapContainer>
          )}
        </div>
        <PerformanceLegend />
      </div>

      {/* Modal for Expanded Map */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50 p-2 backdrop-blur-md sm:p-4">
          <div
            ref={modalRef}
            className="relative max-h-[95vh] w-full max-w-5xl overflow-y-auto rounded-lg bg-white p-3 shadow-lg sm:p-4"
          >
            <div className="mb-3 flex items-center justify-between sm:mb-4">
              <h3 className="flex items-center gap-2 text-base font-semibold text-gray-800 sm:text-lg">
                <MapPin className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="truncate">Casino Locations Map</span>
              </h3>
              <button
                className="flex-shrink-0 rounded-full bg-gray-200 p-1.5 shadow-md transition-all duration-200 ease-in-out hover:scale-110 sm:p-2"
                onClick={closeModal}
              >
                <ExitFullScreenIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
            <p className="mb-3 text-xs text-muted-foreground sm:mb-4 sm:text-sm">
              Interactive map showing casino location performance metrics
            </p>

            {/* Notification for locations without coordinates in modal */}
            {locationsWithoutCoords.length > 0 && (
              <div className="mb-3 rounded-md border border-yellow-200 bg-yellow-50 p-2 sm:mb-4 sm:p-3">
                <div className="flex items-center gap-2 text-xs text-yellow-800 sm:text-sm">
                  <MapPin className="h-3 w-3 flex-shrink-0 sm:h-4 sm:w-4" />
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
            {/* Map - Full Width with Search Overlay */}
            <div className="relative z-0 min-h-[300px] w-full sm:min-h-[400px]">
              {/* Search Bar Overlay - Top Left */}
              <div className="absolute left-3 top-3 z-[800] w-[calc(100%-1.5rem)] max-w-xs sm:left-4 sm:top-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search locations..."
                    value={searchQuery}
                    onChange={e => handleSearch(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white/95 py-2 pl-10 pr-4 text-sm shadow-lg backdrop-blur-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:py-2.5 sm:text-base"
                    onClick={e => e.stopPropagation()}
                  />
                  {/* Search Results Dropdown */}
                  {showSearchResults && (
                    <div className="absolute top-full z-[801] mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-300 bg-white shadow-lg">
                      {searchResults.length > 0 ? (
                        searchResults.map(location => {
                          const locationName =
                            location.name ||
                            location.locationName ||
                            'Unknown Location';
                          const hasValidCoords =
                            location.geoCoords &&
                            location.geoCoords.latitude !== 0 &&
                            getValidLongitude(location.geoCoords) !==
                              undefined &&
                            getValidLongitude(location.geoCoords) !== 0;

                          return (
                            <button
                              key={location._id}
                              onClick={e => {
                                e.stopPropagation();
                                zoomToLocation(location);
                              }}
                              className="flex w-full items-center gap-2 border-b border-gray-200 px-4 py-2 text-left text-sm last:border-b-0 hover:bg-gray-100 sm:text-base"
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
                                {locationName}
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
                        <div className="p-4 text-center text-sm text-gray-500 sm:text-base">
                          No locations found matching &quot;{searchQuery}&quot;
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {mapReady && (
                <MapContainer
                  center={userDefaultCenter} // Always use licensee-based center
                  zoom={10}
                  className="h-[50vh] w-full rounded-lg sm:h-[60vh] md:h-[70vh]"
                  ref={handleModalMapCreated}
                  key="modal-map"
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
                      location,
                      false // isMinimized = false for modal (maximized) map
                    );
                  })}
                </MapContainer>
              )}
              {/* Map Legend */}
              <PerformanceLegend />
            </div>
          </div>
        </div>
      )}
    </TooltipProvider>
  );
}
