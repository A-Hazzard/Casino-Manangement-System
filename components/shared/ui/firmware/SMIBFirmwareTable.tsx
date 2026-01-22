'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { formatDistanceToNow } from 'date-fns';
import { DownloadIcon, TrashIcon } from '@radix-ui/react-icons';
import { useFirmwareActionsStore } from '@/lib/store/firmwareActionsStore';
import type { Firmware } from '@/lib/types/firmware';

type SMIBFirmwareTableProps = {
  firmwares: Firmware[];
  loading: boolean;
  onRefresh: () => void;
};

export default function SMIBFirmwareTable({
  firmwares,
  loading = false,
  onRefresh,
}: SMIBFirmwareTableProps) {
  const tableRef = useRef<HTMLTableElement>(null);
  const prevFirmwaresRef = useRef<Firmware[]>([]);
  const { openDeleteModal, openDownloadModal } = useFirmwareActionsStore();

  // Animate table rows on data change
  useEffect(() => {
    if (
      firmwares.length > 0 &&
      JSON.stringify(firmwares) !== JSON.stringify(prevFirmwaresRef.current)
    ) {
      prevFirmwaresRef.current = [...firmwares];

      const rows = tableRef.current?.querySelectorAll('tbody tr');
      if (rows && rows.length > 0) {
        gsap.fromTo(
          rows,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            stagger: 0.05,
            duration: 0.4,
            ease: 'power2.out',
          }
        );
      }
    }
  }, [firmwares]);

  if (loading) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse text-center">
          <thead className="bg-button text-white">
            <tr>
              <th className="border border-t-0 border-border p-3 text-sm">
                PRODUCT
              </th>
              <th className="border border-t-0 border-border p-3 text-sm">
                VERSION
              </th>
              <th className="border border-t-0 border-border p-3 text-sm">
                DATE ADDED
              </th>
              <th className="border border-t-0 border-border p-3 text-sm">
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody>
            {[...Array(3)].map((_, i) => (
              <tr key={i}>
                <td className="border border-border bg-container p-3">
                  <div className="h-4 animate-pulse rounded bg-gray-200"></div>
                </td>
                <td className="border border-border bg-container p-3">
                  <div className="h-4 animate-pulse rounded bg-gray-200"></div>
                </td>
                <td className="border border-border bg-container p-3">
                  <div className="h-4 animate-pulse rounded bg-gray-200"></div>
                </td>
                <td className="border border-border bg-container p-3">
                  <div className="h-8 animate-pulse rounded bg-gray-200"></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (firmwares.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg bg-white p-8 shadow-md">
        <div className="mb-2 text-lg text-gray-500">No Firmware Available</div>
        <div className="text-center text-sm text-gray-400">
          Upload your first firmware version to get started.
        </div>
        <button
          onClick={onRefresh}
          className="mt-4 rounded-md bg-button px-4 py-2 text-white hover:bg-buttonActive"
        >
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table
        ref={tableRef}
        className="w-full table-fixed border-collapse text-center"
      >
        <thead className="bg-button text-white">
          <tr>
            <th className="border border-t-0 border-border p-3 text-sm">
              PRODUCT
            </th>
            <th className="border border-t-0 border-border p-3 text-sm">
              VERSION
            </th>
            <th className="border border-t-0 border-border p-3 text-sm">
              DATE ADDED
            </th>
            <th className="border border-t-0 border-border p-3 text-sm">
              ACTIONS
            </th>
          </tr>
        </thead>
        <tbody>
          {firmwares.map(firmware => (
            <tr key={firmware._id} className="hover:bg-grayHighlight/10">
              <td className="border border-border bg-container p-3 text-left text-sm hover:bg-grayHighlight/20">
                <div className="font-medium text-button">
                  {firmware.product}
                </div>
                {firmware.versionDetails && (
                  <div className="mt-1 text-xs text-grayHighlight">
                    {firmware.versionDetails}
                  </div>
                )}
              </td>
              <td className="border border-border bg-container p-3 text-sm hover:bg-grayHighlight/20">
                <span className="font-semibold text-buttonActive">
                  {firmware.version}
                </span>
              </td>
              <td className="border border-border bg-container p-3 text-sm hover:bg-grayHighlight/20">
                {formatDistanceToNow(new Date(firmware.createdAt), {
                  addSuffix: true,
                })}
              </td>
              <td className="border border-border bg-container p-3 text-sm">
                <div className="flex items-center justify-center space-x-3">
                  <button
                    onClick={() => openDownloadModal(firmware)}
                    className="text-green-500 transition-colors hover:text-green-700"
                    title="Download Firmware"
                  >
                    <DownloadIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => openDeleteModal(firmware)}
                    className="text-red-500 transition-colors hover:text-red-700"
                    title="Delete Firmware"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

