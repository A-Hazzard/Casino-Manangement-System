/**
 * Cabinets Restore Modal Component
 *
 * Modal for confirming and handling cabinet restoration from archive.
 *
 * @module components/cabinets/CabinetsRestoreModal
 */
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/shared/ui/button';
import { useCabinetsActionsStore } from '@/lib/store/cabinetActionsStore';
import axios from 'axios';
import { toast } from 'sonner';
import { RotateCcw, Loader2, X } from 'lucide-react';
import { gsap } from 'gsap';

export default function CabinetsRestoreModal({
  onCabinetRestored,
}: {
  onCabinetRestored?: () => void;
}) {
  const { isRestoreModalOpen, closeRestoreModal, selectedCabinet } =
    useCabinetsActionsStore();
  const [loading, setLoading] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isRestoreModalOpen && modalRef.current && backdropRef.current) {
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
  }, [isRestoreModalOpen]);

  const handleRestore = async () => {
    if (!selectedCabinet) return;

    setLoading(true);
    try {
      await axios.patch(`/api/cabinets/${selectedCabinet._id}`, {
        action: 'restore',
      });

      toast.success('Cabinet restored successfully');
      onCabinetRestored?.();
      closeRestoreModal();
    } catch (error) {
      console.error('Error restoring cabinet:', error);
      toast.error('Failed to restore cabinet');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      closeRestoreModal();
    }
  };

  if (!isRestoreModalOpen || !selectedCabinet) return null;

  const cabinetName = selectedCabinet.assetNumber || selectedCabinet._id;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/50 p-4"
      onClick={handleClose}
    >
      <div
        ref={modalRef}
        className="w-full max-w-md rounded-lg bg-white shadow-xl"
        style={{ opacity: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-green-600">
              Restore Cabinet
            </h2>
            <button
              onClick={handleClose}
              className="rounded-full p-1 hover:bg-gray-100"
              disabled={loading}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <RotateCcw className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <p className="mb-2 text-center text-lg font-semibold text-gray-900">
            Are you sure you want to restore
            <span className="font-bold text-green-600"> {cabinetName}</span>?
          </p>
          <p className="text-center text-sm text-gray-600">
            The cabinet will be restored and visible in active views again.
          </p>
        </div>

        <div className="border-t border-gray-200 p-4">
          <div className="flex justify-center gap-4">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRestore}
              className="flex-1 bg-green-600 text-white hover:bg-green-700"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Restoring...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Restore
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
