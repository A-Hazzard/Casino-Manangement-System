/**
 * No Data Message Component
 * Component for displaying a message when no data is available.
 *
 * Features:
 * - Centered message display
 * - Customizable message text
 * - Consistent styling
 *
 * @param message - Message text to display
 * @param className - Additional CSS classes
 */
import React from 'react';
import type { NoDataMessageProps } from '@/lib/types/components';

const NoDataMessage: React.FC<NoDataMessageProps> = ({
  message = 'No data available.',
  className,
}) => (
  <div
    className={`flex flex-col items-center justify-center rounded-lg bg-white p-8 shadow-md ${
      className || ''
    }`}
  >
    <div className="mb-2 text-lg text-gray-500">No Data Available</div>
    <div className="text-center text-sm text-gray-400">{message}</div>
  </div>
);

export default NoDataMessage;
