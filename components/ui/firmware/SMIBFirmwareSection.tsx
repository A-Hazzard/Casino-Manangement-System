'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import SMIBFirmwareTable from './SMIBFirmwareTable';
import SMIBFirmwareCard from './SMIBFirmwareCard';
import SMIBFirmwareModal from './SMIBFirmwareModal';
import { DeleteFirmwareModal } from './DeleteFirmwareModal';
import { DownloadFirmwareModal } from './DownloadFirmwareModal';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import type { Firmware } from '@/lib/types/firmware';

export default function SMIBFirmwareSection({ refreshTrigger = 0 }: { refreshTrigger?: number } = {}) {
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

  // Refresh when trigger changes from parent
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchFirmwares();
    }
  }, [refreshTrigger, fetchFirmwares]);

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

  // Loading skeleton for cards
  const renderCardSkeleton = () => (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div>
          <Skeleton className="h-3 w-16 mb-1" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-40 mt-1" />
        </div>
        <div>
          <Skeleton className="h-3 w-16 mb-1" />
          <Skeleton className="h-5 w-20" />
        </div>
        <div>
          <Skeleton className="h-3 w-20 mb-1" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="pt-2 border-t border-gray-200">
          <Skeleton className="h-3 w-16 mb-2" />
          <div className="flex gap-4">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Empty state
  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center rounded-lg bg-white p-8 shadow-md">
      <div className="mb-2 text-lg text-gray-500">No Firmware Available</div>
      <div className="text-center text-sm text-gray-400">
        Upload your first firmware version to get started.
      </div>
      <button
        onClick={fetchFirmwares}
        className="mt-4 rounded-md bg-button px-4 py-2 text-white hover:bg-buttonActive"
      >
        Refresh
      </button>
    </div>
  );

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

        {/* Mobile & Tablet: Card Grid (below lg) */}
        <div className="lg:hidden">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i}>{renderCardSkeleton()}</div>
              ))}
            </div>
          ) : firmwares.length === 0 ? (
            renderEmptyState()
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {firmwares.map(firmware => (
                <SMIBFirmwareCard key={firmware._id} firmware={firmware} />
              ))}
            </div>
          )}
        </div>

        {/* Desktop: Table (lg and above) */}
        <div className="hidden lg:block overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
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
