/**
 * Client Only Component
 * Component that only renders its children on the client side.
 *
 * Features:
 * - Prevents hydration mismatches
 * - Fallback rendering during SSR
 * - Mount state tracking
 *
 * @param children - Content to render on client side
 * @param fallback - Fallback content to render during SSR
 */
'use client';

import { useEffect, useState } from 'react';

type ClientOnlyProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export default function ClientOnly({
  // ============================================================================
  // Hooks & State
  // ============================================================================
  children,
  fallback = null,
}: ClientOnlyProps) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

