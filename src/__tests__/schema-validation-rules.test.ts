/**
 * Tests for Schema Validation Rules
 */

import {
  validateField,
  validateEntity,
  MonetaryValidator,
  QuantityValidator,
  BusinessRuleValidator,
  NUMERIC_VALIDATION_RULES
} from '../lib/schema-validation-rules';

describe('Schema Validation Rules', () => {
  describe('validateField', () => {
    test('should validate product price fields', () => {
      // Valid prices
      expect(validateField('products', 'price', 10.99).isValid).toBe(true);
      expect(validateField('products', 'price', 0).isValid).toBe(true);
      expect(validateField('products', 'price', null).isValid).toBe(true);
      
      // Invalid prices
      expect(validateField('products', 'price', -5.99).isValid).toBe(false);
      expect(validateField('products', 'price', -0.01).isValid).toBe(false);
    });

    test('should validate inventory quantities', () => {
      // Valid quantities
      expect(validateField('inventory', 'quantity', 100).isValid).toBe(true);
      expect(validateField('inventory', 'quantity', 0).isValid).toBe(true);
      expect(validateField('inventory', 'quantity', null).isValid).toBe(true);
      
      // Invalid quantities
      expect(validateField('inventory', 'quantity', -10).isValid).toBe(false);
    });

    test('should validate cart quantities (must be positive)', () => {
      // Valid quantities
      expect(validateField('cart', 'quantity', 1).isValid).toBe(true);
      expect(validateField('cart', 'quantity', 5).isValid).toBe(true);
      
      // Invalid quantities
      expect(validateField('cart', 'quantity', 0).isValid).toBe(false);
      expect(validateField('cart', 'quantity', -1).isValid).toBe(false);
    });

    test('should validate order totals (must be non-negative)', () => {
      // Valid totals
      expect(validateField('orders', 'total', 25.99).isValid).toBe(true);
      expect(validateField('orders', 'total', 0).isValid).toBe(true);
      
      // Invalid totals
      expect(validateField('orders', 'total', -10.50).isValid).toBe(false);
    });
  });

  describe('validateEntity', () => {
    test('should validate entire product entity', () => {
      const validProduct = {
        title: 'Test Product',
        storeId: 'store-123',
        status: 'active',
        pos: true,
        website: true,
        featured: false,
        createdAt: new Date(),
        price: 19.99,
        cost: 10.00,
        saleprice: 15.99
      };
      
      expect(validateEntity('products', validProduct).isValid).toBe(true);
      
      const invalidProduct = {
        title: 'Test Product',
        storeId: 'store-123',
        status: 'active',
        pos: true,
        website: true,
        featured: false,
        createdAt: new Date(),
        price: -19.99, // Invalid negative price
        cost: 10.00,
        saleprice: 15.99
      };
      
      const result = validateEntity('products', invalidProduct);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Product price must be non-negative');
    });

    test('should validate entire order entity', () => {
      const validOrder = {
        storeId: 'store-123',
        orderNumber: 'ORD-001',
        referenceId: 'REF-001',
        status: 'pending',
        paymentStatus: 'pending',
        fulfillmentStatus: 'unfulfilled',
        createdAt: new Date(),
        subtotal: 85.00,
        total: 100.00,
        taxAmount: 8.50,
        shippingAmount: 6.50
      };
      
      expect(validateEntity('orders', validOrder).isValid).toBe(true);
      
      const invalidOrder = {
        storeId: 'store-123',
        orderNumber: 'ORD-002',
        referenceId: 'REF-002',
        status: 'pending',
        paymentStatus: 'pending',
        fulfillmentStatus: 'unfulfilled',
        createdAt: new Date(),
        subtotal: 85.00,
        total: -100.00, // Invalid negative total
        taxAmount: -8.50, // Invalid negative tax
        shippingAmount: 6.50
      };
      
      const result = validateEntity('orders', invalidOrder);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('MonetaryValidator', () => {
    test('should validate monetary precision', () => {
      expect(MonetaryValidator.validatePrecision(10.99)).toBe(true);
      expect(MonetaryValidator.validatePrecision(10.9)).toBe(true);
      expect(MonetaryValidator.validatePrecision(10)).toBe(true);
      expect(MonetaryValidator.validatePrecision(10.999)).toBe(false);
    });

    test('should validate monetary range', () => {
      expect(MonetaryValidator.validateRange(100.00)).toBe(true);
      expect(MonetaryValidator.validateRange(0)).toBe(true);
      expect(MonetaryValidator.validateRange(999999.99)).toBe(true);
      expect(MonetaryValidator.validateRange(-0.01)).toBe(false);
      expect(MonetaryValidator.validateRange(1000000.00)).toBe(false);
    });

    test('should format monetary amounts', () => {
      expect(MonetaryValidator.formatAmount(10.999)).toBe(11.00);
      expect(MonetaryValidator.formatAmount(10.994)).toBe(10.99);
      expect(MonetaryValidator.formatAmount(10.995)).toBe(11.00);
    });

    test('should perform comprehensive monetary validation', () => {
      expect(MonetaryValidator.validate(19.99).isValid).toBe(true);
      expect(MonetaryValidator.validate(19.999).isValid).toBe(false);
      expect(MonetaryValidator.validate(-1.00).isValid).toBe(false);
    });
  });

  describe('QuantityValidator', () => {
    test('should validate whole numbers', () => {
      expect(QuantityValidator.validateWholeNumber(10)).toBe(true);
      expect(QuantityValidator.validateWholeNumber(0)).toBe(true);
      expect(QuantityValidator.validateWholeNumber(10.5)).toBe(false);
    });

    test('should validate quantity range', () => {
      expect(QuantityValidator.validateRange(100)).toBe(true);
      expect(QuantityValidator.validateRange(0)).toBe(true);
      expect(QuantityValidator.validateRange(999999)).toBe(true);
      expect(QuantityValidator.validateRange(-1)).toBe(false);
      expect(QuantityValidator.validateRange(1000000)).toBe(false);
    });

    test('should perform comprehensive quantity validation', () => {
      expect(QuantityValidator.validate(10).isValid).toBe(true);
      expect(QuantityValidator.validate(0).isValid).toBe(true);
      expect(QuantityValidator.validate(10.5).isValid).toBe(false);
      expect(QuantityValidator.validate(-1).isValid).toBe(false);
      
      // Test with allowZero = false
      expect(QuantityValidator.validate(0, false).isValid).toBe(false);
      expect(QuantityValidator.validate(1, false).isValid).toBe(true);
    });
  });

  describe('BusinessRuleValidator', () => {
    test('should validate sale price vs regular price', () => {
      expect(BusinessRuleValidator.validateSalePrice(20.00, 15.00).isValid).toBe(true);
      expect(BusinessRuleValidator.validateSalePrice(20.00, 20.00).isValid).toBe(true);
      expect(BusinessRuleValidator.validateSalePrice(20.00, null).isValid).toBe(true);
      expect(BusinessRuleValidator.validateSalePrice(null, 15.00).isValid).toBe(true);
      expect(BusinessRuleValidator.validateSalePrice(20.00, 25.00).isValid).toBe(false);
    });

    test('should validate inventory consistency', () => {
      expect(BusinessRuleValidator.validateInventoryConsistency(100, 20, 80).isValid).toBe(true);
      expect(BusinessRuleValidator.validateInventoryConsistency(100, 20, 75).isValid).toBe(false);
      expect(BusinessRuleValidator.validateInventoryConsistency(null, 20, 80).isValid).toBe(true);
    });

    test('should validate order totals', () => {
      // subtotal: 100, tax: 8.5, shipping: 6.5, discount: 5, total: 110
      expect(BusinessRuleValidator.validateOrderTotals(100, 8.5, 6.5, 5, 110).isValid).toBe(true);
      expect(BusinessRuleValidator.validateOrderTotals(100, 8.5, 6.5, 5, 115).isValid).toBe(false);
      
      // With null values
      expect(BusinessRuleValidator.validateOrderTotals(100, null, null, null, 100).isValid).toBe(true);
    });
  });

  describe('Validation Rules Coverage', () => {
    test('should have validation rules for all critical entities', () => {
      const entities = [...new Set(NUMERIC_VALIDATION_RULES.map(rule => rule.entity))];
      
      expect(entities).toContain('products');
      expect(entities).toContain('items');
      expect(entities).toContain('inventory');
      expect(entities).toContain('ilocations');
      expect(entities).toContain('cart');
      expect(entities).toContain('orderitems');
      expect(entities).toContain('orders');
    });

    test('should have non-negative rules for all price fields', () => {
      const priceRules = NUMERIC_VALIDATION_RULES.filter(rule => 
        rule.field.includes('price') || rule.field.includes('cost')
      );
      
      expect(priceRules.length).toBeGreaterThan(0);
      
      for (const rule of priceRules) {
        // Some price fields like cart and orderitems use 'positive' rule
        expect(['non-negative', 'positive']).toContain(rule.rule);
      }
    });

    test('should have appropriate rules for quantity fields', () => {
      const quantityRules = NUMERIC_VALIDATION_RULES.filter(rule => 
        rule.field.includes('quantity') || rule.field.includes('qty') || 
        rule.field === 'onHand' || rule.field === 'committed'
      );
      
      expect(quantityRules.length).toBeGreaterThan(0);
      
      for (const rule of quantityRules) {
        expect(['non-negative', 'positive']).toContain(rule.rule);
      }
    });
  });
});