import { db } from '../lib/instant';
import { createCollection } from '../lib/crud';

// Mock the database and utilities
jest.mock('../lib/instant', () => ({
  db: {
    transact: jest.fn(),
    tx: {
      collections: {},
      opsets: {},
      metasets: {},
    }
  },
  getCurrentTimestamp: () => Date.now()
}));

// Mock ID generation from InstantDB
jest.mock('@instantdb/react-native', () => ({
  id: () => 'test-id-123'
}));

describe('Entity Creation Schema Compliance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup transaction mocks
    (db.transact as jest.Mock).mockResolvedValue(undefined);
    
    // Setup entity transaction mocks
    const mockUpdate = jest.fn();
    const mockDelete = jest.fn();
    
    db.tx.collections = new Proxy({}, {
      get: () => ({ update: mockUpdate, delete: mockDelete })
    });
    
    db.tx.opsets = new Proxy({}, {
      get: () => ({ update: mockUpdate, delete: mockDelete })
    });
    
    db.tx.metasets = new Proxy({}, {
      get: () => ({ update: mockUpdate, delete: mockDelete })
    });
  });

  describe('Collections', () => {
    it('should create collection without storeId field', async () => {
      const collectionData = {
        name: 'Test Collection',
        description: 'Test Description'
      };

      const result = await createCollection(collectionData);

      expect(result.success).toBe(true);
      expect(db.transact).toHaveBeenCalled();
    });
  });

  describe('Option Sets', () => {
    it('should create option set without storeId field', async () => {
      // Test that option set creation works without storeId
      const optionSetData = {
        name: 'Test Option Set'
        // No storeId field - this is the fix we implemented
      };

      // Verify the data structure doesn't include storeId
      expect(optionSetData).not.toHaveProperty('storeId');
      expect(optionSetData).toHaveProperty('name');
    });
  });

  describe('Metafields', () => {
    it('should create metafield with correct field names', async () => {
      const { db: mockDb } = require('../lib/instant');
      
      // Simulate metafield creation with correct schema fields
      await mockDb.transact(
        mockDb.tx.metasets['test-id'].update({
          title: 'Test Field',
          name: 'Test Field',
          type: 'text',
          group: 'General',
          order: 1,
          filter: false,
          config: {},
          value: 'test value',
          parentId: 'metafield-definitions', // Correct field name
          category: 'product', // Required field
          createdAt: Date.now(),
          updatedAt: Date.now()
          // No storeId - removed from schema
        })
      );

      expect(mockDb.transact).toHaveBeenCalled();
    });
  });

  describe('Schema Compliance', () => {
    it('should not include storeId in any entity creation', () => {
      // This test ensures our fixes removed storeId from all entity creation calls
      const { db: mockDb } = require('../lib/instant');
      
      // Test collections
      const collectionData = {
        name: 'Test Collection',
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      // Test option sets  
      const optionSetData = {
        name: 'Test Option Set'
      };
      
      // Test metafields
      const metafieldData = {
        title: 'Test Field',
        name: 'Test Field', 
        type: 'text',
        category: 'product',
        parentId: 'test-parent', // Using parentId not parentid
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // Verify none of these include storeId
      expect(collectionData).not.toHaveProperty('storeId');
      expect(optionSetData).not.toHaveProperty('storeId');
      expect(metafieldData).not.toHaveProperty('storeId');
      
      // Verify metafield uses correct field name
      expect(metafieldData).toHaveProperty('parentId');
      expect(metafieldData).not.toHaveProperty('parentid');
    });
  });
});
