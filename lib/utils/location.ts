/**
 * Location utilities for map centering and geolocation
 */
import axios from 'axios';

// Default coordinates for different regions (fallback if geolocation fails)
const REGION_CENTERS: Record<string, [number, number]> = {
  // North America
  US: [39.8283, -98.5795],
  CA: [56.1304, -106.3468],
  MX: [23.6345, -102.5528],

  // Europe
  GB: [55.3781, -3.436],
  DE: [51.1657, 10.4515],
  FR: [46.2276, 2.2137],
  IT: [41.8719, 12.5674],
  ES: [40.4637, -3.7492],
  NL: [52.1326, 5.2913],
  BE: [50.8503, 4.3517],
  SE: [60.1282, 18.6435],
  NO: [60.472, 8.4689],
  DK: [56.2639, 9.5018],
  FI: [61.9241, 25.7482],
  PL: [51.9194, 19.1451],
  CZ: [49.8175, 15.473],
  AT: [47.5162, 14.5501],
  CH: [46.8182, 8.2275],
  IE: [53.1424, -7.6921],
  PT: [39.3999, -8.2245],

  // Asia
  CN: [35.8617, 104.1954],
  JP: [36.2048, 138.2529],
  KR: [35.9078, 127.7669],
  IN: [20.5937, 78.9629],
  TH: [15.87, 100.9925],
  SG: [1.3521, 103.8198],
  MY: [4.2105, 108.9758],
  ID: [-0.7893, 113.9213],
  PH: [12.8797, 121.774],
  VN: [14.0583, 108.2772],

  // Oceania
  AU: [-25.2744, 133.7751],
  NZ: [-40.9006, 174.886],

  // South America
  BR: [-14.235, -51.9253],
  AR: [-38.4161, -63.6167],
  CL: [-35.6751, -71.543],
  CO: [4.5709, -74.2973],
  PE: [-9.19, -75.0152],

  // Africa
  ZA: [-30.5595, 22.9375],
  EG: [26.8206, 30.8025],
  NG: [9.082, 8.6753],
  KE: [-0.0236, 37.9062],
  GH: [7.9465, -1.0232],

  // Middle East
  AE: [23.4241, 53.8478],
  SA: [23.8859, 45.0792],
  IL: [31.0461, 34.8516],
  TR: [38.9637, 35.2433],
  IR: [32.4279, 53.688],

  // Caribbean
  TT: [10.6599, -61.5199], // Trinidad and Tobago
  GY: [4.8604, -58.9302], // Guyana
  BB: [13.1939, -59.5432], // Barbados

  // Default fallback
  DEFAULT: [10.6599, -61.5199], // Trinidad center as global fallback
};

/**
 * Get user's country code from IP address using a free geolocation service
 */
export const getUserCountryCode = async (): Promise<string> => {
  try {
    // Use ipapi.co for free IP geolocation (no API key required)
    const response = await axios.get('https://ipapi.co/json/');
    const data = response.data;
    return data.country_code || 'DEFAULT';
  } catch (error) {
    console.warn('Failed to get user location, using default:', error);
    return 'DEFAULT';
  }
};

/**
 * Get default map center coordinates based on user's country
 */
export const getDefaultMapCenter = async (): Promise<[number, number]> => {
  try {
    const countryCode = await getUserCountryCode();
    const center = REGION_CENTERS[countryCode] || REGION_CENTERS.DEFAULT;
    return center;
  } catch (error) {
    console.warn('Failed to get default map center, using US center:', error);
    return REGION_CENTERS.DEFAULT;
  }
};

/**
 * Get default map center coordinates based on user's country (synchronous version)
 * This can be used when you want to avoid async operations
 */
export const getDefaultMapCenterSync = (): [number, number] => {
  return REGION_CENTERS.DEFAULT;
};

/**
 * Licensee to country mapping
 */
const LICENSEE_COUNTRY_MAP: Record<string, string> = {
  TTG: 'TT', // TTG -> Trinidad and Tobago
  Cabana: 'GY', // Cabana -> Guyana
  Barbados: 'BB', // Barbados -> Barbados
  all: 'TT', // All Licensees -> Trinidad (default)
  '': 'TT', // Empty/undefined -> Trinidad (default)
};

/**
 * Get map center coordinates based on selected licensee
 */
export const getMapCenterByLicensee = (
  selectedLicencee?: string
): [number, number] => {
  const countryCode = LICENSEE_COUNTRY_MAP[selectedLicencee || ''] || 'TT';
  const center = REGION_CENTERS[countryCode] || REGION_CENTERS.DEFAULT;
  return center;
};
