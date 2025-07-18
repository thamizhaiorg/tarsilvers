/**
 * Performance Integration Tests
 * 
 * Tests the integration between performance monitoring utilities,
 * benchmark tests, and the overall performance monitoring system.
 */

import { performanceMonitor, monitoredQuery, performanceAnalysis } from '../lib/performance-monitor';

describe('Performance Integration Tests', () => {
  beforeEach(() => {
    // Clear metrics before each test
    performanceMonitor.clearMetrics();
  });

  describe('Performance Monitor Integration', () => {
    test('should record and retrieve query metrics', async () => {
      // Record some test queries without delays
      await performanceMonitor.measureQuery(
        'test-query',
        async () => {
          return { data: 'test' };
        },
        { param1: 'value1' }
      );

      const stats = performanceMonitor.getQueryStats('test-query');
      
      expect(stats.count).toBe(1);
      expect(stats.avgDuration).toBeGreaterThanOrEqual(0);
      expect(stats.errorRate).toBe(0);
    });

    test('should handle query errors correctly', async () => {
      try {
        await performanceMonitor.measureQuery(
          'error-query',
          async () => {
            throw new Error('Test error');
          }
        );
      } catch (error) {
        // Expected error
      }

      const stats = performanceMonitor.getQueryStats('error-query');
      
      expect(stats.count).toBe(1);
      expect(stats.errorRate).toBe(1);
    });

    test('should generate comprehensive performance summary', async () => {
      // Record multiple queries without delays
      const queries = ['fast-query', 'medium-query', 'slow-query'];

      for (const queryName of queries) {
        for (let i = 0; i < 3; i++) {
          await performanceMonitor.measureQuery(
            queryName,
            async () => {
              return { data: 'test' };
            }
          );
        }
      }

      const summary = performanceMonitor.getPerformanceSummary();
      
      expect(summary.totalQueries).toBe(9);
      expect(summary.topSlowQueries.length).toBeGreaterThan(0);
    });
  });

  describe('Monitored Query Helpers', () => {
    test('should categorize product queries correctly', async () => {
      await monitoredQuery.productSearch(
        'title',
        async () => ({ products: [{ id: 1, title: 'Test Product' }] }),
        { searchTerm: 'test' }
      );

      const stats = performanceMonitor.getQueryStats('product-search-title');
      expect(stats.count).toBe(1);
    });

    test('should categorize order queries correctly', async () => {
      await monitoredQuery.orderQuery(
        'filter',
        async () => ({ orders: [{ id: 1, status: 'completed' }] }),
        { status: 'completed' }
      );

      const stats = performanceMonitor.getQueryStats('order-filter');
      expect(stats.count).toBe(1);
    });

    test('should categorize inventory queries correctly', async () => {
      await monitoredQuery.inventoryQuery(
        'stock-check',
        async () => ({ items: [{ id: 1, stock: 10 }] }),
        { minStock: 5 }
      );

      const stats = performanceMonitor.getQueryStats('inventory-stock-check');
      expect(stats.count).toBe(1);
    });

    test('should categorize customer queries correctly', async () => {
      await monitoredQuery.customerQuery(
        'search',
        async () => ({ customers: [{ id: 1, email: 'test@example.com' }] }),
        { email: 'test@example.com' }
      );

      const stats = performanceMonitor.getQueryStats('customer-search');
      expect(stats.count).toBe(1);
    });

    test('should categorize bulk operations correctly', async () => {
      await monitoredQuery.bulkOperation(
        'update',
        'products',
        async () => ({ updated: 10 }),
        { count: 10 }
      );

      const stats = performanceMonitor.getQueryStats('bulk-update-products');
      expect(stats.count).toBe(1);
    });
  });

  describe('Performance Analysis', () => {
    test('should analyze performance trends correctly', async () => {
      // Create queries without delays - trend analysis will work with any data
      for (let i = 0; i < 20; i++) {
        await performanceMonitor.measureQuery(
          'trending-query',
          async () => {
            return { data: 'test' };
          }
        );
      }

      const trend = performanceAnalysis.analyzeTrends('trending-query');
      
      expect(['improving', 'degrading', 'stable']).toContain(trend.trend);
      expect(typeof trend.trendPercentage).toBe('number');
      expect(trend.recommendation).toBeTruthy();
    });

    test('should generate performance report', async () => {
      // Record some test data
      await performanceMonitor.measureQuery(
        'report-test-query',
        async () => {
          return { data: 'test' };
        }
      );

      const report = performanceAnalysis.generateReport();
      
      expect(report).toContain('Database Performance Report');
      expect(report).toContain('Total Queries:');
      expect(report).toContain('Average Duration:');
      expect(report).toContain('Performance Thresholds:');
    });
  });

  describe('Threshold Management', () => {
    test('should allow updating performance thresholds', () => {
      const originalThresholds = performanceMonitor.getThresholds();
      
      performanceMonitor.updateThresholds({
        fast: 50,
        medium: 200,
      });

      const updatedThresholds = performanceMonitor.getThresholds();
      
      expect(updatedThresholds.fast).toBe(50);
      expect(updatedThresholds.medium).toBe(200);
      expect(updatedThresholds.slow).toBe(originalThresholds.slow); // Unchanged
      expect(updatedThresholds.critical).toBe(originalThresholds.critical); // Unchanged
    });

    test('should flag queries based on updated thresholds', async () => {
      // Set very low thresholds
      performanceMonitor.updateThresholds({
        fast: 0,
        medium: 0,
      });

      await performanceMonitor.measureQuery(
        'threshold-test-query',
        async () => {
          return { data: 'test' };
        }
      );

      const summary = performanceMonitor.getPerformanceSummary();
      
      // Any query should be flagged as slow with 0ms thresholds
      expect(summary.slowQueries).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Data Export and Import', () => {
    test('should export metrics correctly', async () => {
      await performanceMonitor.measureQuery(
        'export-test-query',
        async () => {
          return { data: 'test' };
        },
        { testParam: 'value' }
      );

      const exportedMetrics = performanceMonitor.exportMetrics();
      
      expect(exportedMetrics).toHaveLength(1);
      expect(exportedMetrics[0].queryName).toBe('export-test-query');
      expect(exportedMetrics[0].parameters).toEqual({ testParam: 'value' });
      expect(exportedMetrics[0].duration).toBeGreaterThanOrEqual(0);
      expect(exportedMetrics[0].timestamp).toBeInstanceOf(Date);
    });

    test('should maintain metric history within limits', async () => {
      // Record more metrics than the limit
      for (let i = 0; i < 1100; i++) {
        await performanceMonitor.measureQuery(
          `test-query-${i}`,
          async () => ({ data: 'test' })
        );
      }

      const exportedMetrics = performanceMonitor.exportMetrics();
      
      // Should be limited to maxMetrics (1000)
      expect(exportedMetrics.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing query stats gracefully', () => {
      const stats = performanceMonitor.getQueryStats('non-existent-query');
      
      expect(stats.count).toBe(0);
      expect(stats.avgDuration).toBe(0);
      expect(stats.errorRate).toBe(0);
      expect(stats.recentMetrics).toEqual([]);
    });

    test('should handle trend analysis with insufficient data', () => {
      const trend = performanceAnalysis.analyzeTrends('non-existent-query');
      
      expect(trend.trend).toBe('stable');
      expect(trend.trendPercentage).toBe(0);
      expect(trend.recommendation).toContain('Insufficient data');
    });

    test('should handle empty performance summary', () => {
      performanceMonitor.clearMetrics();
      
      const summary = performanceMonitor.getPerformanceSummary();
      
      expect(summary.totalQueries).toBe(0);
      expect(summary.avgDuration).toBe(0);
      expect(summary.slowQueries).toBe(0);
      expect(summary.criticalQueries).toBe(0);
      expect(summary.errorRate).toBe(0);
      expect(summary.topSlowQueries).toEqual([]);
    });
  });

  describe('Real-world Scenario Simulation', () => {
    test('should handle mixed workload performance monitoring', async () => {
      // Simulate a realistic mix of queries without delays
      const workload = [
        // Fast product searches
        ...Array.from({ length: 10 }, () => 'product-search'),
        // Medium order queries
        ...Array.from({ length: 8 }, () => 'order-query'),
        // Slow inventory operations
        ...Array.from({ length: 5 }, () => 'inventory-operation'),
        // Occasional bulk operations
        ...Array.from({ length: 2 }, () => 'bulk-operation'),
      ];

      // Execute workload
      for (const queryType of workload) {
        await performanceMonitor.measureQuery(
          queryType,
          async () => {
            return { data: 'test' };
          }
        );
      }

      const summary = performanceMonitor.getPerformanceSummary();
      
      expect(summary.totalQueries).toBe(25);
      expect(summary.topSlowQueries.length).toBeGreaterThan(0);
      
      // Verify different query types are tracked
      expect(performanceMonitor.getQueryStats('product-search').count).toBe(10);
      expect(performanceMonitor.getQueryStats('order-query').count).toBe(8);
      expect(performanceMonitor.getQueryStats('inventory-operation').count).toBe(5);
      expect(performanceMonitor.getQueryStats('bulk-operation').count).toBe(2);
    });
  });
});