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
    Loader2,
    Trash2,
    X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface VaultNotification {
  _id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
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
      const res = await fetch(`/api/vault/notifications?locationId=${selectedLocation}`);
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

  const handleAction = async (action: 'mark_read' | 'dismiss', ids: string[]) => {
    try {
      const res = await fetch('/api/vault/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notificationIds: ids })
      });
      const data = await res.json();
      if (data.success) {
        if (action === 'mark_read') {
          setNotifications(prev => prev.map(n => ids.includes(n._id) ? { ...n, isRead: true } : n));
        } else {
          setNotifications(prev => prev.filter(n => !ids.includes(n._id)));
        }
        toast.success(action === 'mark_read' ? 'Marked as read' : 'Notification dismissed');
      }
    } catch (error) {
      console.error(`Failed to ${action} notifications:`, error);
      toast.error('Operation failed');
    }
  };

  const markAllRead = () => {
    const unreadIds = notifications.filter(n => !n.isRead).map(n => n._id);
    if (unreadIds.length > 0) {
      handleAction('mark_read', unreadIds);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertCircle className="h-5 w-5 text-amber-500" />;
      case 'error': return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'success': return <CheckCircle className="h-5 w-5 text-emerald-500" />;
      default: return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-gray-400">
        <Loader2 className="h-10 w-10 animate-spin mb-4 text-violet-500" />
        <p className="text-sm font-semibold uppercase tracking-widest animate-pulse">Scanning alerts...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header section with summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4">
           <div className="h-12 w-12 rounded-2xl bg-violet-100 flex items-center justify-center text-violet-600 shadow-inner">
              <Bell className="h-6 w-6" />
           </div>
           <div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight">Vault Notifications</h2>
              <p className="text-sm text-gray-500 font-medium">
                {notifications.filter(n => !n.isRead).length} unread alerts requiring attention
              </p>
           </div>
        </div>
        
        <div className="flex items-center gap-2">
           <Button 
             variant="outline" 
             size="sm" 
             className="rounded-xl border-gray-200 hover:bg-violet-50 hover:text-violet-700 font-bold"
             onClick={markAllRead}
             disabled={notifications.filter(n => !n.isRead).length === 0}
           >
             <Check className="h-4 w-4 mr-2" />
             Mark All Read
           </Button>
           <Button 
             variant="ghost" 
             size="sm" 
             className="rounded-xl text-gray-400 hover:text-red-600 font-bold"
             onClick={() => handleAction('dismiss', notifications.map(n => n._id))}
             disabled={notifications.length === 0}
           >
             <Trash2 className="h-4 w-4 mr-2" />
             Clear All
           </Button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="grid gap-3">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 bg-white rounded-3xl border border-dashed border-gray-200 text-gray-400">
             <div className="h-16 w-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                <Bell className="h-8 w-8 opacity-20" />
             </div>
             <p className="font-black text-lg text-gray-300 uppercase tracking-widest">No Alerts</p>
             <p className="text-sm">Your vault operations are running smoothly.</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div 
              key={notif._id}
              className={cn(
                "group relative bg-white p-5 rounded-2xl border transition-all duration-300 hover:shadow-md",
                notif.isRead 
                  ? "border-gray-100 opacity-75" 
                  : "border-violet-100 shadow-sm shadow-violet-500/5 ring-1 ring-violet-50"
              )}
            >
              <div className="flex items-start gap-4">
                <div className={cn(
                  "h-10 w-10 shrink-0 rounded-xl flex items-center justify-center",
                  notif.type === 'warning' ? "bg-amber-100" :
                  notif.type === 'error' ? "bg-red-100" :
                  notif.type === 'success' ? "bg-emerald-100" : "bg-blue-100"
                )}>
                  {getIcon(notif.type)}
                </div>
                
                <div className="flex-1 min-w-0 pr-12">
                   <div className="flex items-center gap-2 mb-1">
                      <h3 className={cn("text-sm font-black tracking-tight truncate", notif.isRead ? "text-gray-600" : "text-gray-900")}>
                        {notif.title}
                      </h3>
                      {!notif.isRead && (
                        <span className="h-2 w-2 rounded-full bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.5)] animate-pulse" />
                      )}
                   </div>
                   <p className="text-xs text-gray-500 font-medium leading-relaxed mb-2">
                     {notif.message}
                   </p>
                   <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      <div className="flex items-center gap-1">
                         <Clock className="h-3 w-3" />
                         {safeFormatDate(notif.timestamp)}
                      </div>
                   </div>
                </div>

                <div className="absolute right-4 top-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   {!notif.isRead && (
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
