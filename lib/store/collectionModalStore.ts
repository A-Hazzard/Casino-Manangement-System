/**
 * Collection Modal Store
 * Zustand store for managing collection report modal state and data.
 *
 * Features:
 * - Tracks selected location, machines, and collection time
 * - Manages financial data (taxes, advance, variance, corrections)
 * - Handles available and collected machines for the report
 * - Provides actions to add, remove, and update collected machines
 * - SSR-safe with dummy state for server rendering
 *
 * @returns Zustand hook for accessing and updating collection modal state.
 */
import type { CollectionReportMachineSummary } from '@/lib/types/api';
import type { CollectionDocument } from '@/lib/types/collection';
import { create } from 'zustand';

// ============================================================================
// Types
// ============================================================================

type CollectionModalState = {
  // Location state
  selectedLocationId: string | undefined;
  selectedLocationName: string;
  lockedLocationId: string | undefined;

  // Machines data
  availableMachines: CollectionReportMachineSummary[];
  collectedMachines: CollectionDocument[];

  // Selected machine
  selectedMachineId: string | undefined;
  selectedMachineData: CollectionReportMachineSummary | null;

  // Collection time (shared across all machines in the report)
  collectionTime: Date;

  // Financial data (only for the first machine/report)
  financials: {
    taxes: string;
    advance: string;
    variance: string;
    varianceReason: string;
    amountToCollect: string;
    collectedAmount: string;
    balanceCorrection: string;
    balanceCorrectionReason: string;
    previousBalance: string;
    reasonForShortagePayment: string;
  };

  // Form data for machine entry
  formData: {
    metersIn: string;
    metersOut: string;
    ramClear: boolean;
    ramClearMetersIn: string;
    ramClearMetersOut: string;
    notes: string;
    collectionTime: Date;
    sasStartTime: Date | null;
    sasEndTime: Date | null;
    showAdvancedSas: boolean;
  };

  // Actions
  setSelectedLocation: (
    locationId: string | undefined,
    locationName: string
  ) => void;
  setLockedLocation: (locationId: string | undefined) => void;
  setAvailableMachines: (machines: CollectionReportMachineSummary[]) => void;
  setCollectedMachines: (machines: CollectionDocument[]) => void;
  addCollectedMachine: (machine: CollectionDocument) => void;
  removeCollectedMachine: (machineId: string) => void;
  updateCollectedMachine: (
    machineId: string,
    updates: Partial<CollectionDocument>
  ) => void;
  setSelectedMachineId: (machineId: string | undefined) => void;
  setSelectedMachineData: (
    machineData: CollectionReportMachineSummary | null
  ) => void;
  setCollectionTime: (time: Date) => void;
  setFinancials: (
    financials: Partial<CollectionModalState['financials']>
  ) => void;
  setFormData: (
    formData: Partial<CollectionModalState['formData']>
  ) => void;
  calculateCarryover: (
    collectedAmount: string,
    baseBalanceCorrection: string
  ) => void;
  resetState: () => void;
};

// ============================================================================
// Constants
// ============================================================================

const initialFinancials = {
  taxes: '0',
  advance: '0',
  variance: '0',
  varianceReason: '',
  amountToCollect: '0',
  collectedAmount: '',
  balanceCorrection: '0',
  balanceCorrectionReason: '',
  previousBalance: '0',
  reasonForShortagePayment: '',
};

const initialFormData = {
  metersIn: '',
  metersOut: '',
  ramClear: false,
  ramClearMetersIn: '',
  ramClearMetersOut: '',
  notes: '',
  collectionTime: new Date(),
  sasStartTime: null,
  sasEndTime: null,
  showAdvancedSas: false,
};

// ============================================================================
// Store Creation
// ============================================================================

// Define a no-op version for SSR
const dummyState: CollectionModalState = {
  selectedLocationId: undefined,
  selectedLocationName: '',
  lockedLocationId: undefined,
  availableMachines: [],
  collectedMachines: [],
  selectedMachineId: undefined,
  selectedMachineData: null,
  collectionTime: new Date(),
  financials: initialFinancials,
  formData: initialFormData,
  setSelectedLocation: () => {},
  setLockedLocation: () => {},
  setAvailableMachines: () => {},
  setCollectedMachines: () => {},
  addCollectedMachine: () => {},
  removeCollectedMachine: () => {},
  updateCollectedMachine: () => {},
  setSelectedMachineId: () => {},
  setSelectedMachineData: () => {},
  setCollectionTime: () => {},
  setFinancials: () => {},
  setFormData: () => {},
  calculateCarryover: () => {},
  resetState: () => {},
};

const createStore = () => {
  return create<CollectionModalState>(set => ({
  // Initial state
  selectedLocationId: undefined,
  selectedLocationName: '',
  lockedLocationId: undefined,
  availableMachines: [],
  collectedMachines: [],
  selectedMachineId: undefined,
  selectedMachineData: null,
  collectionTime: new Date(),
  financials: initialFinancials,
  formData: initialFormData,

  // Actions
  setSelectedLocation: (locationId, locationName) =>
    set({ selectedLocationId: locationId, selectedLocationName: locationName }),

  setLockedLocation: locationId => set({ lockedLocationId: locationId }),

  setAvailableMachines: machines => set({ availableMachines: machines }),

  setCollectedMachines: machines => set({ collectedMachines: machines }),

  addCollectedMachine: machine =>
    set(state => ({
      collectedMachines: [...state.collectedMachines, machine],
    })),

  removeCollectedMachine: machineId =>
    set(state => ({
      collectedMachines: state.collectedMachines.filter(
        m => m._id !== machineId
      ),
    })),

  updateCollectedMachine: (machineId, updates) =>
    set(state => ({
      collectedMachines: state.collectedMachines.map(m =>
        m._id === machineId ? { ...m, ...updates } : m
      ),
    })),

  setSelectedMachineId: machineId => set({ selectedMachineId: machineId }),

  setSelectedMachineData: machineData =>
    set({ selectedMachineData: machineData }),

  setCollectionTime: time => set({ collectionTime: time }),

  setFinancials: financials =>
    set(state => ({
      financials: { ...state.financials, ...financials },
    })),

  setFormData: (formData) =>
    set(state => {
      const newFormData = { ...state.formData, ...formData };
      
      // If collectionTime is updated and we are NOT in advanced mode,
      // sync sasEndTime to match collectionTime.
      if (formData.collectionTime && !newFormData.showAdvancedSas) {
        newFormData.sasEndTime = formData.collectionTime;
      }
      
      // If toggling advanced mode OFF, sync sasEndTime to collectionTime
      if (formData.showAdvancedSas === false) {
        newFormData.sasEndTime = newFormData.collectionTime;
        newFormData.sasStartTime = null; // Clear manual start time override
      }

      return {
        formData: newFormData,
      };
    }),

  calculateCarryover: (collectedAmount: string, baseBalanceCorrection: string) => {
    set(state => {
      const amountCollected = Number(collectedAmount) || 0;
      const amountToCollect = Number(state.financials.amountToCollect) || 0;
      const baseCorrection = Number(baseBalanceCorrection) || 0;

      let previousBalance = state.financials.previousBalance;
      let finalCorrection = state.financials.balanceCorrection;

      if (collectedAmount !== '' && amountCollected >= 0) {
        // Carryover = Collected - Target
        const carryover = amountCollected - amountToCollect;
        previousBalance = carryover.toFixed(2);
        
        // Final Balance Correction = Base + Carryover
        finalCorrection = (baseCorrection + carryover).toFixed(2);
      } else {
        // If cleared, reset to base
        finalCorrection = baseCorrection.toFixed(2);
      }

      return {
        financials: {
          ...state.financials,
          collectedAmount,
          previousBalance,
          balanceCorrection: finalCorrection,
        },
      };
    });
  },
  resetState: () =>
    set({
      selectedLocationId: undefined,
      selectedLocationName: '',
      lockedLocationId: undefined,
      availableMachines: [],
      collectedMachines: [],
      selectedMachineId: undefined,
      selectedMachineData: null,
      collectionTime: new Date(),
      financials: initialFinancials,
      formData: initialFormData,
    }),
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
export const useCollectionModalStore =
  typeof window !== 'undefined' ? getClientStore() : create(() => dummyState);

