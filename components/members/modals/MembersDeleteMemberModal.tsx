/**
 * Members Delete Member Modal Component
 *
 * Modal for confirming and handling member deletion.
 *
 * @module components/members/modals/MembersDeleteMemberModal
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { Button } from '@/components/ui/button';
import { useMembersActionsStore } from '@/lib/store/memberActionsStore';
import { useUserStore } from '@/lib/store/userStore';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CasinoMember as Member } from '@/shared/types/entities';

type MembersDeleteMemberModalProps = {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  onDelete: () => void;
};

export default function MembersDeleteMemberModal({
  onClose,
  onDelete,
}: MembersDeleteMemberModalProps) {
  const { isDeleteModalOpen, selectedMember, closeDeleteModal } =
    useMembersActionsStore();
  const { user } = useUserStore();
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);

  // Helper function to get proper user display name for activity logging
  const getUserDisplayName = () => {
    if (!user) return 'Unknown User';

    // Check if user has profile with firstName and lastName
    if (user.profile?.firstName && user.profile?.lastName) {
      return `${user.profile.firstName} ${user.profile.lastName}`;
    }

    // If only firstName exists, use it
    if (user.profile?.firstName && !user.profile?.lastName) {
      return user.profile.firstName;
    }

    // If only lastName exists, use it
    if (!user.profile?.firstName && user.profile?.lastName) {
      return user.profile.lastName;
    }

    // If neither firstName nor lastName exist, use username
    if (user.username && user.username.trim() !== '') {
      return user.username;
    }

    // If username doesn't exist or is blank, use email
    if (user.emailAddress && user.emailAddress.trim() !== '') {
      return user.emailAddress;
    }

    // Fallback
    return 'Unknown User';
  };

  // Activity logging is now handled via API calls
  const logActivity = async (
    action: string,
    resource: string,
    resourceId: string,
    resourceName: string,
    details: string,
    previousData?: Record<string, unknown> | null,
    newData?: Record<string, unknown> | null
  ) => {
    try {
      const response = await fetch('/api/activity-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          resource,
          resourceId,
          resourceName,
          details,
          userId: user?._id || 'unknown',
          username: getUserDisplayName(),
          userRole: 'user',
          previousData: previousData || null,
          newData: newData || null,
          changes: [], // Will be calculated by the API
        }),
      });

      if (!response.ok) {
        console.error('Failed to log activity:', response.statusText);
      }
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  useEffect(() => {
    if (isDeleteModalOpen) {
      gsap.fromTo(
        modalRef.current,
        { opacity: 0, y: -20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.3,
          ease: 'power2.out',
          overwrite: true,
        }
      );

      gsap.to(backdropRef.current, {
        opacity: 1,
        duration: 0.2,
        ease: 'power2.out',
        overwrite: true,
      });
    }
  }, [isDeleteModalOpen]);

  const handleClose = () => {
    gsap.to(modalRef.current, {
      opacity: 0,
      y: -20,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: () => {
        closeDeleteModal();
        onClose();
      },
    });

    gsap.to(backdropRef.current, {
      opacity: 0,
      duration: 0.2,
      ease: 'power2.in',
    });
  };

  const handleDelete = async () => {
    if (!selectedMember?._id) {
      toast.error('No member selected');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.delete(`/api/members/${selectedMember._id}`);

      if (response.status === 200) {
        // Log the deletion activity
        await logActivity(
          'delete',
          'member',
          selectedMember._id,
          `${selectedMember.profile?.firstName || 'Unknown'} ${
            selectedMember.profile?.lastName || 'Member'
          }`,
          `Deleted member: ${selectedMember.profile?.firstName || 'Unknown'} ${
            selectedMember.profile?.lastName || 'Member'
          }`,
          selectedMember, // Previous data (the deleted member)
          null // No new data for deletion
        );

        toast.success('Member deleted successfully');
        onDelete();
        handleClose();
      } else {
        toast.error('Failed to delete member');
      }
    } catch (error) {
      console.error('Error deleting member:', error);
      toast.error('Failed to delete member');
    } finally {
      setLoading(false);
    }
  };

  if (!isDeleteModalOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="fixed inset-0 z-40 bg-black bg-opacity-50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          ref={modalRef}
          className="mx-auto w-full max-w-md rounded-lg bg-white shadow-xl"
        >
          <Dialog open={isDeleteModalOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Delete Member</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this member? This action
                  cannot be undone.
                </DialogDescription>
              </DialogHeader>

              <div className="py-4">
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <h3 className="mb-2 text-lg font-semibold text-red-800">
                    {selectedMember?.profile?.firstName}{' '}
                    {selectedMember?.profile?.lastName}
                  </h3>
                  <p className="text-sm text-red-600">
                    Member ID: {selectedMember?._id}
                  </p>
                  <p className="text-sm text-red-600">
                    Email: {selectedMember?.profile?.email}
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={loading}
                >
                  {loading ? 'Deleting...' : 'Delete Member'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </>
  );
}
