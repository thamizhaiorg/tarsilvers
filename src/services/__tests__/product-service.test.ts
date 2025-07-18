// Tests for product service
import { ProductService } from '../product-service';
import { Product } from '../../lib/instant';

// Mock the database
jest.mock('../../lib/instant', () => ({
  db: {
    transact: jest.fn(),
    tx: {
      products: {},
    },
  },
}));

// Mock the logger
jest.mock('../../lib/logger', () => ({
  log: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  },
  trackError: jest.fn(),
  PerformanceMonitor: {
    measure: jest.fn((label: string, fn: () => any) => fn()),
  },
}));

// Mock id generator
jest.mock('@instantdb/react-native', () => ({
  id: jest.fn(() => 'mock-id-123'),
}));

describe('ProductService', () => {
  let productService: ProductService;
  const mockProducts: Product[] = [
    {
      id: '1',
      title: 'Product A',
      price: 29.99,
      cost: 15.00,
      stock: 100,
      publish: true,
      category: 'Electronics',
      brand: 'Brand A',
      tags: ['tag1', 'tag2'],
      createdAt: '2023-01-01',
      updatedAt: '2023-01-02',
    },
    {
      id: '2',
      title: 'Product B',
      price: 19.99,
      cost: 10.00,
      stock: 0,
      publish: false,
      category: 'Clothing',
      brand: 'Brand B',
      tags: ['tag2', 'tag3'],
      createdAt: '2023-01-02',
      updatedAt: '2023-01-03',
    },
    {
      id: '3',
      title: 'Product C',
      price: 39.99,
      cost: 20.00,
      stock: 5,
      publish: true,
      category: 'Electronics',
      brand: 'Brand A',
      tags: ['tag1'],
      createdAt: '2023-01-03',
      updatedAt: '2023-01-04',
    },
  ];

  beforeEach(() => {
    productService = ProductService.getInstance();
    jest.clearAllMocks();
  });

  describe('filterProducts', () => {
    it('should filter products by search term', () => {
      const filters = { search: 'Product A' };
      const result = productService.filterProducts(mockProducts, filters);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Product A');
    });

    it('should filter products by category', () => {
      const filters = { category: 'Electronics' };
      const result = productService.filterProducts(mockProducts, filters);

      expect(result).toHaveLength(2);
      expect(result.every(p => p.category === 'Electronics')).toBe(true);
    });

    it('should filter products by brand', () => {
      const filters = { brand: 'Brand A' };
      const result = productService.filterProducts(mockProducts, filters);

      expect(result).toHaveLength(2);
      expect(result.every(p => p.brand === 'Brand A')).toBe(true);
    });

    it('should filter products by status', () => {
      const filters = { status: 'Draft' as const };
      const result = productService.filterProducts(mockProducts, filters);

      expect(result).toHaveLength(1);
      expect(result[0].publish).toBe(false);
    });

    it('should filter products by tags', () => {
      const filters = { tags: ['tag1'] };
      const result = productService.filterProducts(mockProducts, filters);

      expect(result).toHaveLength(2);
      expect(result.every(p => Array.isArray(p.tags) && p.tags.includes('tag1'))).toBe(true);
    });

    it('should filter products by price range', () => {
      const filters = { priceRange: { min: 20, max: 35 } };
      const result = productService.filterProducts(mockProducts, filters);

      expect(result).toHaveLength(1);
      expect(result[0].price).toBe(29.99);
    });

    it('should combine multiple filters', () => {
      const filters = {
        search: 'Product',
        category: 'Electronics',
        status: 'Active' as const,
      };
      const result = productService.filterProducts(mockProducts, filters);

      expect(result).toHaveLength(2);
      expect(result.every(p => 
        p.title.includes('Product') && 
        p.category === 'Electronics' && 
        p.publish !== false
      )).toBe(true);
    });

    it('should return empty array when no products match', () => {
      const filters = { search: 'Nonexistent Product' };
      const result = productService.filterProducts(mockProducts, filters);

      expect(result).toHaveLength(0);
    });
  });

  describe('sortProducts', () => {
    it('should sort products by title ascending', () => {
      const sortOptions = { field: 'title' as const, direction: 'asc' as const };
      const result = productService.sortProducts(mockProducts, sortOptions);

      expect(result[0].title).toBe('Product A');
      expect(result[1].title).toBe('Product B');
      expect(result[2].title).toBe('Product C');
    });

    it('should sort products by title descending', () => {
      const sortOptions = { field: 'title' as const, direction: 'desc' as const };
      const result = productService.sortProducts(mockProducts, sortOptions);

      expect(result[0].title).toBe('Product C');
      expect(result[1].title).toBe('Product B');
      expect(result[2].title).toBe('Product A');
    });

    it('should sort products by price ascending', () => {
      const sortOptions = { field: 'price' as const, direction: 'asc' as const };
      const result = productService.sortProducts(mockProducts, sortOptions);

      expect(result[0].price).toBe(19.99);
      expect(result[1].price).toBe(29.99);
      expect(result[2].price).toBe(39.99);
    });

    it('should sort products by stock descending', () => {
      const sortOptions = { field: 'stock' as const, direction: 'desc' as const };
      const result = productService.sortProducts(mockProducts, sortOptions);

      expect(result[0].stock).toBe(100);
      expect(result[1].stock).toBe(5);
      expect(result[2].stock).toBe(0);
    });

    it('should not mutate original array', () => {
      const originalProducts = [...mockProducts];
      const sortOptions = { field: 'title' as const, direction: 'desc' as const };
      
      productService.sortProducts(mockProducts, sortOptions);

      expect(mockProducts).toEqual(originalProducts);
    });
  });

  describe('createProduct', () => {
    it('should create a product successfully', async () => {
      const { db } = require('../../lib/instant');
      db.transact.mockResolvedValue(undefined);

      const productData = {
        title: 'New Product',
        price: 49.99,
        cost: 25.00,
      };

      const result = await productService.createProduct(productData, 'store-123');

      expect(result.success).toBe(true);
      expect(result.productId).toBe('mock-id-123');
      expect(db.transact).toHaveBeenCalledWith([
        expect.objectContaining({
          // Transaction object structure would be tested here
        })
      ]);
    });

    it('should handle creation errors', async () => {
      const { db } = require('../../lib/instant');
      const error = new Error('Database error');
      db.transact.mockRejectedValue(error);

      const productData = { title: 'New Product' };
      const result = await productService.createProduct(productData, 'store-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('updateProduct', () => {
    it('should update a product successfully', async () => {
      const { db } = require('../../lib/instant');
      db.transact.mockResolvedValue(undefined);

      const updates = { title: 'Updated Product', price: 59.99 };
      const result = await productService.updateProduct('product-123', updates);

      expect(result.success).toBe(true);
      expect(db.transact).toHaveBeenCalled();
    });

    it('should handle update errors', async () => {
      const { db } = require('../../lib/instant');
      const error = new Error('Update failed');
      db.transact.mockRejectedValue(error);

      const updates = { title: 'Updated Product' };
      const result = await productService.updateProduct('product-123', updates);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });
  });

  describe('deleteProduct', () => {
    it('should delete a product successfully', async () => {
      const { db } = require('../../lib/instant');
      db.transact.mockResolvedValue(undefined);

      const result = await productService.deleteProduct('product-123');

      expect(result.success).toBe(true);
      expect(db.transact).toHaveBeenCalled();
    });

    it('should handle deletion errors', async () => {
      const { db } = require('../../lib/instant');
      const error = new Error('Deletion failed');
      db.transact.mockRejectedValue(error);

      const result = await productService.deleteProduct('product-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Deletion failed');
    });
  });

  describe('bulkDeleteProducts', () => {
    it('should bulk delete products successfully', async () => {
      const { db } = require('../../lib/instant');
      db.transact.mockResolvedValue(undefined);

      const productIds = ['product-1', 'product-2', 'product-3'];
      const result = await productService.bulkDeleteProducts(productIds);

      expect(result.success).toBe(true);
      expect(db.transact).toHaveBeenCalled();
    });

    it('should handle bulk deletion errors', async () => {
      const { db } = require('../../lib/instant');
      const error = new Error('Bulk deletion failed');
      db.transact.mockRejectedValue(error);

      const productIds = ['product-1', 'product-2'];
      const result = await productService.bulkDeleteProducts(productIds);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Bulk deletion failed');
    });
  });

  describe('getProductStats', () => {
    it('should calculate product statistics correctly', () => {
      const stats = productService.getProductStats(mockProducts);

      expect(stats.total).toBe(3);
      expect(stats.active).toBe(2);
      expect(stats.draft).toBe(1);
      expect(stats.outOfStock).toBe(1);
      expect(stats.lowStock).toBe(1);
      expect(stats.averagePrice).toBeCloseTo(29.99, 2);
    });

    it('should handle empty product array', () => {
      const stats = productService.getProductStats([]);

      expect(stats.total).toBe(0);
      expect(stats.active).toBe(0);
      expect(stats.draft).toBe(0);
      expect(stats.outOfStock).toBe(0);
      expect(stats.lowStock).toBe(0);
      expect(stats.averagePrice).toBe(0);
    });

    it('should handle products without prices', () => {
      const productsWithoutPrices: Product[] = [
        {
          id: '1',
          title: 'Free Product',
          publish: true,
          createdAt: '2023-01-01',
        },
      ];

      const stats = productService.getProductStats(productsWithoutPrices);

      expect(stats.total).toBe(1);
      expect(stats.averagePrice).toBe(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ProductService.getInstance();
      const instance2 = ProductService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });
});
