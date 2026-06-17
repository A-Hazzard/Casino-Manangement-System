import axios from 'axios';
import { useState } from 'react';
import { toast } from 'sonner';

/**
 * Hook for sending the Update Meters command to a SMIB device
 */
export function useSmibUpdateMeters() {
  // ============================================================================
  // State & Hooks
  // ============================================================================
  const [isUpdatingMeters, setIsUpdatingMeters] = useState(false);

  // ============================================================================
  // Handlers
  // ============================================================================

  /**
   * Send the Update Meters command to a SMIB device
   */
  const updateMeters = async (relayId: string): Promise<boolean> => {
    setIsUpdatingMeters(true);
    try {
      const response = await axios.post('/api/smib/update-meters', { relayId });

      if (response.data.success) {
        toast.success('Update Meters command sent successfully');
        return true;
      } else {
        toast.error(
          response.data.error || 'Failed to send Update Meters command'
        );
        return false;
      }
    } catch (error) {
      console.error('[useSmibUpdateMeters] Error:', error instanceof Error ? error.message : 'Unknown error');
      toast.error('Failed to send Update Meters command');
      return false;
    } finally {
      setIsUpdatingMeters(false);
    }
  };

  // ============================================================================
  // Return
  // ============================================================================
  return {
    isUpdatingMeters,
    updateMeters,
  };
}
