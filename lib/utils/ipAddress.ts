/**
 * IP Address Utilities
 *
 * Utility functions for extracting and validating client IP addresses.
 *
 * Features:
 * - IP address extraction from Next.js requests
 * - Proxy header support (x-forwarded-for, x-real-ip, etc.)
 * - Cloudflare support (cf-connecting-ip)
 * - IP validation
 */

import { NextRequest } from 'next/server';

// ============================================================================
// IP Extraction Functions
// ============================================================================
/**
 * Extracts the client IP address from a Next.js request
 * Handles various proxy configurations and deployment environments
 *
 * @param request - The Next.js request object
 * @returns The client IP address or null if not found
 */
export function getClientIP(request: NextRequest): string | null {
  // Try x-forwarded-for header first (most common for proxies/load balancers)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs: "client, proxy1, proxy2"
    // The first IP is the original client IP
    const firstIP = forwardedFor.split(',')[0].trim();
    if (firstIP && isValidIP(firstIP)) {
      return firstIP;
    }
  }

  // Try x-real-ip header (used by some proxies like nginx)
  const realIP = request.headers.get('x-real-ip');
  if (realIP && isValidIP(realIP)) {
    return realIP;
  }

  // Try x-client-ip header (used by some CDNs)
  const clientIP = request.headers.get('x-client-ip');
  if (clientIP && isValidIP(clientIP)) {
    return clientIP;
  }

  // Try cf-connecting-ip header (Cloudflare)
  const cfIP = request.headers.get('cf-connecting-ip');
  if (cfIP && isValidIP(cfIP)) {
    return cfIP;
  }

  // Try x-forwarded header (less common)
  const forwarded = request.headers.get('x-forwarded');
  if (forwarded) {
    const match = forwarded.match(/for=([^;,\s]+)/);
    if (match && match[1]) {
      const ip = match[1].replace(/"/g, '');
      if (isValidIP(ip)) {
        return ip;
      }
    }
  }

  // For development/local environment, try to get a meaningful identifier
  if (process.env.NODE_ENV === 'development') {
    return '127.0.0.1'; // localhost for development
  }

  // If all else fails, return null
  return null;
}

// ============================================================================
// IP Validation Functions
// ============================================================================
/**
 * Validates if a string is a valid IPv4 address
 */
function isValidIPv4(ip: string): boolean {
  const ipv4Regex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipv4Regex.test(ip);
}

/**
 * Validates if a string is a valid IPv6 address
 */
function isValidIPv6(ip: string): boolean {
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
  return ipv6Regex.test(ip);
}

/**
 * Validates if a string is a valid IP address (IPv4 or IPv6)
 */
function isValidIP(ip: string): boolean {
  return isValidIPv4(ip) || isValidIPv6(ip);
}
