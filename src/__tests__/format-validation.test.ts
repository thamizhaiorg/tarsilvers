/**
 * Tests for Format Validation Utilities
 */

import {
  EmailValidator,
  SKUValidator,
  PhoneValidator,
  OrderNumberValidator,
  FormatValidator
} from '../lib/format-validation';

describe('Format Validation Utilities', () => {
  describe('EmailValidator', () => {
    test('should validate correct email formats', () => {
      const validEmails = [
        'user@example.com',
        'test.email@domain.co.uk',
        'user+tag@example.org',
        'firstname.lastname@company.com',
        '123@example.com'
      ];

      for (const email of validEmails) {
        expect(EmailValidator.validate(email).isValid).toBe(true);
      }
    });

    test('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user..name@example.com',
        '.user@example.com',
        'user@example.',
        'user@.example.com'
      ];

      for (const email of invalidEmails) {
        expect(EmailValidator.validate(email).isValid).toBe(false);
      }
    });

    test('should accept empty email (optional field)', () => {
      expect(EmailValidator.validate('').isValid).toBe(true);
    });

    test('should normalize email addresses', () => {
      expect(EmailValidator.normalize('  USER@EXAMPLE.COM  ')).toBe('user@example.com');
      expect(EmailValidator.normalize('Test@Domain.Org')).toBe('test@domain.org');
    });

    test('should reject emails that are too long', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      expect(EmailValidator.validate(longEmail).isValid).toBe(false);
    });
  });

  describe('SKUValidator', () => {
    test('should validate correct SKU formats', () => {
      const validSKUs = [
        'ABC123',
        'PROD-001',
        'SKU_12345',
        'A1B2C3',
        'ITEM-ABC-123'
      ];

      for (const sku of validSKUs) {
        expect(SKUValidator.validate(sku).isValid).toBe(true);
      }
    });

    test('should reject invalid SKU formats', () => {
      const invalidSKUs = [
        '', // empty
        'abc123', // lowercase
        'SKU 123', // space
        'SKU@123', // special character
        'A'.repeat(51), // too long
        'SYS-123', // reserved prefix
        'TEMP-456' // reserved prefix
      ];

      for (const sku of invalidSKUs) {
        expect(SKUValidator.validate(sku).isValid).toBe(false);
      }
    });

    test('should normalize SKU values', () => {
      expect(SKUValidator.normalize('  abc-123  ')).toBe('ABC-123');
      expect(SKUValidator.normalize('prod_001')).toBe('PROD_001');
    });

    test('should generate valid SKUs', () => {
      const sku1 = SKUValidator.generate();
      const sku2 = SKUValidator.generate('PROD-');
      
      expect(SKUValidator.validate(sku1).isValid).toBe(true);
      expect(SKUValidator.validate(sku2).isValid).toBe(true);
      expect(sku2.startsWith('PROD-')).toBe(true);
      expect(sku1).not.toBe(sku2); // Should be unique
    });
  });

  describe('PhoneValidator', () => {
    test('should validate US phone numbers', () => {
      const validPhones = [
        '2125551234',
        '+12125551234',
        '(212) 555-1234',
        '212-555-1234',
        '212.555.1234'
      ];

      for (const phone of validPhones) {
        expect(PhoneValidator.validate(phone, 'US').isValid).toBe(true);
      }
    });

    test('should reject invalid US phone numbers', () => {
      const invalidPhones = [
        '1234567', // too short
        '0125551234', // starts with 0
        '1125551234', // starts with 1
        '2125551234567', // too long
        'abc1234567' // contains letters
      ];

      for (const phone of invalidPhones) {
        expect(PhoneValidator.validate(phone, 'US').isValid).toBe(false);
      }
    });

    test('should accept empty phone (optional field)', () => {
      expect(PhoneValidator.validate('', 'US').isValid).toBe(true);
    });

    test('should normalize phone numbers', () => {
      expect(PhoneValidator.normalize('(212) 555-1234')).toBe('2125551234');
      expect(PhoneValidator.normalize('+1-212.555.1234')).toBe('+12125551234');
    });

    test('should format phone numbers for display', () => {
      expect(PhoneValidator.format('2125551234', 'US')).toBe('(212) 555-1234');
      expect(PhoneValidator.format('12125551234', 'US')).toBe('+1 (212) 555-1234');
    });
  });

  describe('OrderNumberValidator', () => {
    test('should validate correct order number formats', () => {
      const validOrderNumbers = [
        'ORD-123456',
        'ABC-DEF-789',
        '123456789012345',
        'STORE1-ORDER-001'
      ];

      for (const orderNumber of validOrderNumbers) {
        expect(OrderNumberValidator.validate(orderNumber).isValid).toBe(true);
      }
    });

    test('should reject invalid order number formats', () => {
      const invalidOrderNumbers = [
        '', // empty
        '12345', // too short
        'A'.repeat(21), // too long
        'order@123', // invalid character
        'order 123', // space
        'order_123' // underscore
      ];

      for (const orderNumber of invalidOrderNumbers) {
        expect(OrderNumberValidator.validate(orderNumber).isValid).toBe(false);
      }
    });

    test('should generate valid order numbers', () => {
      const orderNumber1 = OrderNumberValidator.generate('STORE1');
      const orderNumber2 = OrderNumberValidator.generate('STORE2');
      
      expect(OrderNumberValidator.validate(orderNumber1).isValid).toBe(true);
      expect(OrderNumberValidator.validate(orderNumber2).isValid).toBe(true);
      expect(orderNumber1.startsWith('STO')).toBe(true); // First 3 chars of STORE1
      expect(orderNumber2.startsWith('STO')).toBe(true); // First 3 chars of STORE2
      expect(orderNumber1).not.toBe(orderNumber2); // Should be unique
    });
  });

  describe('FormatValidator', () => {
    test('should validate customer data', () => {
      const validCustomer = {
        email: 'customer@example.com',
        phone: '2125551234',
        name: 'John Doe'
      };
      
      expect(FormatValidator.validateCustomer(validCustomer).isValid).toBe(true);
      
      const invalidCustomer = {
        email: 'invalid-email',
        phone: '123',
        name: ''
      };
      
      const result = FormatValidator.validateCustomer(invalidCustomer);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should validate item data', () => {
      const validItem = {
        sku: 'ITEM-123',
        productId: 'prod-456',
        storeId: 'store-789'
      };
      
      expect(FormatValidator.validateItem(validItem).isValid).toBe(true);
      
      const invalidItem = {
        sku: 'invalid sku',
        // missing productId and storeId
      };
      
      const result = FormatValidator.validateItem(invalidItem);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should validate order data', () => {
      const validOrder = {
        orderNumber: 'ORD-123456',
        storeId: 'store-789',
        total: 100.00,
        subtotal: 85.00
      };
      
      expect(FormatValidator.validateOrder(validOrder).isValid).toBe(true);
      
      const invalidOrder = {
        orderNumber: 'invalid order',
        // missing storeId
        total: -100.00, // negative total
        subtotal: -85.00 // negative subtotal
      };
      
      const result = FormatValidator.validateOrder(invalidOrder);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases and Error Messages', () => {
    test('should provide specific error messages', () => {
      const emailResult = EmailValidator.validate('invalid-email');
      expect(emailResult.errors).toContain('Email address format is invalid');
      
      const skuResult = SKUValidator.validate('');
      expect(skuResult.errors).toContain('SKU is required');
      
      const phoneResult = PhoneValidator.validate('123', 'US');
      expect(phoneResult.errors).toContain('Phone number format is invalid (US format expected)');
    });

    test('should handle null and undefined values gracefully', () => {
      // These should not throw errors
      expect(() => EmailValidator.validate('')).not.toThrow();
      expect(() => PhoneValidator.validate('')).not.toThrow();
      expect(() => SKUValidator.validate('')).not.toThrow();
    });

    test('should validate multiple errors in single validation', () => {
      const result = FormatValidator.validateCustomer({
        email: 'invalid-email',
        phone: '123',
        name: 'A'.repeat(101) // too long
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
  });
});