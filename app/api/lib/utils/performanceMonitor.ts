/**
 * Simple performance monitoring utility for API endpoints
 */
export class PerformanceMonitor {
  private startTime: number;
  private operationName: string;

  constructor(operationName: string) {
    this.operationName = operationName;
    this.startTime = Date.now();
  }

  /**
   * Log the completion of an operation with timing information
   */
  complete(additionalInfo?: Record<string, unknown>) {
    const duration = Date.now() - this.startTime;
    console.warn(
      `⏱️ ${this.operationName} completed in ${duration}ms${additionalInfo ? ` | ${JSON.stringify(additionalInfo)}` : ''}`
    );
    return duration;
  }

  /**
   * Create a new monitor for a sub-operation
   */
  subOperation(name: string) {
    return new PerformanceMonitor(`${this.operationName} > ${name}`);
  }
}
