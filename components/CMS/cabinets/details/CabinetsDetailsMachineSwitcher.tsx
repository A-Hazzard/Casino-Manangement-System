/**
 * Cabinets Details Machine Switcher
 *
 * Dropdown to switch between machines at the same location without leaving
 * the cabinet detail page.
 */

'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import CopyMachineFieldsButtons from '@/components/shared/ui/CopyMachineFieldsButtons';
import { LocationMachineSwitcherSkeleton } from '@/components/shared/ui/skeletons/CabinetDetailSkeletons';
import { formatMachineDisplayName } from '@/components/shared/ui/machineDisplay';
import type { GamingMachine as Cabinet } from '@/shared/types/entities';

type CabinetsDetailsMachineSwitcherProps = {
  machines: Cabinet[];
  currentMachineId: string;
  loading: boolean;
  onMachineSelect: (machineId: string) => void;
};

export default function CabinetsDetailsMachineSwitcher({
  machines,
  currentMachineId,
  loading,
  onMachineSelect,
}: CabinetsDetailsMachineSwitcherProps) {
  if (loading) {
    return <LocationMachineSwitcherSkeleton />;
  }

  if (machines.length === 0) {
    return null;
  }

  return (
    <Select
      value={currentMachineId}
      onValueChange={next => {
        if (next && next !== currentMachineId) {
          onMachineSelect(next);
        }
      }}
    >
      <SelectTrigger className="h-9 w-full min-w-0 max-w-xs border-buttonActive bg-container text-sm text-gray-800">
        <SelectValue placeholder="Select machine…" />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {machines.map(machine => (
          <SelectItem
            key={machine._id}
            value={String(machine._id)}
            className="pr-2"
          >
            <div className="flex w-full items-center justify-between gap-2 pr-6">
              <span className="truncate">
                {formatMachineDisplayName(machine)}
              </span>
              <CopyMachineFieldsButtons
                machine={machine}
                machineId={String(machine._id)}
              />
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
