/**
 * RetryLoadingBar
 *
 * Determinate, time-estimate loading bar with a retry status line. A single DB-backed
 * request can't report true byte/row progress, so the percentage is an estimate driven by
 * elapsed time vs an expected duration: it eases toward 95% over `expectedDurationMs` and
 * holds there until the request resolves (the parent unmounts this on success).
 *
 * When the underlying request hits a connection issue and is waiting to retry, it switches
 * to an amber "retrying in N s (attempt X of Y)" countdown and resets the bar for the next
 * attempt.
 *
 * @module components/shared/ui/RetryLoadingBar
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

type RetryLoadingBarProps = {
  isRetrying: boolean;
  retryCountdown: number;
  attempt: number;
  maxRetries: number;
  /** Expected time for one attempt to finish; drives the estimated percentage. */
  expectedDurationMs?: number;
  label?: string;
};

const MAX_ESTIMATE_PERCENT = 95;
const TICK_MS = 200;

export default function RetryLoadingBar({
  isRetrying,
  retryCountdown,
  attempt,
  maxRetries,
  expectedDurationMs = 30000,
  label = 'Loading report…',
}: RetryLoadingBarProps) {
  const [percent, setPercent] = useState(0);
  const attemptStartRef = useRef<number>(0);

  // Restart the estimate whenever a new attempt begins (attempt changes) or when a
  // retry wait starts/ends, so each attempt's bar grows from 0 again.
  useEffect(() => {
    if (isRetrying) {
      setPercent(0);
      return;
    }

    attemptStartRef.current =
      typeof performance !== 'undefined' ? performance.now() : 0;
    setPercent(0);

    const intervalId = setInterval(() => {
      const now =
        typeof performance !== 'undefined' ? performance.now() : 0;
      const elapsed = now - attemptStartRef.current;
      // Ease-out: fast at first, slowing as it approaches the cap.
      const ratio = Math.min(elapsed / expectedDurationMs, 1);
      const eased = 1 - Math.pow(1 - ratio, 2);
      setPercent(Math.min(Math.round(eased * MAX_ESTIMATE_PERCENT), MAX_ESTIMATE_PERCENT));
    }, TICK_MS);

    return () => clearInterval(intervalId);
  }, [attempt, isRetrying, expectedDurationMs]);

  const accentClass = isRetrying ? 'bg-amber-500' : 'bg-buttonActive';

  return (
    <div className="w-full">
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full rounded-full ${accentClass} transition-[width] duration-200 ease-out`}
          style={{ width: `${isRetrying ? 0 : percent}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 text-sm">
        {isRetrying ? (
          <span className="flex items-center gap-2 font-semibold text-amber-700">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-600" />
            Connection issue — retrying in {retryCountdown}s (attempt {attempt} of{' '}
            {maxRetries})
          </span>
        ) : (
          <>
            <span className="flex items-center gap-2 text-gray-600">
              <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-gray-500" />
              {label}
            </span>
            <span className="font-semibold tabular-nums text-gray-700">
              {percent}%
            </span>
          </>
        )}
      </div>
    </div>
  );
}
