/**
 * IP Address Utilities
 *
 * Utility functions for extracting and validating client IP addresses.
 *
 * Features:
 * - IP address extraction from Next.js requests and standard Request objects
 * - Proxy header support (x-forwarded-for, x-real-ip, etc.)
 * - Cloudflare support (cf-connecting-ip)
 * - IP validation (IPv4 and IPv6)
 * - IP information and formatting utilities
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
export function getClientIP(request: NextRequest | Request): string | null {
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

  // Try x-cluster-client-ip header
  const clusterIP = request.headers.get('x-cluster-client-ip');
  if (clusterIP && isValidIP(clusterIP)) {
    return clusterIP;
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

  // Try forwarded-for and forwarded headers (standard HTTP headers)
  const forwardedForAlt = request.headers.get('forwarded-for');
  if (forwardedForAlt && isValidIP(forwardedForAlt)) {
    return forwardedForAlt;
  }

  const forwardedAlt = request.headers.get('forwarded');
  if (forwardedAlt) {
    const match = forwardedAlt.match(/for=([^;,\s]+)/);
    if (match && match[1]) {
      const ip = match[1].replace(/"/g, '');
      if (isValidIP(ip)) {
        return ip;
      }
    }
  }

  // Fallback to connection remote address if available (Request only)
  if ('connection' in request) {
    const connection = (request as { connection?: { remoteAddress?: string } })
      .connection;
    if (connection?.remoteAddress && isValidIP(connection.remoteAddress)) {
      return connection.remoteAddress;
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
// IP Information Functions
// ============================================================================
/**
 * Get additional IP information
 * Returns both local and public IP if available
 *
 * @param request - The request object (NextRequest or Request)
 * @returns IP information object with ip, isLocal, isPublic, and userAgent
 */
export function getIPInfo(request: NextRequest | Request): {
  ip: string;
  isLocal: boolean;
  isPublic: boolean;
  userAgent: string;
} {
  const ip = getClientIP(request) || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  // Check if IP is local/private
  const isLocal = isLocalIP(ip);
  const isPublic = !isLocal && ip !== 'unknown';

  return {
    ip,
    isLocal,
    isPublic,
    userAgent,
  };
}

/**
 * Format IP address for display
 *
 * @param ipInfo - IP information object
 * @returns Formatted IP address string
 */
export function formatIPForDisplay(ipInfo: {
  ip: string;
  isLocal: boolean;
  isPublic: boolean;
}): string {
  if (ipInfo.ip === 'unknown' || ipInfo.ip === null) {
    return 'Unknown';
  }

  if (ipInfo.isLocal) {
    return `${ipInfo.ip} (Local)`;
  }

  if (ipInfo.isPublic) {
    return `${ipInfo.ip} (Public)`;
  }

  return ipInfo.ip;
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

/**
 * Check if an IP address is local/private
 *
 * @param ip - IP address string
 * @returns true if IP is local/private
 */
function isLocalIP(ip: string): boolean {
  if (ip === 'unknown' || ip === '::1' || ip === '127.0.0.1') {
    return true;
  }

  // Private IPv4 ranges
  const privateRanges = [
    /^10\./, // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
    /^192\.168\./, // 192.168.0.0/16
    /^169\.254\./, // 169.254.0.0/16 (link-local)
    /^127\./, // 127.0.0.0/8 (loopback)
  ];

  return privateRanges.some(range => range.test(ip));
}

