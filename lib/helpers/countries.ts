/**
 * Countries Helper Functions
 *
 * Provides helper functions for fetching and managing country data. It handles
 * API communication for country operations and includes data normalization
 * utilities for consistent country data formatting.
 *
 * Features:
 * - Fetches all countries from the API
 * - Creates new countries
 * - Updates existing countries
 * - Deletes countries
 * - Normalizes country data format
 */

import axios from 'axios';

import type { Country } from '@/lib/types/common';

// Activity logging removed - handled via API calls

const normalizeCountry = (country: unknown): Country => {
  const raw = country as Partial<Country> & {
    createdAt?: string | Date;
    updatedAt?: string | Date;
  };

  const toIsoString = (value?: string | Date): string => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString();
  };

  return {
    _id: String(raw._id ?? ''),
    name: String(raw.name ?? ''),
    alpha2: String(raw.alpha2 ?? ''),
    alpha3: String(raw.alpha3 ?? ''),
    isoNumeric: String(raw.isoNumeric ?? ''),
    createdAt: toIsoString(raw.createdAt),
    updatedAt: toIsoString(raw.updatedAt),
  };
};

/**
 * Fetches all countries from the API
 */
export async function fetchCountries(): Promise<Country[]> {
  try {
    const response = await axios.get('/api/countries');
    if (response.data.success) {
      return (response.data.countries || []).map(normalizeCountry);
    }
    throw new Error('Failed to fetch countries');
  } catch (error) {
    console.error('Error fetching countries:', error);
    throw error;
  }
}


