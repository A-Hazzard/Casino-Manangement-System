/**
 * Movement requests helper functions for filtering, pagination, and API operations
 */

import axios from 'axios';
import type { MovementRequest } from '@/lib/types/movementRequests';

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

/**
 * Filters movement requests based on search term and selected location
 * @param requests - Array of movement requests to filter
 * @param searchTerm - Search term to filter by
 * @param selectedLocation - Selected location filter
 * @param locations - Array of available locations for lookup
 * @returns Filtered array of movement requests
 */
export function filterMovementRequests(
  requests: MovementRequest[],
  searchTerm: string,
  selectedLocation: string,
  locations: { _id: string; name: string }[]
): MovementRequest[] {
  return requests.filter(req => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      req.createdBy.toLowerCase().includes(searchLower) ||
      req.locationFrom.toLowerCase().includes(searchLower) ||
      req.locationTo.toLowerCase().includes(searchLower) ||
      req.cabinetIn.toLowerCase().includes(searchLower) ||
      req.status.toLowerCase().includes(searchLower);

    const locationData = locations.find(l => l._id === selectedLocation);
    const matchesLocation =
      selectedLocation === 'all' ||
      req.locationFrom === locationData?.name ||
      req.locationTo === locationData?.name;

    return matchesSearch && matchesLocation;
  });
}

/**
 * Paginates movement requests
 * @param requests - Array of requests to paginate
 * @param currentPage - Current page number (0-based)
 * @param itemsPerPage - Number of items per page
 * @returns Paginated requests and total pages
 */
export function paginateMovementRequests(
  requests: MovementRequest[],
  currentPage: number,
  itemsPerPage: number
): {
  paginatedRequests: MovementRequest[];
  totalPages: number;
} {
  const totalPages = Math.ceil(requests.length / itemsPerPage);
  const paginatedRequests = requests.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  return {
    paginatedRequests,
    totalPages,
  };
}
