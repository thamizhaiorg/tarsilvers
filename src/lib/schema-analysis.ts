/**
 * Schema Analysis and Validation Utilities
 * 
 * This module provides utilities to analyze the current InstantDB schema structure,
 * identify inconsistencies, and validate field naming patterns, data types, and relationships.
 */

// Import schema conditionally to avoid Jest issues
let schema: any;
let AppSchema: any;

try {
  const schemaModule = require('../../instant.schema');
  schema = schemaModule.default;
  AppSchema = schemaModule.AppSchema;
} catch (error) {
  // Schema not available (e.g., in test environment)
  schema = null;
  AppSchema = null;
}

// Types for schema analysis
export interface SchemaInconsistency {
  type: 'field_naming' | 'duplicate_field' | 'data_type' | 'missing_relationship' | 'duplicate_entity';
  entity: string;
  field?: string;
  issue: string;
  suggestion: string;
  severity: 'low' | 'medium' | 'high';
}

export interface FieldAnalysis {
  name: string;
  type: string;
  isOptional: boolean;
  isIndexed: boolean;
  isUnique: boolean;
  entity: string;
}

export interface EntityAnalysis {
  name: string;
  fieldCount: number;
  fields: FieldAnalysis[];
  relationships: string[];
  inconsistencies: SchemaInconsistency[];
}

export interface SchemaAnalysisReport {
  totalEntities: number;
  totalFields: number;
  totalRelationships: number;
  inconsistencies: SchemaInconsistency[];
  entities: EntityAnalysis[];
  summary: {
    fieldNamingIssues: number;
    duplicateFields: number;
    dataTypeIssues: number;
    missingRelationships: number;
    duplicateEntities: number;
  };
}

/**
 * Analyzes the current schema structure and identifies inconsistencies
 */
export class SchemaAnalyzer {
  private schema: AppSchema;
  private inconsistencies: SchemaInconsistency[] = [];

  constructor(schemaInstance: AppSchema = schema) {
    this.schema = schemaInstance;
  }

  /**
   * Performs a comprehensive analysis of the schema
   */
  public analyzeSchema(): SchemaAnalysisReport {
    this.inconsistencies = [];
    
    const entities = this.analyzeEntities();
    const relationships = this.analyzeRelationships();
    
    // Detect duplicate entities
    this.detectDuplicateEntities();
    
    return {
      totalEntities: entities.length,
      totalFields: entities.reduce((sum, entity) => sum + entity.fieldCount, 0),
      totalRelationships: relationships.length,
      inconsistencies: this.inconsistencies,
      entities,
      summary: this.generateSummary()
    };
  }

  /**
   * Analyzes all entities in the schema
   */
  private analyzeEntities(): EntityAnalysis[] {
    const entities: EntityAnalysis[] = [];
    
    for (const [entityName, entityDef] of Object.entries(this.schema.entities)) {
      const analysis = this.analyzeEntity(entityName, entityDef);
      entities.push(analysis);
    }
    
    return entities;
  }

  /**
   * Analyzes a single entity
   */
  private analyzeEntity(entityName: string, entityDef: any): EntityAnalysis {
    const fields = this.extractFields(entityName, entityDef);
    const relationships = this.getEntityRelationships(entityName);
    const inconsistencies = this.findEntityInconsistencies(entityName, fields);
    
    return {
      name: entityName,
      fieldCount: fields.length,
      fields,
      relationships,
      inconsistencies
    };
  }

  /**
   * Extracts field information from an entity definition
   */
  private extractFields(entityName: string, entityDef: any): FieldAnalysis[] {
    const fields: FieldAnalysis[] = [];
    
    // This is a simplified extraction - in a real implementation,
    // we'd need to parse the InstantDB entity definition more thoroughly
    const fieldNames = this.getEntityFieldNames(entityName);
    
    for (const fieldName of fieldNames) {
      fields.push({
        name: fieldName,
        type: this.inferFieldType(entityName, fieldName),
        isOptional: this.isFieldOptional(entityName, fieldName),
        isIndexed: this.isFieldIndexed(entityName, fieldName),
        isUnique: this.isFieldUnique(entityName, fieldName),
        entity: entityName
      });
    }
    
    return fields;
  }

  /**
   * Gets field names for an entity (simplified implementation)
   */
  private getEntityFieldNames(entityName: string): string[] {
    // This would need to be implemented based on the actual schema structure
    // For now, we'll use known field names from the schema analysis
    const knownFields: Record<string, string[]> = {
      orders: ['createdat', 'createdAt', 'updatedat', 'updatedAt', 'billaddrs', 'billingAddress', 'shipaddrs', 'shippingAddress', 'tax', 'taxAmount'],
      orderitems: ['taxamt', 'taxAmount', 'taxrate', 'taxRate', 'varianttitle', 'variantTitle'],
      products: ['title', 'brand', 'category', 'type', 'vendor', 'createdAt', 'updatedAt'],
      customers: ['addresses', 'defaultAddress', 'email', 'name'],
      items: ['metafields', 'barcode', 'sku', 'price', 'cost']
    };
    
    return knownFields[entityName] || [];
  }

  /**
   * Infers field type based on known patterns
   */
  private inferFieldType(entityName: string, fieldName: string): string {
    // Simplified type inference
    if (fieldName.includes('At') || fieldName.includes('date')) return 'date';
    if (fieldName.includes('price') || fieldName.includes('cost') || fieldName.includes('amount')) return 'number';
    if (fieldName.includes('Address') || fieldName === 'addresses') return 'json';
    if (fieldName === 'metafields') return 'any';
    return 'string';
  }

  /**
   * Checks if a field is optional
   */
  private isFieldOptional(entityName: string, fieldName: string): boolean {
    // Most fields are optional in the current schema
    const requiredFields = ['storeId', 'title', 'name', 'orderNumber'];
    return !requiredFields.includes(fieldName);
  }

  /**
   * Checks if a field is indexed
   */
  private isFieldIndexed(entityName: string, fieldName: string): boolean {
    const indexedFields = ['storeId', 'orderNumber', 'status', 'email', 'sku'];
    return indexedFields.includes(fieldName);
  }

  /**
   * Checks if a field is unique
   */
  private isFieldUnique(entityName: string, fieldName: string): boolean {
    const uniqueFields = ['orderNumber', 'email', 'sku'];
    return uniqueFields.includes(fieldName);
  }

  /**
   * Finds inconsistencies in an entity
   */
  private findEntityInconsistencies(entityName: string, fields: FieldAnalysis[]): SchemaInconsistency[] {
    const inconsistencies: SchemaInconsistency[] = [];
    
    // Check for field naming inconsistencies
    inconsistencies.push(...this.checkFieldNaming(entityName, fields));
    
    // Check for duplicate fields
    inconsistencies.push(...this.checkDuplicateFields(entityName, fields));
    
    // Check for data type inconsistencies
    inconsistencies.push(...this.checkDataTypes(entityName, fields));
    
    // Check for missing relationships
    inconsistencies.push(...this.checkMissingRelationships(entityName, fields));
    
    // Add to global inconsistencies
    this.inconsistencies.push(...inconsistencies);
    
    return inconsistencies;
  }

  /**
   * Checks for field naming inconsistencies
   */
  private checkFieldNaming(entityName: string, fields: FieldAnalysis[]): SchemaInconsistency[] {
    const inconsistencies: SchemaInconsistency[] = [];
    
    for (const field of fields) {
      // Check for createdat vs createdAt
      if (field.name === 'createdat') {
        inconsistencies.push({
          type: 'field_naming',
          entity: entityName,
          field: field.name,
          issue: 'Inconsistent timestamp field naming',
          suggestion: 'Rename "createdat" to "createdAt" for consistency',
          severity: 'medium'
        });
      }
      
      // Check for updatedat vs updatedAt
      if (field.name === 'updatedat') {
        inconsistencies.push({
          type: 'field_naming',
          entity: entityName,
          field: field.name,
          issue: 'Inconsistent timestamp field naming',
          suggestion: 'Rename "updatedat" to "updatedAt" for consistency',
          severity: 'medium'
        });
      }
      
      // Check for address field inconsistencies
      if (field.name === 'billaddrs') {
        inconsistencies.push({
          type: 'field_naming',
          entity: entityName,
          field: field.name,
          issue: 'Inconsistent address field naming',
          suggestion: 'Rename "billaddrs" to "billingAddress" for consistency',
          severity: 'medium'
        });
      }
      
      if (field.name === 'shipaddrs') {
        inconsistencies.push({
          type: 'field_naming',
          entity: entityName,
          field: field.name,
          issue: 'Inconsistent address field naming',
          suggestion: 'Rename "shipaddrs" to "shippingAddress" for consistency',
          severity: 'medium'
        });
      }
    }
    
    return inconsistencies;
  }

  /**
   * Checks for duplicate fields
   */
  private checkDuplicateFields(entityName: string, fields: FieldAnalysis[]): SchemaInconsistency[] {
    const inconsistencies: SchemaInconsistency[] = [];
    
    // Known duplicate field patterns
    const duplicatePatterns = [
      { old: 'taxamt', new: 'taxAmount' },
      { old: 'taxrate', new: 'taxRate' },
      { old: 'varianttitle', new: 'variantTitle' }
    ];
    
    for (const pattern of duplicatePatterns) {
      const hasOld = fields.some(f => f.name === pattern.old);
      const hasNew = fields.some(f => f.name === pattern.new);
      
      if (hasOld && hasNew) {
        inconsistencies.push({
          type: 'duplicate_field',
          entity: entityName,
          field: pattern.old,
          issue: `Duplicate field: both "${pattern.old}" and "${pattern.new}" exist`,
          suggestion: `Remove "${pattern.old}" and use "${pattern.new}" consistently`,
          severity: 'high'
        });
      }
    }
    
    return inconsistencies;
  }

  /**
   * Checks for data type inconsistencies
   */
  private checkDataTypes(entityName: string, fields: FieldAnalysis[]): SchemaInconsistency[] {
    const inconsistencies: SchemaInconsistency[] = [];
    
    for (const field of fields) {
      // Check for inappropriate use of 'any' type
      if (field.type === 'any' && field.name === 'metafields') {
        inconsistencies.push({
          type: 'data_type',
          entity: entityName,
          field: field.name,
          issue: 'Using "any" type for structured data',
          suggestion: 'Change "any" type to "json" for better type safety',
          severity: 'medium'
        });
      }
      
      // Check for address fields that should be json
      if ((field.name.includes('address') || field.name.includes('addrs')) && field.type !== 'json') {
        inconsistencies.push({
          type: 'data_type',
          entity: entityName,
          field: field.name,
          issue: 'Address field should use structured type',
          suggestion: 'Change to "json" type for structured address data',
          severity: 'medium'
        });
      }
    }
    
    return inconsistencies;
  }

  /**
   * Checks for missing relationships
   */
  private checkMissingRelationships(entityName: string, fields: FieldAnalysis[]): SchemaInconsistency[] {
    const inconsistencies: SchemaInconsistency[] = [];
    
    if (entityName === 'products') {
      // Check for string fields that should be relationships
      const relationshipFields = ['brand', 'category', 'type', 'vendor'];
      
      for (const fieldName of relationshipFields) {
        const field = fields.find(f => f.name === fieldName);
        if (field && field.type === 'string') {
          inconsistencies.push({
            type: 'missing_relationship',
            entity: entityName,
            field: fieldName,
            issue: `Field "${fieldName}" stores string instead of relationship`,
            suggestion: `Convert to "${fieldName}Id" relationship with ${fieldName}s entity`,
            severity: 'high'
          });
        }
      }
    }
    
    return inconsistencies;
  }

  /**
   * Analyzes relationships in the schema
   */
  private analyzeRelationships(): string[] {
    return Object.keys(this.schema.links || {});
  }

  /**
   * Gets relationships for a specific entity
   */
  private getEntityRelationships(entityName: string): string[] {
    const relationships: string[] = [];
    
    for (const [linkName, linkDef] of Object.entries(this.schema.links || {})) {
      if (linkDef.forward?.on === entityName || linkDef.reverse?.on === entityName) {
        relationships.push(linkName);
      }
    }
    
    return relationships;
  }

  /**
   * Detects duplicate entities
   */
  private detectDuplicateEntities(): void {
    // Check for stores vs store duplication
    if (this.schema.entities.stores && this.schema.entities.store) {
      this.inconsistencies.push({
        type: 'duplicate_entity',
        entity: 'stores',
        issue: 'Duplicate entity: both "stores" and "store" exist',
        suggestion: 'Remove "stores" entity and use "store" consistently',
        severity: 'high'
      });
    }
  }

  /**
   * Generates summary statistics
   */
  private generateSummary() {
    return {
      fieldNamingIssues: this.inconsistencies.filter(i => i.type === 'field_naming').length,
      duplicateFields: this.inconsistencies.filter(i => i.type === 'duplicate_field').length,
      dataTypeIssues: this.inconsistencies.filter(i => i.type === 'data_type').length,
      missingRelationships: this.inconsistencies.filter(i => i.type === 'missing_relationship').length,
      duplicateEntities: this.inconsistencies.filter(i => i.type === 'duplicate_entity').length
    };
  }
}

/**
 * Validation utilities for schema changes
 */
export class SchemaValidator {
  /**
   * Validates field naming patterns
   */
  public static validateFieldNaming(fieldName: string): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Check camelCase convention
    if (!/^[a-z][a-zA-Z0-9]*$/.test(fieldName)) {
      issues.push('Field name should use camelCase convention');
    }
    
    // Check for common inconsistencies
    if (fieldName.includes('_')) {
      issues.push('Field name should not contain underscores');
    }
    
    if (fieldName.endsWith('at') && !fieldName.endsWith('At')) {
      issues.push('Timestamp fields should end with "At" (e.g., createdAt)');
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Validates data type consistency
   */
  public static validateDataType(fieldName: string, dataType: string): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Check for appropriate use of 'any' type
    if (dataType === 'any') {
      issues.push('Consider using "json" instead of "any" for structured data');
    }
    
    // Check timestamp fields
    if ((fieldName.includes('At') || fieldName.includes('date')) && dataType !== 'date') {
      issues.push('Timestamp fields should use "date" type');
    }
    
    // Check price/amount fields
    if ((fieldName.includes('price') || fieldName.includes('amount') || fieldName.includes('cost')) && dataType !== 'number') {
      issues.push('Price and amount fields should use "number" type');
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Validates relationship consistency
   */
  public static validateRelationship(entityName: string, fieldName: string, relatedEntity: string): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Check ID field naming
    if (!fieldName.endsWith('Id')) {
      issues.push('Relationship fields should end with "Id"');
    }
    
    // Check if related entity exists (simplified check)
    const commonEntities = ['products', 'orders', 'customers', 'items', 'locations', 'brands', 'categories', 'types', 'vendors'];
    if (!commonEntities.includes(relatedEntity)) {
      issues.push(`Related entity "${relatedEntity}" may not exist`);
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }
}