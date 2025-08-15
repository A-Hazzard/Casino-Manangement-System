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
  complete(additionalInfo?: Record<string, any>) {
    const duration = Date.now() - this.startTime;
    const info = additionalInfo ? ` | ${JSON.stringify(additionalInfo)}` : '';
    // console.log(`⏱️ ${this.operationName} completed in ${duration}ms${info}`);
    return duration;
  }

  /**
   * Create a new monitor for a sub-operation
   */
  subOperation(name: string) {
    return new PerformanceMonitor(`${this.operationName} > ${name}`);
  }
}

/**
 * Decorator function to monitor API endpoint performance
 */
export function monitorPerformance(operationName: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const monitor = new PerformanceMonitor(operationName);
      try {
        const result = await method.apply(this, args);
        monitor.complete();
        return result;
      } catch (error) {
        monitor.complete({ error: error instanceof Error ? error.message : 'Unknown error' });
        throw error;
      }
    };
  };
} 
