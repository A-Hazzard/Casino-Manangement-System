/**
 * Profile Modal Header Component
 *
 * Sticky header for the Profile Modal with edit toggle and close button.
 */

'use client';

import { Button } from '@/components/ui/button';
import * as Dialog from '@radix-ui/react-dialog';
import { Pencil, X } from 'lucide-react';

type ProfileHeaderProps = {
  isEditMode: boolean;
  onToggleEdit: () => void;
  onClose: () => void;
};

export default function ProfileHeader({
  isEditMode,
  onToggleEdit,
  onClose,
}: ProfileHeaderProps) {
  return (
    <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-5">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
            My Profile
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            {isEditMode
              ? 'Update your profile information and preferences'
              : 'View and manage your account details'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isEditMode && (
            <Button
              onClick={onToggleEdit}
              size="sm"
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          )}
          <Dialog.Close asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-9 w-9 rounded-full hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </Button>
          </Dialog.Close>
        </div>
      </div>
    </div>
  );
}
