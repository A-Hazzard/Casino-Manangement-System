'use client';


import { ReactElement } from 'react';
import { ExternalLink } from 'lucide-react';

type MachineInfoDisplayProps = {
  machineName?: string | ReactElement;
  smibId?: string;
  currentMetersIn?: number | null;
  currentMetersOut?: number | null;
  onViewMachine?: () => void;
  showExternalLink?: boolean;
  className?: string;
};

/**
 * CollectionReportFormMachineInfoDisplay Component
 * Displays machine information header with SMIB and current meters
 */
export default function CollectionReportFormMachineInfoDisplay({
  machineName = 'N/A',
  smibId = 'N/A',
  currentMetersIn = 0,
  currentMetersOut = 0,
  onViewMachine,
  showExternalLink = true,
  className = '',
}: MachineInfoDisplayProps) {
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
          <button
            type="button"
            className="ml-2 shrink-0 rounded p-1 text-blue-600 transition-transform hover:scale-110 hover:bg-blue-50 active:scale-95"
            onClick={(e) => {
              e.stopPropagation();
              onViewMachine();
            }}
            aria-label="View machine details"
            title="View machine details"
          >
            <ExternalLink className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
};


