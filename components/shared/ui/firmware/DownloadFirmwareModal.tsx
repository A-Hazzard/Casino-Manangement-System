'use client';

import { Button } from '@/components/shared/ui/button';
import { useFirmwareActionsStore } from '@/lib/store/firmwareActionsStore';
import { Cross1Icon, DownloadIcon } from '@radix-ui/react-icons';
import axios from 'axios';
import { gsap } from 'gsap';
import { useEffect, useRef, useState } from 'react';

export const DownloadFirmwareModal = ({
  onDownloadComplete,
}: {
  onDownloadComplete: () => void;
}) => {
  const { isDownloadModalOpen, selectedFirmware, closeDownloadModal } =
    useFirmwareActionsStore();
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isDownloadModalOpen) {
      gsap.to(modalRef.current, {
        y: 0,
        opacity: 1,
        duration: 0.3,
        ease: 'power2.out',
      });
      gsap.to(backdropRef.current, {
        opacity: 1,
        duration: 0.2,
        ease: 'power2.out',
      });
    }
  }, [isDownloadModalOpen]);

  const handleClose = () => {
    gsap.to(modalRef.current, {
      y: -20,
      opacity: 0,
      duration: 0.3,
      ease: 'power2.in',
    });
    gsap.to(backdropRef.current, {
      opacity: 0,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: closeDownloadModal,
    });
  };

  const handleDownload = async () => {
    if (!selectedFirmware) return;
    setLoading(true);
    try {
      const response = await axios.get(
        `/api/firmwares/${selectedFirmware._id}`,
        {
          responseType: 'blob',
          withCredentials: true,
        }
      );
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = selectedFirmware.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      onDownloadComplete();
    } catch (error) {
      console.error('Error downloading firmware:', error);
      alert('Failed to download firmware file.');
    } finally {
      setLoading(false);
      handleClose();
    }
  };

  if (!isDownloadModalOpen || !selectedFirmware) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/50 opacity-0"
        onClick={handleClose}
      />
      <div
        ref={modalRef}
        className="w-full max-w-sm rounded-lg bg-container opacity-0 shadow-xl"
        style={{ transform: 'translateY(-20px)' }}
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-xl font-bold text-buttonActive">
            Download Confirmation
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="text-grayHighlight hover:bg-buttonInactive/10"
          >
            <Cross1Icon className="h-5 w-5" />
          </Button>
        </div>
        <div className="p-6 text-center">
          <div className="mb-4 flex justify-center">
            <DownloadIcon className="h-16 w-16 text-green-500" />
          </div>
          <p className="mb-2 text-lg font-semibold text-grayHighlight">
            Do you want to download this firmware?
          </p>
          <p className="text-gray-200">
            Product:{' '}
            <span className="font-bold text-buttonActive">
              {selectedFirmware.product}
            </span>
          </p>
          <p className="text-gray-200">
            Version:{' '}
            <span className="font-bold text-buttonActive">
              {selectedFirmware.version}
            </span>
          </p>
          <p className="text-gray-200">
            File:{' '}
            <span className="font-bold text-buttonActive">
              {selectedFirmware.fileName}
            </span>
          </p>
        </div>
        <div className="flex justify-center space-x-4 border-t border-border p-4">
          <Button
            onClick={handleDownload}
            className="bg-green-600 text-white hover:bg-green-700"
            disabled={loading}
          >
            {loading ? 'Downloading...' : 'Download'}
          </Button>
          <Button
            onClick={handleClose}
            variant="outline"
            className="bg-buttonInactive text-primary-foreground hover:bg-buttonInactive/90"
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

