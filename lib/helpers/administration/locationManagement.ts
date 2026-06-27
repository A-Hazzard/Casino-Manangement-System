/**
 * Location Management Helpers
 *
 * Handles location loading for the administration page.
 *
 * Features:
 * - loadLocations: Fetches locations with optional filters
 */

import axios from 'axios';
import { toast } from 'sonner';

type LocationItem = {
  _id: string;
  name: string;
  licenceeId: string | null;
};

type LoadLocationsOptions = {
  showAll?: boolean;
  forceAll?: boolean;
};

// ============================================================================
// Location Management Object
// ============================================================================

export const locationManagement = {
  /**
   * Loads all locations for the administration user
   */
  loadLocations: async (
    options: LoadLocationsOptions = {}
  ): Promise<LocationItem[]> => {
    try {
      const { showAll = true, forceAll = true } = options;
      const response = await axios.get('/api/locations', {
        params: { showAll, forceAll },
      });

      const locationsList = response.data?.locations || [];

      return locationsList.map(
        (loc: {
          _id?: string;
          id?: string;
          name?: string;
          locationName?: string;
          licenceeId?: string;
        }): LocationItem => ({
          _id: loc._id?.toString() || loc.id?.toString() || '',
          name: loc.name || loc.locationName || 'Unknown Location',
          licenceeId: loc.licenceeId ? String(loc.licenceeId) : null,
        })
      );
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to fetch locations:', error);
      }
      toast.error('Failed to load locations');
      return [];
    }
  },
};
