/**
 * CollectionReportDetailsPagination Component
 *
 * Provides pagination controls for machine metrics.
 * Supports direct page entry and sequential navigation.
 */

'use client';

import { Button } from '@/components/shared/ui/button';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
} from '@radix-ui/react-icons';
import { FC } from 'react';

type CollectionReportDetailsPaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export const CollectionReportDetailsPagination: FC<CollectionReportDetailsPaginationProps> = ({ 
  currentPage, 
  totalPages, 
  onPageChange 
}) => {
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
      >
        <DoubleArrowLeftIcon className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        <ChevronLeftIcon className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Page</span>
        <input
          type="number"
          min={1}
          max={totalPages}
          value={currentPage}
          onChange={(e) => onPageChange(Number(e.target.value))}
          className="w-12 rounded border border-gray-300 p-1 text-center text-sm focus:border-blue-500 focus:outline-none"
        />
        <span className="text-sm text-gray-500">of {totalPages}</span>
      </div>

      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        <ChevronRightIcon className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
      >
        <DoubleArrowRightIcon className="h-4 w-4" />
      </Button>
    </div>
  );
};
