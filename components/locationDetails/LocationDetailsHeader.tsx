/**
 * Location Details Header Component
 * Header section displaying location information, status, and action buttons.
 *
 * Features:
 * - Location name and identifier display
 * - Online/offline status indicators
 * - Expandable location information section
 * - Edit and refresh action buttons
 * - Back navigation button
 * - Framer Motion animations
 * - Responsive design
 *
 * @param locationInfo - Extended location information object
 * @param loading - Whether data is loading
 * @param onRefresh - Callback when refresh button is clicked
 * @param onBack - Callback when back button is clicked
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeftIcon, ChevronDownIcon } from '@radix-ui/react-icons';
import { MapPinOff, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import RefreshButton from '@/components/ui/RefreshButton';
import type { LocationInfo } from '@/lib/types/pages';
import { hasMissingCoordinates } from '@/lib/utils/locationsPageUtils';
import type { AggregatedLocation } from '@/shared/types/common';

type ExtendedLocationInfo = LocationInfo & {
  status?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone?: string;
  email?: string;
  licenseNumber?: string;
  licenseExpiry?: string | Date;
  geoCoords?: {
    latitude?: number;
    longitude?: number;
    longtitude?: number;
  };
  cabinets?: Array<{
    online: boolean;
    [key: string]: unknown;
  }>;
};

type LocationDetailsHeaderProps = {
  locationInfo: ExtendedLocationInfo | null;
  loading: boolean;
  onRefresh: () => void;
  onBack: () => void;
};

// Animation variants
const configContentVariants = {
  hidden: { opacity: 0, height: 0 },
  visible: { opacity: 1, height: 'auto' },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
    },
  },
};

export const LocationDetailsHeader = ({
  locationInfo,
  loading,
  onRefresh,
  onBack,
}: LocationDetailsHeaderProps) => {
  const [showLocationDetails, setShowLocationDetails] = useState(false);

  // Handle back navigation
  const handleBack = () => {
    onBack();
  };

  // Handle refresh action
  const handleRefresh = () => {
    onRefresh();
  };

  // Toggle location details visibility
  const toggleLocationDetails = () => {
    setShowLocationDetails(!showLocationDetails);
  };

  // Get status badge color
  const getStatusBadgeColor = () => {
    if (!locationInfo) return 'bg-gray-100 text-gray-800 border-gray-200';

    const isActive = locationInfo?.status === 'active';
    return isActive
      ? 'bg-green-100 text-green-800 border-green-200'
      : 'bg-red-100 text-red-800 border-red-200';
  };

  // Get status text
  const getStatusText = () => {
    if (!locationInfo) return 'Unknown';
    return locationInfo?.status === 'active' ? 'Active' : 'Inactive';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 animate-pulse rounded bg-gray-200" />
            <div className="space-y-2">
              <div className="h-6 w-48 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-24 animate-pulse rounded bg-gray-200" />
            <div className="h-10 w-10 animate-pulse rounded bg-gray-200" />
          </div>
        </div>
      </div>
    );
  }

  if (!locationInfo) {
    return (
      <div className="py-8 text-center">
        <div className="text-lg text-gray-500">Location not found</div>
        <div className="text-sm text-gray-400">
          The requested location could not be loaded
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      initial="hidden"
      animate="visible"
      variants={itemVariants}
    >
      {/* Header with back button and title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={handleBack}
            className="hover:bg-gray-100"
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {locationInfo.name || 'Unknown Location'}
            </h1>
            <p className="text-sm text-gray-600">
              {locationInfo.address || 'No address provided'} •{' '}
              {locationInfo?.city || 'Unknown City'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <RefreshButton
            onClick={handleRefresh}
            isSyncing={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </RefreshButton>
        </div>
      </div>

      {/* Location Status and Information */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Status Card */}
        <div className="rounded-lg border bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Status</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {getStatusText()}
              </p>
            </div>
            <Badge className={getStatusBadgeColor()}>{getStatusText()}</Badge>
          </div>
        </div>

        {/* Total Cabinets Card */}
        <div className="rounded-lg border bg-white p-4">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Cabinets</p>
            <p className="mt-1 text-2xl font-bold text-blue-600">
              {locationInfo?.cabinets?.length || 0}
            </p>
          </div>
        </div>

        {/* Online Cabinets Card */}
        <div className="rounded-lg border bg-white p-4">
          <div>
            <p className="text-sm font-medium text-gray-600">Online Cabinets</p>
            <p className="mt-1 text-2xl font-bold text-green-600">
              {locationInfo?.cabinets?.filter(cabinet => cabinet.online)
                .length || 0}
            </p>
          </div>
        </div>

        {/* Offline Cabinets Card */}
        <div className="rounded-lg border bg-white p-4">
          <div>
            <p className="text-sm font-medium text-gray-600">
              Offline Cabinets
            </p>
            <p className="mt-1 text-2xl font-bold text-red-600">
              {locationInfo?.cabinets?.filter(cabinet => !cabinet.online)
                .length || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Location Details Toggle */}
      <div className="rounded-lg border bg-white">
        <button
          onClick={toggleLocationDetails}
          className="flex w-full items-center justify-between p-4 transition-colors hover:bg-gray-50"
        >
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900">
                Location Details
              </h3>
              {/* Missing Coordinates Icon */}
              {(!locationInfo?.geoCoords ||
                hasMissingCoordinates(
                  locationInfo as AggregatedLocation
                )) && (
                <div className="group relative inline-flex flex-shrink-0">
                  <MapPinOff className="h-4 w-4 text-red-600" />
                  <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                    This location&apos;s coordinates have not been set
                  </div>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-600">
              View location information and settings
            </p>
          </div>
          <ChevronDownIcon
            className={`h-5 w-5 text-gray-400 transition-transform ${
              showLocationDetails ? 'rotate-180' : ''
            }`}
          />
        </button>

        <AnimatePresence>
          {showLocationDetails && (
            <motion.div
              variants={configContentVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="border-t"
            >
              <div className="space-y-4 p-4">
                {/* Basic Information */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Location ID
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {locationInfo._id || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Status
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {locationInfo?.status || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Address
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {locationInfo.address || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      City
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {locationInfo?.city || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      State
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {locationInfo?.state || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Zip Code
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {locationInfo?.zipCode || 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Contact Information */}
                {(locationInfo?.phone || locationInfo?.email) && (
                  <div className="border-t pt-4">
                    <h4 className="text-md mb-3 font-semibold text-gray-900">
                      Contact Information
                    </h4>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {locationInfo?.phone && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">
                            Phone
                          </label>
                          <p className="mt-1 text-sm text-gray-900">
                            {locationInfo.phone}
                          </p>
                        </div>
                      )}
                      {locationInfo?.email && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">
                            Email
                          </label>
                          <p className="mt-1 text-sm text-gray-900">
                            {locationInfo.email}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* License Information */}
                {locationInfo?.licenseNumber && (
                  <div className="border-t pt-4">
                    <h4 className="text-md mb-3 font-semibold text-gray-900">
                      License Information
                    </h4>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          License Number
                        </label>
                        <p className="mt-1 font-mono text-sm text-gray-900">
                          {locationInfo.licenseNumber}
                        </p>
                      </div>
                      {locationInfo?.licenseExpiry && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">
                            License Expiry
                          </label>
                          <p className="mt-1 text-sm text-gray-900">
                            {new Date(
                              locationInfo.licenseExpiry
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
