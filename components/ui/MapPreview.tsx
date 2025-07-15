"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { EnterFullScreenIcon, ExitFullScreenIcon } from "@radix-ui/react-icons";
import "leaflet/dist/leaflet.css";
import { MapPreviewProps } from "@/lib/types/componentProps";
import { locations } from "@/lib/types";
import MapSkeleton from "@/components/ui/MapSkeleton";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { MapPin, DollarSign, TrendingUp, Search } from "lucide-react";
import { useDashBoardStore } from "@/lib/store/dashboardStore";
import getAllGamingLocations from "@/lib/helpers/locations";

// Dynamically import react-leaflet components (SSR disabled)
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), {
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
const getLocationStats = (location: locations, locationAggregates: any[]) => {
  // Try to find matching data in locationAggregates
  const stats = locationAggregates.find(
    (d) => d.location === location._id
  );

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
  if (gross >= 100000) return "text-green-600";
  if (gross >= 50000) return "text-blue-600";
  if (gross >= 10000) return "text-yellow-600";
  return "text-red-600";
};

// Helper function to get performance label
const getPerformanceLabel = (gross: number) => {
  if (gross >= 100000) return "excellent";
  if (gross >= 50000) return "good";
  if (gross >= 10000) return "average";
  return "poor";
};

export default function MapPreview(props: MapPreviewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const [mapReady, setMapReady] = useState(false);
  const [locationAggregates, setLocationAggregates] = useState<any[]>([]);
  const [aggLoading, setAggLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<locations[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const mapRef = useRef<any>(null);
  const router = useRouter();

  // Get Zustand state for reactivity
  const { 
    selectedLicencee, 
    activeMetricsFilter, 
    customDateRange 
  } = useDashBoardStore();

  // Initialize Leaflet on client side
  useEffect(() => {
    import("leaflet").then((L) => {
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "/leaflet/marker-icon.png",
        iconUrl: "/leaflet/marker-icon-image.png",
        shadowUrl: "/leaflet/marker-shadow.png",
      });
      // Force iconUrl to be set on every render
      L.Marker.prototype.options.icon = new L.Icon.Default();
      setMapReady(true);
    });
  }, []);

  // Fetch location aggregation data - now reactive to filters
  useEffect(() => {
    const fetchLocationAggregation = async () => {
      setAggLoading(true);
      try {
        // Build query parameters based on current filters
        const params = new URLSearchParams();
        
        // Add time period based on activeMetricsFilter
        if (activeMetricsFilter === 'Today') {
          params.append('timePeriod', 'Today');
        } else if (activeMetricsFilter === 'Yesterday') {
          params.append('timePeriod', 'Yesterday');
        } else if (activeMetricsFilter === 'last7days' || activeMetricsFilter === '7d') {
          params.append('timePeriod', '7d');
        } else if (activeMetricsFilter === 'last30days' || activeMetricsFilter === '30d') {
          params.append('timePeriod', '30d');
        } else if (activeMetricsFilter === 'Custom' && customDateRange) {
          // For custom range, use the date range directly
          if (customDateRange.startDate && customDateRange.endDate) {
            params.append('startDate', customDateRange.startDate.toISOString());
            params.append('endDate', customDateRange.endDate.toISOString());
          } else {
            params.append('timePeriod', 'Today');
          }
        } else {
          params.append('timePeriod', 'Today');
        }

        // Add licensee filter if selected
        if (selectedLicencee) {
          params.append('licencee', selectedLicencee);
        }

        const res = await fetch(`/api/locationAggregation?${params.toString()}`);
        const data = await res.json();
        setLocationAggregates(data);
      } catch (err) {
        console.error("Error fetching location aggregation:", err);
        setLocationAggregates([]);
      } finally {
        setAggLoading(false);
      }
    };
    fetchLocationAggregation();
  }, [activeMetricsFilter, customDateRange, selectedLicencee]);

  // Modal animation using GSAP
  useEffect(() => {
    if (isModalOpen && modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { opacity: 0, scale: 0.5 },
        { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(1.7)" }
      );
    }
  }, [isModalOpen]);

  const closeModal = () => {
    if (modalRef.current) {
      gsap.to(modalRef.current, {
        opacity: 0,
        scale: 0.5,
        duration: 0.2,
        ease: "power2.in",
        onComplete: () => setIsModalOpen(false),
      });
    }
  };

  // Filter valid locations with coordinates
  const validLocations = props.gamingLocations?.filter(location => {
    if (!location.geoCoords) {
      console.log(`📍 Location "${location.name || location.locationName}" has no geoCoords`);
      return false;
    }
    
    const validLongitude = getValidLongitude(location.geoCoords);
    const hasValidCoords = location.geoCoords.latitude !== 0 && 
                          validLongitude !== undefined && 
                          validLongitude !== 0;
    
    if (!hasValidCoords) {
      console.log(`📍 Location "${location.name || location.locationName}" has invalid coordinates:`, {
        latitude: location.geoCoords.latitude,
        longitude: location.geoCoords.longitude,
        longtitude: location.geoCoords.longtitude,
        validLongitude
      });
    }
    
    return hasValidCoords;
  }) || [];

  // Search functionality
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const filtered = validLocations.filter(location => {
      const locationName = location.name || location.locationName || "";
      return locationName.toLowerCase().includes(query.toLowerCase());
    });

    setSearchResults(filtered);
    setShowSearchResults(true);
  };

  // Zoom to location
  const zoomToLocation = (location: locations) => {
    if (!mapRef.current || !location.geoCoords) return;

    const lat = location.geoCoords.latitude;
    const lon = getValidLongitude(location.geoCoords);
    
    if (lat && lon) {
      mapRef.current.setView([lat, lon], 15);
      setSearchQuery(location.name || location.locationName || "");
      setShowSearchResults(false);
    }
  };

  // Handle map instance
  const handleMapCreated = (map: any) => {
    mapRef.current = map;
  };

  // Show skeleton while loading or initializing
  if (!mapReady || aggLoading) {
    return <MapSkeleton />;
  }

  // Debug logging for gaming locations data
  if (process.env.NODE_ENV === "development") {
    console.log("MapPreview - gamingLocations:", {
      count: validLocations.length,
      locations: validLocations.map(loc => ({
        id: loc._id,
        name: loc.name || loc.locationName,
        geoCoords: loc.geoCoords,
        hasValidCoords: loc.geoCoords && 
          loc.geoCoords.latitude !== 0 && 
          (loc.geoCoords.longitude !== 0 || loc.geoCoords.longtitude !== 0)
      }))
    });
    
    // Log location aggregation data structure
    console.log("MapPreview - locationAggregates:", {
      count: locationAggregates.length,
      sampleData: locationAggregates.slice(0, 2)
    });
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
    locationObj: locations
  ) => {
    const lon = getValidLongitude(geo);
    if (!lon) return null;

    const stats = getLocationStats(locationObj, locationAggregates);
    const performance = getPerformanceLabel(stats.gross);
    const performanceColor = getPerformanceColor(stats.gross);
    
    return (
      <Marker key={key} position={[lat, lon]}>
        <Popup>
          <div className="min-w-[280px] p-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg">
                {label}
              </h3>
              <Badge
                variant={
                  performance === "excellent"
                    ? "default"
                    : performance === "good"
                    ? "secondary"
                    : "outline"
                }
                className={performanceColor}
              >
                {performance}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3 text-green-600" />
                  <span className="font-medium text-green-600">
                    {stats.gross.toLocaleString()}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Gross Revenue
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-blue-600" />
                  <span className="font-medium">
                    {stats.moneyIn > 0 ? ((stats.gross / stats.moneyIn) * 100).toFixed(1) : "0.0"}%
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Revenue Performance (%)
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-medium text-yellow-600">
                  ${stats.moneyIn.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">
                  Money In
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-medium">
                  {stats.onlineMachines}/{stats.totalMachines}
                </div>
                <div className="text-xs text-muted-foreground">
                  Machines Online
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-gray-500">
                  {stats.totalMachines > 0 ? "Active Location" : "No Machines"}
                </span>
                <button
                  onClick={() => handleLocationClick(locationObj._id)}
                  className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                >
                  View Details
                </button>
              </div>
            </div>
          </div>
        </Popup>
      </Marker>
    );
  };

  console.log(`🗺️ MapPreview: ${validLocations.length} valid locations out of ${props.gamingLocations?.length || 0} total`);

  return (
    <>
      {/* Small Map Preview */}
      <div className="relative p-4 rounded-lg shadow-md bg-container w-full">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Map Preview</h3>

        <button
          className="absolute top-8 right-5 z-[50] p-2 bg-white rounded-full shadow-lg hover:scale-110 transition-all duration-200 ease-in-out"
          onClick={() => setIsModalOpen(true)}
        >
          <EnterFullScreenIcon className="w-5 h-5" />
        </button>
        <MapContainer
          center={[10.654, -61.501]}
          zoom={10}
          className="z-10 mt-2 h-48 w-full rounded-lg"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          {/* Render valid markers */}
          {validLocations.map((location) => {
            const locationName =
              location.name || location.locationName || "Unknown Location";
            return renderMarker(
              location.geoCoords.latitude,
              location.geoCoords,
              locationName,
              location._id,
              location
            );
          })}
        </MapContainer>
      </div>

      {/* Modal for Expanded Map */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-md z-[9999]">
          <div
            ref={modalRef}
            className="relative bg-white rounded-lg shadow-lg w-[90vw] max-w-5xl p-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <MapPin className="h-5 w-5" />
              Casino Locations Map
            </h3>
            <button
                className="p-2 bg-gray-200 rounded-full shadow-md hover:scale-110 transition-all duration-200 ease-in-out"
              onClick={closeModal}
            >
              <ExitFullScreenIcon className="w-5 h-5" />
            </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Interactive map showing casino location performance metrics
            </p>
            {/* Flex row: sidebar + map */}
            <div className="flex gap-4">
              {/* Sidebar */}
              <div className="w-72 flex flex-col">
                <div className="relative mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Search locations..."
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                {/* Dropdown always below input */}
                {showSearchResults && (
                  <div className="bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {searchResults.length > 0 ? (
                      searchResults.map((location) => {
                        const locationName = location.name || location.locationName || "Unknown Location";
                        return (
                          <button
                            key={location._id}
                            onClick={() => zoomToLocation(location)}
                            className="w-full px-4 py-2 text-left hover:bg-gray-100 border-b border-gray-200 last:border-b-0 flex items-center gap-2"
                          >
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span>{locationName}</span>
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
              <div className="flex-1">
            <MapContainer
              center={[10.654, -61.501]}
              zoom={10}
                  className="h-[70vh] w-full rounded-lg"
                  ref={handleMapCreated}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              {validLocations.map((location) => {
                const locationName =
                  location.name || location.locationName || "Unknown Location";
                return renderMarker(
                  location.geoCoords.latitude,
                  location.geoCoords,
                  locationName,
                  `modal-${location._id}`,
                  location
                );
              })}
            </MapContainer>
                {/* Map Legend */}
                <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>Excellent Performance</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span>Good Performance</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span>Average Performance</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
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
