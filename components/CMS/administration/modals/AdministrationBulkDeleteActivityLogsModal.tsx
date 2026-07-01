'use client';

import { Button } from '@/components/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/shared/ui/dialog';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';

type AdministrationBulkDeleteActivityLogsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onDelete: (deleteType: 'soft' | 'hard') => Promise<void>;
};

export default function AdministrationBulkDeleteActivityLogsModal({
  open,
  onOpenChange,
  selectedCount,
  onDelete,
}: AdministrationBulkDeleteActivityLogsModalProps) {
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
        <DialogTitle className="sr-only">Delete Selected Activity Logs</DialogTitle>

        <div className="flex items-center gap-2.5 border-b bg-red-50 px-5 py-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100">
            <Trash2 className="h-4 w-4 text-red-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-red-700">
              Delete {selectedCount} Activity Log{selectedCount !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-red-500">
              This action may be irreversible
            </p>
          </div>
        </div>

        <div className="space-y-4 px-5 py-4">
          <p className="text-sm text-gray-600">
            You are about to delete{' '}
            <span className="font-semibold">{selectedCount}</span> selected
            activity log{selectedCount !== 1 ? 's' : ''}.
          </p>

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
                ? 'Hides the logs from the UI but keeps them in the database for auditing.'
                : 'Permanently removes the logs from the database. This cannot be undone.'}
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
                ? `Delete ${selectedCount} permanently`
                : `Soft delete ${selectedCount}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
