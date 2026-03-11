/**
 * Client-side helper functions for licencee operations
 * These functions make API calls instead of directly accessing the database
 */

import type { Licencee } from '@/lib/types/common';

/**
 * Fetches licencees via API call with pagination support
 * @param page - Page number (1-based, default: 1)
 * @param limit - Items per page (default: 50)
 * @returns Promise resolving to paginated licencees with pagination metadata
 */
export async function fetchLicencees(
  page: number = 1,
  limit: number = 50
): Promise<{
  licencees: Licencee[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  try {
    console.log('[fetchLicencees] Calling /api/licencees...', { page, limit });
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(limit));
    
    const response = await fetch(`/api/licencees?${params.toString()}`, {
      method: 'GET',
      credentials: 'include', // Include cookies for authentication
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('[fetchLicencees] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[fetchLicencees] API error:', response.status, errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('[fetchLicencees] Response data:', data);
    console.log('[fetchLicencees] Licencees count:', data.licencees?.length || 0);
    
    // Ensure licencees is always an array
    const licencees = Array.isArray(data.licencees) ? data.licencees : [];
    console.log('[fetchLicencees] Returning licencees:', licencees.map((l: Licencee) => ({ id: l._id, name: l.name })));
    
    return {
      licencees,
      pagination:
        data.pagination || {
          page: 1,
          limit,
          total: licencees.length,
          totalPages: 1,
        },
    };
  } catch (error) {
    console.error('[fetchLicencees] Failed to fetch licencees:', error);
    return {
      licencees: [],
      pagination: {
        page: 1,
        limit,
        total: 0,
        totalPages: 0,
      },
    };
  }
}

/**
 * Fetches a single licencee by ID (or name) via API call.
 */
export async function fetchLicenceeById(
  licenceeId: string
): Promise<Licencee | null> {
  if (!licenceeId) {
    return null;
  }

  try {
    const response = await fetch(`/api/licencees?licencee=${licenceeId}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        '[fetchLicenceeById] API error:',
        response.status,
        errorText
      );
      return null;
    }

    const data = await response.json();
    const licencees = (data?.licencees || []) as Licencee[];
    return licencees.length > 0 ? licencees[0] : null;
  } catch (error) {
    console.error('[fetchLicenceeById] Failed to fetch licencee:', error);
    return null;
  }
}

