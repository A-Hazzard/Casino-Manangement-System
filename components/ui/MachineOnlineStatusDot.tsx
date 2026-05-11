'use client';

import { Badge } from '@/components/shared/ui/badge';
import { MobileIcon, Cross1Icon } from '@radix-ui/react-icons';

type MachineOnlineStatusDotProps = {
  /** true = online, false = offline, undefined = no SMIB (hidden) */
  isOnline: boolean | undefined;
};

/**
 * Online/Offline badge mirroring the cabinets table asset column.
 * Renders nothing when isOnline is undefined (machine has no SMIB).
 */
export default function MachineOnlineStatusDot({
  isOnline,
}: MachineOnlineStatusDotProps) {
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
