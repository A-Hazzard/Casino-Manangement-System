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

import { ReactNode } from 'react';
import { useEffect, useState } from 'react';

type ClientOnlyProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

export default function ClientOnly({
  children,
  fallback = null,
}: ClientOnlyProps) {
  // ============================================================================
  // State & Hooks
  // ============================================================================
  const [hasMounted, setHasMounted] = useState(false);

  // ============================================================================
  // Effects
  // ============================================================================
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // ============================================================================
  // Render
  // ============================================================================
  if (!hasMounted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
