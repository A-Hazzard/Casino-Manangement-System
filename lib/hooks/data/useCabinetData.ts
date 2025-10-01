/**
 * Custom hook for managing cabinet data fetching and state
 * Handles loading, filtering, and error states for cabinet operations
 */

import { useState, useCallback, useEffect } from "react";
import { fetchCabinets, fetchCabinetLocations } from "@/lib/helpers/cabinets";
import { filterCabinets as filterCabinetsHelper } from "@/lib/helpers/cabinetsPage";
import { calculateCabinetFinancialTotals } from "@/lib/utils/financial";
import type { GamingMachine as Cabinet } from "@/shared/types/entities";
type CustomDateRange = {
  startDate: Date;
  endDate: Date;
};

type UseCabinetDataProps = {
  selectedLicencee: string;
  activeMetricsFilter: string;
  customDateRange?: CustomDateRange;
  searchTerm: string;
  selectedLocation: string;
  selectedGameType: string;
};

type UseCabinetDataReturn = {
  // Data states
  allCabinets: Cabinet[];
  filteredCabinets: Cabinet[];
  locations: { _id: string; name: string }[];
  gameTypes: string[];
  financialTotals: ReturnType<typeof calculateCabinetFinancialTotals>;

  // Loading states
  initialLoading: boolean;
  loading: boolean;
  error: string | null;

  // Actions
  loadCabinets: () => Promise<void>;
  loadLocations: () => Promise<void>;
  filterCabinets: (
    cabinets: Cabinet[],
    searchTerm: string,
    selectedLocation: string,
    selectedGameType: string
  ) => void;
  setError: (error: string | null) => void;
};

export const useCabinetData = ({
  selectedLicencee,
  activeMetricsFilter,
  customDateRange,
  searchTerm,
  selectedLocation,
  selectedGameType,
}: UseCabinetDataProps): UseCabinetDataReturn => {
  // State management
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allCabinets, setAllCabinets] = useState<Cabinet[]>([]);
  const [filteredCabinets, setFilteredCabinets] = useState<Cabinet[]>([]);
  const [locations, setLocations] = useState<{ _id: string; name: string }[]>(
    []
  );
  const [gameTypes, setGameTypes] = useState<string[]>([]);

  // Calculate financial totals from cabinet data
  const financialTotals = calculateCabinetFinancialTotals(allCabinets);

  // Load locations for filter dropdown
  const loadLocations = useCallback(async () => {
    try {
      console.warn("Loading cabinet locations for licensee:", selectedLicencee);
      const locationsData = await fetchCabinetLocations(selectedLicencee);

      if (Array.isArray(locationsData)) {
        setLocations(locationsData);
        console.warn("Successfully loaded locations:", locationsData.length);
      } else {
        console.error("Locations data is not an array:", locationsData);
        setLocations([]);
      }
    } catch (error) {
      console.error("Failed to fetch locations:", error);
      setLocations([]);
    }
  }, [selectedLicencee]);

  // Filter cabinets based on search term, selected location, and game type
  const filterCabinets = useCallback(
    (
      cabinets: Cabinet[],
      search: string,
      location: string,
      gameType: string
    ) => {
      console.warn("Filtering cabinets:", {
        totalCabinets: cabinets.length,
        searchTerm: search,
        selectedLocation: location,
        selectedGameType: gameType,
      });

      let filtered = filterCabinetsHelper(cabinets, search, location);

      // Apply game type filter
      if (gameType && gameType !== "all") {
        filtered = filtered.filter((cabinet) => {
          const cabinetGame = cabinet.game || cabinet.installedGame;
          return cabinetGame === gameType;
        });
      }

      setFilteredCabinets(filtered);

      console.warn("Filtered cabinets result:", filtered.length);
    },
    []
  );

  // Load cabinets with proper error handling and logging
  const loadCabinets = useCallback(async () => {
    try {
      console.warn("Loading cabinets with filters:", {
        selectedLicencee,
        activeMetricsFilter,
        customDateRange: customDateRange
          ? {
              startDate: customDateRange.startDate?.toISOString(),
              endDate: customDateRange.endDate?.toISOString(),
            }
          : undefined,
      });

      setLoading(true);
      setError(null);

      const dateRangeForFetch =
        activeMetricsFilter === "Custom" &&
        customDateRange?.startDate &&
        customDateRange?.endDate
          ? {
              from: customDateRange.startDate,
              to: customDateRange.endDate,
            }
          : undefined;

      const cabinetsData = await fetchCabinets(
        selectedLicencee,
        activeMetricsFilter,
        dateRangeForFetch
      );

      if (!Array.isArray(cabinetsData)) {
        console.error("Cabinets data is not an array:", cabinetsData);
        setAllCabinets([]);
        setFilteredCabinets([]);
        setError("Invalid data format received from server");
      } else {
        console.warn("Successfully loaded cabinets:", cabinetsData.length);
        setAllCabinets(cabinetsData);

        // Extract unique game types from cabinets
        const uniqueGameTypes = Array.from(
          new Set(
            cabinetsData
              .map((cabinet) => cabinet.game || cabinet.installedGame)
              .filter((game) => game && game.trim() !== "")
          )
        ).sort();
        setGameTypes(uniqueGameTypes);

        filterCabinets(
          cabinetsData,
          searchTerm,
          selectedLocation,
          selectedGameType
        );
      }
    } catch (error) {
      console.error("Error fetching cabinet data:", error);
      setAllCabinets([]);
      setFilteredCabinets([]);
      setError(
        error instanceof Error ? error.message : "Failed to load cabinets"
      );
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [
    selectedLicencee,
    filterCabinets,
    searchTerm,
    selectedLocation,
    selectedGameType,
    activeMetricsFilter,
    customDateRange,
  ]);

  // Effect hooks for data loading
  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  useEffect(() => {
    loadCabinets();
  }, [loadCabinets]);

  useEffect(() => {
    filterCabinets(allCabinets, searchTerm, selectedLocation, selectedGameType);
  }, [
    searchTerm,
    selectedLocation,
    selectedGameType,
    allCabinets,
    filterCabinets,
  ]);

  return {
    // Data states
    allCabinets,
    filteredCabinets,
    locations,
    gameTypes,
    financialTotals,

    // Loading states
    initialLoading,
    loading,
    error,

    // Actions
    loadCabinets,
    loadLocations,
    filterCabinets,
    setError,
  };
};
