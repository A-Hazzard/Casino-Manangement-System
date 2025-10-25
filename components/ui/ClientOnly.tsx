'use client';

import { useEffect, useState } from 'react';
import type React from 'react';

type ClientOnlyProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

/**
 * ClientOnly component that only renders its children on the client side.
 * This prevents hydration mismatches caused by browser extensions like Dark Reader
 * that modify the DOM after server-side rendering.
 */
export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
