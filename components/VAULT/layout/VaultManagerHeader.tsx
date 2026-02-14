/**
 * Shared Vault Management Header
 * 
 * Provides a consistent header for all Vault Management sub-pages (Cashiers, Floats, etc.)
 * Includes a back button and a persistent notification bell with polling.
 * 
 * @module components/VAULT/layout/VaultManagerHeader
 */
'use client';

import DebugSection from '@/components/shared/debug/DebugSection';
import NotificationBell from '@/components/shared/ui/NotificationBell';
import { Button } from '@/components/shared/ui/button';
import { DEFAULT_POLL_INTERVAL } from '@/lib/constants';
import { fetchVaultBalance, handleFloatAction, handleFloatConfirm } from '@/lib/helpers/vaultHelpers';
import { useNotifications } from '@/lib/hooks/vault/useNotifications';
import { useUserStore } from '@/lib/store/userStore';
import type { Denomination } from '@/shared/types/vault';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

type VaultManagerHeaderProps = {
  title?: string;
  description?: React.ReactNode;
  backHref?: string;
  showBack?: boolean;
  children?: React.ReactNode;
  onFloatActionComplete?: () => void; // Callback after float approve/deny
  showNotificationBell?: boolean;
};

export default function VaultManagerHeader({ 
  title, 
  description, 
  backHref = '/vault/management',
  showBack = true,
  children,
  onFloatActionComplete,
  showNotificationBell = true
}: VaultManagerHeaderProps) {
  const { user } = useUserStore();
  const locationId = user?.assignedLocations?.[0];
  const [vaultInventory, setVaultInventory] = useState<Denomination[]>([]);

  const {
    notifications,
    markAsRead,
    refresh,
    dismissNotification
  } = useNotifications(showNotificationBell ? locationId : undefined);

  // Fetch vault inventory for float request verification
  const fetchInventory = useCallback(async () => {
    if (!locationId) return;
    
    const balance = await fetchVaultBalance(locationId);
    if (balance?.denominations) {
      setVaultInventory(balance.denominations);
    }
  }, [locationId]);

  // Initial fetch of inventory
  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Poll for notifications every 30 seconds
  useEffect(() => {
    if (!locationId || !showNotificationBell) return;
    
    const interval = setInterval(() => {
      refresh();
      fetchInventory(); // Also refresh inventory
    }, DEFAULT_POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [locationId, refresh, fetchInventory, showNotificationBell]);

  // Handle float request approval
  const handleFloatApprove = useCallback(async (requestId: string, approvedDenominations?: Denomination[]) => {
    try {
      const status = approvedDenominations ? 'edited' : 'approved';
      let data: any = undefined;

      if (approvedDenominations) {
          const approvedAmount = approvedDenominations.reduce((sum, d) => sum + (d.denomination * d.quantity), 0);
          data = { approvedDenominations, approvedAmount };
      }

      const result = await handleFloatAction(requestId, status, data);

      if (result.success) {
        toast.success(approvedDenominations ? 'Float request validated and approved' : 'Float request approved successfully');
        refresh(); // Refresh notifications
        fetchInventory(); // Refresh inventory
        onFloatActionComplete?.();
      } else {
        toast.error(result.error || 'Failed to approve float request');
      }
    } catch (error) {
      console.error('Error approving float:', error);
      toast.error('An error occurred while approving the request');
    }
  }, [refresh, fetchInventory, onFloatActionComplete]);

  // Handle float request denial
  const handleFloatDeny = useCallback(async (requestId: string, reason?: string) => {
    try {
      const result = await handleFloatAction(requestId, 'denied', { vmNotes: reason });
      if (result.success) {
        toast.success('Float request denied');
        refresh(); // Refresh notifications
        onFloatActionComplete?.();
      } else {
        toast.error(result.error || 'Failed to deny float request');
      }
    } catch (error) {
      console.error('Error denying float:', error);
      toast.error('An error occurred while denying the request');
    }
  }, [refresh, onFloatActionComplete]);

  // Handle float receipt confirmation (for returns)
  const handleFloatReceiptConfirm = useCallback(async (requestId: string) => {
    try {
      const result = await handleFloatConfirm(requestId);
      if (result.success) {
        toast.success('Float return confirmed and finalized');
        refresh();
        onFloatActionComplete?.();
      } else {
        toast.error(result.error || 'Failed to confirm float receipt');
      }
    } catch (error) {
      console.error('Error confirming receipt:', error);
      toast.error('An error occurred while confirming receipt');
    }
  }, [refresh, onFloatActionComplete]);

  // Map notifications to NotificationItem format
  const bellNotifications = notifications.map(n => ({
    id: n._id,
    type: n.type,
    title: n.title,
    message: n.message,
    timestamp: new Date(n.createdAt),
    urgent: n.urgent,
    status: n.status,
    relatedEntityId: n.relatedEntityId,
    metadata: n.metadata
  }));


  return (
    <div className="border-b pb-4 mb-6">
      {/* First Row: Back Button, Title/Description, and Notification Bell */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          {showBack && backHref && (
            <Link href={backHref}>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          )}
          {title && (
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
              {description && <div className="text-sm text-gray-600">{description}</div>}
            </div>
          )}
          <DebugSection title="Page Context" data={{ title, description, backHref, locationId, user }} className="ml-2" />
        </div>

        <div className="flex items-center gap-3">
          {!user?.roles?.includes('cashier') ? (
            <Link href="/vault/management/reports/end-of-day">
              <Button 
                variant="default" 
                className="bg-orangeHighlight hover:bg-orangeHighlight/90 text-white"
              >
                Close Daily Operations
              </Button>
            </Link>
          ) : (
            <Link href="/vault/cashier/close-shift">
              <Button 
                variant="default" 
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                End Shift
              </Button>
            </Link>
          )}
          
          {showNotificationBell && (
            <NotificationBell
              notifications={bellNotifications}
              onMarkAsRead={markAsRead}
              onMarkAllAsRead={() => markAsRead(notifications.filter(n => n.status === 'unread').map(n => n._id))}
              onNotificationClick={() => {}}
              onDismiss={dismissNotification}
              vaultInventory={vaultInventory}
              onApprove={handleFloatApprove}
              onDeny={handleFloatDeny}
              onConfirm={handleFloatReceiptConfirm}
            />
          )}
        </div>
      </div>

      {/* Second Row: Children (Filters, Buttons, etc.) */}
      {children && (
        <div className="flex items-center gap-2">
          {children}
        </div>
      )}
    </div>
  );
}
