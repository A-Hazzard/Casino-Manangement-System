import React from 'react';
import { motion } from 'framer-motion';
import { formatCurrency } from '@/lib/utils/formatting';
import { GamingMachine as CabinetDetail } from '@/shared/types/entities';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ExtendedCabinetCardProps = {
  cabinet: CabinetDetail;
  onClick: (cabinetId: string, locationId: string) => void;
  isSelected?: boolean;
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
  },
};

const CabinetCard: React.FC<ExtendedCabinetCardProps> = ({
  cabinet,
  onClick,
  isSelected,
}) => {
  // Determine status based on lastActivity - assume online if active within last 3 minutes
  const isOnline = cabinet.lastActivity
    ? new Date().getTime() - new Date(cabinet.lastActivity).getTime() <
      3 * 60 * 1000
    : false;

  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ scale: 1.03 }}
      transition={{ duration: 0.3 }}
      className={`overflow-hidden rounded-lg bg-white shadow-sm transition-shadow hover:shadow-md ${
        isSelected ? 'ring-2 ring-buttonActive' : ''
      }`}
    >
      <div className="p-4">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">
              {cabinet.assetNumber ||
                ((cabinet as Record<string, unknown>).serialNumber as string) ||
                ((cabinet as Record<string, unknown>)
                  .origSerialNumber as string) ||
                ((cabinet as Record<string, unknown>).machineId as string) ||
                'No ID'}
            </h3>
            <p className="text-xs text-gray-500">
              {cabinet.installedGame || cabinet.game || 'No Game'}
            </p>
          </div>
          {/* Status indicator - kept for consistency, logic based on lastActivity */}
          <div
            className={`rounded-full px-2 py-1 text-xs font-medium ${
              isOnline
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {isOnline ? 'Online' : 'Offline'}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
          <div>
            <p className="text-xs text-gray-500">Money In</p>
            <p className="font-medium">
              {formatCurrency(cabinet.moneyIn || 0)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Money Out</p>
            <p className="font-medium">
              {formatCurrency(cabinet.moneyOut || 0)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Gross</p>
            <p className="font-medium">{formatCurrency(cabinet.gross || 0)}</p>
          </div>
          {/* Removed Net as it's not directly available in CabinetDetail */}
        </div>

        {/* Action Button */}
        <div className="mt-3 border-t border-gray-200 pt-3">
          <Button
            onClick={() => onClick(cabinet._id, cabinet.locationId || '')}
            variant="outline"
            size="sm"
            className="w-full flex items-center justify-center gap-1.5 text-xs"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>View</span>
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default CabinetCard;
