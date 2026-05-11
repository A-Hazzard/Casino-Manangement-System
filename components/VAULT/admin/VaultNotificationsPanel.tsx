/**
 * Vault Notifications Panel
 *
 * A dedicated dashboard for viewing and managing vault-related alerts and notifications.
 */
'use client';

import { Button } from '@/components/shared/ui/button';
import { useUserStore } from '@/lib/store/userStore';
import { cn } from '@/lib/utils';
import { safeFormatDate } from '@/lib/utils/date/formatting';
import {
  AlertCircle,
  Bell,
  Check,
  CheckCircle,
  Clock,
  Info,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface VaultNotification {
  _id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  status: string;
  metadata?: {
    cashierId?: string;
    cashierName?: string;
    [key: string]: unknown;
  };
}

export default function VaultNotificationsPanel() {
  const { user } = useUserStore();
  const [notifications, setNotifications] = useState<VaultNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const selectedLocation = user?.assignedLocations?.[0];

  const fetchNotifications = async () => {
    if (!selectedLocation) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/vault/notifications?locationId=${selectedLocation}`
      );
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [selectedLocation]);

  const handleAction = async (
    action: 'mark_read' | 'dismiss',
    ids: string[]
  ) => {
    try {
      const res = await fetch('/api/vault/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notificationIds: ids }),
      });
      const data = await res.json();
      if (data.success) {
        if (action === 'mark_read') {
          setNotifications(prev =>
            prev.map(n => (ids.includes(n._id) ? { ...n, status: 'read' } : n))
          );
        } else {
          setNotifications(prev => prev.filter(n => !ids.includes(n._id)));
        }
        toast.success(
          action === 'mark_read' ? 'Marked as read' : 'Notification dismissed'
        );
      }
    } catch (error) {
      console.error(`Failed to ${action} notifications:`, error);
      toast.error('Operation failed');
    }
  };

  const handleReset2FA = async (userId: string, notificationId: string) => {
    try {
      const res = await fetch('/api/auth/totp/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, notificationId }),
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(prev =>
          prev.map(n =>
            n._id === notificationId ? { ...n, status: 'actioned' } : n
          )
        );
        toast.success(data.message || '2FA has been reset');
      } else {
        toast.error(data.error || 'Failed to reset 2FA');
      }
    } catch (error) {
      console.error('Failed to reset 2FA:', error);
      toast.error('Connection error');
    }
  };

  const markAllRead = () => {
    const unreadIds = notifications
      .filter(n => n.status === 'unread')
      .map(n => n._id);
    if (unreadIds.length > 0) {
      handleAction('mark_read', unreadIds);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning':
      case 'float_request':
        return <AlertCircle className="h-5 w-5 text-amber-500" />;
      case 'error':
      case 'low_balance':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-emerald-500" />;
      case '2fa_recovery_request':
        return <ShieldCheck className="h-5 w-5 text-violet-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 duration-500 animate-in fade-in">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="flex animate-pulse gap-4 rounded-3xl border border-gray-100 bg-white p-5"
          >
            <div className="h-10 w-10 rounded-xl bg-gray-100" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/4 rounded bg-gray-100" />
              <div className="h-3 w-3/4 rounded bg-gray-100" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 duration-500 animate-in fade-in slide-in-from-bottom-2">
      {/* Header section with summary */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 shadow-inner">
            <Bell className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight text-gray-900">
              Vault Notifications
            </h2>
            <p className="text-sm font-medium text-gray-500">
              {notifications.filter(n => n.status === 'unread').length} unread
              alerts requiring attention
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl border-gray-200 font-bold hover:bg-violet-50 hover:text-violet-700"
            onClick={markAllRead}
            disabled={
              notifications.filter(n => n.status === 'unread').length === 0
            }
          >
            <Check className="mr-2 h-4 w-4" />
            Mark All Read
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-xl font-bold text-gray-400 hover:text-red-600"
            onClick={() =>
              handleAction(
                'dismiss',
                notifications.map(n => n._id)
              )
            }
            disabled={notifications.length === 0}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear All
          </Button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="grid gap-3">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-white p-20 text-gray-400">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50">
              <Bell className="h-8 w-8 opacity-20" />
            </div>
            <p className="text-lg font-black uppercase tracking-widest text-gray-300">
              No Alerts
            </p>
            <p className="text-sm">
              Your vault operations are running smoothly.
            </p>
          </div>
        ) : (
          notifications.map(notif => (
            <div
              key={notif._id}
              className={cn(
                'group relative rounded-2xl border bg-white p-5 transition-all duration-300 hover:shadow-md',
                notif.status !== 'unread'
                  ? 'border-gray-100 opacity-75'
                  : 'border-violet-100 shadow-sm shadow-violet-500/5 ring-1 ring-violet-50'
              )}
            >
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                    notif.type === 'warning' || notif.type === 'float_request'
                      ? 'bg-amber-100'
                      : notif.type === 'error' || notif.type === 'low_balance'
                        ? 'bg-red-100'
                        : notif.type === 'success'
                          ? 'bg-emerald-100'
                          : notif.type === '2fa_recovery_request'
                            ? 'bg-violet-100'
                            : 'bg-blue-100' // Added 2fa_recovery_request styling
                  )}
                >
                  {getIcon(notif.type)}
                </div>

                <div className="min-w-0 flex-1 pr-12">
                  <div className="mb-1 flex items-center gap-2">
                    <h3
                      className={cn(
                        'truncate text-sm font-black tracking-tight',
                        notif.status !== 'unread'
                          ? 'text-gray-600'
                          : 'text-gray-900'
                      )}
                    >
                      {notif.title}
                    </h3>
                    {notif.status === 'unread' && (
                      <span className="h-2 w-2 animate-pulse rounded-full bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
                    )}
                  </div>
                  <p className="mb-2 text-xs font-medium leading-relaxed text-gray-500">
                    {notif.message}
                  </p>
                  <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {safeFormatDate(notif.createdAt)}
                    </div>
                  </div>

                  {notif.type === '2fa_recovery_request' &&
                    notif.status === 'unread' && (
                      <div className="mt-4 flex gap-2">
                        <Button
                          size="sm"
                          className="rounded-xl bg-violet-600 font-bold text-white hover:bg-violet-700"
                          onClick={() => {
                            if (
                              confirm(
                                `Are you sure you want to reset 2FA for ${notif.metadata?.cashierName}?`
                              )
                            ) {
                              handleReset2FA(
                                notif.metadata?.cashierId!,
                                notif._id
                              );
                            }
                          }}
                        >
                          Reset 2FA for {notif.metadata?.cashierName}
                        </Button>
                      </div>
                    )}
                </div>

                <div className="absolute right-4 top-4 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  {notif.status === 'unread' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg hover:bg-emerald-50 hover:text-emerald-600"
                      onClick={() => handleAction('mark_read', [notif._id])}
                      title="Mark as read"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg hover:bg-red-50 hover:text-red-600"
                    onClick={() => handleAction('dismiss', [notif._id])}
                    title="Dismiss"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
