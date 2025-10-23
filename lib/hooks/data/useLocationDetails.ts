/**
 * Custom hook for managing location details data fetching and state
 * Handles loading, error states, and data management for location details page
 */

import { useState, useCallback, useEffect } from "react";
import {
  fetchLocationDetails,
  fetchCabinets,
  fetchAllGamingLocations,
} from "@/lib/helpers/locations";
import { toast } from "sonner";
import type { LocationInfo } from "@/lib/types/pages";
import type { GamingMachine as Cabinet } from "@/shared/types/entities";
import type { DateRange } from "react-day-picker";

type UseLocationDetailsProps = {
  locationSlug: string;
  selectedLicencee: string;
  activeMetricsFilter: string;
  customDateRange?: DateRange;
};

type UseLocationDetailsReturn = {
  locationInfo: LocationInfo | null;
  cabinets: Cabinet[];
  allLocations: { _id: string; name: string }[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  loadLocationDetails: () => Promise<void>;
  loadCabinets: () => Promise<void>;
  refreshLocationDetails: () => Promise<void>;
  setError: (error: string | null) => void;
  setPagination: (pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  }) => void;
};

export const useLocationDetails = ({
  locationSlug,
  selectedLicencee,
  activeMetricsFilter,
  customDateRange,
}: UseLocationDetailsProps): UseLocationDetailsReturn => {
  // State management
  const [locationInfo, setLocationInfo] = useState<LocationInfo | null>(null);
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [allLocations, setAllLocations] = useState<
    { _id: string; name: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // Load location details with proper error handling and logging
  const loadLocationDetails = useCallback(async () => {
    try {
      console.warn("Loading location details for slug:", locationSlug);
      console.warn("Loading with filters:", {
        selectedLicencee,
        activeMetricsFilter,
        customDateRange: customDateRange
          ? {
              from: customDateRange.from?.toISOString(),
              to: customDateRange.to?.toISOString(),
            }
          : undefined,
      });

      setLoading(true);
      setError(null);

      const locationData = await fetchLocationDetails(
        locationSlug,
        selectedLicencee
      );

      if (!locationData) {
        console.error("No location data received for slug:", locationSlug);
        setError("Location not found");
        return;
      }

      console.warn("Successfully loaded location details:", {
        locationId: locationData._id,
        locationName: locationData.name,
        totalCabinets: locationData.cabinets?.length || 0,
      });

      setLocationInfo(locationData);
    } catch (error) {
      console.error("Error loading location details:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load location details"
      );
    } finally {
      setLoading(false);
    }
  }, [locationSlug, selectedLicencee, activeMetricsFilter, customDateRange]);

  // Load cabinets for the location
  const loadCabinets = useCallback(async () => {
    try {
      console.warn("Loading cabinets for location:", locationSlug);

      const cabinetsData = await fetchCabinets(locationSlug, selectedLicencee);

      if (!Array.isArray(cabinetsData)) {
        console.error("Cabinets data is not an array:", cabinetsData);
        setCabinets([]);
        return;
      }

      console.warn("Successfully loaded cabinets:", cabinetsData.length);
      setCabinets(cabinetsData);

      // Update pagination
      setPagination((prev) => ({
        ...prev,
        totalCount: cabinetsData.length,
        totalPages: Math.ceil(cabinetsData.length / prev.limit),
        hasNextPage: prev.page < Math.ceil(cabinetsData.length / prev.limit),
        hasPrevPage: prev.page > 1,
      }));
    } catch (error) {
      console.error("Error loading cabinets:", error);
      setCabinets([]);
    }
  }, [locationSlug, selectedLicencee]);

  // Load all locations for navigation
  const loadAllLocations = useCallback(async () => {
    try {
      console.warn("Loading all locations for navigation");
      const locationsData = await fetchAllGamingLocations();

      if (Array.isArray(locationsData)) {
        // Map the data to match the expected type structure
        const mappedLocations = locationsData.map(
          (location: { id: string; name: string }) => ({
            _id: location.id,
            name: location.name,
          })
        );
        setAllLocations(mappedLocations);
        console.warn("Successfully loaded locations:", locationsData.length);
      } else {
        console.error("Locations data is not an array:", locationsData);
        setAllLocations([]);
      }
    } catch (error) {
      console.error("Error loading locations:", error);
      setAllLocations([]);
    }
  }, []);

  // Refresh location details
  const refreshLocationDetails = useCallback(async () => {
    console.warn("Refreshing location details for slug:", locationSlug);
    await Promise.all([
      loadLocationDetails(),
      loadCabinets(),
      loadAllLocations(),
    ]);
    toast.success("Location details refreshed successfully");
  }, [loadLocationDetails, loadCabinets, loadAllLocations, locationSlug]);

  // Effect hooks for data loading
  useEffect(() => {
    if (locationSlug) {
      loadLocationDetails();
      loadCabinets();
      loadAllLocations();
    }
  }, [locationSlug, loadLocationDetails, loadCabinets, loadAllLocations]);

  return {
    // Data states
    locationInfo,
    cabinets,
    allLocations,

    // Loading states
    loading,
    error,

    // Pagination
    pagination,

    // Actions
    loadLocationDetails,
    loadCabinets,
    refreshLocationDetails,
    setError,
    setPagination,
  };
};
