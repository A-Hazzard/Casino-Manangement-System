/**
 * CollectionReportDetailsSortableHeader Component
 *
 * A reusable table header for machine metrics that supports sorting.
 * Displays directional icons when active.
 */

'use client';

import { TableHead } from '@/components/shared/ui/table';
import type { MachineMetric } from '@/lib/types/api';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { FC } from 'react';

type CollectionReportDetailsSortableHeaderProps = {
  label: string;
  field: keyof MachineMetric;
  currentField: keyof MachineMetric;
  direction: 'asc' | 'desc';
  onClick: (field: keyof MachineMetric) => void;
};

export const CollectionReportDetailsSortableHeader: FC<CollectionReportDetailsSortableHeaderProps> = ({ 
  label, 
  field, 
  currentField, 
  direction, 
  onClick 
}) => {
  return (
    <TableHead
      onClick={() => onClick(field)}
      className="cursor-pointer px-4 py-4 font-semibold text-gray-600 transition-colors hover:text-blue-600"
    >
      <div className="flex items-center gap-1.5">
        {label}
        {currentField === field && (
          direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
        )}
      </div>
    </TableHead>
  );
};
