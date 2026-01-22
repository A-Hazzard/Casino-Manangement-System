'use client';

import { SessionsTableProps } from '@/lib/types/sessions';
import { History } from 'lucide-react';
import { SessionsDesktopTable } from './SessionsDesktopTable';
import { SessionsMobileCards } from './SessionsMobileCards';

/**
 * Main Sessions Table Component
 *
 * Renders either a desktop table or mobile cards based on screen size.
 * Handles loading and empty states.
 */
export function SessionsTable({
  sessions,
  isLoading,
  sortOption,
  sortOrder,
  onSort,
}: SessionsTableProps) {
  // === Loading State ===
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-button"></div>
      </div>
    );
  }

  // === Empty State ===
  if (!sessions || sessions.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-12 text-center">
        <History className="mb-4 h-12 w-12 text-gray-300" />
        <h3 className="text-lg font-medium text-gray-900">No sessions found</h3>
        <p className="text-sm text-gray-500">
          Try adjusting your search or filters to find what you're looking for.
        </p>
      </div>
    );
  }

  // === Render Components ===
  return (
    <>
      <SessionsDesktopTable
        sessions={sessions}
        sortOption={sortOption}
        sortOrder={sortOrder}
        onSort={onSort}
      />
      <SessionsMobileCards sessions={sessions} />
    </>
  );
}

