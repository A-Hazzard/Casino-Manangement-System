/**
 * Cabinets Delete Cabinet Modal Component
 *
 * Modal for confirming and handling cabinet archival.
 * - Developers see the option to archive cabinets
 * - All other authorized users can archive
 * - Only developers can permanently delete cabinets (via API, not UI)
 *
 * @module components/cabinets/CabinetsDeleteCabinetModal
 */
'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/shared/ui/button';
import { useCabinetsActionsStore } from '@/lib/store/cabinetActionsStore';
import axios from 'axios';
import { toast } from 'sonner';
import { useUserStore } from '@/lib/store/userStore';
import { Archive, Loader2, X, Trash2 } from 'lucide-react';
import { gsap } from 'gsap';

type ModalStep = 'choose' | 'confirmArchive' | 'confirmDelete';

export default function CabinetsDeleteCabinetModal({
  onCabinetDeleted,
}: {
  onCabinetDeleted?: () => void;
}) {
  const { isDeleteModalOpen, closeDeleteModal, selectedCabinet } =
    useCabinetsActionsStore();
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
      setStep('choose');
    }
  }, [isDeleteModalOpen]);

  const handleArchive = async () => {
    if (!selectedCabinet) return;

    setLoading(true);
    try {
      await axios.delete(`/api/cabinets?id=${selectedCabinet._id}`);

      toast.success('Cabinet archived successfully');
      onCabinetDeleted?.();
      closeDeleteModal();
    } catch (error) {
      console.error('Error archiving cabinet:', error);
      toast.error('Failed to archive cabinet');
    } finally {
      setLoading(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (!selectedCabinet) return;

    setLoading(true);
    try {
      await axios.delete(
        `/api/cabinets/${selectedCabinet._id}?hardDelete=true`
      );

      toast.success('Cabinet permanently deleted');
      onCabinetDeleted?.();
      closeDeleteModal();
    } catch (error) {
      console.error('Error permanently deleting cabinet:', error);
      toast.error('Failed to permanently delete cabinet');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      closeDeleteModal();
    }
  };

  if (!isDeleteModalOpen || !selectedCabinet) return null;

  const cabinetName = selectedCabinet.assetNumber || selectedCabinet._id;

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
          <div className="border-b border-border p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-buttonActive">
                {step === 'choose' && 'Remove Cabinet'}
                {step === 'confirmArchive' && 'Archive Cabinet'}
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

          <div className="p-6">
            {step === 'choose' && (
              <div className="text-center">
                <p className="mb-2 text-lg font-semibold text-grayHighlight">
                  What would you like to do with
                  <span className="font-bold text-buttonActive">
                    {' '}
                    {cabinetName}
                  </span>
                  ?
                </p>
                <p className="mb-6 text-sm text-grayHighlight/70">
                  Choose how you want to remove this cabinet.
                </p>

                <div className="flex flex-col gap-3">
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
                        Hide from active cabinets. Can be restored later.
                      </p>
                    </div>
                  </button>

                  {canPermanentlyDelete && (
                    <button
                      onClick={() => setStep('confirmDelete')}
                      className="group flex items-center gap-4 rounded-lg border-2 border-red-200 bg-red-50 p-4 text-left transition-all hover:border-red-400 hover:bg-red-100"
                    >
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-200 text-red-700 transition-colors group-hover:bg-red-300">
                        <Trash2 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-red-800">
                          Permanently Delete
                        </p>
                        <p className="text-xs text-red-700/80">
                          Completely remove from database. Cannot be undone.
                        </p>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            )}

            {step === 'confirmArchive' && (
              <div className="text-center">
                <div className="mb-4 flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                    <Archive className="h-8 w-8 text-amber-600" />
                  </div>
                </div>
                <p className="mb-4 text-lg font-semibold text-grayHighlight">
                  Are you sure you want to archive
                  <span className="font-bold text-buttonActive">
                    {' '}
                    {cabinetName}
                  </span>
                  ?
                </p>
                <p className="text-sm text-grayHighlight">
                  The cabinet will be hidden from active views but can be found
                  under the &quot;Archived&quot; status filter.
                </p>
              </div>
            )}

            {step === 'confirmDelete' && (
              <div className="text-center">
                <div className="mb-4 flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                    <Trash2 className="h-8 w-8 text-red-600" />
                  </div>
                </div>
                <p className="mb-4 text-lg font-semibold text-grayHighlight">
                  Are you sure you want to permanently delete
                  <span className="font-bold text-buttonActive">
                    {' '}
                    {cabinetName}
                  </span>
                  ?
                </p>
                <p className="text-sm text-red-600">
                  This action cannot be undone. The cabinet will be completely
                  removed from the database.
                </p>
              </div>
            )}
          </div>

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
                    onClick={handlePermanentDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
