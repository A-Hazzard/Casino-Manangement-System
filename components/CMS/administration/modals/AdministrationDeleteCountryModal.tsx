/**
 * Delete Country Modal Component
 * Confirmation modal for deleting a country.
 */

'use client';

import type { Country } from '@/lib/types/country';
import { gsap } from 'gsap';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/shared/ui/button';
import { Loader2, X } from 'lucide-react';
import Image from 'next/image';
import deleteIcon from '@/public/deleteIcon.svg';

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
  const backdropRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && modalRef.current && backdropRef.current) {
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

  if (!open || !country) return null;

  return (
    <div className="fixed inset-0 z-[100000]">
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
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
                Delete Country
              </h2>
              <Button
                variant="ghost"
                onClick={onClose}
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
                Are you sure you want to delete country
                <span className="font-bold text-buttonActive">
                  {' '}
                  {country.name}{' '}
                </span>
                ?
              </p>
              <p className="text-sm text-grayHighlight">
                This action cannot be undone. The country will be permanently
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
                onClick={onClose}
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
