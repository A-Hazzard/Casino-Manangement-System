/**
 * Collection Report UI Store
 *
 * Persists collection report page filter preferences across client-side navigation.
 */
import type {
  CollectionReportLocationFilter,
  CollectionReportUIStore,
} from '@/lib/types/store';
import { areCollectionReportLocationFiltersEqual } from '@/lib/helpers/collectionReport/locationFilter';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const DEFAULT_SELECTED_LOCATION: CollectionReportLocationFilter = 'all';

const createStore = () => {
  return create<CollectionReportUIStore>()(
    persist(
      set => ({
        selectedLocation: DEFAULT_SELECTED_LOCATION,
        setSelectedLocation: selectedLocation =>
          set(state => {
            if (
              areCollectionReportLocationFiltersEqual(
                state.selectedLocation,
                selectedLocation
              )
            ) {
              return state;
            }

            return { selectedLocation };
          }),
        resetSelectedLocation: () =>
          set(state => {
            if (
              areCollectionReportLocationFiltersEqual(
                state.selectedLocation,
                DEFAULT_SELECTED_LOCATION
              )
            ) {
              return state;
            }

            return { selectedLocation: DEFAULT_SELECTED_LOCATION };
          }),
      }),
      {
        name: 'collection-report-ui-store',
        partialize: state => ({
          selectedLocation: state.selectedLocation,
        }),
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
        merge: (persistedState: unknown, currentState: unknown) => {
          const persisted = (persistedState || {}) as Partial<CollectionReportUIStore>;
          const current = (currentState || {}) as CollectionReportUIStore;
          const selectedLocation =
            persisted.selectedLocation ?? current.selectedLocation;
          return {
            ...current,
            selectedLocation:
              selectedLocation === undefined || selectedLocation === null
                ? DEFAULT_SELECTED_LOCATION
                : selectedLocation,
          };
        },
      }
    )
  );
};

const dummyState: CollectionReportUIStore = {
  selectedLocation: DEFAULT_SELECTED_LOCATION,
  setSelectedLocation: () => {},
  resetSelectedLocation: () => {},
};

let storeInstance: ReturnType<typeof createStore> | null = null;

const getClientStore = () => {
  if (!storeInstance) {
    storeInstance = createStore();
  }
  return storeInstance;
};

export const useCollectionReportUIStore =
  typeof window !== 'undefined' ? getClientStore() : create(() => dummyState);
