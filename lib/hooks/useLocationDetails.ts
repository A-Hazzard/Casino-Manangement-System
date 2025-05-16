import { useState, useCallback, useRef, useEffect } from "react";
import axios, { CancelTokenSource } from "axios";
import { toast } from "sonner";
import { LocationInfo } from "@/lib/types/location";
import { CabinetDetail } from "@/lib/types/cabinets";
import { TimePeriod } from "@/lib/types/api";

/**
 * Custom React hook to manage location details data fetching and state.
 *
 * @param locationId - The unique identifier for the location.
 * @returns Object containing location info, cabinets, loading states, error, search/filter management, and update functions.
 */
export default function useLocationDetails(locationId: string) {
  const [locationInfo, setLocationInfo] = useState<LocationInfo | null>(null);
  const [cabinets, setCabinets] = useState<CabinetDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMetricsLoading, setIsMetricsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredCabinets, setFilteredCabinets] = useState<CabinetDetail[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Add a ref to track if this is the initial render
  const initialRenderRef = useRef(true);
  const cancelTokenRef = useRef<CancelTokenSource | null>(null);

  // Create a reference to store the last metrics filter to prevent duplicate requests
  const lastMetricsFilterRef = useRef<TimePeriod | null>(null);
  const currentMetricsRequestRef = useRef<(() => void) | null>(null);

  const loadCabinets = useCallback(
    async (activeMetricsFilter: TimePeriod) => {
      setIsMetricsLoading(true);

      try {
        const timestamp = new Date().getTime();
        const url = `/api/locations/${locationId}/cabinets?timePeriod=${activeMetricsFilter}&cacheBust=${timestamp}`;

        const response = await axios.get(url, {
          cancelToken: cancelTokenRef.current?.token,
          timeout: 30000,
        });

        if (!response.data || !Array.isArray(response.data)) {
          throw new Error("Invalid cabinet data returned");
        }

        setCabinets(response.data as CabinetDetail[]);
        setFilteredCabinets(response.data as CabinetDetail[]);
      } catch (err) {
        if (!axios.isCancel(err)) {
          setError("Failed to load cabinets");
          toast.error("Failed to load cabinets");
        }
      } finally {
        setIsMetricsLoading(false);
      }
    },
    [locationId]
  );

  const fetchLocationDetails = useCallback(
    async (activeMetricsFilter: TimePeriod) => {
      // Don't fetch if already loading
      if (cancelTokenRef.current) {
        cancelTokenRef.current.cancel("Operation canceled due to new request.");
      }

      // Create a new cancel token
      cancelTokenRef.current = axios.CancelToken.source();
      setLoading(true);
      setError(null);

      try {
        const response = await axios.get(`/api/locations/${locationId}`, {
          cancelToken: cancelTokenRef.current.token,
        });

        if (response.data) {
          setLocationInfo({
            _id: locationId,
            name: response.data.name || response.data.locationName,
            address: response.data.address,
          });
        } else {
          throw new Error("No location data found");
        }

        await loadCabinets(activeMetricsFilter);
      } catch (err: unknown) {
        if (!axios.isCancel(err)) {
          setLocationInfo(null);
          setError(
            (err as Error).message || "Failed to fetch location details"
          );
          toast.error("Failed to fetch location details");
        }
      } finally {
        setLoading(false);
      }
    },
    [locationId, loadCabinets]
  );

  const updateMetricsData = useCallback(
    (activeMetricsFilter: TimePeriod) => {
      // Skip if filter hasn't actually changed
      if (lastMetricsFilterRef.current === activeMetricsFilter) {
        return;
      }

      // Update the last filter reference
      lastMetricsFilterRef.current = activeMetricsFilter;

      // Only update metrics when not loading and we have location info
      if (!loading && locationInfo) {
        // Cancel any previous request
        if (currentMetricsRequestRef.current) {
          currentMetricsRequestRef.current();
          currentMetricsRequestRef.current = null;
        }

        // Set the loading state
        setIsMetricsLoading(true);

        // Create a timeout to debounce rapid changes
        setTimeout(async () => {
          try {
            await loadCabinets(activeMetricsFilter);
          } finally {
            setIsMetricsLoading(false);
          }
        }, 500); // 500ms debounce
      }
    },
    [loadCabinets, loading, locationInfo]
  );

  const handleSearch = useCallback(
    (term: string) => {
      setSearchTerm(term);
      if (cabinets.length > 0) {
        const filtered = cabinets.filter((cabinet) =>
          cabinet.serialNumber?.toLowerCase().includes(term.toLowerCase())
        );
        setFilteredCabinets(filtered);
        setCurrentPage(1);
      }
    },
    [cabinets]
  );

  useEffect(() => {
    // Clean up function
    return () => {
      if (cancelTokenRef.current) {
        cancelTokenRef.current.cancel("Component unmounted");
      }

      if (currentMetricsRequestRef.current) {
        currentMetricsRequestRef.current();
      }
    };
  }, []);

  return {
    locationInfo,
    cabinets,
    filteredCabinets,
    loading,
    error,
    isMetricsLoading,
    searchTerm,
    currentPage,
    itemsPerPage,
    initialRenderRef,
    setSearchTerm: handleSearch,
    setFilteredCabinets,
    setCurrentPage,
    fetchLocationDetails,
    updateMetricsData,
    lastMetricsFilterRef,
  };
}
