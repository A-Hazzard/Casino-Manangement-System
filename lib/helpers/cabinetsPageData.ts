import axios from 'axios';
import type { GamingMachine as CabinetDetail } from '@/shared/types/entities';

/**
 * Fetch cabinet by ID
 */
export async function fetchCabinetById(
  cabinetId: string
): Promise<CabinetDetail> {
  try {
    const response = await axios.get(`/api/cabinets/${cabinetId}`);
    return response.data;
  } catch (error) {
    console.error(' Error fetching cabinet by ID:', error);
    throw error;
  }
}

/**
 * Update cabinet metrics data
 */
export async function updateCabinetMetricsData(
  cabinetId: string,
  timePeriod: string
): Promise<CabinetDetail> {
  try {
    const params = new URLSearchParams();
    params.append('timePeriod', timePeriod);

    const response = await axios.get(
      `/api/cabinets/${cabinetId}/metrics?${params.toString()}`
    );
    return response.data;
  } catch (error) {
    console.error(' Error updating cabinet metrics data:', error);
    throw error;
  }
}

/**
 * Fetch cabinet SMIB configuration
 */
export async function fetchCabinetSmibConfig(
  cabinetId: string
): Promise<Record<string, unknown>> {
  try {
    const response = await axios.get(`/api/cabinets/${cabinetId}/smib-config`);

    if (response.data.success) {
      return response.data.data || {};
    } else {
      console.warn('⚠️ SMIB config not found for cabinet:', cabinetId);
      return {};
    }
  } catch (error) {
    console.error(' Error fetching cabinet SMIB config:', error);
    // Return empty object instead of throwing to prevent UI crashes
    return {};
  }
}

/**
 * Update cabinet SMIB configuration
 */
export async function updateCabinetSmibConfig(
  cabinetId: string,
  config: Record<string, unknown>
): Promise<void> {
  try {
    await axios.put(`/api/cabinets/${cabinetId}/smib-config`, config);
  } catch (error) {
    console.error(' Error updating cabinet SMIB config:', error);
    throw error;
  }
}

/**
 * Sync cabinet meters
 */
export async function syncCabinetMeters(cabinetId: string): Promise<void> {
  try {
    await axios.post(`/api/cabinets/${cabinetId}/sync-meters`);
  } catch (error) {
    console.error(' Error syncing cabinet meters:', error);
    throw error;
  }
}

/**
 * Refresh cabinet data
 */
export async function refreshCabinetData(
  cabinetId: string
): Promise<CabinetDetail> {
  try {
    const response = await axios.get(`/api/cabinets/${cabinetId}/refresh`);
    return response.data;
  } catch (error) {
    console.error(' Error refreshing cabinet data:', error);
    throw error;
  }
}
