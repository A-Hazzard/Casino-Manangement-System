import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type {
  ComparisonData,
  ComparisonOverviewSection,
  MachinePerformance,
  MachineDropData,
  TopPerformerData,
} from "@/lib/types/reports";

type ComparisonReportsState = {
  // Data state
  overviewData: ComparisonOverviewSection | null;
  machinePerformance: MachinePerformance[];
  machineDrop: MachineDropData[];
  topPerformers: TopPerformerData[];

  // UI state
  loading: boolean;
  error: string | null;
  selectedLocations: string[];
  dateRange: {
    start: Date;
    end: Date;
  };

  // Actions
  fetchData: () => Promise<void>;
  setDateRange: (start: Date, end: Date) => void;
  setLocations: (locationIds: string[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearData: () => void;
};

const initialState = {
  overviewData: null,
  machinePerformance: [],
  machineDrop: [],
  topPerformers: [],
  loading: false,
  error: null,
  selectedLocations: [],
  dateRange: {
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    end: new Date(),
  },
};

export const useComparisonReportsStore = create<ComparisonReportsState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      fetchData: async () => {
        const { selectedLocations, dateRange } = get();

        if (selectedLocations.length === 0) {
          set({
            error: "Please select at least one location first",
            loading: false,
          });
          return;
        }

        set({ loading: true, error: null });

        try {
          // Build query parameters
          const params = new URLSearchParams({
            locationIds: selectedLocations.join(","),
            startDate: dateRange.start.toISOString(),
            endDate: dateRange.end.toISOString(),
          });

          const response = await fetch(`/api/reports/comparison?${params}`, {
            headers: {
              "Content-Type": "application/json",
            },
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
              errorData.error || "Failed to fetch comparison data"
            );
          }

          const result = await response.json();

          if (!result.success || !result.data) {
            throw new Error("Invalid response format");
          }

          set({
            overviewData: result.data.overview,
            machinePerformance: result.data.machinePerformance,
            machineDrop: result.data.machineDrop,
            topPerformers: result.data.topPerformers,
            loading: false,
            error: null,
          });
        } catch (error) {
          set({
            error:
              error instanceof Error ? error.message : "Failed to fetch data",
            loading: false,
          });
        }
      },

      setDateRange: (start, end) => set({ dateRange: { start, end } }),
      setLocations: (locationIds) => set({ selectedLocations: locationIds }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      clearData: () =>
        set({
          overviewData: null,
          machinePerformance: [],
          machineDrop: [],
          topPerformers: [],
          error: null,
        }),
    }),
    {
      name: "comparison-reports-store",
    }
  )
);
