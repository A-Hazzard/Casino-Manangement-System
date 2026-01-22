/**
 * Collection Report Detail Page Helper Functions
 *
 * Provides helper functions for the collection report detail page, including animations,
 * calculations, sorting, and pagination. It handles location totals, SAS metrics aggregation,
 * and machine metrics display for detailed collection report views.
 *
 * Features:
 * - Applies GSAP animations for desktop tab transitions.
 * - Calculates location totals and SAS metrics from collections.
 * - Sorts collections by SAS drop amount.
 * - Handles pagination for machine metrics display.
 * - Generates machine metrics content data for tables.
 */

import type { CollectionDocument } from '@/lib/types/collection';
import { gsap } from 'gsap';

// ============================================================================
// Animation Utilities
// ============================================================================

/**
 * Applies GSAP animation for desktop tab transitions
 * @param tabContentRef - React ref to the tab content element
 */
export function animateDesktopTabTransition(
  tabContentRef: React.RefObject<HTMLDivElement | null>
) {
  if (tabContentRef.current && window.innerWidth >= 1024) {
    gsap.fromTo(
      tabContentRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }
    );
  }
}

// ============================================================================
// Location Total Calculations
// ============================================================================

/**
 * Calculates the total location value from collections
 * Uses movement.gross (meter gross) for each collection
 * This sums the meter gross column values from all machines
 * @param collections - Array of collection documents
 * @returns Total location value (sum of movement.gross from all collections)
 */
export function calculateLocationTotal(
  collections: CollectionDocument[]
): number {
  if (!collections || collections.length === 0) return 0;
  return collections.reduce((total, collection) => {
    // Sum the meter gross (movement.gross) from each collection
    const gross = collection.movement?.gross || 0;
    return total + gross;
  }, 0);
}

