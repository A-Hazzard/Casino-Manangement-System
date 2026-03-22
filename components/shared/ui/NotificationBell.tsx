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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/shared/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/shared/ui/dropdown-menu';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useMediaQuery } from '@/lib/hooks/useMediaQuery';
import { useVaultLicencee } from '@/lib/hooks/vault/useVaultLicencee';
import { cn } from '@/lib/utils';
import { getDenominationValues } from '@/lib/utils/vault/denominations';
import type { Denomination } from '@/shared/types/vault';
import {
  AlertTriangle,
  Bell,
  Check,
  Clock,
  DollarSign,
  Edit2,
  Eye,
  Filter,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

export type NotificationType =
  | 'shift_review'
  | 'float_request'
  | 'system_alert'
  | 'low_balance';
export type NotificationStatus =
  | 'unread'
  | 'read'
  | 'actioned'
  | 'dismissed'
  | 'cancelled';

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
    [key: string]: unknown;
  };
};

type NotificationBellProps = {
  notifications: NotificationItem[];
  unreadCount?: number;
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
  trigger?: React.ReactNode;
};

export default function NotificationBell({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDismiss,
  vaultInventory = [],
  onApprove,
  onDeny,
  onConfirm,
  onRefreshInventory,
  readOnly = false,
  trigger,
  unreadCount: propUnreadCount,
}: NotificationBellProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [isOpen, setIsOpen] = useState(false);
  const [isRefreshingInventory, setIsRefreshingInventory] = useState(false);
  const [viewDetails, setViewDetails] = useState<NotificationItem | null>(null);
  const [showVaultOnMobile, setShowVaultOnMobile] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedDenominations, setEditedDenominations] = useState<
    Denomination[]
  >([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [rejectionReason, setRejectionReason] = useState('');

  const { formatAmount } = useCurrencyFormat();
  const { licenceeId: selectedLicencee } = useVaultLicencee();

  // Reset editing state when modal closes or changes
  useEffect(() => {
    if (!viewDetails) {
      setIsEditing(false);
      setEditedDenominations([]);
      setRejectionReason('');
    } else {
      // Initialize edited denominations from request
      const requested = viewDetails.metadata?.requestedDenominations || [];
      const denomsList = getDenominationValues(selectedLicencee);
      const initialDenoms: Denomination[] = denomsList.map(d => ({
        denomination: d as Denomination['denomination'],
        quantity:
          requested.find(r => Number(r.denomination) === d)?.quantity || 0,
      }));
      setEditedDenominations(initialDenoms);
      setRejectionReason('');
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

  const unreadCount =
    propUnreadCount ?? notifications.filter(n => n.status === 'unread').length;

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
      const timestamp =
        timestampInput instanceof Date
          ? timestampInput
          : new Date(timestampInput);
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

    // STEP: Skip stock verification for Float Returns (Decrease)
    // When a cashier returns float, the vault is receiving money, so stock availability is irrelevant.
    if (viewDetails.metadata?.requestType === 'decrease') {
      return { hasShortage: false, shortages: [] };
    }

    // Use edited denominations if editing, otherwise original request
    const denomsToCheck = isEditing
      ? editedDenominations.filter(d => d.quantity > 0)
      : viewDetails.metadata?.requestedDenominations || [];

    const shortages = denomsToCheck.filter(req => {
      const stock =
        vaultInventory.find(
          v => Number(v.denomination) === Number(req.denomination)
        )?.quantity || 0;
      return Number(req.quantity) > Number(stock);
    });

    return { hasShortage: shortages.length > 0, shortages };
  }, [viewDetails, isEditing, editedDenominations, vaultInventory]);

  // Helper to calculate total of edited denominations
  const editedTotal = useMemo(() => {
    return editedDenominations.reduce(
      (sum, d) => sum + d.denomination * d.quantity,
      0
    );
  }, [editedDenominations]);

  const NotificationListContent = (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-xl border-b bg-white px-4 py-3">
        <div className="flex flex-col">
          <DropdownMenuLabel className="p-0 text-lg font-bold text-gray-900">
            Notifications ({unreadCount})
          </DropdownMenuLabel>
        </div>
        <div className="flex items-center gap-2">
          {!isSelecting && notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (
                  confirm('Are you sure you want to clear all notifications?')
                ) {
                  onDismiss(notifications.map(n => n.id));
                }
              }}
              className="h-auto p-1 text-[11px] font-bold uppercase text-red-500 hover:bg-red-50 hover:text-red-600"
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
            className={`flex h-auto items-center gap-1.5 rounded-md p-1 text-[11px] font-bold uppercase transition-colors ${
              isSelecting
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {isSelecting ? 'Cancel' : 'Select'}
          </Button>
          {!isSelecting && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setUnreadOnly(!unreadOnly)}
              className={`flex h-auto items-center gap-1.5 rounded-md p-1 text-[11px] font-bold uppercase transition-colors ${
                unreadOnly
                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <Filter
                className={`h-3 w-3 ${unreadOnly ? 'fill-blue-700' : ''}`}
              />
              {unreadOnly ? 'Unread' : 'All'}
            </Button>
          )}
        </div>
      </div>

      <div className="flex justify-end border-b bg-gray-50/50 px-4 py-2">
        {!isSelecting && unreadCount > 0 && (
          <button
            onClick={() => onMarkAllAsRead()}
            className="text-[11px] font-bold uppercase text-blue-600 hover:text-blue-700"
          >
            Mark all read
          </button>
        )}
      </div>

      {isSelecting && filteredNotifications.length > 0 && (
        <div className="flex items-center justify-between border-b bg-blue-50/80 px-4 py-2">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={
                selectedIds.size > 0 &&
                selectedIds.size === filteredNotifications.length
              }
              onCheckedChange={(checked: boolean) => {
                if (checked) {
                  setSelectedIds(new Set(filteredNotifications.map(n => n.id)));
                } else {
                  setSelectedIds(new Set());
                }
              }}
              id="select-all"
            />
            <label
              htmlFor="select-all"
              className="cursor-pointer text-[11px] font-bold uppercase text-blue-700"
            >
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
                className="h-7 px-2 text-[10px] font-black uppercase tracking-wider text-blue-600 hover:bg-blue-100"
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
                className="h-7 px-2 text-[10px] font-black uppercase tracking-wider text-red-600 hover:bg-red-100"
              >
                Delete
              </Button>
            </div>
          )}
        </div>
      )}

      {filteredNotifications.length === 0 ? (
        <div className="px-4 py-12 text-center text-sm text-gray-500">
          <Bell className="mx-auto mb-3 h-10 w-10 text-gray-200" />
          {unreadOnly ? 'No unread notifications' : 'No notification history'}
        </div>
      ) : (
        <div className="min-h-0 flex-1 divide-y overflow-y-auto bg-white">
          {filteredNotifications.map(notification => (
            <div
              key={notification.id}
              className={`${getStatusColor(notification.status)} group relative transition-colors`}
            >
              <div className="flex items-start gap-3 p-4 pr-24">
                {isSelecting && (
                  <div
                    className="mt-1 flex-shrink-0"
                    onClick={e => e.stopPropagation()}
                  >
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
                  <div className="mb-0.5 flex items-center gap-2">
                    <p className="truncate text-sm font-bold text-gray-900">
                      {notification.title}
                    </p>
                    {notification.status === 'cancelled' && (
                      <Badge
                        variant="outline"
                        className="h-3 border-red-200 bg-red-50 px-1 text-[9px] font-black text-red-600"
                      >
                        CANCELLED
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed text-gray-600">
                    {notification.message}
                  </p>
                  <p className="mt-1.5 text-[9px] font-black uppercase tracking-widest text-gray-400">
                    {formatTimeAgo(notification.timestamp)}
                  </p>
                </div>
              </div>

              {/* Inline Actions */}
              <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-l-md bg-inherit p-1 opacity-100 transition-opacity group-hover:opacity-100 sm:opacity-0">
                {notification.status === 'unread' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-green-600 hover:bg-green-100 hover:text-green-700"
                    title="Mark as read"
                    onClick={e => {
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
                    className="h-8 w-8 text-blue-600 hover:bg-blue-100 hover:text-blue-700"
                    title="View Details"
                    onClick={e => {
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
                  className="h-8 w-8 text-red-600 hover:bg-red-100 hover:text-red-700"
                  title="Delete"
                  onClick={e => {
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
    </>
  );

  const BellTrigger = (
    <Button
      variant="ghost"
      size="sm"
      className="group relative rounded-full p-2 transition-colors hover:bg-gray-100"
    >
      <Bell className="h-5 w-5 text-gray-700 transition-colors group-hover:text-blue-600" />
      {unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center border-2 border-white p-0 text-[10px] font-black shadow-sm"
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </Badge>
      )}
    </Button>
  );

  return (
    <>
      {isMobile ? (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>{trigger || BellTrigger}</DialogTrigger>
          <DialogContent
            className="flex max-h-[85vh] flex-col overflow-hidden p-0"
            isMobileFullScreen={false}
          >
            <DialogHeader className="sr-only">
              <DialogTitle>Notifications</DialogTitle>
            </DialogHeader>

            <div className="flex min-h-0 flex-1 flex-col bg-white">
              {NotificationListContent}
            </div>
          </DialogContent>
        </Dialog>
      ) : (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            {trigger || BellTrigger}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="flex max-h-[600px] w-[400px] flex-col overflow-hidden rounded-xl border-gray-200 p-0 shadow-2xl"
          >
            {NotificationListContent}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Denomination Detail Modal - SHARED across Mobile and Desktop */}
      <Dialog
        open={!!viewDetails}
        onOpenChange={open => {
          if (!open) {
            setViewDetails(null);
            setShowVaultOnMobile(false);
            setIsEditing(false);
          }
        }}
      >
        <DialogContent className="flex flex-col overflow-hidden p-0 md:max-w-2xl">
          <DialogHeader className="shrink-0 border-b border-violet-100 bg-violet-50 p-6">
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              {viewDetails
                ? (() => {
                    const rt = viewDetails.metadata?.requestType;
                    if (isEditing) return 'Edit Float Request';
                    const isInitial =
                      viewDetails.message?.toLowerCase().includes('initial') ||
                      viewDetails.title?.toLowerCase().includes('start day') ||
                      !rt;

                    if (isInitial) return 'Cashdesk Start Day Float Request';
                    if (rt === 'decrease') return 'Float Decrease Verification';
                    if (rt === 'increase') return 'Float Increase Verification';
                    return 'Float Request Verification';
                  })()
                : 'Notification Detail'}
            </DialogTitle>
          </DialogHeader>

          {viewDetails
            ? (() => {
                const requested =
                  viewDetails.metadata?.requestedDenominations || [];
                const { hasShortage } = currentShortageCheck;

                return (
                  <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-6 md:max-h-[85vh] md:p-8">
                    <div className="space-y-6 py-2">
                      {/* Status Header */}
                      <div className="flex items-start justify-between border-b pb-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500">
                            Cashier
                          </p>
                          <p className="text-lg font-bold text-gray-900">
                            {viewDetails.metadata?.cashierName || 'Unknown'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-500">
                            {isEditing ? 'New Total' : 'Total Amount'}
                          </p>
                          <p
                            className={`text-2xl font-black tracking-tight ${isEditing ? 'text-orange-600' : 'text-blue-600'}`}
                          >
                            {formatAmount(
                              isEditing
                                ? editedTotal
                                : viewDetails.metadata?.requestedAmount || 0
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Edit Toggle */}
                      {!isEditing &&
                        !readOnly &&
                        (viewDetails.status === 'unread' ||
                          viewDetails.status === 'read') &&
                        !viewDetails.metadata?.entityStatus?.includes(
                          'approved'
                        ) && (
                          <div className="-mt-2 flex justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                setIsEditing(true);
                                if (onRefreshInventory) {
                                  setIsRefreshingInventory(true);
                                  await onRefreshInventory();
                                  setIsRefreshingInventory(false);
                                }
                              }}
                              className="text-blue-600 hover:bg-blue-50"
                            >
                              <Edit2 className="mr-2 h-4 w-4" />
                              Edit Request Breakdown
                            </Button>
                          </div>
                        )}

                      {/* Comparison Grid or Edit Grid */}
                      <div className="relative grid grid-cols-1 gap-6 sm:grid-cols-2">
                        {/* Mobile Toggle for Vault stock (Optional if no shortage) */}
                        {!hasShortage && (
                          <div className="-mb-2 sm:hidden">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setShowVaultOnMobile(!showVaultOnMobile)
                              }
                              className="w-full border-blue-100 bg-blue-50/50 text-[11px] font-bold uppercase tracking-wider text-blue-600"
                            >
                              {showVaultOnMobile
                                ? 'Hide Vault Comparison'
                                : 'Show Vault Comparison'}
                            </Button>
                          </div>
                        )}

                        {/* Left Column: Vault Stock */}
                        <div
                          className={`${!showVaultOnMobile && !hasShortage ? 'hidden sm:block' : 'block'} space-y-3`}
                        >
                          <div className="flex items-center justify-between border-b pb-1">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                                Vault Stock
                              </p>
                              {onRefreshInventory && (
                                <button
                                  onClick={async () => {
                                    setIsRefreshingInventory(true);
                                    await onRefreshInventory();
                                    setIsRefreshingInventory(false);
                                  }}
                                  disabled={isRefreshingInventory}
                                  className="text-gray-400 transition-colors hover:text-blue-500"
                                >
                                  <RefreshCw
                                    className={cn(
                                      'h-3 w-3',
                                      isRefreshingInventory && 'animate-spin'
                                    )}
                                  />
                                </button>
                              )}
                            </div>
                            <Badge
                              variant="outline"
                              className="text-[10px] font-normal"
                            >
                              Available
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 gap-2">
                            {isRefreshingInventory
                              ? Array.from({
                                  length:
                                    getDenominationValues(selectedLicencee)
                                      .length,
                                }).map((_, i) => (
                                  <div
                                    key={i}
                                    className="flex items-center justify-between rounded border border-dashed border-gray-200 bg-gray-50/50 p-2"
                                  >
                                    <span className="h-4 w-10 animate-pulse rounded bg-gray-200" />
                                    <span className="h-4 w-6 animate-pulse rounded bg-gray-200" />
                                  </div>
                                ))
                              : getDenominationValues(selectedLicencee).map(
                                  val => {
                                    const stock =
                                      vaultInventory.find(
                                        v =>
                                          Number(v.denomination) === Number(val)
                                      )?.quantity || 0;
                                    return (
                                      <div
                                        key={val}
                                        className="flex justify-between rounded border border-dashed border-gray-200 bg-gray-50/50 p-2"
                                      >
                                        <span className="font-medium text-gray-500">
                                          ${val}
                                        </span>
                                        <span
                                          className={`font-bold ${stock === 0 ? 'text-gray-300' : 'text-gray-700'}`}
                                        >
                                          {stock}
                                        </span>
                                      </div>
                                    );
                                  }
                                )}
                          </div>
                        </div>

                        {/* Right Column: Requested (Editable) */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between border-b pb-1">
                            <p
                              className={cn(
                                'text-xs font-bold uppercase tracking-widest',
                                isEditing ? 'text-orange-500' : 'text-blue-400'
                              )}
                            >
                              {isEditing ? 'Adjust Amounts' : 'Requested'}
                            </p>
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px] font-normal',
                                isEditing &&
                                  'border-orange-200 bg-orange-50 text-orange-600'
                              )}
                            >
                              {isEditing ? 'Editing' : 'Required'}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 gap-2">
                            {isEditing ? (
                              // Edit Mode: Show All Denominations as Inputs
                              editedDenominations.map((denom, index) => {
                                // Find the stock for validation
                                const stockItem = vaultInventory.find(
                                  v =>
                                    Number(v.denomination) ===
                                    Number(denom.denomination)
                                );
                                const available = stockItem
                                  ? Number(stockItem.quantity)
                                  : 0;
                                const requested = Number(denom.quantity);
                                const isOver =
                                  viewDetails.metadata?.requestType !==
                                    'decrease' && requested > available;

                                return (
                                  <div
                                    key={denom.denomination}
                                    className={cn(
                                      'flex items-center justify-between rounded border p-1.5 transition-colors',
                                      requested > 0
                                        ? isOver
                                          ? 'border-red-200 bg-red-50'
                                          : 'border-orange-200 bg-white ring-1 ring-orange-100'
                                        : 'border-gray-100 bg-gray-50/30'
                                    )}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={cn(
                                          'w-10 text-right font-medium',
                                          requested > 0
                                            ? 'text-orange-700'
                                            : 'text-gray-400'
                                        )}
                                      >
                                        ${denom.denomination}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {isOver && (
                                        <span className="text-[9px] font-bold uppercase text-red-500">
                                          Short
                                        </span>
                                      )}
                                      <input
                                        type="number"
                                        min="0"
                                        value={requested === 0 ? '' : requested}
                                        onChange={e => {
                                          const val =
                                            e.target.value === ''
                                              ? 0
                                              : parseInt(e.target.value);
                                          const newDenoms = [
                                            ...editedDenominations,
                                          ];
                                          newDenoms[index] = {
                                            ...newDenoms[index],
                                            quantity: isNaN(val) ? 0 : val,
                                          };
                                          setEditedDenominations(newDenoms);
                                        }}
                                        className={cn(
                                          'h-8 w-20 rounded border bg-white px-2 text-right text-sm font-bold outline-none transition-all focus:border-orange-500',
                                          isOver &&
                                            'border-red-300 text-red-600 focus:border-red-500',
                                          !isOver &&
                                            requested > 0 &&
                                            'border-orange-200 text-orange-600'
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
                                {requested.map((d, i: number) => {
                                  const stock =
                                    vaultInventory.find(
                                      v =>
                                        Number(v.denomination) ===
                                        Number(d.denomination)
                                    )?.quantity || 0;
                                  const isShort =
                                    viewDetails.metadata?.requestType !==
                                      'decrease' &&
                                    Number(d.quantity) > Number(stock);
                                  return (
                                    <div
                                      key={i}
                                      className={`flex justify-between rounded border p-2 transition-colors ${
                                        isShort
                                          ? 'border-red-200 bg-red-50'
                                          : 'border-blue-100 bg-blue-50/30'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        {isShort && (
                                          <AlertTriangle className="h-3 w-3 text-red-500" />
                                        )}
                                        <span
                                          className={`font-medium ${isShort ? 'text-red-700' : 'text-blue-700'}`}
                                        >
                                          ${d.denomination}
                                        </span>
                                      </div>
                                      <div className="text-right">
                                        <span className="font-bold">
                                          x {d.quantity}
                                        </span>
                                        {isShort && (
                                          <p className="-mt-1 text-[10px] font-bold text-red-500">
                                            Shortage: {d.quantity - stock}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                                {requested.length === 0 && (
                                  <p className="py-4 text-center text-sm italic text-gray-500">
                                    No breakdown provided
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Shortage Alert */}
                      {hasShortage &&
                        (viewDetails.status === 'unread' ||
                          viewDetails.status === 'read') && (
                          <div className="flex items-start gap-3 rounded-md border border-red-200 bg-red-100 p-3">
                            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
                            <div>
                              <p className="text-sm font-bold text-red-800">
                                Insufficient Vault Funds
                              </p>
                              <p className="text-xs text-red-700">
                                {isEditing
                                  ? 'Your adjusted breakdown still exceeds available vault funds.'
                                  : 'Approval is disabled. You do not have enough specific denominations in the vault to fulfill this request.'}
                              </p>
                            </div>
                          </div>
                        )}

                      {/* Rejection Reason */}
                      <div className="pt-2">
                        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-400">
                          Rejection Reason (Optional)
                        </p>
                        <textarea
                          className="min-h-[60px] w-full resize-none rounded-md border bg-gray-50 p-2 text-sm outline-none transition-all focus:bg-white focus:ring-1 focus:ring-blue-500"
                          placeholder="Enter reason for rejection (optional)..."
                          id="rejection-reason"
                          value={rejectionReason}
                          onChange={e => setRejectionReason(e.target.value)}
                        />
                      </div>

                      {/* Final Actions */}
                      {(viewDetails.status === 'unread' ||
                        viewDetails.status === 'read') &&
                      !readOnly ? (
                        <div className="flex gap-3 border-t pt-4">
                          {viewDetails.metadata?.entityStatus ===
                          'approved_vm' ? (
                            viewDetails.metadata?.requestType === 'decrease' ? (
                              <Button
                                className="h-11 flex-1 bg-green-600 font-bold text-white hover:bg-green-700"
                                onClick={async () => {
                                  if (onConfirm) {
                                    const targetId =
                                      viewDetails.relatedEntityId ||
                                      viewDetails.id;
                                    await onConfirm(targetId);
                                    setViewDetails(null);
                                  }
                                }}
                              >
                                <Check className="mr-2 h-4 w-4" />
                                Confirm Receipt & Finalize Return
                              </Button>
                            ) : (
                              <div className="flex flex-1 items-center justify-center gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-blue-700">
                                <Clock className="h-4 w-4 animate-spin" />
                                <span className="text-sm font-bold">
                                  Awaiting Cashier Confirmation
                                </span>
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
                                className={`h-11 flex-1 font-bold ${hasShortage ? '' : 'bg-green-600 text-white hover:bg-green-700'}`}
                                disabled={hasShortage}
                                variant={hasShortage ? 'secondary' : 'default'}
                                onClick={async () => {
                                  if (onApprove) {
                                    const targetId =
                                      viewDetails.relatedEntityId ||
                                      viewDetails.id;
                                    // Pass edited denominations if editing mode was active (or just always pass them if we want to support modification)
                                    // Only pass if isEditing is true
                                    const denoms = isEditing
                                      ? editedDenominations.filter(
                                          d => d.quantity > 0
                                        )
                                      : undefined;
                                    await onApprove(targetId, denoms);
                                    setViewDetails(null);
                                  }
                                }}
                              >
                                <Check className="mr-2 h-4 w-4" />
                                {hasShortage
                                  ? 'Insufficient Stock'
                                  : isEditing
                                    ? 'Approve Amended Request'
                                    : 'Approve Request'}
                              </Button>
                              {!isEditing && (
                                <Button
                                  variant="destructive"
                                  className="h-11 flex-1 font-bold"
                                  onClick={async () => {
                                    if (onDeny) {
                                      const targetId =
                                        viewDetails.relatedEntityId ||
                                        viewDetails.id;
                                      console.log(
                                        'Rejecting request:',
                                        targetId,
                                        'Reason:',
                                        rejectionReason
                                      );
                                      try {
                                        await onDeny(targetId, rejectionReason);
                                        setViewDetails(null);
                                      } catch (err) {
                                        console.error(
                                          'Error rejecting request:',
                                          err
                                        );
                                      }
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
                        <div
                          className={`flex items-center justify-center gap-2 rounded-md border p-4 ${
                            viewDetails.status === 'cancelled'
                              ? 'border-red-200 bg-red-50 text-red-700'
                              : 'border-blue-200 bg-blue-50 text-blue-700'
                          }`}
                        >
                          {viewDetails.status === 'cancelled' ? (
                            <X className="h-5 w-5" />
                          ) : (
                            <Check className="h-5 w-5" />
                          )}
                          <span className="font-bold uppercase tracking-wide">
                            {viewDetails.status === 'cancelled'
                              ? 'Request Cancelled'
                              : 'Request Processed'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()
            : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
