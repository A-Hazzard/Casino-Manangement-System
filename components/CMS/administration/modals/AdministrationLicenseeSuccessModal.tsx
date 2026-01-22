/**
 * Licensee Success Modal Component
 * Success modal displayed after creating a new licensee with license key.
 *
 * Features:
 * - Success message display
 * - License key display
 * - Copy to clipboard functionality
 * - GSAP animations
 * - Licensee name display
 *
 * @param props - Component props
 */
'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { CheckCircle, Copy } from 'lucide-react';

type AdministrationLicenseeSuccessModalProps = {
  open: boolean;
  onClose: () => void;
  licensee: {
    name: string;
    licenseKey: string;
  } | null;
};

function AdministrationLicenseeSuccessModal({
  open,
  onClose,
  licensee,
}: AdministrationLicenseeSuccessModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { y: 80, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.35, ease: 'power2.out' }
      );
    }
  }, [open]);

  const copyToClipboard = async () => {
    if (licensee?.licenseKey) {
      try {
        await navigator.clipboard.writeText(licensee.licenseKey);
        alert('License key copied to clipboard!');
      } catch (err) {
        // Log error for debugging in development
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to copy:', err);
        }
        alert('Failed to copy license key');
      }
    }
  };

  if (!open || !licensee) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div
        ref={modalRef}
        className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-lg"
      >
        <button
          className="absolute right-3 top-3 text-gray-400 hover:text-gray-700"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        <div className="text-center">
          <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-500" />
          <h2 className="mb-2 text-2xl font-bold text-gray-800">
            Licensee Created Successfully!
          </h2>
          <p className="mb-6 text-gray-600">
            <strong>{licensee.name}</strong> has been created with the following
            license key:
          </p>
          <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <code className="break-all font-mono text-lg text-gray-800">
                {licensee.licenseKey}
              </code>
              <button
                onClick={copyToClipboard}
                className="ml-2 rounded p-2 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700"
                title="Copy to clipboard"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
            <p className="text-sm text-yellow-800">
              <strong>Important:</strong> Please save this license key securely.
              You will need it for license validation.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-full rounded bg-green-500 px-4 py-2 font-bold text-white transition-colors hover:bg-green-600"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdministrationLicenseeSuccessModal;

