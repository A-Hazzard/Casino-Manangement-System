import { create } from "zustand";
import type { CollectionDocument } from "@/lib/types/collections";
import type { CollectionReportMachineSummary } from "@/lib/types/api";

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
    financials: Partial<CollectionModalState["financials"]>
  ) => void;
  resetState: () => void;
};

const initialFinancials = {
  taxes: "0",
  advance: "0",
  variance: "0",
  varianceReason: "",
  amountToCollect: "0",
  collectedAmount: "",
  balanceCorrection: "0",
  balanceCorrectionReason: "",
  previousBalance: "0",
  reasonForShortagePayment: "",
};

export const useCollectionModalStore = create<CollectionModalState>((set) => ({
  // Initial state
  selectedLocationId: undefined,
  selectedLocationName: "",
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

  setLockedLocation: (locationId) => set({ lockedLocationId: locationId }),

  setAvailableMachines: (machines) => set({ availableMachines: machines }),

  setCollectedMachines: (machines) => set({ collectedMachines: machines }),

  addCollectedMachine: (machine) =>
    set((state) => ({
      collectedMachines: [...state.collectedMachines, machine],
    })),

  removeCollectedMachine: (machineId) =>
    set((state) => ({
      collectedMachines: state.collectedMachines.filter(
        (m) => m._id !== machineId
      ),
    })),

  updateCollectedMachine: (machineId, updates) =>
    set((state) => ({
      collectedMachines: state.collectedMachines.map((m) =>
        m._id === machineId ? { ...m, ...updates } : m
      ),
    })),

  setSelectedMachineId: (machineId) => set({ selectedMachineId: machineId }),

  setSelectedMachineData: (machineData) =>
    set({ selectedMachineData: machineData }),

  setCollectionTime: (time) => set({ collectionTime: time }),

  setFinancials: (financials) =>
    set((state) => ({
      financials: { ...state.financials, ...financials },
    })),

  resetState: () =>
    set({
      selectedLocationId: undefined,
      selectedLocationName: "",
      lockedLocationId: undefined,
      availableMachines: [],
      collectedMachines: [],
      selectedMachineId: undefined,
      selectedMachineData: null,
      collectionTime: new Date(),
      financials: initialFinancials,
    }),
}));
