/**
 * ScheduleDeleteDialog
 *
 * Shared confirmation dialog for soft-deleting a schedule entry.
 * Used by both Manager Schedule and Collector Schedule tabs.
 *
 * Accessible to: manager, admin, location admin, owner, developer.
 */
'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/shared/ui/alert-dialog';

type ScheduleDeleteDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  collectorName: string;
  locationName: string;
  deleting?: boolean;
};

export default function ScheduleDeleteDialog({
  open,
  onClose,
  onConfirm,
  collectorName,
  locationName,
  deleting = false,
}: ScheduleDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={open ? onClose : undefined}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Schedule</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the schedule for{' '}
            <span className="font-semibold text-gray-900">{collectorName}</span> at{' '}
            <span className="font-semibold text-gray-900">{locationName}</span>?
            <br />
            <span className="mt-1 block text-xs text-gray-500">
              This action cannot be undone.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} disabled={deleting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={deleting}
            className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
