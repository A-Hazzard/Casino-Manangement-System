/**
 * Server-Sent Events utility
 *
 * @module app/api/lib/utils/sseStream
 */

// ============================================================================
// Types
// ============================================================================

export type SseEvent =
  | { type: 'phase'; phase: string }
  | {
      type: 'progress';
      phase: string;
      done: number;
      total: number;
      machineName?: string;
    }
  | { type: 'done'; data: unknown }
  | { type: 'error'; message: string };

// ============================================================================
// Factory
// ============================================================================

/**
 * Wraps an async function in a streaming SSE `Response`.
 *
 * The `send` callback passed to `fn` enqueues events. Auth and DB setup must
 * happen BEFORE calling `createSseResponse` — only the work-in-progress
 * portion (where phases are emitted) should live inside `fn`.
 *
 * Error responses before the stream opens (auth fail, 400 validation) should
 * still use `return NextResponse.json(...)` — SSE is only for success paths
 * where work has already begun.
 */
export function createSseResponse(
  fn: (send: (event: SseEvent) => void) => Promise<void>
): Response {
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: SseEvent) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      try {
        await fn(send);
      } catch (error) {
        send({
          type: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
