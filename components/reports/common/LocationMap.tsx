"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface LocationData {
  locationId: string;
  locationName: string;
  coordinates?: { lat: number; lng: number };
  metrics: {
    grossRevenue: number;
    totalDrop: number;
    totalCancelledCredits: number;
    actualHoldPercentage: number;
  };
  onlineMachines: number;
  totalMachines: number;
  performance: "excellent" | "good" | "average" | "poor";
  sasEnabled: boolean;
}

interface LocationMapProps {
  locations?: LocationData[];
  selectedLocations?: string[];
  onLocationSelect: (locationId: string) => void;
  compact?: boolean;
}

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
const getLocationStats = (location: any, locationAggregates: any[]) => {
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

export default function LocationMap({
  selectedLocations = [],
  onLocationSelect,
  compact = false,
}: LocationMapProps) {
  const [mapReady, setMapReady] = useState(false);
  const [locationAggregates, setLocationAggregates] = useState<any[]>([]);
  const [gamingLocations, setGamingLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedLicencee, activeMetricsFilter, customDateRange } = useDashBoardStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const mapRef = useRef<any>(null);

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

  // Fetch location aggregation data and gaming locations
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
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

        // Fetch location aggregation data
        const aggRes = await fetch(`/api/locationAggregation?${params.toString()}`);
        const aggData = await aggRes.json();
        // Handle both old array format and new paginated format
        const locationData = Array.isArray(aggData) ? aggData : (aggData.data || []);
        setLocationAggregates(locationData);

        // Fetch gaming locations
        const locationsData = await getAllGamingLocations(selectedLicencee);
        setGamingLocations(locationsData);
      } catch (err) {
        console.error("Error fetching location data:", err);
        setLocationAggregates([]);
        setGamingLocations([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedLicencee, activeMetricsFilter, customDateRange]);

  // Filter valid locations with coordinates
  const validLocations = gamingLocations.filter(location => {
    if (!location.geoCoords) {
      return false;
    }
    
    const validLongitude = getValidLongitude(location.geoCoords);
    const hasValidCoords = location.geoCoords.latitude !== 0 && 
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

    const filtered = validLocations.filter(location => {
      const locationName = location.name || location.locationName || "";
      return locationName.toLowerCase().includes(query.toLowerCase());
    });

    setSearchResults(filtered);
    setShowSearchResults(true);
  };

  // Zoom to location
  const zoomToLocation = (location: any) => {
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

  if (!mapReady || loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location Performance Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-gray-500">Loading map...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default center (US center)
  const defaultCenter: [number, number] = [39.8283, -98.5795];

  // Calculate bounds if locations have coordinates
  const mapCenter =
    validLocations.length > 0
      ? ([
          validLocations[0].geoCoords.latitude,
          getValidLongitude(validLocations[0].geoCoords)!,
        ] as [number, number])
      : defaultCenter;

  // Render a marker if valid latitude and a valid longitude are present.
  const renderMarker = (
    lat: number,
    geo: { longitude?: number; longtitude?: number },
    label: string,
    key: string | number,
    locationObj: any
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
                  onClick={() => window.location.assign(`/locations/${locationObj._id}`)}
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

  if (compact) {
    return (
      <div className="h-full w-full">
        <MapContainer
          center={mapCenter}
          zoom={6}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%" }}
          ref={handleMapCreated}
        >
          {/* Grey map tiles similar to Google Analytics */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            className="grayscale"
          />

          {validLocations.map((location) => {
            const locationName = location.name || location.locationName || "Unknown Location";
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
            center={mapCenter}
            zoom={6}
            scrollWheelZoom={true}
              style={{ height: "24rem", width: "100%" }}
              ref={handleMapCreated}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              className="grayscale"
            />
              {validLocations.map((location) => {
                const locationName = location.name || location.locationName || "Unknown Location";
                return renderMarker(
                  location.geoCoords.latitude,
                  location.geoCoords,
                  locationName,
                  location._id,
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
      </CardContent>
    </Card>
  );
}
