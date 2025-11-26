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
import { create } from 'zustand';
import type { CollectionDocument } from '@/lib/types/collections';
import type { CollectionReportMachineSummary } from '@/lib/types/api';

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
