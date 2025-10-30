'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSmibMeters } from '@/lib/hooks/data/useSmibMeters';
import { parseSasPyd } from '@/lib/utils/sas/parsePyd';
import { AlertTriangle, BarChart3, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type MeterDataSectionProps = {
  relayId: string | null;
  isOnline: boolean;
};

export function MeterDataSection({ relayId, isOnline }: MeterDataSectionProps) {
  const { isRequestingMeters, requestMeters } = useSmibMeters();

  const [isLoading, setIsLoading] = useState(false);
  const [requestMessage, setRequestMessage] = useState<string | null>(null);
  const [lastMetersSignature, setLastMetersSignature] = useState<string | null>(
    null
  );
  const [selectedNvsAction, setSelectedNvsAction] = useState<string>('');
  const [isProcessingAction, setIsProcessingAction] = useState(false);
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
  const sseRef = useRef<EventSource | null>(null);
  const requestTimeoutRef = useRef<number | null>(null);

  const handleRequestMeters = async () => {
    if (!relayId) return;
    // Clear previous meters immediately and show loading
    setLiveMeters(null);
    setRequestMessage(null);
    setIsLoading(true);

    // Start timeout (10s). If no response, show message and keep table hidden
    if (requestTimeoutRef.current) {
      window.clearTimeout(requestTimeoutRef.current);
    }
    requestTimeoutRef.current = window.setTimeout(() => {
      setIsLoading(false);
      setRequestMessage('No response from SMIB');
    }, 10000);

    await requestMeters(relayId);
  };

  const handleNvsAction = async () => {
    if (!relayId || !selectedNvsAction) return;

    // TODO: Implement NVS action logic
    setIsProcessingAction(true);

    // Placeholder - will implement later
    setTimeout(() => {
      setIsProcessingAction(false);
      setSelectedNvsAction('');
    }, 1000);
  };

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
              setIsLoading(false);
              if (requestTimeoutRef.current) {
                window.clearTimeout(requestTimeoutRef.current);
                requestTimeoutRef.current = null;
              }
              return;
            }

            // Parse successful, extract all values
            const next = {
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
            } as typeof liveMeters;

            const signature = JSON.stringify({ ...next, lastAt: undefined });
            if (lastMetersSignature && signature === lastMetersSignature) {
              setRequestMessage('No new SAS meters detected');
            } else {
              setRequestMessage(null);
              setLastMetersSignature(signature);
            }
            setLiveMeters(next);
            setIsLoading(false);
            if (requestTimeoutRef.current) {
              window.clearTimeout(requestTimeoutRef.current);
              requestTimeoutRef.current = null;
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
      if (requestTimeoutRef.current) {
        window.clearTimeout(requestTimeoutRef.current);
        requestTimeoutRef.current = null;
      }
    };
  }, [relayId, lastMetersSignature]);

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

          {requestMessage && !isLoading && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-sm text-amber-800">
              {requestMessage}
            </div>
          )}

          {liveMeters && !isLoading && (
            <div className="rounded-md border border-gray-200 p-3">
              {liveMeters.error ? (
                <div className="mb-2 text-sm font-semibold text-amber-600">
                  {liveMeters.error}
                </div>
              ) : (
                <>
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

            <Select
              value={selectedNvsAction}
              onValueChange={setSelectedNvsAction}
              disabled={!relayId}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select NVS Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="clear_nvs">Clear NVS</SelectItem>
                <SelectItem value="clear_nvs_meters">
                  Clear NVS Meters
                </SelectItem>
                <SelectItem value="clear_nvs_bv">Clear NVS BV</SelectItem>
                <SelectItem value="clear_nvs_door">Clear NVS Door</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={handleNvsAction}
              disabled={!relayId || !selectedNvsAction || isProcessingAction}
              variant="default"
            >
              {isProcessingAction ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                  Processing...
                </>
              ) : (
                'Proceed'
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
    </>
  );
}
