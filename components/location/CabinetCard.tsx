import React from "react";
import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils/formatting";
import { CabinetDetail } from "@/lib/types/cabinets";

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
      className={`bg-white rounded-lg shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow ${
        isSelected ? "ring-2 ring-buttonActive" : ""
      }`}
      onClick={() => onClick(cabinet._id, cabinet.locationId || "")}
    >
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">
              {cabinet.assetNumber || (cabinet as Record<string, unknown>).serialNumber as string || (cabinet as Record<string, unknown>).origSerialNumber as string || (cabinet as Record<string, unknown>).machineId as string || "No ID"}
            </h3>
            <p className="text-xs text-gray-500">
              {cabinet.installedGame || cabinet.game || "No Game"}
            </p>
          </div>
          {/* Status indicator - kept for consistency, logic based on lastActivity */}
          <div
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              isOnline
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {isOnline ? "Online" : "Offline"}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4">
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
      </div>
    </motion.div>
  );
};

export default CabinetCard;
