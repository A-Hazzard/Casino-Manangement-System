'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import SMIBFirmwareTable from './SMIBFirmwareTable';
import SMIBFirmwareModal from './SMIBFirmwareModal';
import { DeleteFirmwareModal } from './DeleteFirmwareModal';
import { DownloadFirmwareModal } from './DownloadFirmwareModal';
import type { Firmware } from '@/lib/types/firmware';

export default function SMIBFirmwareSection() {
  const [firmwares, setFirmwares] = useState<Firmware[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchFirmwares = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/firmwares');
      const data = response.data;
      setFirmwares(data);
    } catch (error) {
      // Log error for debugging in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching firmwares:', error);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFirmwares();
  }, [fetchFirmwares]);

  const handleUploadComplete = () => {
    fetchFirmwares(); // Refresh the list after upload
  };

  const handleDeleteComplete = () => {
    fetchFirmwares(); // Refresh the list after delete
  };

  const handleDownloadComplete = () => {
    // Can add a toast notification here if needed
  };

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <>
      <SMIBFirmwareModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onUploadComplete={handleUploadComplete}
      />
      <DeleteFirmwareModal onDeleteComplete={handleDeleteComplete} />
      <DownloadFirmwareModal onDownloadComplete={handleDownloadComplete} />

      <div className="w-full max-w-full">
        {/* Header with Actions */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">
            SMIB Firmware
          </h2>
          
          {/* Mobile: Icon-only button */}
          <div className="md:hidden">
            {loading ? (
              <div className="h-5 w-5 flex-shrink-0" />
            ) : (
              <button
                onClick={openModal}
                disabled={loading}
                className="p-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                aria-label="Add New Firmware Version"
              >
                <PlusCircle className="h-5 w-5 text-green-600 hover:text-green-700" />
              </button>
            )}
          </div>

          {/* Desktop: Full button with icon and text */}
          <div className="hidden md:flex items-center gap-3 flex-shrink-0">
            {loading ? (
              <div className="h-10 w-40 flex-shrink-0" />
            ) : (
              <Button
                onClick={openModal}
                className="bg-button hover:bg-buttonActive text-white px-4 py-2 rounded-md items-center gap-2 flex-shrink-0"
                title="Add New Firmware Version"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Add Firmware</span>
              </Button>
            )}
          </div>
        </div>

        {/* Firmware Table */}
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <SMIBFirmwareTable
            firmwares={firmwares}
            loading={loading}
            onRefresh={fetchFirmwares}
          />
        </div>
      </div>
    </>
  );
}
