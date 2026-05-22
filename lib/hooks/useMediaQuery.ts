'use client';

import { useEffect, useState } from 'react';

export function useMediaQuery(query: string): boolean {
  // ============================================================================
  // State & Hooks
  // ============================================================================

  const [matches, setMatches] = useState(false);

  // ============================================================================
  // Effects
  // ============================================================================

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
}
