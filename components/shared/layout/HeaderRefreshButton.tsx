'use client';

import { useRefreshHandler } from '@/lib/contexts/RefreshContext';
import { RefreshCw } from 'lucide-react';
import { useCallback, useState } from 'react';

const MIN_SPIN_DURATION_MS = 800;

export default function HeaderRefreshButton() {
  const { handler, refreshing, hasHandler } = useRefreshHandler();
  const [isSpinning, setIsSpinning] = useState(false);

  const handleClick = useCallback(async () => {
    if (!handler || isSpinning || refreshing) {
      return;
    }

    setIsSpinning(true);
    const startedAt = Date.now();

    try {
      await handler();
    } finally {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, MIN_SPIN_DURATION_MS - elapsed);
      window.setTimeout(() => setIsSpinning(false), remaining);
    }
  }, [handler, isSpinning, refreshing]);

  if (!hasHandler) {
    return null;
  }

  const showSpinner = isSpinning || refreshing;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={showSpinner}
      className="flex-shrink-0 p-1.5 text-gray-600 transition-colors hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
      aria-label="Refresh"
    >
      <RefreshCw
        className={`h-4 w-4 sm:h-5 sm:w-5 ${showSpinner ? 'animate-spin' : ''}`}
      />
    </button>
  );
}
