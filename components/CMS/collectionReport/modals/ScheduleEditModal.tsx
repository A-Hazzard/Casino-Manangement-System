/**
 * ScheduleEditModal
 *
 * Shared edit modal for both Manager Schedule and Collector Schedule entries.
 * Allows editing: Start Time, End Time, Status.
 * Collector and Location are displayed as read-only context.
 *
 * Accessible to: manager, admin, location admin, owner, developer.
 */
'use client';

import { Button } from '@/components/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/ui/dialog';
import { Label } from '@/components/shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { useState, useEffect } from 'react';

type ScheduleEditModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (data: { startTime: string; endTime: string; status: string }) => Promise<void>;
  initialData: {
    collectorName: string;
    locationName: string;
    startTime: string; // ISO string
    endTime: string;   // ISO string
    status: string;
  } | null;
  saving?: boolean;
};

/** Converts an ISO date string to datetime-local input value (local time) */
function toDatetimeLocal(iso: string): string {
  if (!iso) return '';
  const dateValue = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${dateValue.getFullYear()}-${pad(dateValue.getMonth() + 1)}-${pad(dateValue.getDate())}T${pad(dateValue.getHours())}:${pad(dateValue.getMinutes())}`;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'canceled', label: 'Canceled' },
];

export default function ScheduleEditModal({
  open,
  onClose,
  onSave,
  initialData,
  saving = false,
}: ScheduleEditModalProps) {
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [status, setStatus] = useState('pending');
  const [error, setError] = useState<string | null>(null);

  // Populate form when modal opens
  useEffect(() => {
    if (initialData) {
      setStartTime(toDatetimeLocal(initialData.startTime));
      setEndTime(toDatetimeLocal(initialData.endTime));
      setStatus(initialData.status || 'pending');
      setError(null);
    }
  }, [initialData, open]);

  const handleSave = async () => {
    setError(null);

    if (!startTime || !endTime) {
      setError('Start time and end time are required.');
      return;
    }

    if (new Date(startTime) >= new Date(endTime)) {
      setError('End time must be after start time.');
      return;
    }

    await onSave({
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      status,
    });
  };

  return (
    <Dialog open={open} onOpenChange={open ? onClose : undefined}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Schedule</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Read-only context */}
          <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-3 text-sm">
            <div>
              <span className="font-medium text-gray-500">Collector</span>
              <p className="mt-0.5 text-gray-900">{initialData?.collectorName || '—'}</p>
            </div>
            <div>
              <span className="font-medium text-gray-500">Location</span>
              <p className="mt-0.5 text-gray-900">{initialData?.locationName || '—'}</p>
            </div>
          </div>

          {/* Start Time */}
          <div className="space-y-1.5">
            <Label htmlFor="schedule-start">Start Time</Label>
            <input
              id="schedule-start"
              type="datetime-local"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-button"
            />
          </div>

          {/* End Time */}
          <div className="space-y-1.5">
            <Label htmlFor="schedule-end">End Time</Label>
            <input
              id="schedule-end"
              type="datetime-local"
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-button"
            />
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-button hover:bg-buttonHover text-white">
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
