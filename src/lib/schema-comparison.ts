/**
 * Schema Comparison Tools
 * 
 * This module provides utilities to compare schema versions, track changes,
 * and ensure consistency during schema migrations.
 */

import { type AppSchema } from '../../instant.schema';
import { type SchemaInconsistency, type EntityAnalysis, type FieldAnalysis } from './schema-analysis';

// Types for schema comparison
export interface SchemaChange {
  type: 'entity_added' | 'entity_removed' | 'entity_modified' | 'field_added' | 'field_removed' | 'field_modified' | 'relationship_added' | 'relationship_removed';
  entity: string;
  field?: string;
  oldValue?: any;
  newValue?: any;
  description: string;
  impact: 'breaking' | 'non-breaking' | 'enhancement';
}

export interface SchemaComparison {
  hasChanges: boolean;
  changes: SchemaChange[];
  summary: {
    entitiesAdded: number;
    entitiesRemoved: number;
    entitiesModified: number;
    fieldsAdded: number;
    fieldsRemoved: number;
    fieldsModified: number;
    relationshipsAdded: number;
    relationshipsRemoved: number;
  };
  breakingChanges: SchemaChange[];
  migrationRequired: boolean;
}

export interface SchemaSnapshot {
  timestamp: Date;
  version: string;
  entities: Record<string, EntitySnapshot>;
  relationships: Record<string, RelationshipSnapshot>;
  checksum: string;
}

export interface EntitySnapshot {
  name: string;
  fields: Record<string, FieldSnapshot>;
  fieldCount: number;
}

export interface FieldSnapshot {
  name: string;
  type: string;
  isOptional: boolean;
  isIndexed: boolean;
  isUnique: boolean;
  constraints?: any;
}

export interface RelationshipSnapshot {
  name: string;
  forward: {
    entity: string;
    cardinality: 'one' | 'many';
    label: string;
  };
  reverse: {
    entity: string;
    cardinality: 'one' | 'many';
    label: string;
  };
}

/**
 * Schema comparison and change tracking utilities
 */
export class SchemaComparator {
  /**
   * Compares two schema snapshots and identifies changes
   */
  public static compareSchemas(oldSchema: SchemaSnapshot, newSchema: SchemaSnapshot): SchemaComparison {
    const changes: SchemaChange[] = [];
    
    // Compare entities
    changes.push(...this.compareEntities(oldSchema.entities, newSchema.entities));
    
    // Compare relationships
    changes.push(...this.compareRelationships(oldSchema.relationships, newSchema.relationships));
    
    const summary = this.generateComparisonSummary(changes);
    const breakingChanges = changes.filter(change => change.impact === 'breaking');
    
    return {
      hasChanges: changes.length > 0,
      changes,
      summary,
      breakingChanges,
      migrationRequired: breakingChanges.length > 0
    };
  }

  /**
   * Compares entities between two schemas
   */
  private static compareEntities(oldEntities: Record<string, EntitySnapshot>, newEntities: Record<string, EntitySnapshot>): SchemaChange[] {
    const changes: SchemaChange[] = [];
    
    // Find added entities
    for (const entityName of Object.keys(newEntities)) {
      if (!oldEntities[entityName]) {
        changes.push({
          type: 'entity_added',
          entity: entityName,
          description: `Entity "${entityName}" was added`,
          impact: 'enhancement'
        });
      }
    }
    
    // Find removed entities
    for (const entityName of Object.keys(oldEntities)) {
      if (!newEntities[entityName]) {
        changes.push({
          type: 'entity_removed',
          entity: entityName,
          description: `Entity "${entityName}" was removed`,
          impact: 'breaking'
        });
      }
    }
    
    // Find modified entities
    for (const entityName of Object.keys(oldEntities)) {
      if (newEntities[entityName]) {
        const entityChanges = this.compareEntityFields(
          entityName,
          oldEntities[entityName].fields,
          newEntities[entityName].fields
        );
        changes.push(...entityChanges);
      }
    }
    
    return changes;
  }

  /**
   * Compares fields within an entity
   */
  private static compareEntityFields(entityName: string, oldFields: Record<string, FieldSnapshot>, newFields: Record<string, FieldSnapshot>): SchemaChange[] {
    const changes: SchemaChange[] = [];
    
    // Find added fields
    for (const fieldName of Object.keys(newFields)) {
      if (!oldFields[fieldName]) {
        changes.push({
          type: 'field_added',
          entity: entityName,
          field: fieldName,
          newValue: newFields[fieldName],
          description: `Field "${fieldName}" was added to entity "${entityName}"`,
          impact: 'enhancement'
        });
      }
    }
    
    // Find removed fields
    for (const fieldName of Object.keys(oldFields)) {
      if (!newFields[fieldName]) {
        changes.push({
          type: 'field_removed',
          entity: entityName,
          field: fieldName,
          oldValue: oldFields[fieldName],
          description: `Field "${fieldName}" was removed from entity "${entityName}"`,
          impact: 'breaking'
        });
      }
    }
    
    // Find modified fields
    for (const fieldName of Object.keys(oldFields)) {
      if (newFields[fieldName]) {
        const fieldChanges = this.compareField(entityName, fieldName, oldFields[fieldName], newFields[fieldName]);
        changes.push(...fieldChanges);
      }
    }
    
    return changes;
  }

  /**
   * Compares individual field properties
   */
  private static compareField(entityName: string, fieldName: string, oldField: FieldSnapshot, newField: FieldSnapshot): SchemaChange[] {
    const changes: SchemaChange[] = [];
    
    // Type change
    if (oldField.type !== newField.type) {
      changes.push({
        type: 'field_modified',
        entity: entityName,
        field: fieldName,
        oldValue: oldField.type,
        newValue: newField.type,
        description: `Field "${fieldName}" type changed from "${oldField.type}" to "${newField.type}"`,
        impact: this.determineTypeChangeImpact(oldField.type, newField.type)
      });
    }
    
    // Optional change
    if (oldField.isOptional !== newField.isOptional) {
      const impact = !oldField.isOptional && newField.isOptional ? 'non-breaking' : 'breaking';
      changes.push({
        type: 'field_modified',
        entity: entityName,
        field: fieldName,
        oldValue: oldField.isOptional,
        newValue: newField.isOptional,
        description: `Field "${fieldName}" optional status changed from ${oldField.isOptional} to ${newField.isOptional}`,
        impact
      });
    }
    
    // Index change
    if (oldField.isIndexed !== newField.isIndexed) {
      changes.push({
        type: 'field_modified',
        entity: entityName,
        field: fieldName,
        oldValue: oldField.isIndexed,
        newValue: newField.isIndexed,
        description: `Field "${fieldName}" index status changed from ${oldField.isIndexed} to ${newField.isIndexed}`,
        impact: 'enhancement'
      });
    }
    
    // Unique constraint change
    if (oldField.isUnique !== newField.isUnique) {
      const impact = !oldField.isUnique && newField.isUnique ? 'breaking' : 'non-breaking';
      changes.push({
        type: 'field_modified',
        entity: entityName,
        field: fieldName,
        oldValue: oldField.isUnique,
        newValue: newField.isUnique,
        description: `Field "${fieldName}" unique constraint changed from ${oldField.isUnique} to ${newField.isUnique}`,
        impact
      });
    }
    
    return changes;
  }

  /**
   * Determines the impact of a type change
   */
  private static determineTypeChangeImpact(oldType: string, newType: string): 'breaking' | 'non-breaking' | 'enhancement' {
    // Compatible type changes
    const compatibleChanges = [
      ['any', 'json'],
      ['string', 'json'],
      ['number', 'string'] // with proper conversion
    ];
    
    for (const [from, to] of compatibleChanges) {
      if (oldType === from && newType === to) {
        return 'enhancement';
      }
    }
    
    // Most type changes are breaking
    return 'breaking';
  }

  /**
   * Compares relationships between schemas
   */
  private static compareRelationships(oldRelationships: Record<string, RelationshipSnapshot>, newRelationships: Record<string, RelationshipSnapshot>): SchemaChange[] {
    const changes: SchemaChange[] = [];
    
    // Find added relationships
    for (const relationshipName of Object.keys(newRelationships)) {
      if (!oldRelationships[relationshipName]) {
        changes.push({
          type: 'relationship_added',
          entity: newRelationships[relationshipName].forward.entity,
          description: `Relationship "${relationshipName}" was added`,
          impact: 'enhancement'
        });
      }
    }
    
    // Find removed relationships
    for (const relationshipName of Object.keys(oldRelationships)) {
      if (!newRelationships[relationshipName]) {
        changes.push({
          type: 'relationship_removed',
          entity: oldRelationships[relationshipName].forward.entity,
          description: `Relationship "${relationshipName}" was removed`,
          impact: 'breaking'
        });
      }
    }
    
    return changes;
  }

  /**
   * Generates summary statistics for the comparison
   */
  private static generateComparisonSummary(changes: SchemaChange[]) {
    return {
      entitiesAdded: changes.filter(c => c.type === 'entity_added').length,
      entitiesRemoved: changes.filter(c => c.type === 'entity_removed').length,
      entitiesModified: changes.filter(c => c.type === 'entity_modified').length,
      fieldsAdded: changes.filter(c => c.type === 'field_added').length,
      fieldsRemoved: changes.filter(c => c.type === 'field_removed').length,
      fieldsModified: changes.filter(c => c.type === 'field_modified').length,
      relationshipsAdded: changes.filter(c => c.type === 'relationship_added').length,
      relationshipsRemoved: changes.filter(c => c.type === 'relationship_removed').length
    };
  }
}

/**
 * Schema snapshot utilities
 */
export class SchemaSnapshotManager {
  /**
   * Creates a snapshot of the current schema
   */
  public static createSnapshot(schema: AppSchema, version: string = '1.0.0'): SchemaSnapshot {
    const entities = this.snapshotEntities(schema);
    const relationships = this.snapshotRelationships(schema);
    const checksum = this.generateChecksum(entities, relationships);
    
    return {
      timestamp: new Date(),
      version,
      entities,
      relationships,
      checksum
    };
  }

  /**
   * Creates snapshots of all entities
   */
  private static snapshotEntities(schema: AppSchema): Record<string, EntitySnapshot> {
    const entities: Record<string, EntitySnapshot> = {};
    
    // This is a simplified implementation
    // In a real scenario, we'd need to properly parse the InstantDB schema
    const knownEntities = [
      'products', 'orders', 'orderitems', 'customers', 'items', 'inventory',
      'locations', 'brands', 'categories', 'types', 'vendors', 'collections',
      'cart', 'files', 'store', 'stores'
    ];
    
    for (const entityName of knownEntities) {
      if (schema.entities[entityName]) {
        entities[entityName] = this.snapshotEntity(entityName, schema.entities[entityName]);
      }
    }
    
    return entities;
  }

  /**
   * Creates a snapshot of a single entity
   */
  private static snapshotEntity(entityName: string, entityDef: any): EntitySnapshot {
    const fields = this.snapshotEntityFields(entityName);
    
    return {
      name: entityName,
      fields,
      fieldCount: Object.keys(fields).length
    };
  }

  /**
   * Creates snapshots of entity fields
   */
  private static snapshotEntityFields(entityName: string): Record<string, FieldSnapshot> {
    const fields: Record<string, FieldSnapshot> = {};
    
    // Simplified field extraction based on known schema patterns
    const knownFields = this.getKnownEntityFields(entityName);
    
    for (const fieldInfo of knownFields) {
      fields[fieldInfo.name] = {
        name: fieldInfo.name,
        type: fieldInfo.type,
        isOptional: fieldInfo.isOptional,
        isIndexed: fieldInfo.isIndexed,
        isUnique: fieldInfo.isUnique
      };
    }
    
    return fields;
  }

  /**
   * Gets known fields for an entity (simplified implementation)
   */
  private static getKnownEntityFields(entityName: string): FieldSnapshot[] {
    const fieldMappings: Record<string, FieldSnapshot[]> = {
      products: [
        { name: 'title', type: 'string', isOptional: true, isIndexed: false, isUnique: false },
        { name: 'brand', type: 'string', isOptional: true, isIndexed: false, isUnique: false },
        { name: 'category', type: 'string', isOptional: true, isIndexed: false, isUnique: false },
        { name: 'createdAt', type: 'date', isOptional: false, isIndexed: false, isUnique: false },
        { name: 'updatedAt', type: 'date', isOptional: true, isIndexed: false, isUnique: false }
      ],
      orders: [
        { name: 'createdat', type: 'date', isOptional: false, isIndexed: false, isUnique: false },
        { name: 'createdAt', type: 'date', isOptional: false, isIndexed: false, isUnique: false },
        { name: 'updatedat', type: 'date', isOptional: true, isIndexed: false, isUnique: false },
        { name: 'updatedAt', type: 'date', isOptional: true, isIndexed: false, isUnique: false },
        { name: 'orderNumber', type: 'string', isOptional: false, isIndexed: true, isUnique: true }
      ],
      orderitems: [
        { name: 'taxamt', type: 'number', isOptional: true, isIndexed: false, isUnique: false },
        { name: 'taxAmount', type: 'number', isOptional: true, isIndexed: false, isUnique: false },
        { name: 'varianttitle', type: 'string', isOptional: true, isIndexed: false, isUnique: false },
        { name: 'variantTitle', type: 'string', isOptional: true, isIndexed: false, isUnique: false }
      ]
    };
    
    return fieldMappings[entityName] || [];
  }

  /**
   * Creates snapshots of relationships
   */
  private static snapshotRelationships(schema: AppSchema): Record<string, RelationshipSnapshot> {
    const relationships: Record<string, RelationshipSnapshot> = {};
    
    for (const [linkName, linkDef] of Object.entries(schema.links || {})) {
      relationships[linkName] = {
        name: linkName,
        forward: {
          entity: linkDef.forward?.on || '',
          cardinality: linkDef.forward?.has || 'one',
          label: linkDef.forward?.label || ''
        },
        reverse: {
          entity: linkDef.reverse?.on || '',
          cardinality: linkDef.reverse?.has || 'one',
          label: linkDef.reverse?.label || ''
        }
      };
    }
    
    return relationships;
  }

  /**
   * Generates a checksum for the schema snapshot
   */
  private static generateChecksum(entities: Record<string, EntitySnapshot>, relationships: Record<string, RelationshipSnapshot>): string {
    const data = JSON.stringify({ entities, relationships });
    // Simple hash function (in production, use a proper hash library)
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  /**
   * Saves a schema snapshot to storage
   */
  public static async saveSnapshot(snapshot: SchemaSnapshot, filePath: string): Promise<void> {
    // In a real implementation, this would save to a file or database
  }

  /**
   * Loads a schema snapshot from storage
   */
  public static async loadSnapshot(filePath: string): Promise<SchemaSnapshot | null> {
    // In a real implementation, this would load from a file or database
    return null;
  }
}

/**
 * Migration planning utilities
 */
export class MigrationPlanner {
  /**
   * Generates a migration plan based on schema changes
   */
  public static generateMigrationPlan(comparison: SchemaComparison): MigrationPlan {
    const steps: MigrationStep[] = [];
    
    // Add steps for each change
    for (const change of comparison.changes) {
      const step = this.createMigrationStep(change);
      if (step) {
        steps.push(step);
      }
    }
    
    // Sort steps by priority (breaking changes first)
    steps.sort((a, b) => {
      const priorityOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    
    return {
      steps,
      estimatedDuration: this.estimateMigrationDuration(steps),
      requiresDowntime: steps.some(step => step.requiresDowntime),
      rollbackPlan: this.generateRollbackPlan(steps)
    };
  }

  /**
   * Creates a migration step for a schema change
   */
  private static createMigrationStep(change: SchemaChange): MigrationStep | null {
    switch (change.type) {
      case 'field_removed':
        return {
          id: `remove_field_${change.entity}_${change.field}`,
          description: change.description,
          type: 'field_removal',
          entity: change.entity,
          field: change.field,
          priority: 'critical',
          requiresDowntime: true,
          sql: `-- Remove field ${change.field} from ${change.entity}`,
          rollback: `-- Add field ${change.field} back to ${change.entity}`
        };
      
      case 'field_added':
        return {
          id: `add_field_${change.entity}_${change.field}`,
          description: change.description,
          type: 'field_addition',
          entity: change.entity,
          field: change.field,
          priority: 'low',
          requiresDowntime: false,
          sql: `-- Add field ${change.field} to ${change.entity}`,
          rollback: `-- Remove field ${change.field} from ${change.entity}`
        };
      
      case 'field_modified':
        return {
          id: `modify_field_${change.entity}_${change.field}`,
          description: change.description,
          type: 'field_modification',
          entity: change.entity,
          field: change.field,
          priority: change.impact === 'breaking' ? 'high' : 'medium',
          requiresDowntime: change.impact === 'breaking',
          sql: `-- Modify field ${change.field} in ${change.entity}`,
          rollback: `-- Revert field ${change.field} in ${change.entity}`
        };
      
      default:
        return null;
    }
  }

  /**
   * Estimates migration duration based on steps
   */
  private static estimateMigrationDuration(steps: MigrationStep[]): number {
    // Simple estimation: 5 minutes per step
    return steps.length * 5;
  }

  /**
   * Generates rollback plan
   */
  private static generateRollbackPlan(steps: MigrationStep[]): string[] {
    return steps.reverse().map(step => step.rollback);
  }
}

// Additional types for migration planning
export interface MigrationPlan {
  steps: MigrationStep[];
  estimatedDuration: number; // in minutes
  requiresDowntime: boolean;
  rollbackPlan: string[];
}

export interface MigrationStep {
  id: string;
  description: string;
  type: 'field_addition' | 'field_removal' | 'field_modification' | 'entity_addition' | 'entity_removal';
  entity: string;
  field?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  requiresDowntime: boolean;
  sql: string;
  rollback: string;
}