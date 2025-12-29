/**
 * IP Detection Utilities
 *
 * Utility functions for detecting client IP addresses from requests.
 *
 * Features:
 * - Multiple header support for IP detection
 * - Proxy header handling
 * - Cloudflare support
 * - IP validation
 */

// ============================================================================
// IP Detection Functions
// ============================================================================
/**
 * Get the client's IP address from the request
 * Tries multiple headers to get the most accurate IP
 */
function getClientIP(request: Request): string {
  const headers = request.headers;

  // Check various headers in order of preference
  const ipHeaders = [
    'x-forwarded-for',
    'x-real-ip',
    'x-client-ip',
    'cf-connecting-ip', // Cloudflare
    'x-cluster-client-ip',
    'x-forwarded',
    'forwarded-for',
    'forwarded',
  ];

  for (const header of ipHeaders) {
    const value = headers.get(header);
    if (value) {
      // x-forwarded-for can contain multiple IPs, take the first one
      const ip = value.split(',')[0].trim();
      if (isValidIP(ip)) {
        return ip;
      }
    }
  }

  // Fallback to connection remote address if available
  const connection = (request as { connection?: { remoteAddress?: string } })
    .connection;
  if (connection?.remoteAddress) {
    return connection.remoteAddress;
  }

  // If no IP found, return unknown
  return 'unknown';
}

// ============================================================================
// IP Validation Functions
// ============================================================================
/**
 * Validate if a string is a valid IP address
 */
function isValidIP(ip: string): boolean {
  // IPv4 regex
  const ipv4Regex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

  // IPv6 regex (simplified)
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * Get additional IP information
 * Returns both local and public IP if available
 */
export function getIPInfo(request: Request): {
  ip: string;
  isLocal: boolean;
  isPublic: boolean;
  userAgent: string;
} {
  const ip = getClientIP(request);
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
 * Check if an IP address is local/private
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

/**
 * Format IP address for display
 */
export function formatIPForDisplay(ipInfo: {
  ip: string;
  isLocal: boolean;
  isPublic: boolean;
}): string {
  if (ipInfo.ip === 'unknown') {
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
