/**
 * Machine Online Status Dot Component
 *
 * Displays an Online/Offline/No-SMIB badge for a machine based on SMIB connectivity.
 *
 * @module components/ui/MachineOnlineStatusDot
 */
'use client';

import { Badge } from '@/components/shared/ui/badge';
import { MobileIcon, Cross1Icon } from '@radix-ui/react-icons';

type MachineOnlineStatusDotProps = {
  /** true = online, false = offline, undefined = no SMIB */
  isOnline: boolean | undefined;
  /** true when the machine has no SMIB relay */
  hasRelay?: boolean;
};

/**
 * Online/Offline/No-SMIB badge for machine status.
 * Shows "No SMIB" when hasRelay is false, online/offline when SMIB exists.
 */
export default function MachineOnlineStatusDot({
  isOnline,
  hasRelay,
}: MachineOnlineStatusDotProps) {
  if (hasRelay === false) {
    return (
      <Badge
        variant="outline"
        className="inline-flex w-fit flex-shrink-0 items-center gap-1 rounded-full border-gray-300 bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
      >
        <Cross1Icon className="h-3 w-3" />
        No SMIB
      </Badge>
    );
  }

  if (isOnline === undefined) return null;

  return (
    <Badge
      variant={isOnline ? 'default' : 'destructive'}
      className={`inline-flex w-fit flex-shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
        isOnline
          ? 'bg-green-100 text-green-700 hover:bg-green-200'
          : 'bg-red-100 text-red-700 hover:bg-red-200'
      }`}
    >
      {isOnline ? (
        <MobileIcon className="h-3 w-3" />
      ) : (
        <Cross1Icon className="h-3 w-3" />
      )}
      {isOnline ? 'Online' : 'Offline'}
    </Badge>
  );
}
