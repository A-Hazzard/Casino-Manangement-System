/**
 * Cabinet UI Store
 * Zustand store for managing cabinet-specific UI state and preferences.
 *
 * Features:
 * - Tracks bill validator time period and date range per machine
 * - Persists UI state to localStorage for seamless experience
 * - Provides actions to manage bill validator filters per cabinet
 * - SSR-safe with dummy state for server rendering
 *
 * @returns Zustand hook for accessing and updating cabinet UI state.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ============================================================================
// Types
// ============================================================================

type TimePeriod = 'Today' | 'Yesterday' | '7d' | '30d' | 'All Time' | 'Custom';

type BillValidatorState = {
  timePeriod: TimePeriod;
  customDateRange?: {
    from: Date;
    to: Date;
  };
};

type CabinetUIState = {
  // Bill Validator state per machine
  billValidatorState: Record<string, BillValidatorState>;

  // Actions
  setBillValidatorTimePeriod: (
    machineId: string,
    timePeriod: TimePeriod
  ) => void;
  setBillValidatorDateRange: (
    machineId: string,
    dateRange: { from: Date; to: Date } | undefined
  ) => void;
  getBillValidatorState: (machineId: string) => BillValidatorState;
  resetBillValidatorState: (machineId: string) => void;
};

// ============================================================================
// Constants
// ============================================================================

const defaultBillValidatorState: BillValidatorState = {
  timePeriod: '7d',
  customDateRange: undefined,
};

// ============================================================================
// Store Creation
// ============================================================================

const createStore = () => {
  return create<CabinetUIState>()(
    persist(
      (set, get) => ({
        // Initial state
        billValidatorState: {},

        // Actions
        setBillValidatorTimePeriod: (machineId, timePeriod) =>
          set(state => ({
            billValidatorState: {
              ...state.billValidatorState,
              [machineId]: {
                ...(state.billValidatorState[machineId] ||
                  defaultBillValidatorState),
                timePeriod,
              },
            },
          })),

        setBillValidatorDateRange: (machineId, dateRange) =>
          set(state => ({
            billValidatorState: {
              ...state.billValidatorState,
              [machineId]: {
                ...(state.billValidatorState[machineId] ||
                  defaultBillValidatorState),
                customDateRange: dateRange,
              },
            },
          })),

        getBillValidatorState: machineId => {
          const state = get().billValidatorState[machineId];
          return state || defaultBillValidatorState;
        },

        resetBillValidatorState: machineId =>
          set(state => {
            const newState = { ...state.billValidatorState };
            delete newState[machineId];
            return { billValidatorState: newState };
          }),
      }),
      {
        name: 'cabinet-ui-store',
        storage: createJSONStorage(() => {
          if (typeof window !== 'undefined') {
            return localStorage;
          }
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }),
      }
    )
  );
};

// Define a no-op version for SSR
const dummyState: CabinetUIState = {
  billValidatorState: {},
  setBillValidatorTimePeriod: () => {},
  setBillValidatorDateRange: () => {},
  getBillValidatorState: () => defaultBillValidatorState,
  resetBillValidatorState: () => {},
};

// Use this store only on client side
export const useCabinetUIStore =
  typeof window !== 'undefined' ? createStore() : () => dummyState;
