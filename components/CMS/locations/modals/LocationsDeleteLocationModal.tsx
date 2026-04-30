/**
 * Locations Delete Location Modal Component
 *
 * Modal for confirming and handling location archival.
 * - Developers see the option to archive locations
 * - All other authorized users (admin, manager, location admin, owner) can archive
 * - Only developers can permanently delete locations (via API, not UI)
 *
 * @module components/locations/LocationsDeleteLocationModal
 */
'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/shared/ui/button';
import { useLocationsActionsStore } from '@/lib/store/locationActionsStore';
import axios from 'axios';
import { toast } from 'sonner';
import { useUserStore } from '@/lib/store/userStore';
import { Archive, Loader2, X } from 'lucide-react';
import { gsap } from 'gsap';

type ModalStep = 'choose' | 'confirmArchive';

export default function LocationsDeleteLocationModal({
  onDelete,
}: {
  onDelete: () => void;
}) {
  const { isDeleteModalOpen, closeDeleteModal, selectedLocation } =
    useLocationsActionsStore();
  const { user } = useUserStore();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<ModalStep>('choose');
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const isDeveloper = useMemo(() => {
    const roles = user?.roles || [];
    return roles.map((r: string) => r.toLowerCase()).includes('developer');
  }, [user]);

  const canPermanentlyDelete = useMemo(() => {
    return isDeveloper;
  }, [isDeveloper]);

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
      if (canPermanentlyDelete) {
        setStep('choose');
      } else {
        setStep('confirmArchive');
      }
    }
  }, [isDeleteModalOpen, canPermanentlyDelete]);

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

  const handleArchive = async () => {
    const location = selectedLocation as Record<string, unknown>;
    if (!location?.location) return;

    setLoading(true);
    try {
      // No hardDelete param = soft delete (archive)
      await axios.delete(`/api/locations?id=${location.location}`);

      await logActivity(
        'archive',
        'location',
        location.location as string,
        (location.locationName as string) || 'Unknown Location',
        `Archived location: ${location.locationName as string}`,
        location,
        null
      );

      toast.success('Location archived successfully');
      onDelete();
      closeDeleteModal();
    } catch (error) {
      console.error('Error archiving location:', error);
      toast.error('Failed to archive location');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      closeDeleteModal();
    }
  };

  if (!isDeleteModalOpen || !selectedLocation) return null;

  const locationName = (selectedLocation as Record<string, unknown>)
    ?.locationName as string;

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
          className="w-full max-w-md rounded-md bg-container shadow-lg overflow-hidden"
          style={{ opacity: 0 }}
        >
          {/* Header */}
          <div className="border-b border-border p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-buttonActive">
                {step === 'choose' && 'Remove Location'}
                {step === 'confirmArchive' && 'Archive Location'}
              </h2>
              <Button
                variant="ghost"
                onClick={handleClose}
                className="h-8 w-8 p-0 text-grayHighlight hover:bg-buttonInactive/10"
                disabled={loading}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Body */}
          <div className="p-6">
            {/* ── Step 1: Developer chooses Archive or Delete ── */}
            {step === 'choose' && (
              <div className="text-center">
                <p className="mb-2 text-lg font-semibold text-grayHighlight">
                  What would you like to do with
                  {locationName && (
                    <span className="font-bold text-buttonActive">
                      {' '}
                      {locationName}
                    </span>
                  )}
                  ?
                </p>
                <p className="mb-6 text-sm text-grayHighlight/70">
                  Choose how you want to remove this location.
                </p>

                <div className="flex flex-col gap-3">
                  {/* Archive option */}
                  <button
                    onClick={() => setStep('confirmArchive')}
                    className="group flex items-center gap-4 rounded-lg border-2 border-amber-200 bg-amber-50 p-4 text-left transition-all hover:border-amber-400 hover:bg-amber-100"
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-700 transition-colors group-hover:bg-amber-300">
                      <Archive className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-amber-800">Archive</p>
                      <p className="text-xs text-amber-700/80">
                        Hide from active locations. Can be restored later.
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 2a: Confirm Archive ── */}
            {step === 'confirmArchive' && (
              <div className="text-center">
                <div className="mb-4 flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                    <Archive className="h-8 w-8 text-amber-600" />
                  </div>
                </div>
                <p className="mb-4 text-lg font-semibold text-grayHighlight">
                  Are you sure you want to archive
                  {locationName && (
                    <span className="font-bold text-buttonActive">
                      {' '}
                      {locationName}
                    </span>
                  )}
                  ?
                </p>
                <p className="text-sm text-grayHighlight">
                  The location will be hidden from active views but can be
                  found under the &quot;Archived&quot; status filter.
</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border p-4">
            <div className="flex justify-center space-x-4">
              {step === 'choose' && (
                <Button
                  onClick={handleClose}
                  className="bg-buttonInactive text-primary-foreground hover:bg-buttonInactive/90"
                >
                  Cancel
                </Button>
              )}

              {step === 'confirmArchive' && (
                <>
                  <Button
                    onClick={handleArchive}
                    className="bg-amber-500 text-white hover:bg-amber-600"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Archiving...
                      </>
                    ) : (
                      <>
                        <Archive className="mr-2 h-4 w-4" />
                        Archive
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => setStep('choose')}
                    className="bg-buttonInactive text-primary-foreground hover:bg-buttonInactive/90"
                    disabled={loading}
                  >
                    Back
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
