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
import { Archive, Loader2, X, Trash2, AlertTriangle } from 'lucide-react';
import { gsap } from 'gsap';

type ModalStep = 'choose' | 'confirmArchive' | 'confirmDelete';

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

  const canPermanentlyDelete = useMemo(() => {
    const roles = user?.roles || [];
    return ['developer', 'owner', 'admin', 'location admin'].some(r =>
      roles.map((x: string) => x.toLowerCase()).includes(r)
    );
  }, [user]);

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

      const isArchived = Boolean((selectedLocation as { deletedAt?: string | Date })?.deletedAt);
      if (isArchived) {
        setStep('confirmDelete');
      } else if (canPermanentlyDelete) {
        setStep('choose');
      } else {
        setStep('confirmArchive');
      }
    }
  }, [isDeleteModalOpen, canPermanentlyDelete, selectedLocation]);

  const handleArchive = async () => {
    const location = selectedLocation as Record<string, unknown>;
    if (!location?.location) return;

    const isArchived = Boolean(location.deletedAt);
    setLoading(true);
    try {
      if (isArchived) {
        // Hard delete (permanent delete)
        await axios.delete(`/api/locations?id=${location.location}&hardDelete=true`);

        toast.success('Location permanently deleted successfully');
      } else {
        // No hardDelete param = soft delete (archive)
        await axios.delete(`/api/locations?id=${location.location}`);

        toast.success('Location archived successfully');
      }

      onDelete();
      closeDeleteModal();
    } catch (error) {
      console.error('Error removing location:', error);
      toast.error(isArchived ? 'Failed to permanently delete location' : 'Failed to archive location');
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
          className="w-full max-w-md overflow-hidden rounded-md bg-container shadow-lg"
          style={{ opacity: 0 }}
        >
          {/* Header */}
          <div className="border-b border-border p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-buttonActive">
                {step === 'choose' && 'Remove Location'}
                {step === 'confirmArchive' && 'Archive Location'}
                {step === 'confirmDelete' && 'Permanently Delete Location'}
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
                  The location will be hidden from active views but can be found
                  under the &quot;Archived&quot; status filter.
                </p>
              </div>
            )}

            {/* ── Step 2b: Confirm Delete ── */}
            {step === 'confirmDelete' && (
              <div className="text-center">
                <div className="mb-4 flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                  </div>
                </div>
                <p className="mb-4 text-lg font-semibold text-grayHighlight">
                  Are you sure you want to permanently delete
                  {locationName && (
                    <span className="font-bold text-buttonActive">
                      {' '}
                      {locationName}
                    </span>
                  )}
                  ?
                </p>
                <p className="text-sm text-red-600 font-semibold mb-2">
                  WARNING: This action is irreversible.
                </p>
                <p className="text-sm text-grayHighlight">
                  This will permanently delete the location and all its associated machines. This cannot be undone.
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

              {step === 'confirmDelete' && (
                <>
                  <Button
                    onClick={handleArchive}
                    className="bg-red-600 text-white hover:bg-red-700"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Permanently Delete
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleClose}
                    className="bg-buttonInactive text-primary-foreground hover:bg-buttonInactive/90"
                    disabled={loading}
                  >
                    Cancel
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
