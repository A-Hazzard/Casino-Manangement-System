import { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

/**
 * Hook for managing SMIB meter operations
 */
export function useSmibMeters() {
  const [isRequestingMeters, setIsRequestingMeters] = useState(false);
  const [isResettingMeters, setIsResettingMeters] = useState(false);

  /**
   * Request meter data from a single SMIB
   */
  const requestMeters = async (relayId: string): Promise<boolean> => {
    setIsRequestingMeters(true);
    try {
      const response = await axios.post('/api/smib/meters', { relayId });

      if (response.data.success) {
        toast.success('Meter request sent successfully');
        return true;
      } else {
        toast.error(response.data.error || 'Failed to request meters');
        return false;
      }
    } catch (error) {
      console.error('Error requesting meters:', error);
      toast.error('Failed to request meter data');
      return false;
    } finally {
      setIsRequestingMeters(false);
    }
  };

  /**
   * Request meters from all SMIBs at a location
   */
  const requestLocationMeters = async (
    locationId: string
  ): Promise<{ successful: number; failed: number } | null> => {
    setIsRequestingMeters(true);
    try {
      const response = await axios.post(
        `/api/locations/${locationId}/smib-meters`
      );

      if (response.data.success || response.data.results) {
        const { successful, failed } = response.data.results;
        toast.success(
          `Meter requests sent: ${successful} successful${failed > 0 ? `, ${failed} failed` : ''}`
        );
        return { successful, failed };
      } else {
        toast.error(response.data.error || 'Failed to request meters');
        return null;
      }
    } catch (error) {
      console.error('Error requesting location meters:', error);
      toast.error('Failed to request location meters');
      return null;
    } finally {
      setIsRequestingMeters(false);
    }
  };

  /**
   * Reset meters on a non-SAS SMIB
   */
  const resetMeters = async (relayId: string): Promise<boolean> => {
    setIsResettingMeters(true);
    try {
      const response = await axios.post('/api/smib/reset-meters', { relayId });

      if (response.data.success) {
        toast.success('Meters reset successfully');
        return true;
      } else {
        toast.error(response.data.error || 'Failed to reset meters');
        return false;
      }
    } catch (error) {
      console.error('Error resetting meters:', error);
      const errorMessage =
        axios.isAxiosError(error) && error.response?.data?.error
          ? error.response.data.error
          : 'Failed to reset meters';
      toast.error(errorMessage);
      return false;
    } finally {
      setIsResettingMeters(false);
    }
  };

  return {
    isRequestingMeters,
    isResettingMeters,
    requestMeters,
    requestLocationMeters,
    resetMeters,
  };
}

