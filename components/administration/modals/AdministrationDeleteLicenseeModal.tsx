/**
 * Delete Licensee Modal Component
 * Confirmation modal for deleting a licensee.
 *
 * Features:
 * - Licensee deletion confirmation
 * - Warning message
 * - GSAP animations
 * - Licensee name display
 *
 * @param props - Component props
 */
'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import type { Licensee } from '@/lib/types/licensee';

export type AdministrationDeleteLicenseeModalProps = {
  open: boolean;
  onClose: () => void;
  onDelete: () => void;
  licensee: Licensee | null;
};

export function AdministrationDeleteLicenseeModal({
  open,
  onClose,
  onDelete,
  licensee,
}: AdministrationDeleteLicenseeModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: 'power2.out' }
      );
    }
  }, [open]);

  if (!open || !licensee) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div
        ref={modalRef}
        className="relative w-full max-w-sm rounded-lg bg-white p-6 shadow-lg"
      >
        <button
          className="absolute right-3 top-3 text-gray-400 hover:text-gray-700"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="mb-4 text-center text-2xl font-bold">Delete Licensee</h2>
        <p className="mb-6 text-center text-gray-700">
          Are you sure you want to delete{' '}
          <span className="font-semibold">{licensee.name}</span>?
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={onClose}
            className="rounded bg-gray-200 px-4 py-2 font-semibold text-gray-700 transition hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={onDelete}
            className="rounded bg-red-600 px-4 py-2 font-semibold text-white transition hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdministrationDeleteLicenseeModal;
