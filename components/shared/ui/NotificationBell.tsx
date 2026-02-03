/**
 * Notification Bell Component
 *
 * Bell icon with badge showing pending notifications for VM alerts.
 * Displays dropdown with pending requests and shift reviews.
 *
 * @module components/shared/ui/NotificationBell
 */

'use client';

import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/shared/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuTrigger
} from '@/components/shared/ui/dropdown-menu';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { AlertTriangle, Bell, Check, Clock, DollarSign, Eye, Trash2, X } from 'lucide-react';
import { useState } from 'react';

export type NotificationType = 'shift_review' | 'float_request' | 'system_alert' | 'low_balance';
export type NotificationStatus = 'unread' | 'read' | 'actioned' | 'dismissed' | 'cancelled';

export type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  urgent?: boolean;
  actionUrl?: string;
  status: NotificationStatus;
  relatedEntityId?: string; // Add this field
  metadata?: {
    cashierName?: string;
    requestedAmount?: number;
    requestType?: string;
    requestedDenominations?: { denomination: number; quantity: number }[];
    [key: string]: any;
  };
};

type NotificationBellProps = {
  notifications: NotificationItem[];
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
  onNotificationClick: (notification: NotificationItem) => void;
  onDismiss: (notificationId: string) => void;
  vaultInventory?: { denomination: number; quantity: number }[];
  // Vault specific actions for the modal
  onApprove?: (id: string) => Promise<void>;
  onDeny?: (id: string, reason?: string) => Promise<void>;
};

export default function NotificationBell({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onNotificationClick: _onNotificationClick,
  onDismiss,
  vaultInventory = [],
  onApprove,
  onDeny,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDetails, setViewDetails] = useState<NotificationItem | null>(null);
  const [showVaultOnMobile, setShowVaultOnMobile] = useState(false);
  const { formatAmount } = useCurrencyFormat();

  const unreadCount = notifications.filter(n => n.status === 'unread').length;

  const getStatusColor = (status: NotificationStatus) => {
    switch (status) {
      case 'read':
        return 'bg-green-50/50 hover:bg-green-50';
      case 'cancelled':
        return 'bg-red-50/50 hover:bg-red-50';
      case 'actioned':
        return 'bg-blue-50/50 hover:bg-blue-50';
      case 'unread':
        return 'bg-white hover:bg-gray-50';
      default:
        return 'bg-white hover:bg-gray-50';
    }
  };

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
      <DropdownMenuContent align="end" className="w-[calc(100vw-32px)] sm:w-[400px] p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <DropdownMenuLabel className="p-0 font-semibold text-base">
            Notifications ({unreadCount})
          </DropdownMenuLabel>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onMarkAllAsRead();
                }}
                className="h-auto p-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                Mark all read
              </Button>
            )}
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">
            No history yet
          </div>
        ) : (
          <div className="max-h-[500px] overflow-y-auto divide-y">
            {notifications.map((notification) => (
              <div 
                key={notification.id}
                className={`${getStatusColor(notification.status)} transition-colors relative group`}
              >
                <div className="flex items-start gap-3 p-4 pr-24">
                  <div className="mt-1 flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                       <p className="truncate text-sm font-semibold text-gray-900">
                        {notification.title}
                      </p>
                      {notification.status === 'cancelled' && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1 border-red-200 text-red-600 bg-red-50">
                          CANCELLED
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="mt-1.5 text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                      {formatTimeAgo(notification.timestamp)}
                    </p>
                  </div>
                </div>

                {/* Inline Actions */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-inherit rounded-l-md">
                   {notification.status === 'unread' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
                      title="Mark as read"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMarkAsRead(notification.id);
                      }}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                  
                  {notification.type === 'float_request' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                      title="View Details"
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewDetails(notification);
                        setIsOpen(false);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100"
                    title="Delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDismiss(notification.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DropdownMenuContent>

      {/* Denomination Detail Modal */}
      <Dialog open={!!viewDetails} onOpenChange={(open) => {
        if (!open) {
          setViewDetails(null);
          setShowVaultOnMobile(false);
        }
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              Float Request Verification
            </DialogTitle>
          </DialogHeader>
          
          {viewDetails && (() => {
            const requested = viewDetails.metadata?.requestedDenominations || [];
            const shortages = requested.filter((req: any) => {
              const stock = vaultInventory.find(v => Number(v.denomination) === Number(req.denomination))?.quantity || 0;
              return Number(req.quantity) > Number(stock);
            });
            const hasShortage = shortages.length > 0;

            return (
              <div className="space-y-6 py-2">
                {/* Status Header */}
                <div className="flex justify-between items-start border-b pb-4">
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Cashier</p>
                    <p className="font-bold text-lg text-gray-900">{viewDetails.metadata?.cashierName || 'Unknown'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 font-medium">Total Amount</p>
                    <p className="font-black text-2xl text-blue-600 tracking-tight">
                      {formatAmount(viewDetails.metadata?.requestedAmount || 0)}
                    </p>
                  </div>
                </div>

                {/* Mobile View Vault Toggle */}
                <div className="sm:hidden">
                  <Button 
                    variant="outline" 
                    className="w-full justify-between"
                    onClick={() => setShowVaultOnMobile(!showVaultOnMobile)}
                  >
                    <span>{showVaultOnMobile ? 'Hide' : 'View'} Vault Inventory</span>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                      {vaultInventory.length} Denoms
                    </Badge>
                  </Button>
                </div>

                {/* Comparison Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative">
                  {/* Left Column: Vault Stock (Visible on desktop or when toggled on mobile) */}
                  <div className={`${!showVaultOnMobile ? 'hidden sm:block' : 'block'} space-y-3`}>
                    <div className="flex items-center justify-between pb-1 border-b">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Vault Stock</p>
                      <Badge variant="outline" className="text-[10px] font-normal">Available</Badge>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                       {[100, 50, 20, 10, 5, 1].map(val => {
                        const stock = vaultInventory.find(v => v.denomination === val)?.quantity || 0;
                        return (
                          <div key={val} className="flex justify-between p-2 rounded bg-gray-50/50 border border-dashed border-gray-200">
                            <span className="text-gray-500 font-medium">${val}</span>
                            <span className={`font-bold ${stock === 0 ? 'text-gray-300' : 'text-gray-700'}`}>{stock}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Column: Requested */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-1 border-b">
                      <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">Requested</p>
                      <Badge variant="outline" className="text-[10px] font-normal">Required</Badge>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {requested.map((d: any, i: number) => {
                        const stock = vaultInventory.find(v => v.denomination === d.denomination)?.quantity || 0;
                        const isShort = d.quantity > stock;
                        return (
                          <div 
                            key={i} 
                            className={`flex justify-between p-2 rounded border transition-colors ${
                              isShort ? 'bg-red-50 border-red-200' : 'bg-blue-50/30 border-blue-100'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {isShort && <AlertTriangle className="h-3 w-3 text-red-500" />}
                              <span className={`font-medium ${isShort ? 'text-red-700' : 'text-blue-700'}`}>${d.denomination}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-bold">x {d.quantity}</span>
                              {isShort && <p className="text-[10px] text-red-500 -mt-1 font-bold">Shortage: {d.quantity - stock}</p>}
                            </div>
                          </div>
                        );
                      })}
                      {requested.length === 0 && (
                        <p className="text-sm text-gray-500 py-4 text-center italic">No breakdown provided</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Shortage Alert */}
                {hasShortage && (viewDetails.status === 'unread' || viewDetails.status === 'read') && (
                  <div className="p-3 bg-red-100 border border-red-200 rounded-md flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-red-800">Insufficient Vault Funds</p>
                      <p className="text-xs text-red-700">Approval is disabled. You do not have enough specific denominations in the vault to fulfill this request.</p>
                    </div>
                  </div>
                )}

                {/* Rejection Reason */}
                <div className="pt-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Rejection Reason (Optional)</p>
                  <textarea
                    className="w-full p-2 text-sm border rounded-md bg-gray-50 focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all outline-none min-h-[60px] resize-none"
                    placeholder="Enter reason for rejection (optional)..."
                    id="rejection-reason"
                  />
                </div>

                {/* Final Actions */}
                {viewDetails.status === 'unread' || viewDetails.status === 'read' ? (
                  <div className="flex gap-3 pt-4 border-t">
                    <Button 
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold h-11"
                      disabled={hasShortage}
                      onClick={async () => {
                        if (onApprove) {
                          // Use relatedEntityId (FloatRequestId) if available, otherwise just id (NotificationId)
                          // But for Float Requests, it MUST be relatedEntityId.
                          const targetId = viewDetails.relatedEntityId || viewDetails.id;
                          await onApprove(targetId);
                          setViewDetails(null);
                        }
                      }}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      {hasShortage ? 'Insufficient Stock' : 'Approve Request'}
                    </Button>
                    <Button 
                      variant="destructive"
                      className="flex-1 font-bold h-11"
                      onClick={async () => {
                        if (onDeny) {
                          const reasonEl = document.getElementById('rejection-reason') as HTMLTextAreaElement;
                          const reason = reasonEl?.value || '';
                          const targetId = viewDetails.relatedEntityId || viewDetails.id;
                          await onDeny(targetId, reason);
                          setViewDetails(null);
                        }
                      }}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Reject Request
                    </Button>
                  </div>
                ) : (
                  <div className={`p-4 rounded-md flex items-center justify-center gap-2 border ${
                    viewDetails.status === 'cancelled' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-blue-50 border-blue-200 text-blue-700'
                  }`}>
                    {viewDetails.status === 'cancelled' ? <X className="h-5 w-5" /> : <Check className="h-5 w-5" />}
                    <span className="font-bold uppercase tracking-wide">
                      {viewDetails.status === 'cancelled' ? 'Request Cancelled' : 'Request Processed'}
                    </span>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </DropdownMenu>
  );
}
