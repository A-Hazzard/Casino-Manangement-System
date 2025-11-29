/**
 * Cabinet Details Header Component
 * Header section displaying cabinet information, status, and action buttons.
 *
 * Features:
 * - Cabinet serial number and identifier display
 * - Online/offline status indicator
 * - Last online time display
 * - Edit and refresh action buttons
 * - Back navigation button
 * - Expandable cabinet information section
 * - Framer Motion animations
 * - Responsive design
 *
 * @param cabinetDetails - Cabinet details object
 * @param serialNumberIdentifier - Serial number or identifier to display
 * @param isOnline - Whether cabinet is online
 * @param lastOnlineMinutes - Minutes since last online
 * @param loading - Whether data is loading
 * @param onEdit - Callback when edit button is clicked
 * @param onRefresh - Callback when refresh button is clicked
 * @param onBack - Callback when back button is clicked
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  Pencil2Icon,
} from '@radix-ui/react-icons';
import { RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { differenceInMinutes } from 'date-fns';
import RefreshButton from '@/components/ui/RefreshButton';
import StatusIcon from '@/components/ui/common/StatusIcon';
import type { GamingMachine as CabinetDetail } from '@/shared/types/entities';
// Removed unused LocationInfo import

// Removed unused ExtendedLocationInfo type

type CabinetDetailsHeaderProps = {
  cabinetDetails: CabinetDetail | null;
  serialNumberIdentifier: string;
  isOnline: boolean;
  lastOnlineMinutes: number;
  loading: boolean;
  onEdit: () => void;
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

export const CabinetDetailsHeader = ({
  cabinetDetails,
  serialNumberIdentifier,
  isOnline,
  lastOnlineMinutes,
  loading,
  onEdit,
  onRefresh,
  onBack,
}: CabinetDetailsHeaderProps) => {
  const [showConfigDetails, setShowConfigDetails] = useState(false);

  // Handle back navigation
  const handleBack = () => {
    onBack();
  };

  // Handle edit action
  const handleEdit = () => {
    onEdit();
  };

  // Handle refresh action
  const handleRefresh = () => {
    onRefresh();
  };

  // Toggle config details visibility
  const toggleConfigDetails = () => {
    setShowConfigDetails(!showConfigDetails);
  };

  // Format last online time
  const formatLastOnline = () => {
    if (!cabinetDetails?.lastOnline) return 'Never';

    const lastOnlineDate = new Date(cabinetDetails.lastOnline);
    const now = new Date();
    const minutesAgo = differenceInMinutes(now, lastOnlineDate);

    if (minutesAgo < 1) return 'Just now';
    if (minutesAgo < 60) return `${minutesAgo} minutes ago`;
    if (minutesAgo < 1440) return `${Math.floor(minutesAgo / 60)} hours ago`;
    return `${Math.floor(minutesAgo / 1440)} days ago`;
  };

  // Get status badge color
  const getStatusBadgeColor = () => {
    if (isOnline) return 'bg-green-100 text-green-800 border-green-200';
    if (lastOnlineMinutes < 60)
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  // Get status text
  const getStatusText = () => {
    if (isOnline) return 'Online';
    if (lastOnlineMinutes < 60) return 'Recently Offline';
    return 'Offline';
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

  if (!cabinetDetails) {
    return (
      <div className="py-8 text-center">
        <div className="text-lg text-gray-500">Cabinet not found</div>
        <div className="text-sm text-gray-400">
          The requested cabinet could not be loaded
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
              {cabinetDetails.assetNumber || 'Unknown Asset'}
            </h1>
            <p className="text-sm text-gray-600">
              {cabinetDetails.game || 'Unknown Game'} •{' '}
              {cabinetDetails.locationName || 'Unknown Location'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleEdit}
            className="flex items-center gap-2"
          >
            <Pencil2Icon className="h-4 w-4" />
            Edit
          </Button>
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

      {/* Cabinet Status and Information */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Status Card */}
        <div className="rounded-lg border bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Status</p>
              <div className="mt-1 flex items-center gap-2">
                <StatusIcon isOnline={isOnline} />
                <span
                  className={`text-sm font-medium ${
                    isOnline ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {getStatusText()}
                </span>
              </div>
            </div>
            <Badge className={getStatusBadgeColor()}>
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
          </div>
        </div>

        {/* Serial Number Card */}
        <div className="rounded-lg border bg-white p-4">
          <div>
            <p className="text-sm font-medium text-gray-600">Serial Number</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {serialNumberIdentifier || 'N/A'}
            </p>
          </div>
        </div>

        {/* Last Online Card */}
        <div className="rounded-lg border bg-white p-4">
          <div>
            <p className="text-sm font-medium text-gray-600">Last Online</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {formatLastOnline()}
            </p>
          </div>
        </div>

        {/* Manufacturer Card */}
        <div className="rounded-lg border bg-white p-4">
          <div>
            <p className="text-sm font-medium text-gray-600">Manufacturer</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {cabinetDetails.manufacturer || 'Unknown'}
            </p>
          </div>
        </div>
      </div>

      {/* Configuration Details Toggle */}
      <div className="rounded-lg border bg-white">
        <button
          onClick={toggleConfigDetails}
          className="flex w-full items-center justify-between p-4 transition-colors hover:bg-gray-50"
        >
          <div className="text-left">
            <h3 className="text-lg font-semibold text-gray-900">
              Configuration Details
            </h3>
            <p className="text-sm text-gray-600">
              View cabinet configuration and settings
            </p>
          </div>
          <ChevronDownIcon
            className={`h-5 w-5 text-gray-400 transition-transform ${
              showConfigDetails ? 'rotate-180' : ''
            }`}
          />
        </button>

        <AnimatePresence>
          {showConfigDetails && (
            <motion.div
              variants={configContentVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="border-t"
            >
              <div className="space-y-4 p-4">
                {/* Game Configuration */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Game Type
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {cabinetDetails.gameType || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Cabinet Type
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {cabinetDetails.cabinetType || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Asset Status
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {cabinetDetails.assetStatus || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      SAS Version
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {cabinetDetails.sasVersion || 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Network Configuration */}
                {cabinetDetails.smibConfig && (
                  <div className="border-t pt-4">
                    <h4 className="text-md mb-3 font-semibold text-gray-900">
                      Network Configuration
                    </h4>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          MQTT URI
                        </label>
                        <p className="mt-1 break-words font-mono text-sm text-gray-900">
                          {cabinetDetails.smibConfig.mqtt?.mqttURI || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Network Mode
                        </label>
                        <p className="mt-1 text-sm text-gray-900">
                          {cabinetDetails.smibConfig.net?.netMode || 'N/A'}
                        </p>
                      </div>
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
