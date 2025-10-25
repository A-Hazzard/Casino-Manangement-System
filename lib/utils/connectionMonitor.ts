/**
 * MongoDB connection monitoring and health check utilities
 */

import { Db } from 'mongodb';

type ConnectionStats = {
  totalConnections: number;
  activeConnections: number;
  queuedConnections: number;
  lastHealthCheck: Date;
  isHealthy: boolean;
  averageLatency: number;
};

class ConnectionMonitor {
  private stats: ConnectionStats = {
    totalConnections: 0,
    activeConnections: 0,
    queuedConnections: 0,
    lastHealthCheck: new Date(),
    isHealthy: true,
    averageLatency: 0,
  };

  private latencyHistory: number[] = [];
  private readonly maxHistorySize = 10;

  /**
   * Monitor a database operation and track performance
   */
  async monitorOperation<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await operation();
      const latency = Date.now() - startTime;

      this.updateLatency(latency);
      this.updateStats();

      if (latency > 10000) {
        // Log operations taking >10s
        console.warn(`🐌 Slow operation: ${operationName} took ${latency}ms`);
      }

      return result;
    } catch (error) {
      const latency = Date.now() - startTime;
      console.error(
        ` Operation failed: ${operationName} after ${latency}ms`,
        error
      );
      throw error;
    }
  }

  /**
   * Check database health
   */
  async checkHealth(db: Db): Promise<boolean> {
    const startTime = Date.now();

    try {
      await db.admin().ping();
      const latency = Date.now() - startTime;

      this.updateLatency(latency);
      this.stats.lastHealthCheck = new Date();
      this.stats.isHealthy = true;

      return true;
    } catch (error) {
      this.stats.isHealthy = false;
      console.error(' Database health check failed:', error);
      return false;
    }
  }

  /**
   * Get current connection statistics
   */
  getStats(): ConnectionStats {
    return { ...this.stats };
  }

  /**
   * Get performance recommendations
   */
  getRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.stats.averageLatency > 5000) {
      recommendations.push(
        'Consider optimizing database queries - average latency is high'
      );
    }

    if (this.stats.averageLatency > 10000) {
      recommendations.push(
        'Database performance is critically slow - check indexes and query optimization'
      );
    }

    if (!this.stats.isHealthy) {
      recommendations.push(
        'Database connection is unhealthy - check network and server status'
      );
    }

    return recommendations;
  }

  private updateLatency(latency: number): void {
    this.latencyHistory.push(latency);

    // Keep only the last N measurements
    if (this.latencyHistory.length > this.maxHistorySize) {
      this.latencyHistory.shift();
    }

    // Calculate average latency
    this.stats.averageLatency =
      this.latencyHistory.reduce((a, b) => a + b, 0) /
      this.latencyHistory.length;
  }

  private updateStats(): void {
    // This would ideally get real connection pool stats
    // For now, we'll simulate based on latency
    if (this.stats.averageLatency > 5000) {
      this.stats.activeConnections = Math.min(
        10,
        this.stats.activeConnections + 1
      );
    } else {
      this.stats.activeConnections = Math.max(
        1,
        this.stats.activeConnections - 1
      );
    }
  }
}

// Global connection monitor instance
export const connectionMonitor = new ConnectionMonitor();

/**
 * Wrapper function to monitor database operations
 */
export function monitorDatabaseOperation<T>(
  operationName: string,
  operation: () => Promise<T>
): Promise<T> {
  return connectionMonitor.monitorOperation(operationName, operation);
}

/**
 * Get connection health status
 */
export async function getConnectionHealth(db: Db): Promise<{
  isHealthy: boolean;
  latency: number;
  recommendations: string[];
}> {
  const isHealthy = await connectionMonitor.checkHealth(db);
  const stats = connectionMonitor.getStats();
  const recommendations = connectionMonitor.getRecommendations();

  return {
    isHealthy,
    latency: stats.averageLatency,
    recommendations,
  };
}
