import React from "react";
import { motion } from "framer-motion";

type ExtendedStatusIndicatorProps = {
  isOnline: boolean;
};

const StatusIndicator: React.FC<ExtendedStatusIndicatorProps> = ({
  isOnline,
}) => {
  return (
    <motion.div
      className="w-full bg-container border border-border rounded-md shadow mb-4 md:hidden"
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <div className="flex items-center justify-center py-3">
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
    </motion.div>
  );
};

export default StatusIndicator;
