/**
 * Manufacturers Helper Functions
 *
 * Provides helper functions for fetching manufacturer data from the machines collection.
 * It retrieves unique manufacturer names for use in filters, dropdowns, and other UI components.
 *
 * Features:
 * - Fetches unique manufacturers from the machines collection.
 * - Handles errors gracefully with empty array fallback.
 */

import axios from 'axios';

// ============================================================================
// Type Definitions
// ============================================================================

export type Manufacturer = string;

// ============================================================================
// Manufacturer Data Fetching
// ============================================================================

/**
 * Fetches unique manufacturers from the machines collection
 * @returns Promise<Manufacturer[]> - Array of unique manufacturer names
 */
export const fetchManufacturers = async (): Promise<Manufacturer[]> => {
  try {
    const response = await axios.get('/api/manufacturers');
    return response.data;
  } catch (error) {
    console.error('Error fetching manufacturers:', error);
    return [];
  }
};
