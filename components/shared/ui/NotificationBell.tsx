/**
 * Notification Bell Component
 *
 * Bell icon with badge showing pending notifications for VM alerts.
 * Displays dropdown with pending requests and shift reviews.
 *
 * @module components/shared/ui/NotificationBell
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/shared/ui/dropdown-menu';
import { Badge } from '@/components/shared/ui/badge';
import { Bell, AlertTriangle, DollarSign, Clock } from 'lucide-react';

type NotificationType = 'shift_review' | 'float_request' | 'system_alert';

export type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  urgent?: boolean;
  actionUrl?: string;
};

type NotificationBellProps = {
  notifications: NotificationItem[];
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
  onNotificationClick: (notification: NotificationItem) => void;
};

export default function NotificationBell({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onNotificationClick,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.length;

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'shift_review':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'float_request':
        return <DollarSign className="h-4 w-4 text-blue-500" />;
      case 'system_alert':
        return <Clock className="h-4 w-4 text-red-500" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - timestamp.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0 font-semibold">
            Notifications ({unreadCount})
          </DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onMarkAllAsRead();
                setIsOpen(false);
              }}
              className="h-auto p-1 text-xs"
            >
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />

        {notifications.length === 0 ? (
          <div className="px-2 py-4 text-center text-sm text-gray-500">
            No new notifications
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {notifications.map((notification, index) => (
              <div key={notification.id}>
                <DropdownMenuItem
                  className={`flex cursor-pointer items-start gap-3 p-3 ${
                    notification.urgent
                      ? 'border-l-2 border-l-red-500 bg-red-50'
                      : ''
                  }`}
                  onClick={() => {
                    onNotificationClick(notification);
                    onMarkAsRead(notification.id);
                  }}
                >
                  <div className="mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {notification.title}
                    </p>
                    <p className="line-clamp-2 text-xs text-gray-600">
                      {notification.message}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {formatTimeAgo(notification.timestamp)}
                    </p>
                  </div>
                </DropdownMenuItem>
                {index < notifications.length - 1 && <DropdownMenuSeparator />}
              </div>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
