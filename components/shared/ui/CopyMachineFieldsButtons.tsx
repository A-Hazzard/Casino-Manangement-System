'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shared/ui/dropdown-menu';
import { copyToClipboard } from '@/lib/utils/common/clipboard';
import {
  resolveGmNumber,
  resolveMachineRouteId,
  resolveSerialNumber,
  type GmNumberSource,
  type MachineIdSource,
  type SerialNumberSource,
} from '@/lib/utils/machineIdentifiers';
import { cn } from '@/lib/utils';
import { Check, Copy } from 'lucide-react';
import { type PointerEvent, useMemo, useState } from 'react';

type MachineFieldsSource = MachineIdSource &
  GmNumberSource &
  SerialNumberSource;

type CopyableField = {
  label: string;
  value: string;
};

type CopyMachineFieldsButtonsProps = {
  machine?: MachineFieldsSource;
  machineId?: string | null | undefined;
  gmNumber?: string | null | undefined;
  serialNumber?: string | null | undefined;
  displayName?: string | null | undefined;
  className?: string;
  size?: 'sm' | 'md';
  variant?: 'icon' | 'button';
  showDisplayName?: boolean;
  showId?: boolean;
  showGm?: boolean;
  showSerial?: boolean;
};

export function CopyMachineFieldsButtons({
  machine,
  machineId,
  gmNumber,
  serialNumber,
  displayName,
  className,
  size = 'sm',
  variant = 'icon',
  showDisplayName = false,
  showId = true,
  showGm = true,
  showSerial = true,
}: CopyMachineFieldsButtonsProps) {
  const [copied, setCopied] = useState(false);

  const copyableFields = useMemo(() => {
    const fields: CopyableField[] = [];

    if (showDisplayName) {
      const resolvedDisplayName = displayName?.trim();
      if (resolvedDisplayName) {
        fields.push({ label: 'Display Name', value: resolvedDisplayName });
      }
    }

    if (showId) {
      const resolvedMachineId =
        machineId?.trim() || resolveMachineRouteId(machine);
      if (resolvedMachineId) {
        fields.push({ label: 'Machine ID', value: resolvedMachineId });
      }
    }

    if (showGm) {
      const resolvedGmNumber = gmNumber?.trim() || resolveGmNumber(machine);
      if (resolvedGmNumber) {
        fields.push({ label: 'GM Number', value: resolvedGmNumber });
      }
    }

    if (showSerial) {
      const resolvedSerialNumber =
        serialNumber?.trim() || resolveSerialNumber(machine);
      if (resolvedSerialNumber) {
        fields.push({ label: 'Serial Number', value: resolvedSerialNumber });
      }
    }

    return fields;
  }, [
    displayName,
    gmNumber,
    machine,
    machineId,
    serialNumber,
    showDisplayName,
    showGm,
    showId,
    showSerial,
  ]);

  if (copyableFields.length === 0) {
    return null;
  }

  const iconSize = size === 'md' ? 'h-4 w-4' : 'h-3 w-3';

  const handlePointerDown = (event: PointerEvent) => {
    event.stopPropagation();
  };

  const handleCopy = async (value: string, label: string) => {
    const success = await copyToClipboard(value, label);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const triggerContent =
    variant === 'button' ? (
      <>
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
        Copy
      </>
    ) : copied ? (
      <Check className={cn(iconSize, 'text-green-500')} />
    ) : (
      <Copy className={iconSize} />
    );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onPointerDown={handlePointerDown}
          title="Copy machine fields"
          aria-label="Copy machine fields"
          className={cn(
            variant === 'button'
              ? 'inline-flex h-8 items-center gap-1.5 rounded-md border bg-white px-3 text-xs font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50'
              : 'inline-flex shrink-0 items-center rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700',
            className
          )}
        >
          {triggerContent}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        onClick={event => event.stopPropagation()}
      >
        {copyableFields.map(field => (
          <DropdownMenuItem
            key={field.label}
            onClick={event => {
              event.stopPropagation();
              void handleCopy(field.value, field.label);
            }}
          >
            {field.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default CopyMachineFieldsButtons;
