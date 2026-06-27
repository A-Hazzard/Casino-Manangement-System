/**
 * Licencee Management Helpers
 *
 * Handles licencee CRUD operations for the administration page including
 * loading, creating, updating, deleting, and toggling payment status.
 *
 * Features:
 * - loadLicencees: Fetches all licencees from the API
 * - createNewLicencee: Creates a new licencee
 * - updateExistingLicencee: Updates an existing licencee
 * - deleteExistingLicencee: Deletes a licencee
 * - togglePaymentStatus: Toggles payment/expiry status
 */

import { fetchLicencees } from '@/lib/helpers/client';
import type { Licencee } from '@/lib/types/common';
import type { AddLicenceeForm } from '@/lib/types/pages';
import { getNext30Days } from '@/lib/utils/licencee';
import axios from 'axios';
import { toast } from 'sonner';

// ============================================================================
// Licencee Management Object
// ============================================================================

export const licenceeManagement = {
  /**
   * Loads all licencees from the API
   */
  loadLicencees: async (
    setAllLicencees: (licencees: Licencee[]) => void,
    setIsLicenceesLoading: (loading: boolean) => void
  ): Promise<void> => {
    setIsLicenceesLoading(true);
    try {
      const result = await fetchLicencees();
      const licenceesData = Array.isArray(result.licencees)
        ? result.licencees
        : [];
      setAllLicencees(licenceesData);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to fetch licencees:', error);
      }
      setAllLicencees([]);
      toast.error('Failed to load licencees');
    }
    setIsLicenceesLoading(false);
  },

  /**
   * Creates a new licencee
   */
  createNewLicencee: async (
    licenceeForm: AddLicenceeForm,
    setIsAddLicenceeModalOpen: (open: boolean) => void,
    setLicenceeForm: (form: AddLicenceeForm) => void,
    setCreatedLicencee: (
      licencee: { name: string; licenceKey: string } | null
    ) => void,
    setIsLicenceeSuccessModalOpen: (open: boolean) => void,
    refreshLicencees: () => Promise<void>
  ): Promise<void> => {
    if (!licenceeForm.name || !licenceeForm.country) {
      toast.error('Name and country are required');
      return;
    }

    try {
      const response = await fetch('/api/licencees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: licenceeForm.name,
          country: licenceeForm.country,
          startDate: licenceeForm.startDate,
          expiryDate: licenceeForm.expiryDate,
        }),
      });

      const result = await response.json();

      if (result.licencee && result.licencee.licenceKey) {
        setCreatedLicencee({
          name: result.licencee.name,
          licenceKey: result.licencee.licenceKey,
        });
        setIsLicenceeSuccessModalOpen(true);
      }

      setIsAddLicenceeModalOpen(false);
      setLicenceeForm({});
      await refreshLicencees();
      toast.success('Licencee created successfully');
    } catch (err) {
      const error = err as Error & {
        response?: { data?: { message?: string } };
      };
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to add licencee'
      );
    }
  },

  /**
   * Updates an existing licencee
   */
  updateExistingLicencee: async (
    selectedLicencee: Licencee,
    licenceeForm: AddLicenceeForm,
    setIsEditLicenceeModalOpen: (open: boolean) => void,
    setSelectedLicencee: (licencee: Licencee | null) => void,
    setLicenceeForm: (form: AddLicenceeForm) => void,
    refreshLicencees: () => Promise<void>
  ): Promise<void> => {
    try {
      const updateData = {
        ...licenceeForm,
        _id: selectedLicencee._id,
        isPaid: selectedLicencee.isPaid,
      };

      const response = await fetch(`/api/licencees/${selectedLicencee._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error('Failed to update licencee');
      }
      setIsEditLicenceeModalOpen(false);
      setSelectedLicencee(null);
      setLicenceeForm({});
      await refreshLicencees();
      toast.success('Licencee updated successfully');
    } catch (err) {
      const error = err as Error & {
        response?: { data?: { message?: string } };
      };
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to update licencee'
      );
    }
  },

  /**
   * Deletes a licencee
   */
  deleteExistingLicencee: async (
    selectedLicencee: Licencee,
    setIsDeleteLicenceeModalOpen: (open: boolean) => void,
    setSelectedLicencee: (licencee: Licencee | null) => void,
    refreshLicencees: () => Promise<void>
  ): Promise<void> => {
    try {
      const response = await fetch(`/api/licencees/${selectedLicencee._id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete licencee');
      }
      setIsDeleteLicenceeModalOpen(false);
      setSelectedLicencee(null);
      await refreshLicencees();
      toast.success('Licencee deleted successfully');
    } catch (err) {
      const error = err as Error & {
        response?: { data?: { message?: string } };
      };
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to delete licencee'
      );
    }
  },

  /**
   * Toggles payment status for a licencee
   */
  togglePaymentStatus: async (
    selectedLicenceeForPaymentChange: Licencee,
    refreshLicencees: () => Promise<void>
  ): Promise<void> => {
    try {
      const currentIsPaid =
        selectedLicenceeForPaymentChange.isPaid !== undefined
          ? selectedLicenceeForPaymentChange.isPaid
          : selectedLicenceeForPaymentChange.expiryDate
            ? new Date(selectedLicenceeForPaymentChange.expiryDate) > new Date()
            : false;

      const newIsPaid = !currentIsPaid;

      const updateData: {
        _id: string;
        isPaid: boolean;
        expiryDate?: Date;
        prevExpiryDate?: Date;
      } = {
        _id: selectedLicenceeForPaymentChange._id,
        isPaid: newIsPaid,
      };

      if (!currentIsPaid && newIsPaid) {
        updateData.prevExpiryDate = selectedLicenceeForPaymentChange.expiryDate
          ? new Date(selectedLicenceeForPaymentChange.expiryDate)
          : undefined;
        updateData.expiryDate = getNext30Days();
      }

      await axios.put('/api/licencees', updateData);

      await refreshLicencees();
      toast.success('Payment status updated successfully');
    } catch (err) {
      const error = err as Error & {
        response?: { data?: { message?: string } };
      };
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to update payment status'
      );
    }
  },
};
