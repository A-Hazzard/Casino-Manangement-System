'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
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
        {/* Header with Add Button */}
        <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="w-full sm:w-auto">
            <h2 className="text-xl font-semibold text-gray-800">
              SMIB Firmware
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Manage firmware versions for SMIB devices
            </p>
          </div>
          <Button
            onClick={openModal}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-button px-4 py-2 text-white hover:bg-button/90 sm:w-auto"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white">
              <Plus className="h-4 w-4 text-white" />
            </div>
            <span>Add New Firmware Version</span>
          </Button>
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
