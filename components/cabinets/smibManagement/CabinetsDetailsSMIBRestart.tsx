/**
 * CabinetsDetailsSMIBRestart Component
 * 
 * Handles restart commands for SMIB devices.
 * 
 * @param props - Component props
 */

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
import { useSmibRestart } from '@/lib/hooks/data/useSmibRestart';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { useEffect, useState } from 'react';

export type CabinetsDetailsSMIBRestartProps = {
  relayId: string | null;
  isOnline: boolean;
  onRefreshData?: () => Promise<void>;
};

export function CabinetsDetailsSMIBRestart({
  relayId,
  isOnline,
  onRefreshData,
}: CabinetsDetailsSMIBRestartProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdown, setCountdown] = useState(15);
  const { isRestarting, restartSmib } = useSmibRestart();

  // Countdown effect
  useEffect(() => {
    if (!showCountdown) return undefined;

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }

    if (countdown === 0) {
      // Call refresh function
      if (onRefreshData) {
        onRefreshData();
      }
      setShowCountdown(false);
      setCountdown(15);
    }

    return undefined;
  }, [showCountdown, countdown, onRefreshData]);

  const handleRestart = async () => {
    if (!relayId) return;

    const success = await restartSmib(relayId);
    if (success) {
      setShowConfirmDialog(false);
      setShowCountdown(true);
      setCountdown(15);
    }
  };

  return (
    <>
      <Card className="relative w-full max-w-full min-w-0 overflow-x-hidden">
        <CardHeader className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-700">
            <RotateCw className="h-5 w-5" />
            SMIB Restart
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 min-w-0 overflow-x-hidden">
          <p className="text-sm text-gray-600">
            Restart the SMIB device to reboot and reinitialize the system. This
            action will temporarily disconnect the device.
          </p>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowConfirmDialog(true)}
              disabled={!relayId || isRestarting || showCountdown}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isRestarting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                  Restarting...
                </>
              ) : (
                <>
                  <RotateCw className="mr-2 h-4 w-4" />
                  Restart SMIB
                </>
              )}
            </Button>

            {!isOnline && relayId && (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                <span>SMIB is offline</span>
              </div>
            )}
          </div>

          {!relayId && (
            <p className="text-sm text-gray-500">
              Select a SMIB to enable restart functionality
            </p>
          )}
        </CardContent>

        {/* Countdown Overlay */}
        {showCountdown && (
          <div className="absolute inset-0 z-50 flex items-center justify-center rounded-lg bg-white/95 backdrop-blur-sm">
            <div className="text-center">
              <div className="mb-3 text-sm font-medium text-gray-600">
                Refreshing in
              </div>
              <div className="mb-3 text-6xl font-bold text-orange-600 transition-all duration-300">
                {countdown}
              </div>
              <div className="text-xs text-gray-500">
                SMIB restart successful
              </div>
            </div>
          </div>
        )}
      </Card>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Confirm SMIB Restart
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to restart SMIB{' '}
                <span className="font-semibold">{relayId}</span>?
              </p>
              <p className="text-sm">
                This will temporarily disconnect the device and may interrupt
                active operations. The SMIB will automatically reconnect after
                rebooting.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRestarting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestart}
              disabled={isRestarting}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isRestarting ? 'Restarting...' : 'Restart SMIB'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
