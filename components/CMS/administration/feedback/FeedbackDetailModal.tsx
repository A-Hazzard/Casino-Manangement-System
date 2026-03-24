/**
 * Feedback Detail Modal Component
 */

import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { Checkbox } from '@/components/shared/ui/checkbox';
import {
    Dialog,
    DialogContent,
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
import { Textarea } from '@/components/shared/ui/textarea';
import { format } from 'date-fns';
import { Building2, Edit2, RotateCcw, Save, Trash2, User, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CATEGORY_LABELS, Feedback, getInitials, STATUS_HEADER } from './FeedbackTypes';

type FeedbackDetailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  selectedFeedback: Feedback | null;
  onUpdate: (updated: Feedback) => void;
  onDeleteClick: (item: Feedback) => void;
  onRestoreClick: (item: Feedback) => void;
  isUpdating: boolean;
  isDeleting: boolean;
};

export default function FeedbackDetailModal({
  isOpen,
  onClose,
  selectedFeedback,
  onUpdate,
  onDeleteClick,
  onRestoreClick,
  isUpdating,
  isDeleting,
}: FeedbackDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editStatus, setEditStatus] = useState<string>('');
  const [editArchived, setEditArchived] = useState<boolean>(false);
  const [editNotes, setEditNotes] = useState<string>('');
  const [localIsUpdating, setLocalIsUpdating] = useState(false);

  useEffect(() => {
    if (selectedFeedback) {
      setEditStatus(selectedFeedback.status);
      setEditArchived(Boolean(selectedFeedback.archived));
      setEditNotes(selectedFeedback.notes || '');
      setIsEditing(false);
    }
  }, [selectedFeedback, isOpen]);

  const handleUpdateFeedback = async () => {
    if (!selectedFeedback) return;

    setLocalIsUpdating(true);
    try {
      const updateData: {
        _id: string;
        status?: string;
        archived?: boolean;
        notes?: string | null;
      } = {
        _id: selectedFeedback._id,
      };

      if (editStatus !== selectedFeedback.status) {
        updateData.status = editStatus;
      }

      const currentArchived = Boolean(selectedFeedback.archived);
      if (editArchived !== currentArchived) {
        updateData.archived = editArchived;
      }

      const currentNotes = selectedFeedback.notes || '';
      if (editNotes.trim() !== currentNotes.trim()) {
        updateData.notes = editNotes.trim() || null;
      }

      if (Object.keys(updateData).length === 1) {
        toast.info('No changes to save');
        setLocalIsUpdating(false);
        setIsEditing(false);
        return;
      }

      const response = await fetch('/api/feedback', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update feedback');
      }

      const updatedFeedback = { 
        ...selectedFeedback, 
        ...data.feedback,
        archived: data.feedback.archived ?? false,
      };
      
      onUpdate(updatedFeedback);
      setIsEditing(false);
      toast.success('Feedback updated successfully');
    } catch (error) {
      console.error('Error updating feedback:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to update feedback. Please try again.'
      );
    } finally {
      setLocalIsUpdating(false);
    }
  };

  if (!selectedFeedback) return null;

  const header = STATUS_HEADER[selectedFeedback.archived ? 'archived' : selectedFeedback.status] ?? STATUS_HEADER.pending;
  const initials = getInitials(selectedFeedback.firstName, selectedFeedback.lastName, selectedFeedback.email);
  const displayName = [selectedFeedback.firstName, selectedFeedback.lastName].filter(Boolean).join(' ') || null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        isMobileFullScreen={false}
        showCloseButton={false}
        className="flex max-h-[90vh] w-[calc(100%-2rem)] max-w-xl flex-col overflow-hidden rounded-2xl p-0 shadow-2xl"
      >
        <DialogTitle className="sr-only">Feedback Details</DialogTitle>
        
        {/* Header */}
        <div className={`relative shrink-0 ${header.bg} px-6 pb-5 pt-5`}>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-1 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20 text-lg font-bold text-white ring-2 ring-white/30">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-base font-semibold ${header.text}`}>
                {displayName ?? <span className="opacity-70">Anonymous</span>}
              </p>
              <p className={`mt-0.5 break-all text-sm ${header.text} opacity-80`}>
                {selectedFeedback.email}
              </p>
              {selectedFeedback.username && (
                <p className={`mt-0.5 text-xs ${header.text} opacity-60`}>
                  @{selectedFeedback.username}
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {isEditing ? (
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger className="h-7 w-36 border-white/40 bg-white/20 text-xs text-white placeholder:text-white focus:ring-white/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Badge variant="outline" className={`border text-xs font-medium ${header.badge}`}>
                {selectedFeedback.archived ? 'Archived' : selectedFeedback.status.charAt(0).toUpperCase() + selectedFeedback.status.slice(1)}
              </Badge>
            )}
            <Badge variant="outline" className={`border text-xs ${header.badge}`}>
              {CATEGORY_LABELS[selectedFeedback.category] || selectedFeedback.category}
            </Badge>
            <span className={`ml-auto text-xs ${header.text} opacity-60`}>
              {format(new Date(selectedFeedback.submittedAt), 'MMM d, yyyy · HH:mm')}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                <User className="h-3 w-3" /> Username
              </p>
              <p className="text-sm font-medium text-gray-800">
                {selectedFeedback.username ?? <span className="text-gray-300">—</span>}
              </p>
            </div>
            <div>
              <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                <Building2 className="h-3 w-3" /> Licencee
              </p>
              <p className="break-words text-sm font-medium leading-snug text-gray-800">
                {selectedFeedback.licenceeName ?? <span className="text-gray-300">—</span>}
              </p>
            </div>
          </div>

          <div className="h-px bg-gray-100" />

          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Description</p>
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                {selectedFeedback.description}
              </p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Admin Notes</p>
            {isEditing ? (
              <Textarea
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                placeholder="Add internal notes about this feedback..."
                className="min-h-[100px] resize-none rounded-xl border-gray-200 text-sm focus:border-gray-300"
              />
            ) : selectedFeedback.notes ? (
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-blue-900">
                  {selectedFeedback.notes}
                </p>
              </div>
            ) : (
              <p className="text-sm italic text-gray-300">No notes added yet.</p>
            )}
          </div>

          {isEditing && (
            <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <Checkbox
                id="archived-checkbox"
                checked={editArchived}
                onCheckedChange={checked => setEditArchived(Boolean(checked))}
              />
              <Label htmlFor="archived-checkbox" className="cursor-pointer text-sm text-gray-700">
                Mark as archived
              </Label>
            </div>
          )}

          {selectedFeedback.reviewedBy && selectedFeedback.reviewedAt && (
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Review Trail</p>
              <p className="text-sm text-gray-700">
                Reviewed by <span className="font-medium text-gray-900">{selectedFeedback.reviewedBy}</span>
                {' · '}
                {format(new Date(selectedFeedback.reviewedAt), 'MMM d, yyyy · HH:mm')}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t bg-gray-50/80 px-6 py-4">
          {isEditing ? (
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(false)}
                disabled={localIsUpdating}
                className="text-gray-600"
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleUpdateFeedback} disabled={localIsUpdating}>
                <Save className="mr-1.5 h-3.5 w-3.5" />
                {localIsUpdating ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          ) : (
            <div className="flex w-full items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDeleteClick(selectedFeedback)}
                disabled={isDeleting}
                className="text-red-500 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Delete
              </Button>
              <div className="flex gap-2">
                {selectedFeedback.archived && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRestoreClick(selectedFeedback)}
                    disabled={isUpdating}
                    className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                  >
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                    Restore
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit2 className="mr-1.5 h-3.5 w-3.5" />
                  Edit
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
