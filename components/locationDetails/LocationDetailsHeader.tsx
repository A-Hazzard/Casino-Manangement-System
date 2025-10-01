/**
 * Location Details Header Component
 * Handles the header section with location information and navigation
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeftIcon,
  ChevronDownIcon,
} from "@radix-ui/react-icons";
import { RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import RefreshButton from "@/components/ui/RefreshButton";
import type { LocationInfo } from "@/lib/types/pages";

// Extended LocationInfo type to include additional properties
type ExtendedLocationInfo = LocationInfo & {
  status?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone?: string;
  email?: string;
  licenseNumber?: string;
  licenseExpiry?: string | Date;
  cabinets?: Array<{
    online: boolean;
    [key: string]: unknown;
  }>;
};

interface LocationDetailsHeaderProps {
  // Data props
  locationInfo: ExtendedLocationInfo | null;
  
  // Loading states
  loading: boolean;
  
  // Actions
  onRefresh: () => void;
  onBack: () => void;
}

// Animation variants
const configContentVariants = {
  hidden: { opacity: 0, height: 0 },
  visible: { opacity: 1, height: "auto" },
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
    if (!locationInfo) return "bg-gray-100 text-gray-800 border-gray-200";
    
    const isActive = locationInfo?.status === "active";
    return isActive 
      ? "bg-green-100 text-green-800 border-green-200"
      : "bg-red-100 text-red-800 border-red-200";
  };

  // Get status text
  const getStatusText = () => {
    if (!locationInfo) return "Unknown";
    return locationInfo?.status === "active" ? "Active" : "Inactive";
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-gray-200 rounded animate-pulse" />
            <div className="space-y-2">
              <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 w-10 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!locationInfo) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500 text-lg">Location not found</div>
        <div className="text-gray-400 text-sm">The requested location could not be loaded</div>
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
              {locationInfo.name || "Unknown Location"}
            </h1>
            <p className="text-sm text-gray-600">
              {locationInfo.address || "No address provided"} • {locationInfo?.city || "Unknown City"}
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status Card */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Status</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {getStatusText()}
              </p>
            </div>
            <Badge className={getStatusBadgeColor()}>
              {getStatusText()}
            </Badge>
          </div>
        </div>

        {/* Total Cabinets Card */}
        <div className="bg-white rounded-lg border p-4">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Cabinets</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              {locationInfo?.cabinets?.length || 0}
            </p>
          </div>
        </div>

        {/* Online Cabinets Card */}
        <div className="bg-white rounded-lg border p-4">
          <div>
            <p className="text-sm font-medium text-gray-600">Online Cabinets</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {locationInfo?.cabinets?.filter(cabinet => cabinet.online).length || 0}
            </p>
          </div>
        </div>

        {/* Offline Cabinets Card */}
        <div className="bg-white rounded-lg border p-4">
          <div>
            <p className="text-sm font-medium text-gray-600">Offline Cabinets</p>
            <p className="text-2xl font-bold text-red-600 mt-1">
              {locationInfo?.cabinets?.filter(cabinet => !cabinet.online).length || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Location Details Toggle */}
      <div className="bg-white rounded-lg border">
        <button
          onClick={toggleLocationDetails}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="text-left">
            <h3 className="text-lg font-semibold text-gray-900">Location Details</h3>
            <p className="text-sm text-gray-600">View location information and settings</p>
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
              <div className="p-4 space-y-4">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Location ID</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {locationInfo._id || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Status</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {locationInfo?.status || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Address</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {locationInfo.address || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">City</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {locationInfo?.city || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">State</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {locationInfo?.state || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Zip Code</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {locationInfo?.zipCode || "N/A"}
                    </p>
                  </div>
                </div>

                {/* Contact Information */}
                {(locationInfo?.phone || locationInfo?.email) && (
                  <div className="border-t pt-4">
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Contact Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {locationInfo?.phone && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">Phone</label>
                          <p className="text-sm text-gray-900 mt-1">
                            {locationInfo.phone}
                          </p>
                        </div>
                      )}
                      {locationInfo?.email && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">Email</label>
                          <p className="text-sm text-gray-900 mt-1">
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
                    <h4 className="text-md font-semibold text-gray-900 mb-3">License Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">License Number</label>
                        <p className="text-sm text-gray-900 mt-1 font-mono">
                          {locationInfo.licenseNumber}
                        </p>
                      </div>
                      {locationInfo?.licenseExpiry && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">License Expiry</label>
                          <p className="text-sm text-gray-900 mt-1">
                            {new Date(locationInfo.licenseExpiry).toLocaleDateString()}
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
