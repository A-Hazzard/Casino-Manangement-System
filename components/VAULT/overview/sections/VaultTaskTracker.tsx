/**
 * Vault Task Tracker Component
 *
 * Displays a summary of pending and completed actions for the Vault Manager.
 * Helps prioritize work by showing float requests, shift reviews, and operational status.
 *
 * @module components/VAULT/overview/sections/VaultTaskTracker
 */
'use client';

import { Badge } from '@/components/shared/ui/badge';
import { Card } from '@/components/shared/ui/card';
import { cn } from '@/lib/utils';
import {
    AlertCircle,
    ArrowRight,
    CheckCircle2,
    ClipboardList,
    Clock
} from 'lucide-react';

type TaskItem = {
  id: string;
  title: string;
  status: 'pending' | 'completed' | 'critical';
  count?: number;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

type VaultTaskTrackerProps = {
  pendingFloats: number;
  pendingReviews: number;
  isVaultOpen: boolean;
  onViewFloats?: () => void;
  onViewReviews?: () => void;
  onOpenVault?: () => void;
};

export default function VaultTaskTracker({
  pendingFloats,
  pendingReviews,
  isVaultOpen,
  onViewFloats,
  onViewReviews,
  onOpenVault,
}: VaultTaskTrackerProps) {
  const tasks: TaskItem[] = [
    {
      id: 'vault-status',
      title: 'Vault Status',
      status: isVaultOpen ? 'completed' : 'critical',
      description: isVaultOpen 
        ? 'Vault shift is active and operational.' 
        : 'Vault is closed. No operations allowed.',
      actionLabel: isVaultOpen ? undefined : 'Open Vault',
      onAction: onOpenVault
    },
    {
      id: 'float-requests',
      title: 'Float Requests',
      status: pendingFloats > 0 ? 'pending' : 'completed',
      count: pendingFloats,
      description: pendingFloats > 0 
        ? `${pendingFloats} cashier requests awaiting your approval.` 
        : 'All cashier float requests have been processed.',
      actionLabel: pendingFloats > 0 ? 'Review Floats' : undefined,
      onAction: onViewFloats
    },
    {
      id: 'shift-reviews',
      title: 'Shift Reviews',
      status: pendingReviews > 0 ? 'critical' : 'completed',
      count: pendingReviews,
      description: pendingReviews > 0 
        ? `${pendingReviews} closed shifts have discrepancies requiring review.` 
        : 'All cashier shifts are reconciled and balanced.',
      actionLabel: pendingReviews > 0 ? 'Resolve Issues' : undefined,
      onAction: onViewReviews
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <ClipboardList className="h-5 w-5 text-blue-600" />
        <h2 className="text-lg font-semibold text-gray-900">Task Tracker</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {tasks.map((task) => (
          <Card 
            key={task.id}
            className={cn(
              "relative overflow-hidden border-none shadow-sm transition-all hover:shadow-md",
              task.status === 'completed' ? "bg-green-50/50" : 
              task.status === 'critical' ? "bg-red-50/50" : "bg-amber-50/50"
            )}
          >
            {/* Status Indicator Bar */}
            <div className={cn(
              "absolute left-0 top-0 bottom-0 w-1",
              task.status === 'completed' ? "bg-green-500" : 
              task.status === 'critical' ? "bg-red-500" : "bg-amber-500"
            )} />

            <div className="p-4 sm:p-5">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {task.status === 'completed' ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : task.status === 'critical' ? (
                    <AlertCircle className="h-5 w-5 text-red-600 animate-pulse" />
                  ) : (
                    <Clock className="h-5 w-5 text-amber-600" />
                  )}
                  <h3 className="font-bold text-gray-900">{task.title}</h3>
                </div>
                {task.count !== undefined && task.count > 0 && (
                  <Badge className={cn(
                    "rounded-full px-2",
                    task.status === 'critical' ? "bg-red-100 text-red-700 hover:bg-red-200" : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                  )}>
                    {task.count}
                  </Badge>
                )}
              </div>

              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {task.description}
              </p>

              {task.actionLabel && (
                <button 
                  onClick={task.onAction}
                  className={cn(
                    "flex items-center gap-1 text-xs font-bold uppercase tracking-wider transition-colors",
                    task.status === 'critical' ? "text-red-700 hover:text-red-900" : "text-amber-700 hover:text-amber-900"
                  )}
                >
                  {task.actionLabel}
                  <ArrowRight className="h-3 w-3" />
                </button>
              )}
              
              {!task.actionLabel && task.status === 'completed' && (
                <span className="text-xs font-bold uppercase tracking-wider text-green-700 opacity-60">
                  Up to date
                </span>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
