/**
 * Location Info Component
 * Card component displaying location information and financial metrics.
 *
 * Features:
 * - Location name and address display
 * - Financial metrics (Gross, Net, Drop, Win)
 * - Currency formatting with overflow handling
 * - Address formatting
 * - Framer Motion animations
 * - Responsive grid layout
 *
 * @param location - Location data object
 */
import React from 'react';
import { motion } from 'framer-motion';
import { LocationData } from '@/lib/types/location';
import { formatCurrency } from '@/lib/utils/formatting';
import CurrencyValueWithOverflow from '@/components/ui/CurrencyValueWithOverflow';
import type { LocationData as LocationDataType } from '@/lib/types/location';

// ============================================================================
// Types & Helper Functions
// ============================================================================

type ExtendedLocationInfoProps = {
  location: LocationDataType | null;
};

const LocationInfoCard: React.FC<ExtendedLocationInfoProps> = ({
  location,
}) => {
  // Format address object into a string
  const formatAddress = (address?: LocationData['address']) => {
    if (!address || typeof address !== 'object') return 'N/A';
    const street =
      'street' in address && typeof address.street === 'string'
        ? address.street
        : '';
    const city =
      'city' in address && typeof address.city === 'string' ? address.city : '';
    const country =
      'country' in address && typeof address.country === 'string'
        ? address.country
        : '';
    const parts = [street, city, country].filter(Boolean);
    return parts.join(', ') || 'N/A';
  };

  return (
    <motion.div
      className="mb-6 rounded-lg bg-white p-4 shadow-sm md:p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="mb-4 text-lg font-semibold">Location Information</h2>
          <div className="space-y-2">
            <p>
              <span className="font-medium">Name:</span>{' '}
              {location?.locationName}
            </p>
            <div className="mt-4 text-sm text-gray-600">
              <p>
                <span className="font-medium">Address:</span>{' '}
                {formatAddress(location?.address)}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="mb-4 text-lg font-semibold">Metrics</h2>
          <div className="grid grid-cols-1 gap-2">
            <motion.div
              className="rounded-lg bg-gray-50 p-3"
              whileHover={{
                scale: 1.02,
                backgroundColor: '#f5f3ff',
              }}
            >
              <p className="text-sm text-gray-500">Total Cabinets</p>
              <p className="text-lg font-semibold">{location?.totalMachines}</p>
            </motion.div>
            <motion.div
              className="rounded-lg bg-gray-50 p-3"
              whileHover={{
                scale: 1.02,
                backgroundColor: '#f0fdf4',
              }}
            >
              <p className="text-sm text-gray-500">Money In</p>
              <p className="text-lg font-semibold">
                <CurrencyValueWithOverflow
                  value={location?.moneyIn ?? 0}
                  formatCurrencyFn={formatCurrency}
                />
              </p>
            </motion.div>
            <motion.div
              className="rounded-lg bg-gray-50 p-3"
              whileHover={{
                scale: 1.02,
                backgroundColor: '#fef2f2',
              }}
            >
              <p className="text-sm text-gray-500">Money Out</p>
              <p className="text-lg font-semibold">
                <CurrencyValueWithOverflow
                  value={location?.moneyOut ?? 0}
                  formatCurrencyFn={formatCurrency}
                />
              </p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default LocationInfoCard;
