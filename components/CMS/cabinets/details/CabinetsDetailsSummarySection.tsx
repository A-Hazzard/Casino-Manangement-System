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
import { IMAGES } from '@/lib/constants';
import { getSerialNumberIdentifier } from '@/lib/utils/serialNumber';
import type { GamingMachine as Cabinet } from '@/shared/types/entities';
import { ArrowLeftIcon, Pencil2Icon } from '@radix-ui/react-icons';
import { Copy, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import RefreshButton from '@/components/shared/ui/RefreshButton';

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
  const cabinetName = cabinet ? getSerialNumberIdentifier(cabinet) : 'Unknown';

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
        <div className="flex flex-col justify-between md:flex-row md:items-center">
          <div className="mb-4 md:mb-0">
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Image
                src={IMAGES.cabinetsIcon}
                alt="Cabinet Icon"
                width={32}
                height={32}
                className="h-6 w-6 flex-shrink-0 sm:h-8 sm:w-8"
              />
              <span>Name: {cabinetName}</span>
              <button
                onClick={() => onCopyToClipboard(cabinetName, 'Cabinet Name')}
                className="ml-1 rounded p-1 transition-colors hover:bg-gray-100"
                title="Copy cabinet name"
              >
                <Copy className="h-4 w-4 text-gray-500 hover:text-blue-600" />
              </button>
              {/* Show edit button only if user can edit machines */}
              {canEditMachines && cabinet && (
                <motion.button
                  className="ml-2 rounded-full p-2 transition-colors hover:bg-gray-100"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onEdit(cabinet)}
                >
                  <Pencil2Icon className="h-5 w-5 text-button" />
                </motion.button>
              )}
            </h1>

            {/* Show deleted status badge if cabinet has been deleted */}
            {cabinet?.deletedAt && new Date(cabinet.deletedAt).getFullYear() > 2020 && (
              <div className="mt-2">
                <span className="inline-flex items-center rounded-full border border-red-200 bg-red-100 px-3 py-1 text-sm font-medium text-red-800">
                  <span className="mr-2 h-2 w-2 rounded-full bg-red-400"></span>
                  DELETED - {new Date(cabinet.deletedAt).toLocaleDateString()}
                </span>
              </div>
            )}

            <p className="mt-2 text-gray-500">
              Manufacturer: {cabinet?.gameConfig?.theoreticalRtp ? 'Some Manufacturer' : 'None'}
            </p>
            <p className="mt-1 text-gray-500">
              Game Type: {cabinet?.gameType || 'None'}
            </p>
            <p className="mt-1 flex items-center gap-2">
              <span className="text-button">
                {/* Show location name with appropriate styling based on location status */}
                {locationName === 'Location Not Found' ? (
                  <span className="text-orange-600">Location Not Found</span>
                ) : locationName === 'No Location Assigned' ? (
                  <span className="text-gray-500">No Location Assigned</span>
                ) : (
                  <button
                    onClick={() => cabinet?.gamingLocation && onLocationClick(cabinet.gamingLocation)}
                    className="cursor-pointer hover:text-blue-600 hover:underline"
                    disabled={!cabinet?.gamingLocation}
                  >
                    {locationName || 'Unknown Location'}
                  </button>
                )}
              </span>
              {/* Show external link icon if location is valid and assigned */}
              {cabinet?.gamingLocation && !['Location Not Found', 'No Location Assigned'].includes(locationName) && (
                <button onClick={() => onLocationClick(cabinet.gamingLocation!)}>
                  <ExternalLink className="h-4 w-4 text-gray-500 hover:text-blue-600" />
                </button>
              )}
              <span className="text-gray-400">, {selectedLicencee === 'TTG' ? 'Trinidad and Tobago' : 'International'}</span>
            </p>
          </div>

          <div className="mt-2 flex items-center gap-2 md:absolute md:right-0 md:top-0 md:mt-0">
            <div className="flex items-center rounded-lg border bg-white px-3 py-1.5 shadow-sm">
              <div className={`mr-2 h-2.5 w-2.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className={`text-sm font-semibold ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                {isOnline ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
            <RefreshButton onClick={onRefresh} isSyncing={refreshing} label="Refresh" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

