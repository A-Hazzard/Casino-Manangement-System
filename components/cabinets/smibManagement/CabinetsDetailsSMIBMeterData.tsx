/**
 * CabinetsDetailsSMIBMeterData Component
 * 
 * Handles meter data requests and display for SMIB devices.
 * 
 * @param props - Component props
 */

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
import { useCallback, useEffect, useRef, useState } from 'react';

type SSEMessage = {
  type:
    | 'connected'
    | 'callback_ready'
    | 'heartbeat'
    | 'keepalive'
    | 'config_update'
    | 'error';
  relayId?: string;
  timestamp?: string;
  message?: string;
  component?: string;
  data?: Record<string, unknown>;
  error?: string;
};

export type CabinetsDetailsSMIBMeterDataProps = {
  relayId: string | null;
  isOnline: boolean;
  smibConfig?: {
    subscribeToMessages: (
      callback: (message: SSEMessage) => void
    ) => () => void;
    isSSEConnected: boolean;
  };
};

export function CabinetsDetailsSMIBMeterData({
  relayId,
  isOnline,
  smibConfig,
}: CabinetsDetailsSMIBMeterDataProps) {
  const { isRequestingMeters, requestMeters } = useSmibMeters();

  const [isLoading, setIsLoading] = useState(false);
  const [requestMessage, setRequestMessage] = useState<string | null>(null);
  const [_lastMetersSignature, setLastMetersSignature] = useState<
    string | null
  >(null);
  const [selectedNvsAction, setSelectedNvsAction] = useState<string>('');
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [isSSEConnected, setIsSSEConnected] = useState(false);
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
  const requestTimeoutRef = useRef<number | null>(null);
  const sseRef = useRef<EventSource | null>(null);

  const handleRequestMeters = async () => {
    if (!relayId) {
      return;
    }

    // Use smibConfig's SSE connection status if provided, otherwise use internal state
    const sseConnected = smibConfig
      ? smibConfig.isSSEConnected
      : isSSEConnected;

    // Prevent request if SSE not connected
    if (!sseConnected) {
      setRequestMessage('Please wait for MQTT connection to establish...');
      return;
    }

    // Prevent duplicate requests
    if (isLoading || isRequestingMeters) {
      return;
    }

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
    if (!relayId || !selectedNvsAction) {
      return;
    }

    if (!isOnline) {
      setRequestMessage('SMIB is offline. Cannot execute NVS action.');
      return;
    }

    setIsProcessingAction(true);
    setRequestMessage(null);

    try {
      const response = await fetch('/api/smib/nvs-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          relayId,
          action: selectedNvsAction,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setRequestMessage(
          `${selectedNvsAction.replace(/_/g, ' ')} command sent successfully`
        );
        setSelectedNvsAction('');
      } else {
        setRequestMessage(data.error || 'Failed to execute NVS action');
      }
    } catch (error) {
      console.error('❌ Failed to execute NVS action:', error);
      setRequestMessage('Failed to execute NVS action');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Message handler for processing SSE messages
  const handleSSEMessage = useCallback((msg: SSEMessage) => {
    try {
      // Mark as ready when callback is actually registered
      if (msg.type === 'callback_ready') {
        setIsSSEConnected(true);
        return;
      }

      if (msg?.type === 'config_update' && msg?.data) {
        const data = msg.data as Record<string, unknown>;
        const typ = data.typ as string | undefined;
        const pyd = data.pyd as string | undefined;
        const sta = data.sta as string | undefined;

        // Handle NVS action responses (srsp)
        if (typ === 'srsp' && sta === '162') {
          // Check for success/failure responses
          if (pyd === 'E10101' || pyd?.startsWith('E10101')) {
            setRequestMessage('NVS action completed successfully');
            setIsProcessingAction(false);
          } else if (pyd === 'E10100' || pyd?.startsWith('E10100')) {
            setRequestMessage('NVS action failed');
            setIsProcessingAction(false);
          }
        }

        // Handle exception/completion messages (exp)
        if (typ === 'exp' && pyd === '00') {
          setRequestMessage('NVS action completed successfully');
          setIsProcessingAction(false);
        }

        // Handle meter responses (rsp)
        if (typ === 'rsp' && pyd && typeof pyd === 'string') {
          // Check for error response before parsing
          if (pyd === '-1' || pyd.trim() === '-1') {
            setLiveMeters({
              error: 'SMIB returned error: -1 (Unable to read meters)',
              lastAt: new Date().toISOString(),
            });
            setRequestMessage('SMIB error: Unable to read meters');
            setIsLoading(false);
            if (requestTimeoutRef.current) {
              window.clearTimeout(requestTimeoutRef.current);
              requestTimeoutRef.current = null;
            }
            return;
          }

          const parsed = parseSasPyd(pyd);

          // Handle error case from parser
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
          setLastMetersSignature(prev => {
            if (prev && signature === prev) {
              setRequestMessage('No new SAS meters detected');
            } else {
              setRequestMessage(null);
            }
            return signature;
          });
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
  }, []);

  // Track subscription to prevent infinite loops
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const lastRelayIdRef = useRef<string | null>(null);
  const handleSSEMessageRef = useRef(handleSSEMessage);
  const subscribeToMessagesRef = useRef(smibConfig?.subscribeToMessages);

  // Keep refs up to date
  useEffect(() => {
    handleSSEMessageRef.current = handleSSEMessage;
  }, [handleSSEMessage]);

  useEffect(() => {
    subscribeToMessagesRef.current = smibConfig?.subscribeToMessages;
  }, [smibConfig?.subscribeToMessages]);

  // Subscribe to SSE messages - either from shared connection or create our own
  useEffect(() => {
    console.log(
      `🔗 [MeterDataSection] useEffect triggered, relayId: ${relayId}, hasSmibConfig: ${!!subscribeToMessagesRef.current}`
    );

    // Cleanup previous subscription if relayId changed
    if (lastRelayIdRef.current !== relayId && unsubscribeRef.current) {
      console.log(
        `🔄 [MeterDataSection] RelayId changed, cleaning up previous subscription`
      );
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    if (!relayId) {
      console.warn(
        `⚠️ [MeterDataSection] No relayId provided, skipping SSE connection`
      );
      lastRelayIdRef.current = null;
      return;
    }

    // Skip if already subscribed to this relayId
    if (lastRelayIdRef.current === relayId && unsubscribeRef.current) {
      console.log(
        `⏭️ [MeterDataSection] Already subscribed to relayId: ${relayId}, skipping`
      );
      return;
    }

    lastRelayIdRef.current = relayId;

    // If smibConfig is provided, use the shared SSE connection
    const subscribeFn = subscribeToMessagesRef.current;
    if (subscribeFn) {
      console.log(
        `📡 [MeterDataSection] Using shared SSE connection from smibConfig`
      );
      const unsubscribe = subscribeFn((msg: SSEMessage) => {
        handleSSEMessageRef.current(msg);
      });
      unsubscribeRef.current = unsubscribe;
      return () => {
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }
        if (requestTimeoutRef.current) {
          window.clearTimeout(requestTimeoutRef.current);
          requestTimeoutRef.current = null;
        }
      };
    }

    // Otherwise, create our own SSE connection
    console.log(
      `🔗 [MeterDataSection] Creating own SSE connection for relayId: ${relayId}`
    );
    setIsSSEConnected(false);

    if (sseRef.current) {
      console.log(`🔄 [MeterDataSection] Closing existing SSE connection`);
      sseRef.current.close();
      sseRef.current = null;
    }

    const es = new EventSource(`/api/mqtt/config/subscribe?relayId=${relayId}`);
    sseRef.current = es;

    es.onopen = () => {
      console.log(
        `✅ [MeterDataSection] SSE connection opened for relayId: ${relayId}`
      );
      setIsSSEConnected(true);
    };

    es.onerror = error => {
      console.error(
        `❌ [MeterDataSection] SSE connection error for relayId ${relayId}:`,
        error
      );
      setIsSSEConnected(false);
    };

    es.onmessage = ev => {
      try {
        const msg = JSON.parse(ev.data) as SSEMessage;
        if (msg.type === 'callback_ready') {
          console.log(
            `✅ [MeterDataSection] Callback ready received for relayId: ${relayId}`
          );
        }
        handleSSEMessageRef.current(msg);
      } catch {
        // ignore malformed
      }
    };

    return () => {
      console.log(
        `🧹 [MeterDataSection] Cleaning up SSE connection for relayId: ${relayId}`
      );
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
      if (requestTimeoutRef.current) {
        window.clearTimeout(requestTimeoutRef.current);
        requestTimeoutRef.current = null;
      }
    };
  }, [relayId, smibConfig?.subscribeToMessages]);

  return (
    <>
      <Card className="w-full max-w-full min-w-0 overflow-x-hidden">
        <CardHeader className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-700">
            <BarChart3 className="h-5 w-5" />
            Meter Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 min-w-0 overflow-x-hidden">
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
              disabled={
                !relayId ||
                (smibConfig ? !smibConfig.isSSEConnected : !isSSEConnected) ||
                isRequestingMeters
              }
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
