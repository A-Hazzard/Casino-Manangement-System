'use client';

import { Button } from '@/components/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/shared/ui/dialog';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';

type AdministrationClearActivityLogsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClear: () => Promise<void>;
};

export default function AdministrationClearActivityLogsModal({
  open,
  onOpenChange,
  onClear,
}: AdministrationClearActivityLogsModalProps) {
  const [isClearing, setIsClearing] = useState(false);

  const handleClear = async () => {
    setIsClearing(true);
    try {
      await onClear();
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-full gap-0 overflow-hidden rounded-none p-0 sm:h-auto sm:max-w-md sm:rounded-xl">
        <DialogTitle className="sr-only">Clear All Activity Logs</DialogTitle>

        <div className="flex items-center gap-2.5 border-b bg-red-50 px-5 py-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100">
            <Trash2 className="h-4 w-4 text-red-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-red-700">
              Clear All Activity Logs
            </p>
            <p className="text-xs text-red-500">
              This action is extremely destructive and irreversible
            </p>
          </div>
        </div>

        <div className="space-y-4 px-5 py-4">
          <p className="text-sm leading-relaxed text-gray-600">
            Are you sure you want to{' '}
            <span className="font-semibold text-red-600">
              permanently delete all activity logs
            </span>{' '}
            from the database? This will clear the entire history of actions,
            edits, creations, and deletions.
          </p>
          <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50/50 p-3 text-xs leading-relaxed text-red-800">
            <span className="shrink-0 font-bold">WARNING:</span>
            <span>
              This cannot be undone. All audit trails for compliance and
              troubleshooting will be lost forever.
            </span>
          </div>
        </div>

        <div className="flex gap-2 border-t bg-gray-50 px-5 py-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isClearing}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleClear}
            disabled={isClearing}
            className="flex-1 bg-red-600 font-semibold text-white hover:bg-red-700"
          >
            {isClearing ? 'Clearing…' : 'Yes, clear all logs'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
