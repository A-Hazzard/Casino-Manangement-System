/**
 * Client-side SSE stream reader
 *
 * Reads a `text/event-stream` response body, calling `onPhase` for each phase
 * event, `onProgress` for per-machine progress events, and resolving with the
 * payload from the final `done` event.
 */

// ============================================================================
// Reader
// ============================================================================

export async function readSseStream<T>(
  response: Response,
  onPhase: (phase: string) => void,
  onProgress?: (
    phase: string,
    done: number,
    total: number,
    machineName?: string
  ) => void
): Promise<T> {
  if (!response.ok) {
    const text = await response.text().catch(() => 'Unknown error');
    throw new Error(`Request failed (${response.status}): ${text}`);
  }
  if (!response.body) throw new Error('No response body');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (!raw) continue;

      let event: {
        type: string;
        phase?: string;
        data?: unknown;
        message?: string;
        done?: number;
        total?: number;
        machineName?: string;
      };
      try {
        event = JSON.parse(raw);
      } catch {
        continue;
      }

      if (event.type === 'phase' && event.phase) {
        onPhase(event.phase);
      } else if (event.type === 'progress' && event.phase && onProgress) {
        onProgress(
          event.phase,
          event.done ?? 0,
          event.total ?? 0,
          event.machineName
        );
      } else if (event.type === 'done') {
        return event.data as T;
      } else if (event.type === 'error') {
        throw new Error(event.message ?? 'Server error');
      }
    }
  }

  throw new Error('Stream ended without a done event');
}
