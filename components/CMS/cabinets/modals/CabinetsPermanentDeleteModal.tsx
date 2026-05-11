/**
 * Cabinets Permanent Delete Modal Component
 *
 * Modal for confirming and handling permanent deletion of cabinets.
 * Only developers can permanently delete cabinets.
 *
 * @module components/cabinets/CabinetsPermanentDeleteModal
 */
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/shared/ui/button';
import { useCabinetsActionsStore } from '@/lib/store/cabinetActionsStore';
import axios from 'axios';
import { toast } from 'sonner';
import { useUserStore } from '@/lib/store/userStore';
import { Trash2, Loader2, X } from 'lucide-react';
import { gsap } from 'gsap';

export default function CabinetsPermanentDeleteModal({
  onCabinetDeleted,
}: {
  onCabinetDeleted?: () => void;
}) {
  const {
    isPermanentDeleteModalOpen,
    closePermanentDeleteModal,
    selectedCabinet,
  } = useCabinetsActionsStore();
  const { user } = useUserStore();
  const [loading, setLoading] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isPermanentDeleteModalOpen && modalRef.current && backdropRef.current) {
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
  }, [isPermanentDeleteModalOpen]);

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
    details: string
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
          previousData: selectedCabinet,
          newData: null,
          changes: [],
        }),
      });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  const handlePermanentDelete = async () => {
    if (!selectedCabinet) return;

    setLoading(true);
    try {
      await axios.delete(
        `/api/cabinets/${selectedCabinet._id}?hardDelete=true`
      );

      await logActivity(
        'delete',
        'machine',
        selectedCabinet._id,
        selectedCabinet.assetNumber || 'Unknown Cabinet',
        `Permanently deleted cabinet: ${selectedCabinet.assetNumber || selectedCabinet._id}`
      );

      toast.success('Cabinet permanently deleted');
      onCabinetDeleted?.();
      closePermanentDeleteModal();
    } catch (error) {
      console.error('Error permanently deleting cabinet:', error);
      toast.error('Failed to permanently delete cabinet');
    } finally {
      setLoading(false);
    }
  };

  if (!isPermanentDeleteModalOpen) return null;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={closePermanentDeleteModal}
    >
      <div
        ref={modalRef}
        className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-red-600">
            Permanently Delete Cabinet
          </h2>
          <button
            onClick={closePermanentDeleteModal}
            className="rounded-full p-1 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6">
          <p className="mb-2 text-gray-700">
            Are you sure you want to{' '}
            <span className="font-bold text-red-600">permanently delete</span>{' '}
            the following cabinet?
          </p>
          <div className="rounded-lg bg-red-50 p-3">
            <p className="font-semibold text-gray-900">
              {selectedCabinet?.assetNumber || 'Unknown Cabinet'}
            </p>
            <p className="text-sm text-gray-600">
              {selectedCabinet?.game || 'No game specified'}
            </p>
          </div>
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm font-medium text-red-800">
              Warning: This action cannot be undone. The cabinet and all
              associated data will be permanently removed from the database.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={closePermanentDeleteModal}
            className="flex-1"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handlePermanentDelete}
            className="flex-1 bg-red-600 text-white hover:bg-red-700"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Deleting...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Permanently Delete
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
