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
import { Checkbox } from '@/components/shared/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/shared/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from '@/components/shared/ui/dropdown-menu';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { cn } from '@/lib/utils';
import { getDenominationValues } from '@/lib/utils/vault/denominations';
import type { Denomination } from '@/shared/types/vault';
import { AlertTriangle, Bell, Check, Clock, DollarSign, Edit2, Eye, Filter, RefreshCw, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

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
  relatedEntityId?: string;
  metadata?: {
    cashierName?: string;
    requestedAmount?: number;
    requestType?: string;
    requestedDenominations?: { denomination: number; quantity: number }[];
    entityStatus?: string;
    [key: string]: any;
  };
};

type NotificationBellProps = {
  notifications: NotificationItem[];
  onMarkAsRead: (notificationId: string | string[]) => void;
  onMarkAllAsRead: () => void;
  onNotificationClick: (notification: NotificationItem) => void;
  onDismiss: (notificationId: string | string[]) => void;
  vaultInventory?: { denomination: number; quantity: number }[];
  // Vault specific actions for the modal
  onApprove?: (id: string, denominations?: Denomination[]) => Promise<void>;
  onDeny?: (id: string, reason?: string) => Promise<void>;
  onConfirm?: (id: string) => Promise<void>;
  onRefreshInventory?: () => Promise<void>;
  readOnly?: boolean;
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
  onConfirm,
  onRefreshInventory,
  readOnly = false,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRefreshingInventory, setIsRefreshingInventory] = useState(false);
  const [viewDetails, setViewDetails] = useState<NotificationItem | null>(null);
  const [showVaultOnMobile, setShowVaultOnMobile] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedDenominations, setEditedDenominations] = useState<Denomination[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { formatAmount } = useCurrencyFormat();
  const { selectedLicencee } = useDashBoardStore();

  // Reset editing state when modal closes or changes
  useEffect(() => {
    if (!viewDetails) {
        setIsEditing(false);
        setEditedDenominations([]);
    } else {
        // Initialize edited denominations from request
        const requested = viewDetails.metadata?.requestedDenominations || [];
        const denomsList = getDenominationValues(selectedLicencee);
        const initialDenoms: Denomination[] = denomsList.map(d => ({
            denomination: d as any,
            quantity: requested.find((r: any) => Number(r.denomination) === d)?.quantity || 0
        }));
        setEditedDenominations(initialDenoms);
    }
  }, [viewDetails]);

  const filteredNotifications = useMemo(() => {
    let list = [...notifications];
    if (unreadOnly) {
      list = list.filter(n => n.status === 'unread');
    }
    
    // Sort logic: Unread first, then by timestamp desc
    return list.sort((a, b) => {
      // If status is different, unread wins
      if (a.status === 'unread' && b.status !== 'unread') return -1;
      if (a.status !== 'unread' && b.status === 'unread') return 1;
      
      // If same status (both read or both unread), sort by time
      return b.timestamp.getTime() - a.timestamp.getTime();
    });
  }, [notifications, unreadOnly]);

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

  const formatTimeAgo = (timestampInput: Date | string) => {
    try {
      const timestamp = timestampInput instanceof Date ? timestampInput : new Date(timestampInput);
      if (isNaN(timestamp.getTime())) return '-';
      
      const now = new Date();
      const diffInMinutes = Math.floor(
        (now.getTime() - timestamp.getTime()) / (1000 * 60)
      );

      if (diffInMinutes < 1) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    } catch {
      return '-';
    }
  };

  // Calculated shortage based on current state (viewing vs editing)
  const currentShortageCheck = useMemo(() => {
    if (!viewDetails) return { hasShortage: false, shortages: [] };
    
    // Use edited denominations if editing, otherwise original request
    const denomsToCheck = isEditing 
        ? editedDenominations.filter(d => d.quantity > 0)
        : (viewDetails.metadata?.requestedDenominations || []);

    const shortages = denomsToCheck.filter((req: any) => {
        const stock = vaultInventory.find(v => Number(v.denomination) === Number(req.denomination))?.quantity || 0;
        return Number(req.quantity) > Number(stock);
    });

    return { hasShortage: shortages.length > 0, shortages };
  }, [viewDetails, isEditing, editedDenominations, vaultInventory]);

  // Helper to calculate total of edited denominations
  const editedTotal = useMemo(() => {
     return editedDenominations.reduce((sum, d) => sum + (d.denomination * d.quantity), 0);
  }, [editedDenominations]);

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
            {!isSelecting && notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm('Are you sure you want to clear all notifications?')) {
                    onDismiss(notifications.map(n => n.id));
                  }
                }}
                className="h-auto p-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Clear All
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const newState = !isSelecting;
                setIsSelecting(newState);
                if (!newState) setSelectedIds(new Set());
              }}
              className={`h-auto p-1.5 text-xs flex items-center gap-1.5 rounded-md transition-colors ${
                isSelecting 
                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {isSelecting ? 'Cancel Select' : 'Select'}
            </Button>
            {!isSelecting && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUnreadOnly(!unreadOnly)}
                className={`h-auto p-1.5 text-xs flex items-center gap-1.5 rounded-md transition-colors ${
                  unreadOnly 
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                <Filter className={`h-3 w-3 ${unreadOnly ? 'fill-blue-700' : ''}`} />
                {unreadOnly ? 'Unread Only' : 'Show All'}
              </Button>
            )}
            {!isSelecting && unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onMarkAllAsRead();
                }}
                className="h-auto p-1.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                Mark all read
              </Button>
            )}
          </div>
        </div>

        {isSelecting && filteredNotifications.length > 0 && (
          <div className="bg-blue-50 px-4 py-2 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Checkbox 
                checked={selectedIds.size > 0 && selectedIds.size === filteredNotifications.length}
                onCheckedChange={(checked: boolean) => {
                  if (checked) {
                    setSelectedIds(new Set(filteredNotifications.map(n => n.id)));
                  } else {
                    setSelectedIds(new Set());
                  }
                }}
                id="select-all"
              />
              <label htmlFor="select-all" className="text-xs font-semibold text-blue-700 cursor-pointer">
                Select All ({filteredNotifications.length})
              </label>
            </div>
            {selectedIds.size > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onMarkAsRead(Array.from(selectedIds));
                    setIsSelecting(false);
                    setSelectedIds(new Set());
                  }}
                  className="h-7 px-2 text-[10px] font-bold uppercase tracking-wider text-blue-600 hover:bg-blue-100"
                >
                  Mark Read
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm(`Delete ${selectedIds.size} notifications?`)) {
                      onDismiss(Array.from(selectedIds));
                      setIsSelecting(false);
                      setSelectedIds(new Set());
                    }
                  }}
                  className="h-7 px-2 text-[10px] font-bold uppercase tracking-wider text-red-600 hover:bg-red-100"
                >
                  Delete
                </Button>
              </div>
            )}
          </div>
        )}
        {filteredNotifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">
            {unreadOnly ? 'No unread notifications' : 'No history yet'}
          </div>
        ) : (
          <div className="max-h-[500px] overflow-y-auto divide-y">
            {filteredNotifications.map((notification) => (
              <div 
                key={notification.id}
                className={`${getStatusColor(notification.status)} transition-colors relative group`}
              >
                <div className="flex items-start gap-3 p-4 pr-24">
                  {isSelecting && (
                    <div className="mt-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Checkbox 
                        checked={selectedIds.has(notification.id)}
                        onCheckedChange={(checked: boolean) => {
                          const newSelected = new Set(selectedIds);
                          if (checked) {
                            newSelected.add(notification.id);
                          } else {
                            newSelected.delete(notification.id);
                          }
                          setSelectedIds(newSelected);
                        }}
                      />
                    </div>
                  )}
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
          setIsEditing(false);
        }
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              {viewDetails ? (() => {
                const rt = viewDetails.metadata?.requestType;
                if (isEditing) return 'Edit Float Request';
                const isInitial = viewDetails.message?.toLowerCase().includes('initial') || 
                                viewDetails.title?.toLowerCase().includes('start day') || 
                                !rt;
                
                if (isInitial) return 'Cashdesk Start Day Float Request';
                if (rt === 'decrease') return 'Float Decrease Verification';
                if (rt === 'increase') return 'Float Increase Verification';
                return 'Float Request Verification';
              })() : 'Notification Detail'}
            </DialogTitle>
          </DialogHeader>
          
          {viewDetails && (() => {
            const requested = viewDetails.metadata?.requestedDenominations || [];
            const { hasShortage, shortages: _shortages } = currentShortageCheck;

            return (
              <div className="space-y-6 py-2">
                {/* Status Header */}
                <div className="flex justify-between items-start border-b pb-4">
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Cashier</p>
                    <p className="font-bold text-lg text-gray-900">{viewDetails.metadata?.cashierName || 'Unknown'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 font-medium">
                        {isEditing ? 'New Total' : 'Total Amount'}
                    </p>
                    <p className={`font-black text-2xl tracking-tight ${isEditing ? 'text-orange-600' : 'text-blue-600'}`}>
                      {formatAmount(isEditing ? editedTotal : (viewDetails.metadata?.requestedAmount || 0))}
                    </p>
                  </div>
                </div>

                {/* Edit Toggle */}
                {!isEditing && !readOnly && (viewDetails.status === 'unread' || viewDetails.status === 'read') && !viewDetails.metadata?.entityStatus?.includes('approved') && (
                    <div className="flex justify-end -mt-2">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setIsEditing(true)}
                            className="text-blue-600 hover:bg-blue-50"
                        >
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit Request Breakdown
                        </Button>
                    </div>
                )}

                {/* Comparison Grid or Edit Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative">
                     {/* Left Column: Vault Stock */}
                      <div className={`${!showVaultOnMobile ? 'hidden sm:block' : 'block'} space-y-3`}>
                        <div className="flex items-center justify-between pb-1 border-b">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Vault Stock</p>
                            {onRefreshInventory && (
                                <button 
                                    onClick={async () => {
                                        setIsRefreshingInventory(true);
                                        await onRefreshInventory();
                                        setIsRefreshingInventory(false);
                                    }}
                                    disabled={isRefreshingInventory}
                                    className="text-gray-400 hover:text-blue-500 transition-colors"
                                >
                                    <RefreshCw className={cn("h-3 w-3", isRefreshingInventory && "animate-spin")} />
                                </button>
                            )}
                          </div>
                          <Badge variant="outline" className="text-[10px] font-normal">Available</Badge>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                           {getDenominationValues(selectedLicencee).map(val => {
                            const stock = vaultInventory.find(v => Number(v.denomination) === Number(val))?.quantity || 0;
                            return (
                              <div key={val} className="flex justify-between p-2 rounded bg-gray-50/50 border border-dashed border-gray-200">
                                <span className="text-gray-500 font-medium">${val}</span>
                                <span className={`font-bold ${stock === 0 ? 'text-gray-300' : 'text-gray-700'}`}>{stock}</span>
                              </div>
                            );
                          })}
                        </div>
                     </div>
                     
                     {/* Right Column: Requested (Editable) */}
                     <div className="space-y-3">
                        <div className="flex items-center justify-between pb-1 border-b">
                          <p className={cn("text-xs font-bold uppercase tracking-widest", isEditing ? "text-orange-500" : "text-blue-400")}>
                              {isEditing ? "Adjust Amounts" : "Requested"}
                          </p>
                          <Badge variant="outline" className={cn("text-[10px] font-normal", isEditing && "bg-orange-50 text-orange-600 border-orange-200")}>
                              {isEditing ? "Editing" : "Required"}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          {isEditing ? (
                              // Edit Mode: Show All Denominations as Inputs
                              editedDenominations.map((denom, index) => {
                                  // Find the stock for validation
                                  const stockItem = vaultInventory.find(v => Number(v.denomination) === Number(denom.denomination));
                                  const available = stockItem ? Number(stockItem.quantity) : 0;
                                  const requested = Number(denom.quantity);
                                  const isOver = requested > available;

                                  return (
                                    <div 
                                      key={denom.denomination} 
                                      className={cn(
                                        "flex justify-between items-center p-1.5 rounded border transition-colors",
                                        requested > 0 
                                          ? (isOver ? "bg-red-50 border-red-200" : "bg-white border-orange-200 ring-1 ring-orange-100")
                                          : "bg-gray-50/30 border-gray-100"
                                      )}
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className={cn("font-medium w-10 text-right", requested > 0 ? "text-orange-700" : "text-gray-400")}>
                                            ${denom.denomination}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                          {isOver && (
                                              <span className="text-[9px] font-bold text-red-500 uppercase">Short</span>
                                          )}
                                          <input
                                              type="number"
                                              min="0"
                                              value={requested === 0 ? '' : requested}
                                              onChange={e => {
                                                  const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                                                  const newDenoms = [...editedDenominations];
                                                  newDenoms[index] = { ...newDenoms[index], quantity: isNaN(val) ? 0 : val };
                                                  setEditedDenominations(newDenoms);
                                              }}
                                              className={cn(
                                                  "w-20 h-8 text-right font-bold bg-white rounded border focus:border-orange-500 transition-all outline-none text-sm px-2",
                                                  isOver && "text-red-600 border-red-300 focus:border-red-500",
                                                  !isOver && requested > 0 && "text-orange-600 border-orange-200"
                                              )}
                                              placeholder="0"
                                          />
                                      </div>
                                    </div>
                                  );
                              })
                          ) : (
                              // View Mode: Show Only Requested Items
                              <>
                                  {requested.map((d: any, i: number) => {
                                    const stock = vaultInventory.find(v => Number(v.denomination) === Number(d.denomination))?.quantity || 0;
                                    const isShort = Number(d.quantity) > Number(stock);
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
                              </>
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
                      <p className="text-xs text-red-700">
                        {isEditing 
                            ? "Your adjusted breakdown still exceeds available vault funds." 
                            : "Approval is disabled. You do not have enough specific denominations in the vault to fulfill this request."}
                      </p>
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
                {(viewDetails.status === 'unread' || viewDetails.status === 'read') && !readOnly ? (
                  <div className="flex gap-3 pt-4 border-t">
                    {viewDetails.metadata?.entityStatus === 'approved_vm' ? (
                       viewDetails.metadata?.requestType === 'decrease' ? (
                        <Button 
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold h-11"
                          onClick={async () => {
                            if (onConfirm) {
                              const targetId = viewDetails.relatedEntityId || viewDetails.id;
                              await onConfirm(targetId);
                              setViewDetails(null);
                            }
                          }}
                        >
                          <Check className="mr-2 h-4 w-4" />
                          Confirm Receipt & Finalize Return
                        </Button>
                      ) : (
                        <div className="flex-1 flex items-center justify-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-md border border-blue-200">
                          <Clock className="h-4 w-4 animate-spin" />
                          <span className="text-sm font-bold">Awaiting Cashier Confirmation</span>
                        </div>
                      )
                    ) : (
                      <>
                        {isEditing && (
                            <Button
                                variant="outline"
                                className="h-11 border-gray-300 text-gray-600 hover:bg-gray-50"
                                onClick={() => setIsEditing(false)}
                            >
                                Cancel Edit
                            </Button>
                        )}
                        <Button 
                          className={`flex-1 font-bold h-11 ${hasShortage ? '' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                          disabled={hasShortage}
                          variant={hasShortage ? "secondary" : "default"}
                          onClick={async () => {
                            if (onApprove) {
                              const targetId = viewDetails.relatedEntityId || viewDetails.id;
                              // Pass edited denominations if editing mode was active (or just always pass them if we want to support modification)
                              // Only pass if isEditing is true
                              const denoms = isEditing ? editedDenominations.filter(d => d.quantity > 0) : undefined;
                              await onApprove(targetId, denoms);
                              setViewDetails(null);
                            }
                          }}
                        >
                          <Check className="mr-2 h-4 w-4" />
                          {hasShortage ? 'Insufficient Stock' : (isEditing ? 'Approve Amended Request' : 'Approve Request')}
                        </Button>
                         {!isEditing && (
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
                         )}
                      </>
                    )}
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
