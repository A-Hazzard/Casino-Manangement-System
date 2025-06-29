import React from "react";
import type { NoDataMessageProps } from "@/lib/types/components";

/**
 * Displays a message when no data is available
 */
const NoDataMessage: React.FC<NoDataMessageProps> = ({
  message = "No data available.",
  className,
}) => (
  <div
    className={`flex flex-col items-center justify-center p-8 bg-white rounded-lg shadow-md ${
      className || ""
    }`}
  >
    <div className="text-gray-500 text-lg mb-2">No Data Available</div>
    <div className="text-gray-400 text-sm text-center">{message}</div>
  </div>
);

export default NoDataMessage;
