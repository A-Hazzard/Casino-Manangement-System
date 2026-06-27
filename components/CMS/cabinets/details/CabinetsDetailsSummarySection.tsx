/**
 * Cabinets Details Summary Section Component
 *
 * Displays the header and summary information for a cabinet.
 *
 * Features:
 * - Back to Cabinets navigation
 * - Cabinet name and manufacturing info
 * - Online/Offline status indicator
 * - Refresh button
 * - Edit machine action
 * - Deleted status indicator
 */

'use client';

import { Button } from '@/components/shared/ui/button';
import type { GamingMachine as Cabinet } from '@/shared/types/entities';
import { ArrowLeftIcon, Pencil2Icon } from '@radix-ui/react-icons';
import { Copy, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import RefreshButton from '@/components/shared/ui/RefreshButton';
import { formatMachineDisplayName } from '@/components/shared/ui/machineDisplay';

type CabinetsDetailsSummarySectionProps = {
  cabinet: Cabinet | null;
  locationName: string;
  selectedLicencee: string | null;
  isOnline: boolean;
  refreshing: boolean;
  canEditMachines: boolean;
  onBack: () => void;
  onRefresh: () => void;
  onEdit: (cabinet: Cabinet) => void;
  onCopyToClipboard: (text: string, label: string) => void;
  onLocationClick: (locationId: string) => void;
};

export default function CabinetsDetailsSummarySection({
  cabinet,
  locationName,
  selectedLicencee,
  isOnline,
  refreshing,
  canEditMachines,
  onBack,
  onRefresh,
  onEdit,
  onCopyToClipboard,
  onLocationClick,
}: CabinetsDetailsSummarySectionProps) {
  // ============================================================================
  // Computed
  // ============================================================================
  const cabinetCopyName = cabinet
    ? formatMachineDisplayName(cabinet)
    : 'Unknown';

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div className="space-y-6">
      {/* Back Button */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-2 mt-4"
      >
        <Button
          onClick={onBack}
          variant="outline"
          className="flex items-center border-buttonActive bg-container text-buttonActive transition-colors duration-300 hover:bg-buttonActive hover:text-container"
          size="sm"
        >
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          Back to Cabinets
        </Button>
      </motion.div>

      {/* Header Info */}
      <motion.div
        className="relative mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex flex-col gap-4">
          {/* Top Row: Back button area already above, now title block */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1 min-w-0">
              {/* Serial Number Badge */}
              <div className="mb-1.5 flex items-center gap-2">
                <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  {cabinet?.serialNumber || 'N/A'}
                </span>
                {cabinet?.deletedAt &&
                  new Date(cabinet.deletedAt).getFullYear() > 2020 && (
                    <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                      DELETED
                    </span>
                  )}
              </div>

              {/* Custom Name / Game Title */}
              <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
                {cabinet?.custom?.name || cabinet?.game || cabinet?.serialNumber || 'Unknown Cabinet'}
              </h1>

              {/* Game Name (if different from title) */}
              {cabinet?.custom?.name && cabinet?.game && (
                <p className="mt-0.5 text-sm text-gray-500">
                  {cabinet.game}
                </p>
              )}
            </div>

            {/* Right Side: Online Status + Refresh */}
            <div className="flex items-center gap-2 sm:flex-shrink-0">
              <div className="hidden items-center gap-2 rounded-lg border bg-white px-3 py-1.5 shadow-sm sm:flex">
                <div
                  className={`h-2.5 w-2.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}
                />
                <span
                  className={`text-sm font-semibold ${isOnline ? 'text-green-600' : 'text-red-600'}`}
                >
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              <RefreshButton
                onClick={onRefresh}
                isSyncing={refreshing}
                label="Refresh"
              />
            </div>
          </div>

          {/* Metadata Row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
            <span>
              <span className="font-medium text-gray-600">Type:</span>{' '}
              {cabinet?.gameType || 'N/A'}
            </span>
            <span className="hidden text-gray-300 sm:inline">|</span>
            <span className="flex items-center gap-1.5">
              <span className="font-medium text-gray-600">Location:</span>
              {locationName === 'Location Not Found' ? (
                <span className="text-orange-600">Not Found</span>
              ) : locationName === 'No Location Assigned' ? (
                <span className="text-gray-400">None</span>
              ) : (
                <button
                  onClick={() =>
                    cabinet?.gamingLocation &&
                    onLocationClick(cabinet.gamingLocation)
                  }
                  className="cursor-pointer text-button hover:text-blue-600 hover:underline"
                  disabled={!cabinet?.gamingLocation}
                >
                  {locationName || 'Unknown'}
                </button>
              )}
              {cabinet?.gamingLocation &&
                !['Location Not Found', 'No Location Assigned'].includes(
                  locationName
                ) && (
                  <button
                    onClick={() => onLocationClick(cabinet.gamingLocation!)}
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-gray-400 hover:text-blue-600" />
                  </button>
                )}
            </span>
            <span className="hidden text-gray-300 sm:inline">|</span>
            <span>
              <span className="font-medium text-gray-600">Licencee:</span>{' '}
              {selectedLicencee === 'TTG' ? 'Trinidad' : 'International'}
            </span>
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-2">
            {canEditMachines && cabinet && (
              <Button
                onClick={() => onEdit(cabinet)}
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 px-3 text-xs"
              >
                <Pencil2Icon className="h-3.5 w-3.5" />
                Edit
              </Button>
            )}
            <button
              onClick={() =>
                onCopyToClipboard(cabinetCopyName, 'Cabinet Name')
              }
              className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-white px-3 text-xs font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
              title="Copy cabinet name"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy Name
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
