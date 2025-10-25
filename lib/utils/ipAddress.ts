import { NextRequest } from 'next/server';

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

/**
 * Utility functions for IP address validation and formatting
 */

/**
 * Validates if a string is a valid IPv4 address
 */
export function isValidIPv4(ip: string): boolean {
  const ipv4Regex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipv4Regex.test(ip);
}

/**
 * Validates if a string is a valid IPv6 address
 */
export function isValidIPv6(ip: string): boolean {
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
  return ipv6Regex.test(ip);
}

/**
 * Validates if a string is a valid IP address (IPv4 or IPv6)
 */
export function isValidIP(ip: string): boolean {
  return isValidIPv4(ip) || isValidIPv6(ip);
}

/**
 * Formats an IP address for display
 */
export function formatIPAddress(ip: string): string {
  if (!ip || ip === 'unknown' || ip === 'client-side') {
    return 'Unknown';
  }

  // Remove any port numbers
  const cleanIP = ip.split(':')[0];

  // Validate the IP
  if (!isValidIP(cleanIP)) {
    return 'Invalid IP';
  }

  return cleanIP;
}

/**
 * Masks an IP address for privacy (shows only first and last octet for IPv4)
 */
export function maskIPAddress(ip: string): string {
  if (!ip || ip === 'unknown' || ip === 'client-side') {
    return 'Unknown';
  }

  const cleanIP = ip.split(':')[0];

  if (isValidIPv4(cleanIP)) {
    const parts = cleanIP.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.***.***.${parts[3]}`;
    }
  }

  if (isValidIPv6(cleanIP)) {
    // For IPv6, mask the middle part
    const parts = cleanIP.split(':');
    if (parts.length >= 4) {
      return `${parts[0]}:${parts[1]}:***:***:${parts[parts.length - 2]}:${parts[parts.length - 1]}`;
    }
  }

  return 'Invalid IP';
}

/**
 * Checks if an IP address is a private/local address
 */
export function isPrivateIP(ip: string): boolean {
  if (!ip || !isValidIP(ip)) {
    return false;
  }

  const cleanIP = ip.split(':')[0];

  if (isValidIPv4(cleanIP)) {
    const parts = cleanIP.split('.').map(Number);

    // Private IPv4 ranges
    return (
      parts[0] === 10 ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      parts[0] === 127 // localhost
    );
  }

  if (isValidIPv6(cleanIP)) {
    // Private IPv6 ranges
    return (
      cleanIP.startsWith('fe80:') || // link-local
      cleanIP.startsWith('fc00:') || // unique local
      cleanIP.startsWith('fd00:') || // unique local
      cleanIP === '::1' // localhost
    );
  }

  return false;
}

/**
 * Gets a user-friendly IP address description
 *
 * @param ip - The IP address
 * @returns A description of the IP address
 */
export function getIPDescription(ip: string | null): string {
  if (!ip) {
    return 'Unknown';
  }

  if (ip === '127.0.0.1' || ip === '::1') {
    return `${ip} (localhost)`;
  }

  if (
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    ip.startsWith('172.')
  ) {
    return `${ip} (private network)`;
  }

  return ip;
}
