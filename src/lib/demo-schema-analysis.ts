/**
 * Demo Script for Schema Analysis Utilities
 * 
 * This script demonstrates the capabilities of the schema analysis utilities
 * without requiring the full InstantDB schema to be loaded.
 */

import { SchemaValidator, type SchemaInconsistency } from './schema-analysis';

/**
 * Demonstrates field naming validation
 */
export function demoFieldNamingValidation(): void {

  const testFields = [
    { name: 'createdAt', type: 'date' },
    { name: 'createdat', type: 'date' },
    { name: 'created_at', type: 'date' },
    { name: 'orderNumber', type: 'string' },
    { name: 'order-number', type: 'string' },
    { name: 'userId', type: 'string' },
    { name: 'user_id', type: 'string' }
  ];

  for (const field of testFields) {
    const result = SchemaValidator.validateFieldNaming(field.name);
    const status = result.isValid ? '✅' : '❌';
  }
}

/**
 * Demonstrates data type validation
 */
export function demoDataTypeValidation(): void {

  const testFields = [
    { name: 'createdAt', type: 'date' },
    { name: 'createdAt', type: 'string' },
    { name: 'price', type: 'number' },
    { name: 'price', type: 'string' },
    { name: 'metafields', type: 'json' },
    { name: 'metafields', type: 'any' },
    { name: 'title', type: 'string' }
  ];

  for (const field of testFields) {
    const result = SchemaValidator.validateDataType(field.name, field.type);
    const status = result.isValid ? '✅' : '❌';
  }
}

/**
 * Demonstrates relationship validation
 */
export function demoRelationshipValidation(): void {

  const testRelationships = [
    { entity: 'products', field: 'brandId', related: 'brands' },
    { entity: 'products', field: 'brand', related: 'brands' },
    { entity: 'orders', field: 'customerId', related: 'customers' },
    { entity: 'orders', field: 'customerId', related: 'nonexistent' },
    { entity: 'items', field: 'productId', related: 'products' }
  ];

  for (const rel of testRelationships) {
    const result = SchemaValidator.validateRelationship(rel.entity, rel.field, rel.related);
    const status = result.isValid ? '✅' : '❌';
  }
}

/**
 * Simulates schema inconsistencies that would be found in the actual schema
 */
export function demoSchemaInconsistencies(): void {

  // Simulate the types of inconsistencies we'd find in the real schema
  const mockInconsistencies: SchemaInconsistency[] = [
    {
      type: 'field_naming',
      entity: 'orders',
      field: 'createdat',
      issue: 'Inconsistent timestamp field naming',
      suggestion: 'Rename "createdat" to "createdAt" for consistency',
      severity: 'medium'
    },
    {
      type: 'duplicate_field',
      entity: 'orderitems',
      field: 'taxamt',
      issue: 'Duplicate field: both "taxamt" and "taxAmount" exist',
      suggestion: 'Remove "taxamt" and use "taxAmount" consistently',
      severity: 'high'
    },
    {
      type: 'missing_relationship',
      entity: 'products',
      field: 'brand',
      issue: 'Field "brand" stores string instead of relationship',
      suggestion: 'Convert to "brandId" relationship with brands entity',
      severity: 'high'
    },
    {
      type: 'data_type',
      entity: 'customers',
      field: 'addresses',
      issue: 'Using "any" type for structured data',
      suggestion: 'Change "any" type to "json" for better type safety',
      severity: 'medium'
    },
    {
      type: 'duplicate_entity',
      entity: 'stores',
      issue: 'Duplicate entity: both "stores" and "store" exist',
      suggestion: 'Remove "stores" entity and use "store" consistently',
      severity: 'high'
    }
  ];

  // Group by severity
  const groupedBySeverity = mockInconsistencies.reduce((groups, issue) => {
    if (!groups[issue.severity]) {
      groups[issue.severity] = [];
    }
    groups[issue.severity].push(issue);
    return groups;
  }, {} as Record<string, SchemaInconsistency[]>);

  for (const [severity, issues] of Object.entries(groupedBySeverity)) {
    for (const issue of issues) {
      // Process issues silently
    }
  }
}

/**
 * Runs all demo functions
 */
export function runAllDemos(): void {
  demoFieldNamingValidation();
  demoDataTypeValidation();
  demoRelationshipValidation();
  demoSchemaInconsistencies();
}

// Run demo if this file is executed directly
if (require.main === module) {
  runAllDemos();
}