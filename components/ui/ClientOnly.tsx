'use client';

import { useEffect, useState } from 'react';
import type React from 'react';

type ClientOnlyProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

/**
 * Client Only Component
 * Component that only renders its children on the client side.
 *
 * Features:
 * - Prevents hydration mismatches
 * - Useful for browser extensions that modify DOM (e.g., Dark Reader)
 * - Fallback rendering during SSR
 * - Mount state tracking
 *
 * @param children - Content to render on client side
 * @param fallback - Fallback content to render during SSR
 */
export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  // ============================================================================
  // Hooks & State
  // ============================================================================
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
