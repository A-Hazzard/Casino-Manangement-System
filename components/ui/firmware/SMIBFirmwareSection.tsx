"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import SMIBFirmwareTable from "./SMIBFirmwareTable";
import SMIBFirmwareModal from "./SMIBFirmwareModal";
import type { Firmware } from "@/lib/types/firmware";

export default function SMIBFirmwareSection() {
  const [firmwares, setFirmwares] = useState<Firmware[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchFirmwares = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/firmwares");
      if (!response.ok) {
        throw new Error("Failed to fetch firmwares");
      }
      const data = await response.json();
      setFirmwares(data);
    } catch (error) {
      // Log error for debugging in development
      if (process.env.NODE_ENV === "development") {
        console.error("Error fetching firmwares:", error);
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

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <>
      <SMIBFirmwareModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onUploadComplete={handleUploadComplete}
      />

      <div className="w-full max-w-full">
        {/* Header with Add Button */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              SMIB Firmware
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage firmware versions for SMIB devices
            </p>
          </div>
          <Button
            onClick={openModal}
            className="bg-button hover:bg-button/90 text-white px-4 py-2 rounded-md flex items-center gap-2"
          >
            <div className="flex items-center justify-center w-6 h-6 border-2 border-white rounded-full">
              <Plus className="w-4 h-4 text-white" />
            </div>
            <span>Add New Firmware Version</span>
          </Button>
        </div>

        {/* Firmware Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <SMIBFirmwareTable firmwares={firmwares} loading={loading} />
        </div>
      </div>
    </>
  );
}
