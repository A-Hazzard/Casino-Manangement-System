'use client';

import { formatDistanceToNow } from 'date-fns';
import { DownloadIcon, TrashIcon } from '@radix-ui/react-icons';
import { Card, CardContent } from '@/components/ui/card';
import { useFirmwareActionsStore } from '@/lib/store/firmwareActionsStore';
import type { Firmware } from '@/lib/types/firmware';

type SMIBFirmwareCardProps = {
  firmware: Firmware;
};

export default function SMIBFirmwareCard({ firmware }: SMIBFirmwareCardProps) {
  const { openDeleteModal, openDownloadModal } = useFirmwareActionsStore();

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        {/* Product */}
        <div>
          <div className="text-xs text-gray-500 uppercase font-semibold mb-1">
            Product
          </div>
          <div className="font-medium text-button">{firmware.product}</div>
          {firmware.versionDetails && (
            <div className="mt-1 text-xs text-grayHighlight">
              {firmware.versionDetails}
            </div>
          )}
        </div>

        {/* Version */}
        <div>
          <div className="text-xs text-gray-500 uppercase font-semibold mb-1">
            Version
          </div>
          <span className="font-semibold text-buttonActive">
            {firmware.version}
          </span>
        </div>

        {/* Date Added */}
        <div>
          <div className="text-xs text-gray-500 uppercase font-semibold mb-1">
            Date Added
          </div>
          <div className="text-sm">
            {formatDistanceToNow(new Date(firmware.createdAt), {
              addSuffix: true,
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="pt-2 border-t border-gray-200">
          <div className="text-xs text-gray-500 uppercase font-semibold mb-2">
            Actions
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => openDownloadModal(firmware)}
              className="flex items-center gap-2 text-green-500 transition-colors hover:text-green-700"
              title="Download Firmware"
            >
              <DownloadIcon className="h-5 w-5" />
              <span className="text-sm font-medium">Download</span>
            </button>
            <button
              onClick={() => openDeleteModal(firmware)}
              className="flex items-center gap-2 text-red-500 transition-colors hover:text-red-700"
              title="Delete Firmware"
            >
              <TrashIcon className="h-5 w-5" />
              <span className="text-sm font-medium">Delete</span>
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

