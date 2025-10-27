'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { BarChart3, RefreshCw, AlertTriangle } from 'lucide-react';
import { useSmibMeters } from '@/lib/hooks/data/useSmibMeters';

type MeterDataSectionProps = {
  relayId: string | null;
  isOnline: boolean;
  comsMode?: number; // 0 = SAS, 1 = Non-SAS, 2 = IGT
};

export function MeterDataSection({
  relayId,
  isOnline,
  comsMode,
}: MeterDataSectionProps) {
  const [showResetDialog, setShowResetDialog] = useState(false);
  const { isRequestingMeters, isResettingMeters, requestMeters, resetMeters } =
    useSmibMeters();

  const handleRequestMeters = async () => {
    if (!relayId) return;
    await requestMeters(relayId);
  };

  const handleResetMeters = async () => {
    if (!relayId) return;
    const success = await resetMeters(relayId);
    if (success) {
      setShowResetDialog(false);
    }
  };

  const canResetMeters = comsMode !== undefined && comsMode !== 0; // Non-SAS only

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-700">
            <BarChart3 className="h-5 w-5" />
            Meter Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Request current meter data from the SMIB to verify machine
            communication and retrieve accounting information.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleRequestMeters}
              disabled={!relayId || isRequestingMeters}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isRequestingMeters ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                  Requesting...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Get Meters
                </>
              )}
            </Button>

            {canResetMeters ? (
              <Button
                onClick={() => setShowResetDialog(true)}
                disabled={!relayId || isResettingMeters}
                variant="destructive"
                className="bg-red-600 hover:bg-red-700"
              >
                {isResettingMeters ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                    Resetting...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Reset Meters
                  </>
                )}
              </Button>
            ) : (
              <div
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-500"
                title="Reset meters is only available for non-SAS machines"
              >
                <AlertTriangle className="mr-2 inline h-4 w-4" />
                Reset Meters (Non-SAS only)
              </div>
            )}

            {!isOnline && relayId && (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                <span>SMIB is offline</span>
              </div>
            )}
          </div>

          {!relayId && (
            <p className="text-sm text-gray-500">
              Select a SMIB to request meter data
            </p>
          )}

          <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-800">
            <p className="font-medium">Note:</p>
            <p>
              Meter data will be received via MQTT and displayed in real-time
              when the SMIB responds. This may take a few seconds depending on
              network conditions.
            </p>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Confirm Meter Reset
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to reset meters for SMIB{' '}
                <span className="font-semibold">{relayId}</span>?
              </p>
              <p className="font-medium text-red-600">
                This action cannot be undone!
              </p>
              <p className="text-sm">
                Resetting meters will clear all meter memory on this non-SAS
                machine. This operation should only be performed when
                absolutely necessary.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResettingMeters}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetMeters}
              disabled={isResettingMeters}
              className="bg-red-600 hover:bg-red-700"
            >
              {isResettingMeters ? 'Resetting...' : 'Reset Meters'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

