/**
 * Utility functions for resolving IDs to meaningful names in activity logs
 */

import axios from 'axios';

// Cache for resolved IDs
const idCache: Map<string, string> = new Map();

/**
 * Checks if a value looks like a MongoDB ObjectId (24 character hex string)
 */
export function isObjectId(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  // MongoDB ObjectId is exactly 24 hexadecimal characters
  return /^[0-9a-fA-F]{24}$/.test(value);
}

/**
 * Resolves a country ID to its name
 */
async function resolveCountryId(countryId: string): Promise<string> {
  const cacheKey = `country:${countryId}`;
  if (idCache.has(cacheKey)) {
    return idCache.get(cacheKey) || countryId;
  }

  try {
    const response = await axios.get(`/api/countries`);
    const countries = response.data.countries || [];
    const country = countries.find((c: { _id: string }) => c._id === countryId);
    const name = country?.name || countryId;
    idCache.set(cacheKey, name);
    return name;
  } catch (error) {
    console.error('Error resolving country ID:', error);
    return countryId;
  }
}

/**
 * Resolves an ID based on field name
 * Currently supports: country, countryName
 */
export async function resolveIdToName(
  value: unknown,
  fieldName: string
): Promise<string> {
  if (!isObjectId(value)) {
    return String(value || 'empty');
  }

  const id = String(value);
  const field = fieldName.toLowerCase();

  // Resolve country IDs
  if (field === 'country' || field === 'countryname') {
    return await resolveCountryId(id);
  }

  // For other IDs, return as-is for now (can be extended later)
  return id;
}

/**
 * Synchronously checks if a value is an ID (for filtering purposes)
 * This doesn't resolve the ID, just checks if it is one
 */
export function isIdValue(value: unknown): boolean {
  return isObjectId(value);
}

