/**
 * Report Store
 * Zustand store for managing report generation and configuration.
 *
 * Features:
 * - Tracks report generation steps and progress
 * - Manages report type selection and configuration
 * - Stores available locations and machines for filtering
 * - Handles report data and generation status
 * - Provides error handling for report generation
 * - SSR-safe with dummy state for server rendering
 *
 * @returns Zustand hook for accessing and updating report state.
 */
import { create } from 'zustand';
import {
  ReportConfig,
  ReportData,
  ReportStep,
  ReportType,
} from '@/lib/types/reports';
import { CasinoLocation, GamingMachine } from '@/lib/types/reports';

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// Constants
// ============================================================================

const initialState = {
  currentStep: {
    id: 'selectType',
    name: 'Select Report Type',
    status: 'pending' as const,
    progress: 0,
  } as ReportStep,
  reportType: null,
  reportConfig: {},
  reportData: null,
  isGenerating: false,
  error: null,
  availableLocations: [],
  availableMachines: [],
};

// ============================================================================
// Store Creation
// ============================================================================

// Define a no-op version for SSR
const dummyState: ReportStore = {
  ...initialState,
  setStep: () => {},
  setReportType: () => {},
  updateReportConfig: () => {},
  resetReportConfig: () => {},
  setAvailableLocations: () => {},
  setAvailableMachines: () => {},
  setReportData: () => {},
  setIsGenerating: () => {},
  setError: () => {},
};

const createStore = () => {
  return create<ReportStore>(set => ({
  ...initialState,

  // Step Management
  setStep: step => set({ currentStep: step }),

  // Report Configuration
  setReportType: type =>
    set({
      reportType: type,
      currentStep: {
        id: 'configure',
        name: 'Configure Report',
        status: 'pending' as const,
        progress: 25,
      },
      reportConfig: {},
      reportData: null,
    }),
  updateReportConfig: updates =>
    set(state => ({
      reportConfig: { ...state.reportConfig, ...updates },
    })),
  resetReportConfig: () => set({ ...initialState }),

  // Available Items
  setAvailableLocations: locations => set({ availableLocations: locations }),
  setAvailableMachines: machines => set({ availableMachines: machines }),

  // Generated Report
  setReportData: data => set({ reportData: data }),
  setIsGenerating: isGenerating => set({ isGenerating }),
  setError: error => set({ error }),
  }));
};

// Create the store conditionally
let storeInstance: ReturnType<typeof createStore> | null = null;

// Helper to ensure we use the same instance
const getClientStore = () => {
  if (!storeInstance) {
    storeInstance = createStore();
  }
  return storeInstance;
};

// Use this store only on client side
export const useReportStore =
  typeof window !== 'undefined' ? getClientStore() : create(() => dummyState);
