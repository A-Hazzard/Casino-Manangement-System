'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSmibOTA } from '@/lib/hooks/data/useSmibOTA';
import { AlertTriangle, Download } from 'lucide-react';
import { useEffect, useState } from 'react';

type OTAUpdateSectionProps = {
  relayId: string | null;
  isOnline: boolean;
};

export function OTAUpdateSection({ relayId, isOnline }: OTAUpdateSectionProps) {
  const [selectedFirmwareId, setSelectedFirmwareId] = useState<string>('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const {
    isUpdating,
    firmwares,
    isLoadingFirmwares,
    fetchFirmwares,
    updateSmib,
  } = useSmibOTA();

  useEffect(() => {
    fetchFirmwares();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpdate = async () => {
    if (!relayId || !selectedFirmwareId) return;

    const firmware = firmwares.find(f => f._id === selectedFirmwareId);
    if (!firmware) return;

    const success = await updateSmib(relayId, firmware.version);

    if (success) {
      setShowConfirmDialog(false);
      setSelectedFirmwareId('');
    }
  };

  const selectedFirmware = firmwares.find(f => f._id === selectedFirmwareId);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-700">
            <Download className="h-5 w-5" />
            OTA Firmware Update
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Deploy over-the-air firmware updates to the SMIB device. Select a
            firmware version and initiate the update.
          </p>

          <div className="space-y-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Select Firmware Version
              </label>
              <Select
                value={selectedFirmwareId}
                onValueChange={setSelectedFirmwareId}
                disabled={!relayId || isLoadingFirmwares}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose firmware version..." />
                </SelectTrigger>
                <SelectContent>
                  {firmwares.length === 0 && !isLoadingFirmwares ? (
                    <div className="px-2 py-4 text-center text-sm text-gray-500">
                      No firmware versions available
                    </div>
                  ) : (
                    firmwares.map(firmware => (
                      <SelectItem key={firmware._id} value={firmware._id}>
                        {firmware.product} v{firmware.version}
                        {firmware.versionDetails &&
                          ` - ${firmware.versionDetails}`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={() => setShowConfirmDialog(true)}
                disabled={
                  !relayId || !selectedFirmwareId || isUpdating || !isOnline
                }
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isUpdating ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                    Initiating...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Initiate OTA Update
                  </>
                )}
              </Button>

              {!isOnline && relayId && (
                <div className="flex items-center gap-2 text-sm text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span>SMIB must be online for OTA updates</span>
                </div>
              )}
            </div>
          </div>

          {!relayId && (
            <p className="text-sm text-gray-500">
              Select a SMIB to enable OTA updates
            </p>
          )}

          <div className="rounded-md bg-purple-50 p-3 text-sm text-purple-800">
            <p className="font-medium">Important:</p>
            <ul className="ml-4 mt-1 list-disc space-y-1">
              <li>The SMIB must be online to receive OTA updates</li>
              <li>Updates may take several minutes to complete</li>
              <li>The device will restart automatically after update</li>
              <li>Do not power off the device during the update process</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-purple-600" />
              Confirm OTA Update
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Initiate OTA firmware update for SMIB{' '}
                <span className="font-semibold">{relayId}</span>?
              </p>
              {selectedFirmware && (
                <div className="rounded-md bg-gray-100 p-3">
                  <p className="font-medium">Firmware Details:</p>
                  <p className="text-sm">Product: {selectedFirmware.product}</p>
                  <p className="text-sm">Version: {selectedFirmware.version}</p>
                  {selectedFirmware.versionDetails && (
                    <p className="text-sm">
                      Details: {selectedFirmware.versionDetails}
                    </p>
                  )}
                </div>
              )}
              <p className="text-sm">
                The SMIB will download and install the firmware automatically.
                This process may take several minutes and the device will
                restart when complete.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUpdate}
              disabled={isUpdating}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isUpdating ? 'Initiating...' : 'Start Update'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
