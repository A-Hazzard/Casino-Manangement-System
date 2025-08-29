import { create } from "zustand";
import axios from "axios";
import { LocationStore } from "@/lib/types/location";
import { createActivityLogger } from "@/lib/helpers/activityLogger";

// Define a no-op version for SSR
const dummyState: LocationStore = {
  isLocationModalOpen: false,
  openLocationModal: () => {},
  closeLocationModal: () => {},
  createLocation: async () => {},
};

// Make sure store is created only on client-side
const createStore = () => {
  return create<LocationStore>((set) => ({
    isLocationModalOpen: false,
    openLocationModal: () => set({ isLocationModalOpen: true }),
    closeLocationModal: () => set({ isLocationModalOpen: false }),
    createLocation: async (location) => {
      try {
        const locationLogger = createActivityLogger("location");
        
        const response = await axios.post("/api/locations", {
          name: location.name,
          address: {
            street: location.address,
          },
          geoCoords: {
            latitude: location.latitude,
            longitude: location.longitude,
          },
        });

        // Log the location creation activity
        await locationLogger.logCreate(
          response.data?.data?._id || location.name,
          location.name,
          {
            name: location.name,
            address: location.address,
            latitude: location.latitude,
            longitude: location.longitude,
          },
          `Created new location: ${location.name} at ${location.address}`
        );
      } catch (error) {
        console.error("Error creating location:", error);
        throw error;
      }
    },
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

/**
 * Zustand store for managing the state of the location modal.
 *
 * - Tracks modal open/close state.
 * - Provides actions to open and close the modal.
 * - Returns a dummy state for SSR.
 *
 * @returns Zustand hook for accessing and updating location modal state.
 */
// Use this store only on client side
export const useLocationStore =
  typeof window !== "undefined" ? getClientStore() : create(() => dummyState);
