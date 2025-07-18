/**
 * Backward Compatibility Layer Tests
 * 
 * Tests for fallback queries, data transformation middleware,
 * migration status tracking, and rollback capabilities.
 */

import {
  LEGACY_FIELD_MAPPINGS,
  addLegacyFields,
  transformLegacyInput,
  migrationStatusManager,
  migrationRollback,
  createCompatibilityMiddleware,
  BatchMigrationProcessor,
  MigrationValidator,
  CompatibilityPerformanceMonitor,
  compatibilityPerformanceMonitor,
  getStoreMigrationStatus,
  safelyDisableCompatibilityLayer,
  emergencyRollback,
} from '../lib/backward-compatibility';

// Mock the database
jest.mock('../lib/instant', () => ({
  db: {
    query: jest.fn(),
    transact: jest.fn(),
    tx: {
      products: {},
      orders: {},
      orderitems: {},
      customers: {},
      items: {},
    },
    id: jest.fn(() => 'mock-id-123'),
  },
}));

describe('Backward Compatibility Layer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Legacy Field Mappings', () => {
    test('should have correct mappings for all entities', () => {
      expect(LEGACY_FIELD_MAPPINGS.products).toEqual({
        createdat: 'createdAt',
        updatedat: 'updatedAt',
        name: 'title',
        brand: 'brandId',
        category: 'categoryId',
        type: 'typeId',
        vendor: 'vendorId',
        collection: 'collectionId',
      });

      expect(LEGACY_FIELD_MAPPINGS.orders).toEqual({
        createdat: 'createdAt',
        updatedat: 'updatedAt',
        referid: 'referenceId',
        billaddrs: 'billingAddress',
        shipaddrs: 'shippingAddress',
        taxamt: 'taxAmount',
        discount: 'discountAmount',
        fulfill: 'fulfillmentStatus',
      });

      expect(LEGACY_FIELD_MAPPINGS.orderitems).toEqual({
        qty: 'quantity',
        total: 'lineTotal',
        taxamt: 'taxAmount',
        taxrate: 'taxRate',
        varianttitle: 'variantTitle',
      });
    });
  });

  describe('Data Transformation', () => {
    test('should add legacy fields to records', () => {
      const products = [
        {
          id: '1',
          title: 'Product 1',
          createdAt: '2023-01-01',
          brandId: 'brand-1',
        },
        {
          id: '2',
          title: 'Product 2',
          updatedAt: '2023-01-02',
          categoryId: 'cat-1',
        },
      ];

      const result = addLegacyFields('products', products);

      expect(result[0]).toEqual({
        id: '1',
        title: 'Product 1',
        createdAt: '2023-01-01',
        brandId: 'brand-1',
        name: 'Product 1', // Legacy field added
        createdat: '2023-01-01', // Legacy field added
        brand: 'brand-1', // Legacy field added
      });

      expect(result[1]).toEqual({
        id: '2',
        title: 'Product 2',
        updatedAt: '2023-01-02',
        categoryId: 'cat-1',
        name: 'Product 2', // Legacy field added
        updatedat: '2023-01-02', // Legacy field added
        category: 'cat-1', // Legacy field added
      });
    });

    test('should transform legacy input to new field names', () => {
      const legacyInput = {
        name: 'Product Name',
        createdat: '2023-01-01',
        brand: 'brand-1',
        category: 'cat-1',
        price: 99.99,
      };

      const result = transformLegacyInput('products', legacyInput);

      expect(result).toEqual({
        title: 'Product Name',
        createdAt: '2023-01-01',
        brandId: 'brand-1',
        categoryId: 'cat-1',
        price: 99.99,
      });
    });

    test('should not transform if new field already exists', () => {
      const input = {
        name: 'Old Name',
        title: 'New Title',
        createdat: '2023-01-01',
        createdAt: '2023-01-02',
      };

      const result = transformLegacyInput('products', input);

      expect(result).toEqual({
        title: 'New Title', // New field takes precedence
        createdAt: '2023-01-02', // New field takes precedence
      });
      
      // Ensure legacy fields are removed
      expect(result.name).toBeUndefined();
      expect(result.createdat).toBeUndefined();
    });
  });

  describe('Migration Status Manager', () => {
    test('should track migration status correctly', () => {
      const status = {
        storeId: 'store-1',
        entity: 'products',
        status: 'in_progress' as const,
        recordsTotal: 100,
        recordsMigrated: 50,
        recordsFailed: 0,
        version: '1.0.0',
      };

      migrationStatusManager.setStatus(status);
      const retrieved = migrationStatusManager.getStatus('store-1', 'products');

      expect(retrieved).toEqual(status);
    });

    test('should check if entity is migrated', () => {
      migrationStatusManager.setStatus({
        storeId: 'store-1',
        entity: 'products',
        status: 'completed',
        recordsTotal: 100,
        recordsMigrated: 100,
        recordsFailed: 0,
        version: '1.0.0',
      });

      expect(migrationStatusManager.isEntityMigrated('store-1', 'products')).toBe(true);
      expect(migrationStatusManager.isEntityMigrated('store-1', 'orders')).toBe(false);
    });

    test('should get statistics correctly', () => {
      // Clear any existing statuses
      migrationStatusManager.clearStoreStatuses('store-1');

      migrationStatusManager.setStatus({
        storeId: 'store-1',
        entity: 'products',
        status: 'completed',
        recordsTotal: 100,
        recordsMigrated: 100,
        recordsFailed: 0,
        version: '1.0.0',
      });

      migrationStatusManager.setStatus({
        storeId: 'store-1',
        entity: 'orders',
        status: 'failed',
        recordsTotal: 50,
        recordsMigrated: 30,
        recordsFailed: 20,
        version: '1.0.0',
      });

      const stats = migrationStatusManager.getStatistics();
      expect(stats.completedMigrations).toBeGreaterThanOrEqual(1);
      expect(stats.failedMigrations).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Compatibility Middleware', () => {
    test('should transform query parameters', () => {
      const middleware = createCompatibilityMiddleware();
      
      const query = {
        where: {
          name: 'Product Name',
          createdat: '2023-01-01',
        },
        order: 'createdat',
      };

      const result = middleware.transformQuery('products', query);

      expect(result.where).toEqual({
        title: 'Product Name',
        createdAt: '2023-01-01',
      });
      expect(result.order).toBe('createdAt');
    });

    test('should transform select clauses', () => {
      const middleware = createCompatibilityMiddleware();
      
      const selectArray = ['name', 'createdat', 'brand'];
      const result = middleware.transformSelectClause('products', selectArray);

      expect(result).toEqual(['title', 'createdAt', 'brandId']);
    });

    test('should check if middleware should be applied', () => {
      const middleware = createCompatibilityMiddleware();
      
      // Mock entity as not migrated
      migrationStatusManager.setStatus({
        storeId: 'store-1',
        entity: 'products',
        status: 'in_progress',
        recordsTotal: 100,
        recordsMigrated: 50,
        recordsFailed: 0,
        version: '1.0.0',
      });

      expect(middleware.shouldApplyMiddleware('products', 'store-1')).toBe(true);

      // Mock entity as migrated
      migrationStatusManager.setStatus({
        storeId: 'store-1',
        entity: 'products',
        status: 'completed',
        recordsTotal: 100,
        recordsMigrated: 100,
        recordsFailed: 0,
        version: '1.0.0',
      });

      expect(middleware.shouldApplyMiddleware('products', 'store-1')).toBe(false);
    });
  });

  describe('Migration Rollback', () => {
    test('should verify backup exists and is valid', () => {
      const verification = migrationRollback.verifyBackup('store-1', 'products');
      expect(verification.exists).toBe(false);
      expect(verification.valid).toBe(false);
      expect(verification.issues).toContain('Backup does not exist');
    });

    test('should list available backups', () => {
      const backups = migrationRollback.listBackups();
      expect(Array.isArray(backups)).toBe(true);
    });

    test('should get rollback history', () => {
      const history = migrationRollback.getRollbackHistory('store-1', 'products');
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('Batch Migration Processor', () => {
    test('should create batch processor with correct settings', () => {
      const processor = new BatchMigrationProcessor(50, 2);
      expect(processor).toBeInstanceOf(BatchMigrationProcessor);
    });
  });

  describe('Migration Validator', () => {
    test('should validate field mappings correctly', () => {
      const originalRecord = {
        name: 'Product Name',
        createdat: '2023-01-01',
        brand: 'brand-1',
      };

      const transformedRecord = {
        title: 'Product Name',
        createdAt: '2023-01-01',
        brandId: 'brand-1',
      };

      const validation = MigrationValidator.validateFieldMappings(
        'products',
        originalRecord,
        transformedRecord
      );

      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    test('should detect field mapping issues', () => {
      const originalRecord = {
        name: 'Product Name',
        createdat: '2023-01-01',
      };

      const transformedRecord = {
        title: 'Different Name', // Value mismatch
        // Missing createdAt field
      };

      const validation = MigrationValidator.validateFieldMappings(
        'products',
        originalRecord,
        transformedRecord
      );

      expect(validation.isValid).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Monitor', () => {
    test('should track operation timing', () => {
      const monitor = new CompatibilityPerformanceMonitor();
      
      const timingId = monitor.startTiming('test_operation');
      expect(typeof timingId).toBe('string');
      
      monitor.endTiming(timingId, true);
      
      const stats = monitor.getStatistics();
      expect(stats.totalOperations).toBe(1);
      expect(stats.successRate).toBe(1);
    });

    test('should calculate statistics correctly', () => {
      const monitor = new CompatibilityPerformanceMonitor();
      
      // Add successful operation
      const id1 = monitor.startTiming('query');
      monitor.endTiming(id1, true);
      
      // Add failed operation
      const id2 = monitor.startTiming('query');
      monitor.endTiming(id2, false);
      
      const stats = monitor.getStatistics();
      expect(stats.totalOperations).toBe(2);
      expect(stats.successRate).toBe(0.5);
      expect(stats.operationBreakdown.query.count).toBe(2);
      expect(stats.operationBreakdown.query.successRate).toBe(0.5);
    });
  });

  describe('Store Migration Status', () => {
    test('should get comprehensive migration status', () => {
      migrationStatusManager.clearStoreStatuses('test-store');
      
      migrationStatusManager.setStatus({
        storeId: 'test-store',
        entity: 'products',
        status: 'completed',
        recordsTotal: 100,
        recordsMigrated: 100,
        recordsFailed: 0,
        version: '1.0.0',
      });

      migrationStatusManager.setStatus({
        storeId: 'test-store',
        entity: 'orders',
        status: 'in_progress',
        recordsTotal: 50,
        recordsMigrated: 25,
        recordsFailed: 5,
        version: '1.0.0',
      });

      const status = getStoreMigrationStatus('test-store');
      
      expect(status.statuses).toHaveLength(2);
      expect(status.overall.totalRecords).toBe(150);
      expect(status.overall.migratedRecords).toBe(125);
      expect(status.overall.failedRecords).toBe(5);
      expect(status.overall.isComplete).toBe(false);
    });
  });

  describe('Safety Checks', () => {
    test('should assess if compatibility layer can be safely disabled', async () => {
      // Clear any existing statuses first
      migrationStatusManager.clearStoreStatuses('safe-store');
      
      // Mock all entities as completed
      const entities = ['products', 'orders', 'orderitems', 'customers', 'items'];
      entities.forEach(entity => {
        migrationStatusManager.setStatus({
          storeId: 'safe-store',
          entity,
          status: 'completed',
          recordsTotal: 100,
          recordsMigrated: 100,
          recordsFailed: 0,
          version: '1.0.0',
        });
      });

      // Mock database query for consistency check - return consistent data
      const { db } = require('../lib/instant');
      db.query.mockImplementation(({ products, orders, orderitems, customers, items }) => {
        if (products) {
          return Promise.resolve({
            data: { products: [{ id: '1', title: 'Test', createdAt: '2023-01-01' }] }
          });
        }
        if (orders) {
          return Promise.resolve({
            data: { orders: [{ id: '1', orderNumber: 'ORD-001', createdAt: '2023-01-01' }] }
          });
        }
        if (orderitems) {
          return Promise.resolve({
            data: { orderitems: [{ id: '1', quantity: 1, createdAt: '2023-01-01' }] }
          });
        }
        if (customers) {
          return Promise.resolve({
            data: { customers: [{ id: '1', name: 'Test Customer', createdAt: '2023-01-01' }] }
          });
        }
        if (items) {
          return Promise.resolve({
            data: { items: [{ id: '1', sku: 'SKU-001', createdAt: '2023-01-01' }] }
          });
        }
        return Promise.resolve({ data: {} });
      });

      // Mock performance monitor to return good stats
      const mockStats = {
        totalOperations: 100,
        averageDuration: 50,
        successRate: 0.98,
        operationBreakdown: {},
      };
      jest.spyOn(compatibilityPerformanceMonitor, 'getStatistics').mockReturnValue(mockStats);

      const assessment = await safelyDisableCompatibilityLayer('safe-store');
      
      expect(assessment.canDisable).toBe(true);
      expect(assessment.issues).toHaveLength(0);
      expect(assessment.recommendations).toContain('Compatibility layer can be safely disabled');
    });
  });

  describe('Emergency Rollback', () => {
    test('should handle emergency rollback gracefully', async () => {
      const { db } = require('../lib/instant');
      db.query.mockResolvedValue({ data: { products: [] } });
      db.transact.mockResolvedValue(undefined);

      const result = await emergencyRollback('emergency-store', {
        entities: ['products'],
        reason: 'Critical data corruption',
        createEmergencyBackup: false, // Skip backup for test
      });

      expect(result.success).toBe(false); // Will fail because no backup exists
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});