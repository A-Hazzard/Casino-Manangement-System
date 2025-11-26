/**
 * MQTT Config Subscribe API Route (SSE)
 *
 * This route handles Server-Sent Events (SSE) for live MQTT config updates.
 * It supports:
 * - GET: Establishes an SSE connection for real-time MQTT config updates for a specific `relayId`
 *
 * @module app/api/mqtt/config/subscribe/route
 */

import { mqttService } from '@/app/api/lib/services/mqttService';
import { NextRequest } from 'next/server';

/**
 * Main GET handler for MQTT config SSE subscription
 *
 * Flow:
 * 1. Parse and validate relayId parameter
 * 2. Set up SSE headers
 * 3. Create readable stream for SSE
 * 4. Register MQTT callback for config updates
 * 5. Handle client disconnect and cleanup
 * 6. Return SSE response stream
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse and validate relayId parameter
    // ============================================================================
    const { searchParams } = new URL(request.url);
    const relayId = searchParams.get('relayId');

    if (!relayId) {
      const duration = Date.now() - startTime;
      console.error(
        `[MQTT Config Subscribe GET API] Missing relayId parameter after ${duration}ms.`
      );
      return new Response(
        JSON.stringify({ error: 'relayId query parameter is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(
      `[MQTT Config Subscribe GET API] Establishing SSE connection for relayId: ${relayId}`
    );

    // ============================================================================
    // STEP 2: Set up SSE headers
    // ============================================================================
    const headers = new Headers({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    // ============================================================================
    // STEP 3: Create readable stream for SSE
    // ============================================================================
    const stream = new ReadableStream({
      start(controller) {
        // ============================================================================
        // STEP 3a: Send initial connection message
        // ============================================================================
        const initialMessage = {
          type: 'connected',
          relayId,
          timestamp: new Date().toISOString(),
          message: 'Connected to MQTT config stream',
        };
        controller.enqueue(`data: ${JSON.stringify(initialMessage)}\n\n`);

        // ============================================================================
        // STEP 3b: Track connection state
        // ============================================================================
        let isClosed = false;

        // ============================================================================
        // STEP 4: Register MQTT callback for config updates
        // ============================================================================
        const handleConfigMessage = (message: Record<string, unknown>) => {
          if (isClosed) {
            return;
          }

          const messageType = (message.typ as string) || 'unknown';
          const messageRelayId = (message.rly as string) || relayId;

          // Only log meter responses with errors
          if (messageType === 'rsp' && message.pyd === '-1') {
            console.warn(
              `[MQTT Config Subscribe GET API] SMIB ${messageRelayId} returned error: -1`
            );
          }

          const sseMessage = {
            type: 'config_update',
            relayId: messageRelayId,
            component: message.comp,
            data: message,
            timestamp: new Date().toISOString(),
          };

          try {
            controller.enqueue(`data: ${JSON.stringify(sseMessage)}\n\n`);
          } catch (enqueueError) {
            console.error(
              `[MQTT Config Subscribe GET API] Failed to enqueue message:`,
              enqueueError
            );
          }
        };

        // Subscribe to config updates
        mqttService
          .subscribeToConfig(relayId, handleConfigMessage)
          .then(() => {
            const callbackReadyMessage = {
              type: 'callback_ready',
              relayId,
              timestamp: new Date().toISOString(),
              message: 'Callback registered and ready for meter requests',
            };
            controller.enqueue(
              `data: ${JSON.stringify(callbackReadyMessage)}\n\n`
            );
          })
          .catch(error => {
            console.error(
              `[MQTT Config Subscribe GET API] Failed to subscribe to config for relayId ${relayId}:`,
              error
            );
            const errorMessage = {
              type: 'error',
              relayId,
              error: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date().toISOString(),
            };
            controller.enqueue(`data: ${JSON.stringify(errorMessage)}\n\n`);
          });

        // ============================================================================
        // STEP 5: Handle client disconnect and cleanup
        // ============================================================================
        const handleDisconnect = () => {
          console.log(
            `[MQTT Config Subscribe GET API] Client disconnected for relayId: ${relayId}`
          );
          isClosed = true;
          mqttService.unsubscribeCallback(relayId, handleConfigMessage);
          try {
            controller.close();
          } catch (closeError) {
            // Controller might already be closed
            console.log(
              `[MQTT Config Subscribe GET API] Controller already closed:`,
              closeError
            );
          }
        };

        request.signal.addEventListener('abort', handleDisconnect);

        // Send keep-alive/heartbeat messages every 5 seconds
        const keepAliveInterval = setInterval(() => {
          if (request.signal.aborted || isClosed) {
            clearInterval(keepAliveInterval);
            return;
          }

          const keepAliveMessage = {
            type: 'heartbeat',
            relayId,
            timestamp: new Date().toISOString(),
          };

          try {
            controller.enqueue(`data: ${JSON.stringify(keepAliveMessage)}\n\n`);
          } catch (error) {
            console.error(
              `[MQTT Config Subscribe GET API] Error sending keep-alive:`,
              error
            );
            isClosed = true;
            clearInterval(keepAliveInterval);
          }
        }, 5000);

        // Clean up interval on abort
        request.signal.addEventListener('abort', () => {
          isClosed = true;
          clearInterval(keepAliveInterval);
        });
    },
      cancel() {
        console.log(
          `[MQTT Config Subscribe GET API] SSE stream cancelled for relayId: ${relayId}`
        );
        // Fallback cleanup when stream is cancelled
        mqttService.unsubscribeFromConfig(relayId);
      },
    });

    // ============================================================================
    // STEP 6: Return SSE response stream
    // ============================================================================
    const duration = Date.now() - startTime;
    console.log(
      `[MQTT Config Subscribe GET API] SSE connection established for relayId: ${relayId} after ${duration}ms.`
    );
    return new Response(stream, { headers });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(
      `[MQTT Config Subscribe GET API] Error after ${duration}ms:`,
      errorMessage
    );
    return new Response(
      JSON.stringify({ error: 'Failed to establish SSE connection' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
