import axios from 'axios';
import { useState } from 'react';
import { toast } from 'sonner';

type Firmware = {
  _id: string;
  product: string;
  version: string;
  versionDetails?: string;
  url: string;
  createdAt: string;
};

/**
 * Hook for managing SMIB OTA firmware updates
 */
export function useSmibOTA(onUpdateComplete?: () => void) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [firmwares, setFirmwares] = useState<Firmware[]>([]);
  const [isLoadingFirmwares, setIsLoadingFirmwares] = useState(false);

  /**
   * Fetch available firmware versions
   */
  const fetchFirmwares = async (): Promise<void> => {
    setIsLoadingFirmwares(true);
    try {
      const response = await axios.get('/api/firmwares');
      setFirmwares(response.data);
    } catch (error) {
      console.error('Error fetching firmwares:', error);
      toast.error('Failed to load firmware list');
    } finally {
      setIsLoadingFirmwares(false);
    }
  };

  /**
   * Trigger OTA update for a single SMIB
   */
  const updateSmib = async (
    relayId: string,
    firmwareId: string,
    firmwareVersion: string
  ): Promise<boolean> => {
    setIsUpdating(true);
    try {
      console.log(
        `🚀 [OTA] Initiating update for ${relayId} to version ${firmwareVersion}`
      );

      const response = await axios.post('/api/smib/ota-update', {
        relayId,
        firmwareId,
      });

      if (response.data.success) {
        toast.success(
          `OTA update initiated for version ${firmwareVersion}. This process may take several minutes. Check back later.`,
          { duration: 6000 }
        );
        console.log(`✅ [OTA] Update initiated successfully`);

        // Call refresh callback to update parent data
        if (onUpdateComplete) {
          console.log(`🔄 [OTA] Calling refresh callback`);
          onUpdateComplete();
        }

        return true;
      } else {
        toast.error(response.data.error || 'Failed to initiate OTA update');
        console.error(`❌ [OTA] Update failed:`, response.data.error);
        return false;
      }
    } catch (error) {
      console.error('❌ [OTA] Error initiating update:', error);
      toast.error('Failed to initiate OTA update');
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Trigger OTA update for all SMIBs at a location
   */
  const updateLocationSmibs = async (
    locationId: string,
    firmwareVersion: string
  ): Promise<{ successful: number; failed: number } | null> => {
    setIsUpdating(true);
    try {
      const response = await axios.post(
        `/api/locations/${locationId}/smib-ota`,
        {
          firmwareVersion,
        }
      );

      if (response.data.success || response.data.results) {
        const { successful, failed } = response.data.results;
        toast.success(
          `OTA updates initiated: ${successful} successful${failed > 0 ? `, ${failed} failed` : ''}`
        );
        return { successful, failed };
      } else {
        toast.error(response.data.error || 'Failed to initiate OTA updates');
        return null;
      }
    } catch (error) {
      console.error('Error initiating location OTA updates:', error);
      toast.error('Failed to initiate location OTA updates');
      return null;
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    isUpdating,
    firmwares,
    isLoadingFirmwares,
    fetchFirmwares,
    updateSmib,
    updateLocationSmibs,
  };
}
