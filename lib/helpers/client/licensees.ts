/**
 * Client-side helper functions for licensee operations
 * These functions make API calls instead of directly accessing the database
 */

import type { Licensee } from '@/lib/types/common';

/**
 * Fetches licensees via API call with pagination support
 * @param page - Page number (1-based, default: 1)
 * @param limit - Items per page (default: 50)
 * @returns Promise resolving to paginated licensees with pagination metadata
 */
export async function fetchLicensees(
  page: number = 1,
  limit: number = 50
): Promise<{
  licensees: Licensee[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  try {
    console.log('[fetchLicensees] Calling /api/licensees...', { page, limit });
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(limit));
    
    const response = await fetch(`/api/licensees?${params.toString()}`, {
      method: 'GET',
      credentials: 'include', // Include cookies for authentication
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('[fetchLicensees] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[fetchLicensees] API error:', response.status, errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('[fetchLicensees] Response data:', data);
    console.log('[fetchLicensees] Licensees count:', data.licensees?.length || 0);
    
    // Ensure licensees is always an array
    const licensees = Array.isArray(data.licensees) ? data.licensees : [];
    console.log('[fetchLicensees] Returning licensees:', licensees.map((l: Licensee) => ({ id: l._id, name: l.name })));
    
    return {
      licensees,
      pagination:
        data.pagination || {
          page: 1,
          limit,
          total: licensees.length,
          totalPages: 1,
        },
    };
  } catch (error) {
    console.error('[fetchLicensees] Failed to fetch licensees:', error);
    return {
      licensees: [],
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
 * Fetches a single licensee by ID (or name) via API call.
 */
export async function fetchLicenseeById(
  licenseeId: string
): Promise<Licensee | null> {
  if (!licenseeId) {
    return null;
  }

  try {
    const response = await fetch(`/api/licensees?licensee=${licenseeId}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        '[fetchLicenseeById] API error:',
        response.status,
        errorText
      );
      return null;
    }

    const data = await response.json();
    const licensees = (data?.licensees || []) as Licensee[];
    return licensees.length > 0 ? licensees[0] : null;
  } catch (error) {
    console.error('[fetchLicenseeById] Failed to fetch licensee:', error);
    return null;
  }
}

