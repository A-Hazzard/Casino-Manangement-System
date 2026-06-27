/**
 * Cabinet CRUD Operations Helpers
 *
 * Handles creating, updating, restoring, and permanently deleting cabinets.
 *
 * Features:
 * - Create a new cabinet
 * - Update an existing cabinet
 * - Restore a soft-deleted (archived) cabinet
 * - Permanently delete a cabinet
 */

import axios from 'axios';
import { getAuthHeaders } from '@/lib/utils/auth';
import type { GamingMachine } from '@/shared/types/entities';

type NewCabinetFormData = Partial<GamingMachine>;
type CabinetFormData = Partial<GamingMachine>;

// ============================================================================
// Cabinet CRUD Operations
// ============================================================================

/**
 * Create a new cabinet using provided form data.
 */
export const createCabinet = async (
  data: NewCabinetFormData | CabinetFormData
) => {
  try {
    const endpoint = '/api/cabinets';
    const response = await axios.post(endpoint, data);

    if (response.data && response.data.success) {
      return response.data.data;
    }

    throw new Error('Failed to create cabinet');
  } catch (error) {
    console.error('Error creating cabinet:', error);
    throw error;
  }
};

/**
 * Update an existing cabinet with provided form data.
 */
export const updateCabinet = async (data: CabinetFormData) => {
  try {
    const response = await axios.put(`/api/cabinets/${data._id}`, data);

    if (response.data && response.data.success) {
      return response.data.data;
    }

    throw new Error('Failed to update cabinet');
  } catch (error) {
    console.error(`Error updating cabinet with ID ${data._id}:`, error);
    throw error;
  }
};

// ============================================================================
// Cabinet Lifecycle (Restore & Delete)
// ============================================================================

/**
 * Restore a soft-deleted (archived) cabinet.
 */
export async function restoreCabinet(locationId: string, cabinetId: string) {
  try {
    const response = await axios.patch(
      `/api/cabinets/${cabinetId}`,
      { action: 'restore' },
      { headers: getAuthHeaders() }
    );

    if (response.data && response.data.success) {
      return response.data.data;
    }

    throw new Error(response.data?.error || 'Failed to restore cabinet');
  } catch (error) {
    console.error(`Error restoring cabinet ${cabinetId}:`, error);
    throw error;
  }
}

/**
 * Permanently delete a cabinet (hard delete).
 * Only accessible to admins and developers.
 */
export async function permanentlyDeleteCabinet(
  locationId: string,
  cabinetId: string
) {
  try {
    const response = await axios.delete(
      `/api/cabinets/${cabinetId}?hardDelete=true`,
      { headers: getAuthHeaders() }
    );

    if (response.data && response.data.success) {
      return response.data;
    }

    throw new Error(
      response.data?.error || 'Failed to permanently delete cabinet'
    );
  } catch (error) {
    console.error(`Error permanently deleting cabinet ${cabinetId}:`, error);
    throw error;
  }
}
