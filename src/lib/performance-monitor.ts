/**
 * Performance Monitoring Utilities
 * 
 * Provides tools for ongoing performance monitoring and analysis
 * of database queries and operations in production.
 */

import { log } from './logger';

export interface QueryMetrics {
  queryName: string;
  duration: number;
  timestamp: Date;
  resultCount?: number;
  parameters?: Record<string, any>;
  error?: string;
}

export interface PerformanceThresholds {
  fast: number;      // < 100ms
  medium: number;    // < 500ms
  slow: number;      // < 2000ms
  critical: number;  // >= 2000ms
}

export class DatabasePerformanceMonitor {
  private static instance: DatabasePerformanceMonitor;
  private metrics: QueryMetrics[] = [];
  private maxMetrics = 1000;
  
  private thresholds: PerformanceThresholds = {
    fast: 100,
    medium: 500,
    slow: 2000,
    critical: 2000,
  };

  static getInstance(): DatabasePerformanceMonitor {
    if (!this.instance) {
      this.instance = new DatabasePerformanceMonitor();
    }
    return this.instance;
  }

  /**
   * Record a query performance metric
   */
  recordQuery(metric: QueryMetrics): void {
    this.metrics.push(metric);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log slow queries
    if (metric.duration >= this.thresholds.medium) {
      const level = metric.duration >= this.thresholds.critical ? 'error' : 'warn';
      log[level](
        `Slow query detected: ${metric.queryName} took ${metric.duration}ms`,
        'Performance',
        {
          duration: metric.duration,
          resultCount: metric.resultCount,
          parameters: metric.parameters,
        }
      );
    }
  }

  /**
   * Measure and record a query execution
   */
  async measureQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>,
    parameters?: Record<string, any>
  ): Promise<T> {
    const startTime = Date.now();
    let error: string | undefined;
    let result: T;
    let resultCount: number | undefined;

    try {
      result = await queryFn();
      
      // Try to determine result count
      if (Array.isArray(result)) {
        resultCount = result.length;
      } else if (result && typeof result === 'object' && 'length' in result) {
        resultCount = (result as any).length;
      }
      
      return result;
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      const duration = Date.now() - startTime;
      
      this.recordQuery({
        queryName,
        duration,
        timestamp: new Date(),
        resultCount,
        parameters,
        error,
      });
    }
  }

  /**
   * Get performance statistics for a specific query
   */
  getQueryStats(queryName: string): {
    count: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    errorRate: number;
    recentMetrics: QueryMetrics[];
  } {
    const queryMetrics = this.metrics.filter(m => m.queryName === queryName);
    
    if (queryMetrics.length === 0) {
      return {
        count: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        errorRate: 0,
        recentMetrics: [],
      };
    }

    const durations = queryMetrics.map(m => m.duration);
    const errorCount = queryMetrics.filter(m => m.error).length;

    return {
      count: queryMetrics.length,
      avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      errorRate: errorCount / queryMetrics.length,
      recentMetrics: queryMetrics.slice(-10),
    };
  }

  /**
   * Get overall performance summary
   */
  getPerformanceSummary(): {
    totalQueries: number;
    avgDuration: number;
    slowQueries: number;
    criticalQueries: number;
    errorRate: number;
    topSlowQueries: Array<{ queryName: string; avgDuration: number; count: number }>;
  } {
    if (this.metrics.length === 0) {
      return {
        totalQueries: 0,
        avgDuration: 0,
        slowQueries: 0,
        criticalQueries: 0,
        errorRate: 0,
        topSlowQueries: [],
      };
    }

    const durations = this.metrics.map(m => m.duration);
    const slowQueries = this.metrics.filter(m => m.duration >= this.thresholds.medium).length;
    const criticalQueries = this.metrics.filter(m => m.duration >= this.thresholds.critical).length;
    const errorCount = this.metrics.filter(m => m.error).length;

    // Calculate top slow queries
    const queryGroups = new Map<string, { totalDuration: number; count: number }>();
    
    this.metrics.forEach(metric => {
      const existing = queryGroups.get(metric.queryName) || { totalDuration: 0, count: 0 };
      queryGroups.set(metric.queryName, {
        totalDuration: existing.totalDuration + metric.duration,
        count: existing.count + 1,
      });
    });

    const topSlowQueries = Array.from(queryGroups.entries())
      .map(([queryName, stats]) => ({
        queryName,
        avgDuration: stats.totalDuration / stats.count,
        count: stats.count,
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 10);

    return {
      totalQueries: this.metrics.length,
      avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      slowQueries,
      criticalQueries,
      errorRate: errorCount / this.metrics.length,
      topSlowQueries,
    };
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): QueryMetrics[] {
    return [...this.metrics];
  }

  /**
   * Update performance thresholds
   */
  updateThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * Get current thresholds
   */
  getThresholds(): PerformanceThresholds {
    return { ...this.thresholds };
  }
}

// Singleton instance
export const performanceMonitor = DatabasePerformanceMonitor.getInstance();

// Convenience functions for common query patterns
export const monitoredQuery = {
  /**
   * Monitor a product search query
   */
  async productSearch<T>(
    searchType: 'title' | 'sku' | 'barcode' | 'status' | 'filter',
    queryFn: () => Promise<T>,
    parameters?: Record<string, any>
  ): Promise<T> {
    return performanceMonitor.measureQuery(
      `product-search-${searchType}`,
      queryFn,
      parameters
    );
  },

  /**
   * Monitor an order query
   */
  async orderQuery<T>(
    queryType: 'search' | 'filter' | 'lookup' | 'range',
    queryFn: () => Promise<T>,
    parameters?: Record<string, any>
  ): Promise<T> {
    return performanceMonitor.measureQuery(
      `order-${queryType}`,
      queryFn,
      parameters
    );
  },

  /**
   * Monitor an inventory query
   */
  async inventoryQuery<T>(
    queryType: 'search' | 'lookup' | 'stock-check' | 'location',
    queryFn: () => Promise<T>,
    parameters?: Record<string, any>
  ): Promise<T> {
    return performanceMonitor.measureQuery(
      `inventory-${queryType}`,
      queryFn,
      parameters
    );
  },

  /**
   * Monitor a customer query
   */
  async customerQuery<T>(
    queryType: 'search' | 'lookup' | 'filter',
    queryFn: () => Promise<T>,
    parameters?: Record<string, any>
  ): Promise<T> {
    return performanceMonitor.measureQuery(
      `customer-${queryType}`,
      queryFn,
      parameters
    );
  },

  /**
   * Monitor a bulk operation
   */
  async bulkOperation<T>(
    operationType: 'insert' | 'update' | 'delete',
    entityType: 'products' | 'orders' | 'items' | 'customers',
    queryFn: () => Promise<T>,
    parameters?: Record<string, any>
  ): Promise<T> {
    return performanceMonitor.measureQuery(
      `bulk-${operationType}-${entityType}`,
      queryFn,
      parameters
    );
  },
};

// Performance analysis utilities
export const performanceAnalysis = {
  /**
   * Analyze query performance trends
   */
  analyzeTrends(queryName: string, timeWindowHours = 24): {
    trend: 'improving' | 'degrading' | 'stable';
    trendPercentage: number;
    recommendation: string;
  } {
    const cutoffTime = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);
    const recentMetrics = performanceMonitor.exportMetrics()
      .filter(m => m.queryName === queryName && m.timestamp >= cutoffTime)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (recentMetrics.length < 10) {
      return {
        trend: 'stable',
        trendPercentage: 0,
        recommendation: 'Insufficient data for trend analysis',
      };
    }

    // Compare first half vs second half
    const midpoint = Math.floor(recentMetrics.length / 2);
    const firstHalf = recentMetrics.slice(0, midpoint);
    const secondHalf = recentMetrics.slice(midpoint);

    const firstHalfAvg = firstHalf.reduce((sum, m) => sum + m.duration, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, m) => sum + m.duration, 0) / secondHalf.length;

    const changePercentage = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;

    let trend: 'improving' | 'degrading' | 'stable';
    let recommendation: string;

    if (Math.abs(changePercentage) < 10) {
      trend = 'stable';
      recommendation = 'Performance is stable';
    } else if (changePercentage > 0) {
      trend = 'degrading';
      recommendation = changePercentage > 50 
        ? 'Critical: Performance degrading significantly. Review indexes and query optimization.'
        : 'Warning: Performance degrading. Monitor closely and consider optimization.';
    } else {
      trend = 'improving';
      recommendation = 'Performance is improving';
    }

    return {
      trend,
      trendPercentage: Math.abs(changePercentage),
      recommendation,
    };
  },

  /**
   * Generate performance report
   */
  generateReport(): string {
    const summary = performanceMonitor.getPerformanceSummary();
    const thresholds = performanceMonitor.getThresholds();

    let report = '=== Database Performance Report ===\n\n';
    
    report += `Total Queries: ${summary.totalQueries}\n`;
    report += `Average Duration: ${summary.avgDuration.toFixed(2)}ms\n`;
    report += `Slow Queries (>${thresholds.medium}ms): ${summary.slowQueries} (${((summary.slowQueries / summary.totalQueries) * 100).toFixed(1)}%)\n`;
    report += `Critical Queries (>${thresholds.critical}ms): ${summary.criticalQueries} (${((summary.criticalQueries / summary.totalQueries) * 100).toFixed(1)}%)\n`;
    report += `Error Rate: ${(summary.errorRate * 100).toFixed(2)}%\n\n`;

    if (summary.topSlowQueries.length > 0) {
      report += 'Top Slow Queries:\n';
      summary.topSlowQueries.forEach((query, index) => {
        report += `${index + 1}. ${query.queryName}: ${query.avgDuration.toFixed(2)}ms avg (${query.count} executions)\n`;
      });
      report += '\n';
    }

    report += 'Performance Thresholds:\n';
    report += `- Fast: < ${thresholds.fast}ms\n`;
    report += `- Medium: < ${thresholds.medium}ms\n`;
    report += `- Slow: < ${thresholds.slow}ms\n`;
    report += `- Critical: >= ${thresholds.critical}ms\n\n`;

    report += '=====================================';

    return report;
  },
};

export default performanceMonitor;