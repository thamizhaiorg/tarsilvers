// Tests for validation service
import { ValidationService } from '../validation-service';

describe('ValidationService', () => {
  let validationService: ValidationService;

  beforeEach(() => {
    validationService = ValidationService.getInstance();
  });

  describe('Product Validation', () => {
    it('should validate a valid product', () => {
      const productData = {
        title: 'Test Product',
        price: 29.99,
        cost: 15.00,
        stock: 100,
        weight: 1.5,
        email: 'test@example.com',
        phone: '+1234567890',
        website: 'https://example.com',
        tags: ['electronics', 'gadget'],
      };

      const result = validationService.validateProduct(productData);

      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('should require title when isRequired is true', () => {
      const productData = {};

      const result = validationService.validateProduct(productData, true);

      expect(result.isValid).toBe(false);
      expect(result.errors.title).toBe('Product title is required');
    });

    it('should validate title length', () => {
      const productData = {
        title: 'A'.repeat(256), // Too long
      };

      const result = validationService.validateProduct(productData);

      expect(result.isValid).toBe(false);
      expect(result.errors.title).toBe('Product title must be less than 255 characters');
    });

    it('should validate minimum title length', () => {
      const productData = {
        title: 'A', // Too short
      };

      const result = validationService.validateProduct(productData);

      expect(result.isValid).toBe(false);
      expect(result.errors.title).toBe('Product title must be at least 2 characters');
    });

    it('should validate negative price', () => {
      const productData = {
        price: -10,
      };

      const result = validationService.validateProduct(productData);

      expect(result.isValid).toBe(false);
      expect(result.errors.price).toBe('Price cannot be negative');
    });

    it('should validate maximum price', () => {
      const productData = {
        price: 1000000,
      };

      const result = validationService.validateProduct(productData);

      expect(result.isValid).toBe(false);
      expect(result.errors.price).toBe('Price cannot exceed $999,999.99');
    });

    it('should warn about zero price', () => {
      const productData = {
        price: 0,
      };

      const result = validationService.validateProduct(productData);

      expect(result.isValid).toBe(true);
      expect(result.warnings?.price).toBe('Price is set to $0.00');
    });

    it('should validate cost vs price', () => {
      const productData = {
        price: 10,
        cost: 15, // Cost higher than price
      };

      const result = validationService.validateProduct(productData);

      expect(result.isValid).toBe(true);
      expect(result.warnings?.cost).toBe('Cost is higher than selling price');
    });

    it('should validate negative stock', () => {
      const productData = {
        stock: -5,
      };

      const result = validationService.validateProduct(productData);

      expect(result.isValid).toBe(false);
      expect(result.errors.stock).toBe('Stock cannot be negative');
    });

    it('should warn about low stock', () => {
      const productData = {
        stock: 3,
      };

      const result = validationService.validateProduct(productData);

      expect(result.isValid).toBe(true);
      expect(result.warnings?.stock).toBe('Low stock level');
    });

    it('should validate email format', () => {
      const productData = {
        email: 'invalid-email',
      };

      const result = validationService.validateProduct(productData);

      expect(result.isValid).toBe(false);
      expect(result.errors.email).toBe('Please enter a valid email address');
    });

    it('should validate phone format', () => {
      const productData = {
        phone: 'invalid-phone',
      };

      const result = validationService.validateProduct(productData);

      expect(result.isValid).toBe(false);
      expect(result.errors.phone).toBe('Please enter a valid phone number');
    });

    it('should validate website URL', () => {
      const productData = {
        website: 'invalid-url',
      };

      const result = validationService.validateProduct(productData);

      expect(result.isValid).toBe(false);
      expect(result.errors.website).toBe('Please enter a valid website URL');
    });

    it('should validate tags count', () => {
      const productData = {
        tags: Array(25).fill('tag'), // Too many tags
      };

      const result = validationService.validateProduct(productData);

      expect(result.isValid).toBe(false);
      expect(result.errors.tags).toBe('Maximum 20 tags allowed');
    });

    it('should validate tag length', () => {
      const productData = {
        tags: ['A'.repeat(51)], // Tag too long
      };

      const result = validationService.validateProduct(productData);

      expect(result.isValid).toBe(false);
      expect(result.errors.tags).toBe('Tags must be less than 50 characters each');
    });
  });

  describe('Collection Validation', () => {
    it('should validate a valid collection', () => {
      const collectionData = {
        name: 'Test Collection',
        description: 'A test collection description',
      };

      const result = validationService.validateCollection(collectionData);

      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('should require name when isRequired is true', () => {
      const collectionData = {};

      const result = validationService.validateCollection(collectionData, true);

      expect(result.isValid).toBe(false);
      expect(result.errors.name).toBe('Collection name is required');
    });

    it('should validate name length', () => {
      const collectionData = {
        name: 'A'.repeat(256),
      };

      const result = validationService.validateCollection(collectionData);

      expect(result.isValid).toBe(false);
      expect(result.errors.name).toBe('Collection name must be less than 255 characters');
    });

    it('should validate description length', () => {
      const collectionData = {
        description: 'A'.repeat(1001),
      };

      const result = validationService.validateCollection(collectionData);

      expect(result.isValid).toBe(false);
      expect(result.errors.description).toBe('Description must be less than 1000 characters');
    });
  });

  describe('Store Validation', () => {
    it('should validate a valid store', () => {
      const storeData = {
        name: 'Test Store',
        email: 'store@example.com',
        phone: '+1234567890',
        website: 'https://store.example.com',
        address: '123 Main St, City, State 12345',
      };

      const result = validationService.validateStore(storeData);

      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('should require name when isRequired is true', () => {
      const storeData = {};

      const result = validationService.validateStore(storeData, true);

      expect(result.isValid).toBe(false);
      expect(result.errors.name).toBe('Store name is required');
    });

    it('should validate address length', () => {
      const storeData = {
        address: 'A'.repeat(501),
      };

      const result = validationService.validateStore(storeData);

      expect(result.isValid).toBe(false);
      expect(result.errors.address).toBe('Address must be less than 500 characters');
    });
  });

  describe('File Validation', () => {
    it('should validate a valid file', () => {
      const file = {
        name: 'test-image.jpg',
        size: 1024 * 1024, // 1MB
        type: 'image/jpeg',
      };

      const result = validationService.validateFile(file);

      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('should validate file size', () => {
      const file = {
        name: 'large-file.jpg',
        size: 15 * 1024 * 1024, // 15MB (exceeds 10MB default)
        type: 'image/jpeg',
      };

      const result = validationService.validateFile(file);

      expect(result.isValid).toBe(false);
      expect(result.errors.size).toBe('File size must be less than 10MB');
    });

    it('should validate file type', () => {
      const file = {
        name: 'test.exe',
        size: 1024,
        type: 'application/x-executable',
      };

      const result = validationService.validateFile(file);

      expect(result.isValid).toBe(false);
      expect(result.errors.type).toBe('File type not supported');
    });

    it('should validate file name length', () => {
      const file = {
        name: 'A'.repeat(256) + '.jpg',
        size: 1024,
        type: 'image/jpeg',
      };

      const result = validationService.validateFile(file);

      expect(result.isValid).toBe(false);
      expect(result.errors.name).toBe('File name must be less than 255 characters');
    });
  });

  describe('Search Query Validation', () => {
    it('should validate a valid search query', () => {
      const result = validationService.validateSearchQuery('test product');

      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('should validate query length', () => {
      const longQuery = 'A'.repeat(101);
      const result = validationService.validateSearchQuery(longQuery);

      expect(result.isValid).toBe(false);
      expect(result.errors.query).toBe('Search query must be less than 100 characters');
    });

    it('should validate dangerous characters', () => {
      const dangerousQuery = '<script>alert("xss")</script>';
      const result = validationService.validateSearchQuery(dangerousQuery);

      expect(result.isValid).toBe(false);
      expect(result.errors.query).toBe('Search query contains invalid characters');
    });
  });

  describe('Batch Validation', () => {
    it('should validate multiple items', () => {
      const items = [
        { title: 'Valid Product 1', price: 10 },
        { title: '', price: 20 }, // Invalid - empty title
        { title: 'Valid Product 2', price: 30 },
      ];

      const validator = (item: any) => validationService.validateProduct(item, true);
      const result = validationService.validateBatch(items, validator);

      expect(result.valid).toHaveLength(2);
      expect(result.invalid).toHaveLength(1);
      expect(result.invalid[0].errors.title).toBe('Product title is required');
    });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ValidationService.getInstance();
      const instance2 = ValidationService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });
});
