import axios from 'axios';
import { useState } from 'react';
import { toast } from 'sonner';

/**
 * Hook for managing SMIB restart operations
 */
export function useSmibRestart() {
  // ============================================================================
  // State & Hooks
  // ============================================================================
  const [isRestarting, setIsRestarting] = useState(false);

  // ============================================================================
  // Handlers
  // ============================================================================

  /**
   * Restart a single SMIB device
   */
  const restartSmib = async (relayId: string): Promise<boolean> => {
    console.log('🔄 [SMIB RESTART] Restarting SMIB:', relayId);
    setIsRestarting(true);
    try {
      console.log('🔄 [SMIB RESTART] Sending POST to /api/smib/restart');
      const response = await axios.post('/api/smib/restart', { relayId });
      console.log('🔄 [SMIB RESTART] Response:', response.data);

      if (response.data.success) {
        console.log('✅ [SMIB RESTART] Success!');
        toast.success('Restart command sent successfully');
        return true;
      } else {
        console.error('❌ [SMIB RESTART] Failed:', response.data.error);
        toast.error(response.data.error || 'Failed to send restart command');
        return false;
      }
    } catch (error) {
      console.error('❌ [SMIB RESTART] Error restarting SMIB:', error);
      toast.error('Failed to restart SMIB');
      return false;
    } finally {
      setIsRestarting(false);
    }
  };

  /**
   * Restart all SMIBs at a location
   */
  const restartLocationSmibs = async (
    locationId: string
  ): Promise<{ successful: number; failed: number } | null> => {
    setIsRestarting(true);
    try {
      const response = await axios.post(
        `/api/locations/${locationId}/smib-restart`
      );

      if (response.data.success || response.data.results) {
        const { successful, failed } = response.data.results;
        toast.success(
          `Restart commands sent: ${successful} successful${failed > 0 ? `, ${failed} failed` : ''}`
        );
        return { successful, failed };
      } else {
        toast.error(response.data.error || 'Failed to send restart commands');
        return null;
      }
    } catch (error) {
      console.error('Error restarting location SMIBs:', error);
      toast.error('Failed to restart location SMIBs');
      return null;
    } finally {
      setIsRestarting(false);
    }
  };

  // ============================================================================
  // Return
  // ============================================================================
  return {
    isRestarting,
    restartSmib,
    restartLocationSmibs,
  };
}
