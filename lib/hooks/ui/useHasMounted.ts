import { useState, useEffect } from 'react';

/**
 * Custom React hook to determine if the component has mounted on the client.
 *
 * @returns Boolean indicating if the component has mounted.
 */
export function useHasMounted() {
  // ============================================================================
  // State
  // ============================================================================
  const [hasMounted, setHasMounted] = useState(false);

  // ============================================================================
  // Effects
  // ============================================================================
  useEffect(() => {
    setHasMounted(true);
  }, []);

  return hasMounted;
}

export default useHasMounted;
