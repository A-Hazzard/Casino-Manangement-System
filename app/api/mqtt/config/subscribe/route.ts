import { mqttService } from '@/lib/services/mqttService';
import { NextRequest } from 'next/server';

/**
 * GET /api/mqtt/config/subscribe
 * Server-Sent Events endpoint for live MQTT config updates
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const relayId = searchParams.get('relayId');

  console.log(
    `🔍 [API] SSE Subscribe request received for relayId: ${relayId}`
  );

  if (!relayId) {
    console.log(`❌ [API] Missing relayId in SSE request`);
    return new Response(
      JSON.stringify({ error: 'relayId query parameter is required' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Set up SSE headers
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
  });

  // Create readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const initialMessage = {
        type: 'connected',
        relayId,
        timestamp: new Date().toISOString(),
        message: 'Connected to MQTT config stream',
      };

      controller.enqueue(`data: ${JSON.stringify(initialMessage)}\n\n`);

      // Track if controller is closed
      let isClosed = false;

      // Set up MQTT callback for this relayId
      const handleConfigMessage = (message: Record<string, unknown>) => {
        // Don't process if controller is already closed
        if (isClosed) {
          console.log(
            `⚠️ [API] SSE controller closed, skipping message for ${relayId}`
          );
          return;
        }

        console.log(
          `🔍 [API] SSE received MQTT message for relayId: ${relayId}`
        );
        console.log(
          `🔍 [API] SSE message payload:`,
          JSON.stringify(message, null, 2)
        );

        try {
          const sseMessage = {
            type: 'config_update',
            relayId: message.rly || relayId,
            component: message.comp,
            data: message,
            timestamp: new Date().toISOString(),
          };

          console.log(
            `📡 [API] SSE sending message to client:`,
            JSON.stringify(sseMessage, null, 2)
          );
          controller.enqueue(`data: ${JSON.stringify(sseMessage)}\n\n`);
        } catch (error) {
          console.error('❌ [API] Error processing config message:', error);
          // Mark as closed if we get an invalid state error
          if (
            error instanceof Error &&
            error.message.includes('Controller is already closed')
          ) {
            isClosed = true;
          }
        }
      };

      // Subscribe to config updates for this relayId
      console.log(`🔗 [SSE] Subscribing to config for relayId: ${relayId}`);
      mqttService
        .subscribeToConfig(relayId, handleConfigMessage)
        .then(() => {
          console.log(
            `✅ [SSE] Successfully subscribed to config for relayId: ${relayId}`
          );
        })
        .catch(error => {
          console.error('❌ [SSE] Failed to subscribe to config:', error);
          const errorMessage = {
            type: 'error',
            relayId,
            error: error.message,
            timestamp: new Date().toISOString(),
          };
          controller.enqueue(`data: ${JSON.stringify(errorMessage)}\n\n`);
        });

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        console.log(`Client disconnected for relayId: ${relayId}`);
        isClosed = true;
        mqttService.unsubscribeCallback(relayId, handleConfigMessage);
        try {
          controller.close();
        } catch (_error) {
          // Controller might already be closed
          console.log('Controller already closed', _error);
        }
      });

      // Send keep-alive/heartbeat messages every 5 seconds to maintain connection
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
          console.error('Error sending keep-alive:', error);
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
      console.log(`SSE stream cancelled for relayId: ${relayId}`);
      // Note: We can't access handleConfigMessage here, so we'll use the old method
      // This is a fallback for when the stream is cancelled
      mqttService.unsubscribeFromConfig(relayId);
    },
  });

  return new Response(stream, { headers });
}
