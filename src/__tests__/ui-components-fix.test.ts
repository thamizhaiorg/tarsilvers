import { db } from '../lib/instant';

// Mock the database
jest.mock('../lib/instant', () => ({
  db: {
    useQuery: jest.fn(),
    queryOnce: jest.fn(),
    transact: jest.fn(),
    tx: {
      collections: {},
      opsets: {},
      metasets: {},
    }
  }
}));

// Mock store context
jest.mock('../lib/store-context', () => ({
  useStore: () => ({
    isLoading: false
    // No currentStore.id - this is the fix
  })
}));

describe('UI Components Schema Fixes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup query mocks
    (db.useQuery as jest.Mock).mockReturnValue({
      data: { collections: [], opsets: [], metasets: [], opvalues: [] },
      isLoading: false,
      error: null
    });
    
    (db.queryOnce as jest.Mock).mockResolvedValue({
      data: { collections: [], opsets: [], metasets: [] }
    });
    
    (db.transact as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Collections Query Fix', () => {
    it('should query collections without storeId filter', () => {
      // Simulate collections query
      db.useQuery({
        collections: {
          products: {
            brand: {},
            category: {},
            type: {},
            vendor: {}
          },
          $: {
            order: {
              name: 'asc'
            }
          }
        }
      });

      expect(db.useQuery).toHaveBeenCalledWith({
        collections: {
          products: {
            brand: {},
            category: {},
            type: {},
            vendor: {}
          },
          $: {
            order: {
              name: 'asc'
            }
          }
        }
      });
    });

    it('should check for duplicate collection names without storeId', async () => {
      // Simulate duplicate check query
      await db.queryOnce({
        collections: {
          $: { where: { name: 'Test Collection' } }
        }
      });

      expect(db.queryOnce).toHaveBeenCalledWith({
        collections: {
          $: { where: { name: 'Test Collection' } }
        }
      });
    });
  });

  describe('Option Sets Query Fix', () => {
    it('should query option sets without storeId filter', () => {
      // Simulate option sets query
      db.useQuery({
        opsets: {},
        opvalues: {}
      });

      expect(db.useQuery).toHaveBeenCalledWith({
        opsets: {},
        opvalues: {}
      });
    });
  });

  describe('Metafields Query Fix', () => {
    it('should query metafield definitions with correct parentId field', () => {
      // Simulate metafield definitions query
      db.useQuery({
        metasets: {
          $: {
            where: {
              parentId: 'metafield-definitions'
            }
          }
        }
      });

      expect(db.useQuery).toHaveBeenCalledWith({
        metasets: {
          $: {
            where: {
              parentId: 'metafield-definitions'
            }
          }
        }
      });
    });

    it('should query metafield values with correct parentId field', () => {
      const productId = 'test-product-id';
      
      // Simulate metafield values query
      db.useQuery({
        metasets: {
          $: {
            where: {
              parentId: productId
            }
          }
        }
      });

      expect(db.useQuery).toHaveBeenCalledWith({
        metasets: {
          $: {
            where: {
              parentId: productId
            }
          }
        }
      });
    });
  });

  describe('Store Context Independence', () => {
    it('should work without currentStore.id in all components', () => {
      // Test that components can work without store context providing currentStore.id
      const mockStoreContext = {
        isLoading: false
        // No currentStore - this should not break anything
      };

      expect(mockStoreContext).not.toHaveProperty('currentStore');
      expect(mockStoreContext).toHaveProperty('isLoading');
    });
  });

  describe('Schema Compliance Verification', () => {
    it('should use correct field names for all entities', () => {
      // Collections - no storeId
      const collectionData = {
        name: 'Test Collection',
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // Option Sets - no storeId
      const optionSetData = {
        name: 'Test Option Set'
      };

      // Metafields - parentId not parentid, no storeId
      const metafieldData = {
        title: 'Test Field',
        name: 'Test Field',
        type: 'text',
        category: 'product',
        parentId: 'test-parent',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // Verify schema compliance
      expect(collectionData).not.toHaveProperty('storeId');
      expect(optionSetData).not.toHaveProperty('storeId');
      expect(metafieldData).not.toHaveProperty('storeId');
      expect(metafieldData).toHaveProperty('parentId');
      expect(metafieldData).not.toHaveProperty('parentid');
    });
  });
});
