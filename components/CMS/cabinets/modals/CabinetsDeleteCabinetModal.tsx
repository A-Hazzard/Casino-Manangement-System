/**
 * Cabinets Delete Cabinet Modal Component
 *
 * Modal for confirming and handling cabinet deletion.
 *
 * @module components/cabinets/CabinetsDeleteCabinetModal
 */
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/shared/ui/button';
import { useCabinetsActionsStore } from '@/lib/store/cabinetActionsStore';
import axios from 'axios';
import { toast } from 'sonner';
import { useUserStore } from '@/lib/store/userStore';
import Image from 'next/image';
import deleteIcon from '@/public/deleteIcon.svg';
import { Loader2, X } from 'lucide-react';
import { gsap } from 'gsap';

export default function CabinetsDeleteCabinetModal({
  onCabinetDeleted,
}: {
  onCabinetDeleted?: () => void;
}) {
  const { isDeleteModalOpen, closeDeleteModal, selectedCabinet } =
    useCabinetsActionsStore();
  const { user } = useUserStore();
  const [loading, setLoading] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

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

  // Helper function to get proper user display name for activity logging
  const getUserDisplayName = () => {
    if (!user) return 'Unknown User';

    if (user.profile?.firstName && user.profile?.lastName) {
      return `${user.profile.firstName} ${user.profile.lastName}`;
    }
    if (user.profile?.firstName) return user.profile.firstName;
    if (user.profile?.lastName) return user.profile.lastName;
    if (user.username) return user.username;
    if (user.emailAddress) return user.emailAddress;
    return 'Unknown User';
  };

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
      await fetch('/api/activity-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
          changes: [],
        }),
      });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedCabinet) return;

    setLoading(true);
    try {
      await axios.delete(`/api/cabinets?id=${selectedCabinet._id}`);

      await logActivity(
        'delete',
        'cabinet',
        selectedCabinet._id,
        selectedCabinet.assetNumber || 'Unknown Cabinet',
        `Deleted cabinet: ${selectedCabinet.assetNumber || selectedCabinet._id}`,
        selectedCabinet,
        null
      );

      toast.success('Cabinet deleted successfully');
      onCabinetDeleted?.();
      closeDeleteModal();
    } catch (error) {
      console.error('Error deleting cabinet:', error);
      toast.error('Failed to delete cabinet');
    } finally {
      setLoading(false);
    }
  };

  if (!isDeleteModalOpen || !selectedCabinet) return null;

  return (
    <div className="fixed inset-0 z-[100000]">
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/50"
        onClick={closeDeleteModal}
      />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div
          ref={modalRef}
          className="w-full max-w-md rounded-md bg-container shadow-lg overflow-hidden"
          style={{ opacity: 0 }}
        >
          <div className="border-b border-border p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-buttonActive">
                Delete Cabinet
              </h2>
              <Button
                variant="ghost"
                onClick={closeDeleteModal}
                className="h-8 w-8 p-0 text-grayHighlight hover:bg-buttonInactive/10"
                disabled={loading}
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
                Are you sure you want to delete this cabinet
                {selectedCabinet.assetNumber && (
                  <span className="font-bold text-buttonActive">
                    {' '}
                    {selectedCabinet.assetNumber}{' '}
                  </span>
                )}
                ?
              </p>
              <p className="text-sm text-grayHighlight">
                This action cannot be undone. The cabinet will be permanently
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
                onClick={closeDeleteModal}
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

