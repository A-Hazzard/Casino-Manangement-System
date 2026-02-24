'use client';

import { create } from 'zustand';

export type NotificationItem = {
  id: string;
  type: any;
  title: string;
  message: string;
  timestamp: Date;
  urgent?: boolean;
  actionUrl?: string;
  status: any;
  relatedEntityId?: string;
  metadata?: any;
};

type NotificationStore = {
  notifications: NotificationItem[];
  unreadCount: number;
  setNotifications: (notifications: NotificationItem[], unreadCount: number) => void;
  clearNotifications: () => void;
  // Handlers
  onMarkAsRead: (id: string | string[]) => void;
  onMarkAllAsRead: () => void;
  onDismiss: (id: string | string[]) => void;
  setHandlers: (handlers: {
    onMarkAsRead: (id: string | string[]) => void;
    onMarkAllAsRead: () => void;
    onDismiss: (id: string | string[]) => void;
  }) => void;
};

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  unreadCount: 0,
  setNotifications: (notifications, unreadCount) => set({ notifications, unreadCount }),
  clearNotifications: () => set({ notifications: [], unreadCount: 0 }),
  onMarkAsRead: () => {},
  onMarkAllAsRead: () => {},
  onDismiss: () => {},
  setHandlers: (handlers) => set({ ...handlers }),
}));
