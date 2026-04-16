/**
 * CollectionReportDetailsIndicators Components
 *
 * Visual indicators for machine state and adjustments.
 * - RamClearIndicator: Shows machine was RAM cleared
 * - JackpotIndicator: Shows machine had a jackpot deduction
 */

'use client';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/shared/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/shared/ui/popover';
import { FileText, Zap } from 'lucide-react';
import Image from 'next/image';
import { FC } from 'react';

export const CollectionReportDetailsRamClearIndicator: FC = () => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex h-8 w-8 shrink-0 animate-pulse items-center justify-center rounded-full bg-orange-500 text-white shadow-md">
            <Zap className="h-5 w-5" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm font-medium">Machine was RAM cleared</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export const CollectionReportDetailsJackpotIndicator: FC = () => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex h-8 w-8 shrink-0 cursor-default items-center justify-center">
            <Image
              src="/jackpot.svg"
              alt="Jackpot"
              width={28}
              height={28}
              className="drop-shadow-md"
            />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm font-medium">Machine had a jackpot deduction</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

type CollectionReportDetailsNoteIndicatorProps = {
  note: string;
};

export const CollectionReportDetailsNoteIndicator: FC<
  CollectionReportDetailsNoteIndicatorProps
> = ({ note }) => {
  return (
    <Popover>
      <TooltipProvider>
        <Tooltip>
          <PopoverTrigger asChild>
            <TooltipTrigger asChild>
              <button className="flex h-8 w-8 shrink-0 cursor-help items-center justify-center rounded-full bg-blue-100 text-blue-600 shadow-sm transition-colors hover:bg-blue-200">
                <FileText className="h-5 w-5" />
              </button>
            </TooltipTrigger>
          </PopoverTrigger>
          <TooltipContent side="top">
            <p className="text-xs">Click to view note</p>
          </TooltipContent>
          <PopoverContent side="right" className="w-[280px] p-4">
            <div className="space-y-2">
              <h4 className="flex items-center gap-2 font-semibold text-blue-700">
                <FileText className="h-4 w-4" />
                Collection Note
              </h4>
              <p className="text-sm italic text-gray-700 leading-relaxed">{note}</p>
            </div>
          </PopoverContent>
        </Tooltip>
      </TooltipProvider>
    </Popover>
  );
};
