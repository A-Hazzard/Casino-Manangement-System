'use client';

import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { VariationsListDisplay } from './VariationsListDisplay';
import type { MachineVariationData } from '@/lib/hooks/collectionReport/useCollectionReportVariationCheck';

interface VariationsCollapsibleSectionProps {
  machines: MachineVariationData[];
  isExpanded: boolean;
  onExpandChange: (expanded: boolean) => void;
  onMachineClick?: (machineId: string) => void;
}

export function VariationsCollapsibleSection({
  machines,
  isExpanded,
  onExpandChange,
  onMachineClick,
}: VariationsCollapsibleSectionProps) {
  const variationCount = machines.filter(m => typeof m.variation === 'number' && Math.abs(m.variation) > 0.1).length;

  if (variationCount === 0) {
    return null;
  }

  return (
    <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-4">
      {/* Header */}
      <button
        onClick={() => onExpandChange(!isExpanded)}
        className="flex w-full items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-white text-sm font-bold">
            {variationCount}
          </div>
          <span className="font-semibold text-gray-900">
            Variations Found: {variationCount} {variationCount === 1 ? 'machine' : 'machines'} with variation
          </span>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-5 w-5 text-gray-600" />
        </motion.div>
      </button>

      {/* Content */}
      <motion.div
        initial={false}
        animate={{ height: isExpanded ? 'auto' : 0, opacity: isExpanded ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden"
      >
        <div className="pt-3">
          <VariationsListDisplay machines={machines} onMachineClick={onMachineClick} />
        </div>
      </motion.div>
    </div>
  );
}
