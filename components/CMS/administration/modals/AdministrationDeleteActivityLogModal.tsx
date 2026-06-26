'use client';

import { Button } from '@/components/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/shared/ui/dialog';
import type { ActivityLog } from '@/shared/types/activityLog';
import { safeFormatDate } from '@/lib/utils/formatting';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';

type AdministrationDeleteActivityLogModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  log: ActivityLog | null;
  onDelete: (deleteType: 'soft' | 'hard') => Promise<void>;
};

export default function AdministrationDeleteActivityLogModal({
  open,
  onOpenChange,
  log,
  onDelete,
}: AdministrationDeleteActivityLogModalProps) {
  const [deleteType, setDeleteType] = useState<'soft' | 'hard'>('soft');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onDelete(deleteType);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-full gap-0 overflow-hidden rounded-none p-0 sm:h-auto sm:max-w-sm sm:rounded-xl">
        <DialogTitle className="sr-only">Delete Activity Log</DialogTitle>

        <div className="flex items-center gap-2.5 border-b bg-red-50 px-5 py-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100">
            <Trash2 className="h-4 w-4 text-red-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-red-700">
              Delete Activity Log
            </p>
            <p className="text-xs text-red-500">
              This action may be irreversible
            </p>
          </div>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="space-y-1 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 font-mono text-xs text-gray-500">
            <p>
              <span className="font-semibold text-gray-600">ID</span> &nbsp;
              {log?._id}
            </p>
            <p>
              <span className="font-semibold text-gray-600">Action</span>{' '}
              &nbsp;{log?.action}
            </p>
            <p>
              <span className="font-semibold text-gray-600">User</span> &nbsp;
              {log?.username}
            </p>
            <p>
              <span className="font-semibold text-gray-600">Time</span> &nbsp;
              {log && safeFormatDate(log.timestamp)}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Deletion mode
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDeleteType('soft')}
                className={`rounded-lg border py-2 text-xs font-semibold transition-colors ${
                  deleteType === 'soft'
                    ? 'border-buttonActive bg-buttonActive text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-buttonActive/50 hover:bg-buttonActive/10'
                }`}
              >
                Soft delete
              </button>
              <button
                type="button"
                onClick={() => setDeleteType('hard')}
                className={`rounded-lg border py-2 text-xs font-semibold transition-colors ${
                  deleteType === 'hard'
                    ? 'border-red-500 bg-red-600 text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-red-300 hover:bg-red-50'
                }`}
              >
                Hard delete
              </button>
            </div>
            <p className="text-[11px] leading-relaxed text-gray-500">
              {deleteType === 'soft'
                ? 'Hides the log from the UI but keeps it in the database for auditing.'
                : 'Permanently removes the log from the database. This cannot be undone.'}
            </p>
          </div>
        </div>

        <div className="flex gap-2 border-t bg-gray-50 px-5 py-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={isDeleting}
            className={`flex-1 text-white ${
              deleteType === 'hard'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-buttonActive hover:bg-button'
            }`}
          >
            {isDeleting
              ? 'Deleting…'
              : deleteType === 'hard'
                ? 'Delete permanently'
                : 'Soft delete'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
