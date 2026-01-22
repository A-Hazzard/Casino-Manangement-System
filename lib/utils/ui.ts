// UI-related utility functions

import type { GamingMachine as Cabinet } from '@/shared/types/entities';
import { gsap } from 'gsap';
import { RefObject } from 'react';
type CabinetSortOption =
  | 'assetNumber'
  | 'locationName'
  | 'moneyIn'
  | 'moneyOut'
  | 'jackpot'
  | 'gross'
  | 'cancelledCredits'
  | 'game'
  | 'smbId'
  | 'serialNumber'
  | 'lastOnline'
  | 'offlineTime';

/**
 * Animates table rows when data changes
 */
export const animateTableRows = (
  tableRef: RefObject<HTMLDivElement | null>
) => {
  if (tableRef.current) {
    const tableRows = tableRef.current.querySelectorAll('tbody tr');
    gsap.fromTo(
      tableRows,
      { opacity: 0, y: 15 },
      {
        opacity: 1,
        y: 0,
        duration: 0.4,
        stagger: 0.05,
        ease: 'power2.out',
      }
    );
  }
};

/**
 * Animates cards when data changes
 */
export const animateCards = (cardsRef: RefObject<HTMLDivElement | null>) => {
  if (cardsRef.current) {
    const cards = Array.from(cardsRef.current.children);
    gsap.fromTo(
      cards,
      { opacity: 0, scale: 0.95, y: 15 },
      {
        opacity: 1,
        scale: 1,
        y: 0,
        duration: 0.4,
        stagger: 0.08,
        ease: 'back.out(1.5)',
      }
    );
  }
};

/**
 * Filter and sort cabinets based on search term and sort options
 */
export const filterAndSortCabinets = (
  allCabinets: Cabinet[],
  searchTerm: string,
  sortOption: CabinetSortOption,
  sortOrder: 'asc' | 'desc'
) => {
  if (!allCabinets || allCabinets.length === 0) {
    return [];
  }

  let filtered = [...allCabinets];

  // Apply search term filter
  if (searchTerm.trim()) {
    const searchLower = searchTerm.toLowerCase();
    filtered = filtered.filter(cab => {
      const cabinetId = String(cab._id || '').toLowerCase();
      return (
        cab.assetNumber?.toLowerCase().includes(searchLower) ||
        cab.smbId?.toLowerCase().includes(searchLower) ||
        cab.serialNumber?.toLowerCase().includes(searchLower) ||
        cab.game?.toLowerCase().includes(searchLower) ||
        cabinetId.includes(searchLower)
      );
    });
  }

  // Apply sorting
  filtered.sort((a, b) => {
    const order = sortOrder === 'desc' ? -1 : 1;

    // Special handling for offlineTime sorting
    if (sortOption === 'offlineTime') {
      const now = Date.now();
      const fiveMinutesAgo = now - 5 * 60 * 1000;

      const firstLastActivity = a.lastActivity || a.lastOnline;
      const secondLastActivity = b.lastActivity || b.lastOnline;

      const firstIsOnline =
        firstLastActivity &&
        new Date(firstLastActivity).getTime() > fiveMinutesAgo;
      const secondIsOnline =
        secondLastActivity &&
        new Date(secondLastActivity).getTime() > fiveMinutesAgo;

      if (firstIsOnline && secondIsOnline) return 0;
      if (!firstIsOnline && !secondIsOnline) {
        const firstTime = firstLastActivity
          ? new Date(firstLastActivity).getTime()
          : 0;
        const secondTime = secondLastActivity
          ? new Date(secondLastActivity).getTime()
          : 0;

        // Always push "Never Online" (0) to the bottom
        if (firstTime === 0 && secondTime > 0) return 1;
        if (firstTime > 0 && secondTime === 0) return -1;
        if (firstTime === 0 && secondTime === 0) return 0;

        return (firstTime < secondTime ? 1 : -1) * order;
      }
      return firstIsOnline ? 1 : -1;
    }

    let valA = a[sortOption as keyof Cabinet] as string | number | undefined;
    let valB = b[sortOption as keyof Cabinet] as string | number | undefined;

    // Handle null/undefined specifically for sorting, treating them as lowest value
    const aIsNull = valA === null || valA === undefined;
    const bIsNull = valB === null || valB === undefined;
    if (aIsNull && bIsNull) return 0;
    if (aIsNull) return -1 * order; // nulls/undefined first in asc, last in desc
    if (bIsNull) return 1 * order;

    // Specific type comparisons
    if (sortOption === 'assetNumber') {
      // Ensure string comparison
      valA = String(valA);
      valB = String(valB);
      return valA.localeCompare(valB) * order;
    } else {
      // Default to numeric comparison for moneyIn, gross, etc.
      valA = Number(valA) || 0;
      valB = Number(valB) || 0;
      return (valA - valB) * order;
    }
  });

  return filtered;
};

