import { NextRequest } from "next/server";

/**
 * Extracts the client IP address from a Next.js request
 * Handles various proxy configurations and deployment environments
 *
 * @param request - The Next.js request object
 * @returns The client IP address or null if not found
 */
export function getClientIP(request: NextRequest): string | null {
  // Try x-forwarded-for header first (most common for proxies/load balancers)
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs: "client, proxy1, proxy2"
    // The first IP is the original client IP
    const firstIP = forwardedFor.split(",")[0].trim();
    if (firstIP && isValidIP(firstIP)) {
      return firstIP;
    }
  }

  // Try x-real-ip header (used by some proxies like nginx)
  const realIP = request.headers.get("x-real-ip");
  if (realIP && isValidIP(realIP)) {
    return realIP;
  }

  // Try x-client-ip header (used by some CDNs)
  const clientIP = request.headers.get("x-client-ip");
  if (clientIP && isValidIP(clientIP)) {
    return clientIP;
  }

  // Try cf-connecting-ip header (Cloudflare)
  const cfIP = request.headers.get("cf-connecting-ip");
  if (cfIP && isValidIP(cfIP)) {
    return cfIP;
  }

  // Try x-forwarded header (less common)
  const forwarded = request.headers.get("x-forwarded");
  if (forwarded) {
    const match = forwarded.match(/for=([^;,\s]+)/);
    if (match && match[1]) {
      const ip = match[1].replace(/"/g, "");
      if (isValidIP(ip)) {
        return ip;
      }
    }
  }

  // For development/local environment, try to get a meaningful identifier
  if (process.env.NODE_ENV === "development") {
    return "127.0.0.1"; // localhost for development
  }

  // If all else fails, return null
  return null;
}

/**
 * Validates if a string is a valid IP address (IPv4 or IPv6)
 *
 * @param ip - The IP address string to validate
 * @returns True if valid IP address, false otherwise
 */
function isValidIP(ip: string): boolean {
  // Remove any port numbers
  const cleanIP = ip.split(":")[0];

  // IPv4 regex
  const ipv4Regex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

  // IPv6 regex (simplified)
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;

  // Check for private/local IPs that we want to exclude in production
  const isPrivateIP =
    /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|127\.|169\.254\.|::1|fc00:|fe80:)/;

  if (ipv4Regex.test(cleanIP) || ipv6Regex.test(cleanIP)) {
    // In production, we might want to exclude private IPs
    // In development, we accept them
    if (process.env.NODE_ENV === "development" || !isPrivateIP.test(cleanIP)) {
      return true;
    }
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
    return "Unknown";
  }

  if (ip === "127.0.0.1" || ip === "::1") {
    return `${ip} (localhost)`;
  }

  if (
    ip.startsWith("192.168.") ||
    ip.startsWith("10.") ||
    ip.startsWith("172.")
  ) {
    return `${ip} (private network)`;
  }

  return ip;
}
