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
import { useSmibMeters } from '@/lib/hooks/data/useSmibMeters';
import { parseSasPyd } from '@/lib/utils/sas/parsePyd';
import { AlertTriangle, BarChart3, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

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

  const [liveMeters, setLiveMeters] = useState<{
    totalCoinCredits?: number;
    totalCoinOut?: number;
    totalCancelledCredits?: number;
    totalHandPaidCancelCredits?: number;
    totalWonCredits?: number;
    totalDrop?: number;
    totalAttendantPaidProgressiveWin?: number;
    currentCredits?: number;
    total20KBillsAccepted?: number;
    total200BillsToDrop?: number;
    lastAt?: string;
    error?: string;
  } | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const sseRef = useRef<EventSource | null>(null);
  const liveMetersRef = useRef<typeof liveMeters>(null);

  useEffect(() => {
    liveMetersRef.current = liveMeters;
  }, [liveMeters]);

  const metersEqual = (a: typeof liveMeters, b: typeof liveMeters): boolean => {
    if (!a || !b) return false;
    return (
      a.totalCoinCredits === b.totalCoinCredits &&
      a.totalCoinOut === b.totalCoinOut &&
      a.totalCancelledCredits === b.totalCancelledCredits &&
      a.totalHandPaidCancelCredits === b.totalHandPaidCancelCredits &&
      a.totalWonCredits === b.totalWonCredits &&
      a.totalDrop === b.totalDrop &&
      a.totalAttendantPaidProgressiveWin ===
        b.totalAttendantPaidProgressiveWin &&
      a.currentCredits === b.currentCredits &&
      a.total20KBillsAccepted === b.total20KBillsAccepted &&
      a.total200BillsToDrop === b.total200BillsToDrop
    );
  };

  const handleRequestMeters = async () => {
    if (!relayId) return;
    setInfoMessage(null);
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

  // Connect to SSE to capture 'rsp' with pyd and parse meters
  useEffect(() => {
    if (!relayId) return;

    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }

    const es = new EventSource(`/api/mqtt/config/subscribe?relayId=${relayId}`);
    sseRef.current = es;

    es.onmessage = ev => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg?.type === 'config_update' && msg?.data) {
          const data = msg.data as Record<string, unknown>;
          const typ = data.typ as string | undefined;
          const pyd = data.pyd as string | undefined;
          if (typ === 'rsp' && pyd && typeof pyd === 'string') {
            const parsed = parseSasPyd(pyd);

            // Handle error case (e.g., pyd: "-1")
            if (parsed.error) {
              setLiveMeters({
                error: parsed.error,
                lastAt: new Date().toISOString(),
              });
              setInfoMessage(null);
              return;
            }

            // Parse successful, extract all values
            const nextMeters = {
              totalCoinCredits: parsed.totalCoinCredits,
              totalCoinOut: parsed.totalCoinOut,
              totalCancelledCredits: parsed.totalCancelledCredits,
              totalHandPaidCancelCredits: parsed.totalHandPaidCancelCredits,
              totalWonCredits: parsed.totalWonCredits,
              totalDrop: parsed.totalDrop,
              totalAttendantPaidProgressiveWin:
                parsed.totalAttendantPaidProgressiveWin,
              currentCredits: parsed.currentCredits,
              total20KBillsAccepted: parsed.total20KBillsAccepted,
              total200BillsToDrop: parsed.total200BillsToDrop,
              lastAt: new Date().toISOString(),
            } as const;

            if (metersEqual(liveMetersRef.current, nextMeters)) {
              setInfoMessage('No new SAS meters detected');
              // Still update timestamp to reflect last check
              setLiveMeters({ ...nextMeters });
            } else {
              setInfoMessage(null);
              setLiveMeters({ ...nextMeters });
            }
          }
        }
      } catch {
        // ignore malformed
      }
    };

    es.onerror = () => {
      // Best-effort; ignore
    };

    return () => {
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
    };
  }, [relayId]);

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

          {liveMeters && (
            <div className="rounded-md border border-gray-200 p-3">
              {liveMeters.error ? (
                <div className="mb-2 text-sm font-semibold text-amber-600">
                  {liveMeters.error}
                </div>
              ) : (
                <>
                  {infoMessage && (
                    <div className="mb-2 rounded-md bg-blue-50 p-2 text-xs font-medium text-blue-700">
                      {infoMessage}
                    </div>
                  )}
                  <div className="mb-3 text-sm font-semibold">
                    Live SAS Meters
                  </div>
                  <div className="divide-y divide-gray-200">
                    {[
                      {
                        label: 'Total Coin Credits',
                        value: liveMeters.totalCoinCredits,
                      },
                      {
                        label: 'Total Coin Out',
                        value: liveMeters.totalCoinOut,
                      },
                      {
                        label: 'Total Cancelled Credits',
                        value: liveMeters.totalCancelledCredits,
                      },
                      {
                        label: 'Total Hand Paid Cancel Credits',
                        value: liveMeters.totalHandPaidCancelCredits,
                      },
                      {
                        label: 'Total Won Credits',
                        value: liveMeters.totalWonCredits,
                      },
                      { label: 'Total Drop', value: liveMeters.totalDrop },
                      {
                        label: 'Total Attendant Paid Progressive Win',
                        value: liveMeters.totalAttendantPaidProgressiveWin,
                      },
                      {
                        label: 'Current Credits',
                        value: liveMeters.currentCredits,
                      },
                      {
                        label: 'Total $20K Bills Accepted',
                        value: liveMeters.total20KBillsAccepted,
                      },
                      {
                        label: 'Total $200 Bills to Drop',
                        value: liveMeters.total200BillsToDrop,
                      },
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between py-2 text-sm"
                      >
                        <span className="text-gray-600">{item.label}</span>
                        <span className="font-medium">{item.value ?? '—'}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Last updated: {liveMeters.lastAt}
                  </div>
                </>
              )}
            </div>
          )}

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
                machine. This operation should only be performed when absolutely
                necessary.
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
