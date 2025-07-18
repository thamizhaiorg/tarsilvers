/**
 * Tests for Schema Analysis and Validation Utilities
 */

import { SchemaValidator } from '../lib/schema-analysis';

describe('Schema Validation Utilities', () => {
  describe('SchemaValidator', () => {
    test('should validate field naming patterns', () => {
      // Valid field names
      expect(SchemaValidator.validateFieldNaming('createdAt').isValid).toBe(true);
      expect(SchemaValidator.validateFieldNaming('orderNumber').isValid).toBe(true);
      expect(SchemaValidator.validateFieldNaming('userId').isValid).toBe(true);
      
      // Invalid field names
      expect(SchemaValidator.validateFieldNaming('created_at').isValid).toBe(false);
      expect(SchemaValidator.validateFieldNaming('createdat').isValid).toBe(false);
      expect(SchemaValidator.validateFieldNaming('user-id').isValid).toBe(false);
    });

    test('should provide specific naming issues', () => {
      const result = SchemaValidator.validateFieldNaming('created_at');
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Field name should not contain underscores');
      expect(result.issues).toContain('Field name should use camelCase convention');
    });

    test('should validate timestamp field naming', () => {
      const result = SchemaValidator.validateFieldNaming('createdat');
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Timestamp fields should end with "At" (e.g., createdAt)');
    });

    test('should validate data types', () => {
      // Valid data types
      expect(SchemaValidator.validateDataType('createdAt', 'date').isValid).toBe(true);
      expect(SchemaValidator.validateDataType('price', 'number').isValid).toBe(true);
      expect(SchemaValidator.validateDataType('title', 'string').isValid).toBe(true);
      
      // Invalid data types
      expect(SchemaValidator.validateDataType('createdAt', 'string').isValid).toBe(false);
      expect(SchemaValidator.validateDataType('price', 'string').isValid).toBe(false);
      expect(SchemaValidator.validateDataType('metafields', 'any').isValid).toBe(false);
    });

    test('should provide specific data type issues', () => {
      const result = SchemaValidator.validateDataType('createdAt', 'string');
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Timestamp fields should use "date" type');
    });

    test('should suggest json over any type', () => {
      const result = SchemaValidator.validateDataType('metafields', 'any');
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Consider using "json" instead of "any" for structured data');
    });

    test('should validate relationships', () => {
      // Valid relationships
      expect(SchemaValidator.validateRelationship('products', 'brandId', 'brands').isValid).toBe(true);
      expect(SchemaValidator.validateRelationship('orders', 'customerId', 'customers').isValid).toBe(true);
      
      // Invalid relationships
      expect(SchemaValidator.validateRelationship('products', 'brand', 'brands').isValid).toBe(false);
      expect(SchemaValidator.validateRelationship('orders', 'customerId', 'nonexistent').isValid).toBe(false);
    });

    test('should provide specific relationship issues', () => {
      const result = SchemaValidator.validateRelationship('products', 'brand', 'brands');
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Relationship fields should end with "Id"');
    });

    test('should validate related entity existence', () => {
      const result = SchemaValidator.validateRelationship('orders', 'customerId', 'nonexistent');
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Related entity "nonexistent" may not exist');
    });
  });
});