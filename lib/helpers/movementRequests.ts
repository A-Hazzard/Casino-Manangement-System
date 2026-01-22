/**
 * Movement Requests Helper Functions
 *
 * Provides helper functions for managing movement requests, including CRUD operations,
 * filtering, and pagination. Movement requests track the movement of cabinets/machines
 * between locations.
 *
 * Features:
 * - Fetches all movement requests with optional licensee filtering.
 * - Creates, updates, and deletes movement requests.
 * - Filters movement requests by search term and location.
 * - Paginates movement requests for display.
 */

import type { MovementRequest } from '@/lib/types/movement';
import axios from 'axios';

// ============================================================================
// Movement Request API Operations
// ============================================================================

/**
 * Fetch all movement requests from the API.
 * @param licensee - (Optional) Licensee filter for movement requests.
 * @returns Promise<MovementRequest[]>
 */
export async function fetchMovementRequests(
  licensee?: string
): Promise<MovementRequest[]> {
  const params: Record<string, string> = {};
  if (licensee && licensee !== 'all') {
    params.licensee = licensee;
  }

  const res = await axios.get('/api/movement-requests', { params });
  return res.data;
}

/**
 * Create a new movement request via the API.
 * @param data MovementRequest (without _id)
 * @returns Promise<MovementRequest>
 */
export async function createMovementRequest(
  data: Omit<MovementRequest, '_id' | 'createdAt' | 'updatedAt'>
): Promise<MovementRequest> {
  const res = await axios.post('/api/movement-requests', data);
  return res.data;
}

/**
 * Update a movement request by ID via the API.
 * @param data MovementRequest (must include _id)
 * @returns Promise<MovementRequest>
 */
export async function updateMovementRequest(
  data: MovementRequest
): Promise<MovementRequest> {
  const res = await axios.patch(`/api/movement-requests/${data._id}`, data);
  return res.data;
}

/**
 * Delete a movement request by ID via the API.
 * @param id MovementRequest _id
 * @returns Promise<void>
 */
export async function deleteMovementRequest(id: string): Promise<void> {
  await axios.delete(`/api/movement-requests/${id}`);
}

