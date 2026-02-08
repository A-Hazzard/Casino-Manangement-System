/**
 * Vault Header Section
 *
 * Displays title, date, notifications, and manager on duty.
 *
 * @module components/VAULT/overview/sections/VaultHeader
 */
'use client';

import { Button } from '@/components/shared/ui/button';
import NotificationBell from '@/components/shared/ui/NotificationBell';
import { RefreshCw } from 'lucide-react';

type VaultHeaderProps = {
  bellNotifications: any[];
  denominations: any[];
  refreshing: boolean;
  onRefresh: () => void;
  onMarkAsRead: (id: string) => void | Promise<void>;
  onMarkAllAsRead: () => void | Promise<void>;
  onNotificationClick: (n: any) => void;
  onDismiss: (id: string) => void | Promise<void>;
  onApprove: (id: string) => Promise<void>;
  onDeny: (id: string, reason?: string) => Promise<void>;
  onCloseDay: () => void;
  isShiftActive?: boolean;
};

export default function VaultHeader({
  bellNotifications,
  denominations,
  refreshing,
  onRefresh,
  onMarkAsRead,
  onMarkAllAsRead,
  onNotificationClick,
  onDismiss,
  onApprove,
  onDeny,
  onCloseDay,
  isShiftActive,
}: VaultHeaderProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="mt-1 text-sm text-gray-600 flex items-center gap-2">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onRefresh} 
            disabled={refreshing}
            className="h-6 px-2 text-gray-400 hover:text-blue-600"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </p>
      </div>
      <div className="flex items-center gap-3">
       
        <NotificationBell
          notifications={bellNotifications}
          onMarkAsRead={onMarkAsRead}
          onMarkAllAsRead={onMarkAllAsRead}
          onNotificationClick={onNotificationClick}
          onDismiss={onDismiss}
          onApprove={onApprove}
          onDeny={onDeny}
          vaultInventory={denominations}
        />
         {isShiftActive && (
          <Button 
            onClick={onCloseDay}
            className="bg-orangeHighlight text-white hover:bg-orangeHighlight/90"
          >
            Close Day
          </Button>
        )}
      </div>
    </div>
  );
}
