import React from "react";
import { motion } from "framer-motion";
import { Pencil2Icon } from "@radix-ui/react-icons";
import { Skeleton } from "@/components/ui/skeleton";

type ExtendedCabinetInfoHeaderProps = {
  title: string;
  isLoading: boolean;
  isOnline?: boolean;
  // lastCommunication?: string; // Removed as unused
};

const CabinetInfoHeader: React.FC<ExtendedCabinetInfoHeaderProps> = ({
  title,
  isLoading,
  isOnline,
  // lastCommunication,
}) => {
  return (
    <motion.div
      className="mt-6 mb-6 relative"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex flex-col md:flex-row md:items-start justify-between w-full">
        <div className="md:w-3/4 mb-4 md:mb-0">
          <h1 className="text-2xl font-bold flex items-center">
            Name: {title}
            <motion.button
              className="ml-2 p-1"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Pencil2Icon className="w-5 h-5 text-button" />
            </motion.button>
          </h1>

          <p className="text-grayHighlight mt-2">
            Manufacturer: {isLoading ? <Skeleton className="h-4 w-32 inline-block" /> : "Some Manufacturer"}
          </p>
          <p className="text-grayHighlight mt-1">
            Game Type: {isLoading ? <Skeleton className="h-4 w-24 inline-block" /> : "None"}
          </p>
          <p className="mt-1">
            <span className="text-button">{title}</span>
          </p>
        </div>

        {/* Online status for desktop */}
        {isOnline !== undefined && (
          <div className="hidden md:flex items-center justify-end md:w-1/4 md:pr-4">
            <motion.div
              className={`w-3 h-3 rounded-full mr-2 ${
                isOnline ? "bg-button" : "bg-destructive"
              }`}
              animate={
                isOnline
                  ? { scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }
                  : { scale: 1, opacity: 1 }
              }
              transition={
                isOnline ? { repeat: Infinity, duration: 2 } : { duration: 0.3 }
              }
            />
            <span
              className={(isOnline
                ? "text-button font-bold"
                : "text-destructive font-bold"
              ).trim()}
            >
              {isOnline ? "ONLINE" : "OFFLINE"}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default CabinetInfoHeader;
