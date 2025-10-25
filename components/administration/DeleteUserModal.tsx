import { Button } from '@/components/ui/button';
import type { DeleteUserModalProps } from '@/lib/types/administration';
import { X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

// Import SVG icons for pre-rendering
import deleteIcon from '@/public/deleteIcon.svg';

export default function DeleteUserModal({
  open,
  user,
  onClose,
  onDelete,
}: DeleteUserModalProps) {
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
    }
  }, [open]);

  if (!open || !user) return null;

  // Desktop View
  return (
    <div className="fixed inset-0 z-50">
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
                Delete User
              </h2>
              <Button
                variant="ghost"
                onClick={onClose}
                className="text-grayHighlight hover:bg-buttonInactive/10"
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
                Are you sure you want to delete user
                <span className="font-bold text-buttonActive">
                  {' '}
                  {user.username}{' '}
                </span>
                ?
              </p>
              <p className="text-sm text-grayHighlight">
                This action cannot be undone. The user will be permanently
                removed from the system.
              </p>
            </div>
          </div>
          <div className="border-t border-border p-4">
            <div className="flex justify-center space-x-4">
              <Button
                onClick={() => {
                  setLoading(true);
                  onDelete();
                  setLoading(false);
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={loading}
              >
                {loading ? 'Deleting...' : 'Delete'}
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
