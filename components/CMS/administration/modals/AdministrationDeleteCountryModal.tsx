/**
 * Delete Country Modal Component
 * Confirmation modal for deleting a country.
 */

'use client';

import type { Country } from '@/lib/types/country';
import { gsap } from 'gsap';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

type AdministrationDeleteCountryModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  country: Country | null;
};

export default function AdministrationDeleteCountryModal({
  open,
  onClose,
  onConfirm,
  country,
}: AdministrationDeleteCountryModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { scale: 0.9, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.7)' }
      );
    }
  }, [open]);

  const handleDelete = async () => {
    if (!country?._id) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/countries?id=${country._id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Country deleted successfully');
        onConfirm();
        onClose();
      } else {
        toast.error(data.error || 'Failed to delete country');
      }
    } catch (error) {
      console.error('Error deleting country:', error);
      toast.error('Failed to delete country');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
      <div
        ref={modalRef}
        className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 className="mb-2 text-xl font-bold text-gray-900">Delete Country</h2>
        <p className="mb-6 text-gray-600">
          Are you sure you want to delete <span className="font-semibold text-gray-900">{country?.name}</span>? This action cannot be undone.
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
