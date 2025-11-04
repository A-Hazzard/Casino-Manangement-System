'use client';

import React from 'react';
import { ExternalLink } from 'lucide-react';

type MachineInfoDisplayProps = {
  machineName?: string | React.ReactElement;
  smibId?: string;
  currentMetersIn?: number | null;
  currentMetersOut?: number | null;
  onViewMachine?: () => void;
  showExternalLink?: boolean;
  className?: string;
};

/**
 * MachineInfoDisplay Component
 * Displays machine information header with SMIB and current meters
 */
export const MachineInfoDisplay: React.FC<MachineInfoDisplayProps> = ({
  machineName = 'N/A',
  smibId = 'N/A',
  currentMetersIn = 0,
  currentMetersOut = 0,
  onViewMachine,
  showExternalLink = true,
  className = '',
}) => {
  return (
    <div className={`relative rounded-lg bg-gray-100 p-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          {typeof machineName === 'string' ? (
            <p className="font-semibold" dangerouslySetInnerHTML={{ __html: machineName }} />
          ) : (
            <p className="font-semibold">{machineName}</p>
          )}
          <p className="text-xs text-gray-500">SMIB: {smibId}</p>
          <p className="mt-1 text-xs text-gray-500">
            Current In: {currentMetersIn} | Current Out: {currentMetersOut}
          </p>
        </div>
        {showExternalLink && onViewMachine && (
          <ExternalLink
            className="ml-2 h-5 w-5 cursor-pointer text-blue-600 transition-transform hover:scale-110"
            onClick={(e) => {
              e.stopPropagation();
              onViewMachine();
            }}
          />
        )}
      </div>
    </div>
  );
};

