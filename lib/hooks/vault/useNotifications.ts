/**
 * Vault Notifications Hook
 *
 * Manages fetching and polling for vault notifications.
 *
 * @module lib/hooks/vault/useNotifications
 */

import { NOTIFICATION_POLL_INTERVAL } from '@/lib/constants/vault';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

export type VaultNotification = {
  _id: string;
  type: 'float_request' | 'shift_review' | 'system_alert' | 'low_balance';
  title: string;
  message: string;
  urgent: boolean;
  status: 'unread' | 'read' | 'actioned' | 'dismissed' | 'cancelled';
  createdAt: string;
  actionUrl?: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
  metadata?: {
    cashierName?: string;
    requestedAmount?: number;
    requestType?: string;
    requestedDenominations?: { denomination: number; quantity: number }[];
    [key: string]: any;
  };
};

export function useNotifications(locationId?: string, enabled: boolean = true) {
  const [notifications, setNotifications] = useState<VaultNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingFloatRequests, setPendingFloatRequests] = useState(0);
  const [pendingShiftReviews, setPendingShiftReviews] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!locationId) return;

    try {
      // Don't set isLoading to true for polling to avoid flashing
      const res = await fetch(`/api/vault/notifications?locationId=${locationId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setNotifications(data.notifications);
          setUnreadCount(data.unreadCount);
          setPendingFloatRequests(data.pendingFloatRequests);
          setPendingShiftReviews(data.pendingShiftReviews);
        }
      }
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  }, [locationId]);

  // Initial fetch and polling
  useEffect(() => {
    if (!enabled || !locationId) return;

    setIsLoading(true);
    fetchNotifications().finally(() => setIsLoading(false));

    const interval = setInterval(fetchNotifications, NOTIFICATION_POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [locationId, enabled, fetchNotifications]);

  const markAsRead = async (notificationIds: string | string[]) => {
    const ids = Array.isArray(notificationIds) ? notificationIds : [notificationIds];
    if (ids.length === 0) return;

    try {
      const res = await fetch('/api/vault/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_read',
          notificationIds: ids
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          // Optimistically update local state
          setNotifications(prev => 
            prev.map(n => ids.includes(n._id) ? { ...n, status: 'read' } : n)
          );
          setUnreadCount(prev => Math.max(0, prev - ids.length));
        }
      }
    } catch (error) {
      console.error('Failed to mark notifications as read', error);
      toast.error('Failed to update notifications');
    }
  };

  const dismissNotifications = async (notificationIds: string | string[]) => {
    const ids = Array.isArray(notificationIds) ? notificationIds : [notificationIds];
    if (ids.length === 0) return;

    try {
      const res = await fetch('/api/vault/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'dismiss',
          notificationIds: ids
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setNotifications(prev => prev.filter(n => !ids.includes(n._id)));
          
          // Calculate how many unread were dismissed to update count
          const unreadDismissed = notifications.filter(n => ids.includes(n._id) && n.status === 'unread').length;
          if (unreadDismissed > 0) {
            setUnreadCount(prev => Math.max(0, prev - unreadDismissed));
          }
        }
      }
    } catch (error) {
      console.error('Failed to dismiss notifications', error);
      toast.error('Failed to dismiss notifications');
    }
  };

  return {
    notifications,
    unreadCount,
    pendingFloatRequests,
    pendingShiftReviews,
    isLoading,
    markAsRead,
    dismissNotification: dismissNotifications,
    refresh: fetchNotifications
  };
}
