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
import { Button } from '@/components/shared/ui/button';
import { useMembersActionsStore } from '@/lib/store/memberActionsStore';

import axios from 'axios';
import { toast } from 'sonner';
import { Loader2, X } from 'lucide-react';
import Image from 'next/image';
import deleteIcon from '@/public/deleteIcon.svg';

type MembersDeleteMemberModalProps = {
  isOpen: boolean;
  onClose: () => void;
  member: Record<string, unknown> | null;
  onDelete: () => void;
};

export default function MembersDeleteMemberModal({
  onClose,
  onDelete,
}: MembersDeleteMemberModalProps) {
  // ============================================================================
  // State & Hooks
  // ============================================================================
  const { isDeleteModalOpen, selectedMember, closeDeleteModal } =
    useMembersActionsStore();

  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);


  // ============================================================================
  // Effects
  // ============================================================================
  useEffect(() => {
    if (isDeleteModalOpen && modalRef.current && backdropRef.current) {
      gsap.fromTo(
        modalRef.current,
        { y: 100, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out' }
      );
      gsap.fromTo(
        backdropRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: 'power2.out' }
      );
      setLoading(false);
    }
  }, [isDeleteModalOpen]);

  // ============================================================================
  // Handlers
  // ============================================================================
  const handleClose = () => {
    closeDeleteModal();
    onClose();
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

  // ============================================================================
  // Computed
  // ============================================================================
  if (!isDeleteModalOpen || !selectedMember) return null;

  const memberDisplayName =
    `${selectedMember.profile?.firstName || ''} ${
      selectedMember.profile?.lastName || ''
    }`.trim() || selectedMember._id;

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div className="fixed inset-0 z-[100000]">
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div
          ref={modalRef}
          className="w-full max-w-md rounded-md bg-container shadow-lg"
          style={{ opacity: 0, transform: 'translateY(-20px)' }}
        >
          <div className="border-b border-border p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-buttonActive">
                Delete Member
              </h2>
              <Button
                variant="ghost"
                onClick={handleClose}
                className="h-8 w-8 p-0 text-grayHighlight hover:bg-buttonInactive/10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <div className="p-6">
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <Image src={deleteIcon} alt="Delete" width={64} height={64} />
              </div>
              <p className="mb-4 text-lg font-semibold text-grayHighlight">
                Are you sure you want to delete member
                <span className="font-bold text-buttonActive">
                  {' '}
                  {memberDisplayName}{' '}
                </span>
                ?
              </p>
              <div className="mb-4 rounded-lg border border-border bg-buttonInactive/5 p-3 text-left">
                <p className="text-sm text-grayHighlight">
                  <span className="font-semibold">Member ID:</span>{' '}
                  {selectedMember._id}
                </p>
                {selectedMember.profile?.email && (
                  <p className="text-sm text-grayHighlight">
                    <span className="font-semibold">Email:</span>{' '}
                    {selectedMember.profile.email}
                  </p>
                )}
              </div>
              <p className="text-sm text-grayHighlight">
                This action cannot be undone. The member will be permanently
                removed from the system.
              </p>
            </div>
          </div>
          <div className="border-t border-border p-4">
            <div className="flex justify-center space-x-4">
              <Button
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </Button>
              <Button
                onClick={handleClose}
                className="bg-buttonInactive text-primary-foreground hover:bg-buttonInactive/90"
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
