'use client';

import { formatDistanceToNow } from 'date-fns';
import { Download, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/shared/ui/card';
import { Button } from '@/components/shared/ui/button';
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

        {/* Action Buttons */}
        <div className="pt-3 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <Button
              onClick={() => openDownloadModal(firmware)}
              variant="outline"
              size="sm"
              className="flex-1 flex items-center justify-center gap-1.5 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download</span>
            </Button>
            <Button
              onClick={() => openDeleteModal(firmware)}
              variant="outline"
              size="sm"
              className="flex items-center justify-center gap-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


