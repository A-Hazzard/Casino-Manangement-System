import { create } from "zustand";
import {
  ReportConfig,
  ReportData,
  ReportStep,
  ReportType,
} from "@/lib/types/reports";
import { CasinoLocation, GamingMachine } from "@/lib/types/reports";

type ReportStore = {
  // Step Management
  currentStep: ReportStep;
  setStep: (step: ReportStep) => void;

  // Report Configuration
  reportType: ReportType | null;
  setReportType: (type: ReportType | null) => void;

  reportConfig: Partial<ReportConfig>;
  updateReportConfig: (updates: Partial<ReportConfig>) => void;
  resetReportConfig: () => void;

  // Available Items for Filtering/Selection
  availableLocations: CasinoLocation[];
  setAvailableLocations: (locations: CasinoLocation[]) => void;
  availableMachines: GamingMachine[];
  setAvailableMachines: (machines: GamingMachine[]) => void;

  // Generated Report
  reportData: ReportData | null;
  setReportData: (data: ReportData | null) => void;

  isGenerating: boolean;
  setIsGenerating: (isGenerating: boolean) => void;

  error: string | null;
  setError: (error: string | null) => void;
};

const initialState = {
  currentStep: "selectType" as ReportStep,
  reportType: null,
  reportConfig: {},
  reportData: null,
  isGenerating: false,
  error: null,
  availableLocations: [],
  availableMachines: [],
};

export const useReportStore = create<ReportStore>((set) => ({
  ...initialState,

  // Step Management
  setStep: (step) => set({ currentStep: step }),

  // Report Configuration
  setReportType: (type) =>
    set({
      reportType: type,
      currentStep: "configure",
      reportConfig: {},
      reportData: null,
    }),
  updateReportConfig: (updates) =>
    set((state) => ({
      reportConfig: { ...state.reportConfig, ...updates },
    })),
  resetReportConfig: () => set({ ...initialState }),

  // Available Items
  setAvailableLocations: (locations) => set({ availableLocations: locations }),
  setAvailableMachines: (machines) => set({ availableMachines: machines }),

  // Generated Report
  setReportData: (data) => set({ reportData: data }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setError: (error) => set({ error }),
}));
