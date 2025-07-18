#!/usr/bin/env tsx
/**
 * Database Performance Benchmark Script
 * 
 * Standalone script to run comprehensive performance benchmarks
 * against the database schema optimizations.
 * 
 * Usage: npx tsx scripts/performance-benchmark.ts
 */

import { performanceMonitor, monitoredQuery, performanceAnalysis } from '../src/lib/performance-monitor';

// Mock database for standalone testing
const mockDb = {
  useQuery: (query: any) => {
    // Simulate query execution time based on complexity
    const delay = Math.random() * 50; // 0-50ms random delay
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          products: Array.from({ length: Math.floor(Math.random() * 100) }, (_, i) => ({ id: i })),
          orders: Array.from({ length: Math.floor(Math.random() * 50) }, (_, i) => ({ id: i })),
          items: Array.from({ length: Math.floor(Math.random() * 200) }, (_, i) => ({ id: i })),
          customers: Array.from({ length: Math.floor(Math.random() * 75) }, (_, i) => ({ id: i })),
        });
      }, delay);
    });
  },
  transact: async (transactions: any[]) => {
    // Simulate bulk operation time
    const delay = transactions.length * 2; // 2ms per transaction
    return new Promise(resolve => {
      setTimeout(resolve, delay);
    });
  },
  tx: {
    products: {},
    orders: {},
    items: {},
    customers: {},
  },
};

// Benchmark configuration
const benchmarkConfig = {
  iterations: {
    singleQueries: 20,
    bulkOperations: 5,
    concurrentQueries: 10,
  },
  testStoreId: 'benchmark-store',
};

// Benchmark functions
const benchmarks = {
  async runProductQueries(): Promise<void> {
    console.log('Running product query benchmarks...');
    
    const queries = [
      { name: 'title-search', type: 'title' as const },
      { name: 'sku-search', type: 'sku' as const },
      { name: 'barcode-search', type: 'barcode' as const },
      { name: 'status-filter', type: 'status' as const },
      { name: 'pos-filter', type: 'filter' as const },
      { name: 'website-filter', type: 'filter' as const },
      { name: 'featured-filter', type: 'filter' as const },
    ];

    for (const query of queries) {
      for (let i = 0; i < benchmarkConfig.iterations.singleQueries; i++) {
        await monitoredQuery.productSearch(
          query.type,
          async () => {
            return mockDb.useQuery({
              products: {
                $: {
                  where: {
                    storeId: benchmarkConfig.testStoreId,
                    [query.name.includes('search') ? 'title' : 'status']: 'test-value'
                  }
                }
              }
            });
          },
          { queryName: query.name, iteration: i }
        );
      }
    }
  },

  async runOrderQueries(): Promise<void> {
    console.log('Running order query benchmarks...');
    
    const queries = [
      { name: 'order-number-search', type: 'search' as const },
      { name: 'status-filter', type: 'filter' as const },
      { name: 'payment-status-filter', type: 'filter' as const },
      { name: 'fulfillment-status-filter', type: 'filter' as const },
      { name: 'date-range', type: 'range' as const },
      { name: 'customer-lookup', type: 'lookup' as const },
    ];

    for (const query of queries) {
      for (let i = 0; i < benchmarkConfig.iterations.singleQueries; i++) {
        await monitoredQuery.orderQuery(
          query.type,
          async () => {
            return mockDb.useQuery({
              orders: {
                $: {
                  where: {
                    storeId: benchmarkConfig.testStoreId,
                    status: 'completed'
                  }
                }
              }
            });
          },
          { queryName: query.name, iteration: i }
        );
      }
    }
  },

  async runInventoryQueries(): Promise<void> {
    console.log('Running inventory query benchmarks...');
    
    const queries = [
      { name: 'sku-search', type: 'search' as const },
      { name: 'barcode-search', type: 'search' as const },
      { name: 'product-items-lookup', type: 'lookup' as const },
      { name: 'low-stock-check', type: 'stock-check' as const },
      { name: 'available-inventory', type: 'stock-check' as const },
      { name: 'location-inventory', type: 'location' as const },
    ];

    for (const query of queries) {
      for (let i = 0; i < benchmarkConfig.iterations.singleQueries; i++) {
        await monitoredQuery.inventoryQuery(
          query.type,
          async () => {
            return mockDb.useQuery({
              items: {
                $: {
                  where: {
                    storeId: benchmarkConfig.testStoreId,
                    totalOnHand: { $gt: 0 }
                  }
                }
              }
            });
          },
          { queryName: query.name, iteration: i }
        );
      }
    }
  },

  async runCustomerQueries(): Promise<void> {
    console.log('Running customer query benchmarks...');
    
    const queries = [
      { name: 'email-search', type: 'search' as const },
      { name: 'phone-search', type: 'search' as const },
      { name: 'customer-lookup', type: 'lookup' as const },
      { name: 'recent-customers', type: 'filter' as const },
      { name: 'active-customers', type: 'filter' as const },
    ];

    for (const query of queries) {
      for (let i = 0; i < benchmarkConfig.iterations.singleQueries; i++) {
        await monitoredQuery.customerQuery(
          query.type,
          async () => {
            return mockDb.useQuery({
              customers: {
                $: {
                  where: {
                    storeId: benchmarkConfig.testStoreId,
                    email: { $like: '%@test.com' }
                  }
                }
              }
            });
          },
          { queryName: query.name, iteration: i }
        );
      }
    }
  },

  async runBulkOperations(): Promise<void> {
    console.log('Running bulk operation benchmarks...');
    
    const operations = [
      { entity: 'products' as const, operation: 'update' as const, count: 50 },
      { entity: 'orders' as const, operation: 'insert' as const, count: 30 },
      { entity: 'items' as const, operation: 'update' as const, count: 75 },
      { entity: 'customers' as const, operation: 'insert' as const, count: 25 },
    ];

    for (const op of operations) {
      for (let i = 0; i < benchmarkConfig.iterations.bulkOperations; i++) {
        await monitoredQuery.bulkOperation(
          op.operation,
          op.entity,
          async () => {
            const transactions = Array.from({ length: op.count }, (_, j) => ({
              id: `${op.entity}-${i}-${j}`,
              storeId: benchmarkConfig.testStoreId,
            }));
            return mockDb.transact(transactions);
          },
          { operationType: op.operation, entityType: op.entity, count: op.count, iteration: i }
        );
      }
    }
  },

  async runConcurrentQueries(): Promise<void> {
    console.log('Running concurrent query benchmarks...');
    
    const concurrentOperations = Array.from({ length: benchmarkConfig.iterations.concurrentQueries }, (_, i) => {
      const operations = [
        monitoredQuery.productSearch('filter', async () => mockDb.useQuery({ products: {} })),
        monitoredQuery.orderQuery('filter', async () => mockDb.useQuery({ orders: {} })),
        monitoredQuery.inventoryQuery('stock-check', async () => mockDb.useQuery({ items: {} })),
        monitoredQuery.customerQuery('search', async () => mockDb.useQuery({ customers: {} })),
      ];
      
      return Promise.all(operations);
    });

    await Promise.all(concurrentOperations);
  },
};

// Main benchmark runner
async function runBenchmarks(): Promise<void> {
  console.log('🚀 Starting Database Performance Benchmarks');
  console.log('============================================\n');

  const startTime = Date.now();

  try {
    // Clear any existing metrics
    performanceMonitor.clearMetrics();

    // Run all benchmark categories
    await benchmarks.runProductQueries();
    await benchmarks.runOrderQueries();
    await benchmarks.runInventoryQueries();
    await benchmarks.runCustomerQueries();
    await benchmarks.runBulkOperations();
    await benchmarks.runConcurrentQueries();

    const totalTime = Date.now() - startTime;

    console.log('\n✅ Benchmarks completed successfully');
    console.log(`⏱️  Total execution time: ${totalTime}ms\n`);

    // Generate and display performance report
    console.log(performanceAnalysis.generateReport());

    // Analyze trends for key queries
    console.log('\n=== Performance Trend Analysis ===\n');
    
    const keyQueries = [
      'product-search-title',
      'order-filter',
      'inventory-stock-check',
      'customer-search',
      'bulk-update-products',
    ];

    keyQueries.forEach(queryName => {
      const stats = performanceMonitor.getQueryStats(queryName);
      if (stats.count > 0) {
        console.log(`${queryName}:`);
        console.log(`  Executions: ${stats.count}`);
        console.log(`  Avg Duration: ${stats.avgDuration.toFixed(2)}ms`);
        console.log(`  Min/Max: ${stats.minDuration}ms / ${stats.maxDuration}ms`);
        console.log(`  Error Rate: ${(stats.errorRate * 100).toFixed(2)}%`);
        
        const trend = performanceAnalysis.analyzeTrends(queryName);
        console.log(`  Trend: ${trend.trend} (${trend.trendPercentage.toFixed(1)}%)`);
        console.log(`  Recommendation: ${trend.recommendation}\n`);
      }
    });

    console.log('=====================================');

  } catch (error) {
    console.error('❌ Benchmark execution failed:', error);
    process.exit(1);
  }
}

// Performance recommendations
function displayRecommendations(): void {
  console.log('\n=== Performance Optimization Recommendations ===\n');
  
  const summary = performanceMonitor.getPerformanceSummary();
  const thresholds = performanceMonitor.getThresholds();

  if (summary.criticalQueries > 0) {
    console.log('🔴 CRITICAL ISSUES:');
    console.log(`- ${summary.criticalQueries} queries exceed ${thresholds.critical}ms threshold`);
    console.log('- Review and optimize these queries immediately');
    console.log('- Consider adding indexes or restructuring queries\n');
  }

  if (summary.slowQueries > summary.criticalQueries) {
    console.log('🟡 PERFORMANCE WARNINGS:');
    console.log(`- ${summary.slowQueries - summary.criticalQueries} queries are slow (${thresholds.medium}-${thresholds.critical}ms)`);
    console.log('- Monitor these queries and consider optimization');
    console.log('- Review query patterns and index usage\n');
  }

  if (summary.errorRate > 0.01) {
    console.log('🔴 ERROR RATE ISSUES:');
    console.log(`- ${(summary.errorRate * 100).toFixed(2)}% of queries are failing`);
    console.log('- Investigate query errors and fix underlying issues\n');
  }

  console.log('✅ GENERAL RECOMMENDATIONS:');
  console.log('- Regularly monitor query performance in production');
  console.log('- Set up alerts for queries exceeding thresholds');
  console.log('- Review and update indexes based on query patterns');
  console.log('- Consider query result caching for frequently accessed data');
  console.log('- Monitor database resource usage during peak times');
  
  console.log('\n===============================================');
}

// Run benchmarks if this script is executed directly
if (require.main === module) {
  runBenchmarks()
    .then(() => {
      displayRecommendations();
      console.log('\n🎉 Performance benchmark completed successfully!');
    })
    .catch((error) => {
      console.error('💥 Benchmark failed:', error);
      process.exit(1);
    });
}

export { runBenchmarks, benchmarks, benchmarkConfig };