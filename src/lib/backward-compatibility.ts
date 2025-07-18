/**
 * Backward Compatibility Layer
 * 
 * This module provides fallback queries and data transformation middleware
 * to maintain compatibility with legacy field access during schema migration.
 */

import { db } from './instant';

// Migration status tracking
export interface MigrationStatus {
  storeId: string;
  entity: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  recordsTotal: number;
  recordsMigrated: number;
  recordsFailed: number;
  lastError?: string;
  version: string;
}

// Legacy field mappings for backward compatibility
export const LEGACY_FIELD_MAPPINGS = {
  products: {
    createdat: 'createdAt',
    updatedat: 'updatedAt',
    name: 'title',
    brand: 'brandId',
    category: 'categoryId',
    type: 'typeId',
    vendor: 'vendorId',
    collection: 'collectionId',
  },
  orders: {
    createdat: 'createdAt',
    updatedat: 'updatedAt',
    referid: 'referenceId',
    billaddrs: 'billingAddress',
    shipaddrs: 'shippingAddress',
    taxamt: 'taxAmount',
    discount: 'discountAmount',
    fulfill: 'fulfillmentStatus',
  },
  orderitems: {
    qty: 'quantity',
    total: 'lineTotal',
    taxamt: 'taxAmount',
    taxrate: 'taxRate',
    varianttitle: 'variantTitle',
  },
  customers: {
    createdat: 'createdAt',
    updatedat: 'updatedAt',
  },
  items: {
    createdat: 'createdAt',
    updatedat: 'updatedAt',
  },
} as const;

/**
 * Migration status storage with enhanced persistence and tracking
 */
class MigrationStatusManager {
  private statuses = new Map<string, MigrationStatus>();
  private persistenceEnabled = false;
  
  constructor() {
    this.loadPersistedStatuses();
  }
  
  getStatus(storeId: string, entity: string): MigrationStatus | null {
    const key = `${storeId}:${entity}`;
    return this.statuses.get(key) || null;
  }
  
  setStatus(status: MigrationStatus): void {
    const key = `${status.storeId}:${status.entity}`;
    this.statuses.set(key, status);
    
    if (this.persistenceEnabled) {
      this.persistStatus(status);
    }
  }
  
  getAllStatuses(storeId: string): MigrationStatus[] {
    return Array.from(this.statuses.values()).filter(status => status.storeId === storeId);
  }
  
  isEntityMigrated(storeId: string, entity: string): boolean {
    const status = this.getStatus(storeId, entity);
    return status?.status === 'completed';
  }
  
  isStoreMigrated(storeId: string): boolean {
    const entities = ['products', 'orders', 'orderitems', 'customers', 'items'];
    return entities.every(entity => this.isEntityMigrated(storeId, entity));
  }
  
  /**
   * Enable persistence of migration statuses
   */
  enablePersistence(): void {
    this.persistenceEnabled = true;
  }
  
  /**
   * Disable persistence of migration statuses
   */
  disablePersistence(): void {
    this.persistenceEnabled = false;
  }
  
  /**
   * Load persisted migration statuses from storage
   */
  private async loadPersistedStatuses(): Promise<void> {
    try {
      // In a real implementation, this would load from AsyncStorage or database
      // For now, we'll use a simple in-memory approach
    } catch (error) {
      // Failed to load persisted migration statuses
    }
  }
  
  /**
   * Persist migration status to storage
   */
  private async persistStatus(status: MigrationStatus): Promise<void> {
    try {
      // In a real implementation, this would save to AsyncStorage or database
    } catch (error) {
      // Failed to persist migration status
    }
  }
  
  /**
   * Clear all migration statuses for a store
   */
  clearStoreStatuses(storeId: string): void {
    const keys = Array.from(this.statuses.keys()).filter(key => key.startsWith(`${storeId}:`));
    keys.forEach(key => this.statuses.delete(key));
  }
  
  /**
   * Get migration statistics
   */
  getStatistics(): {
    totalStores: number;
    totalEntities: number;
    completedMigrations: number;
    failedMigrations: number;
    inProgressMigrations: number;
  } {
    const allStatuses = Array.from(this.statuses.values());
    const uniqueStores = new Set(allStatuses.map(s => s.storeId));
    
    return {
      totalStores: uniqueStores.size,
      totalEntities: allStatuses.length,
      completedMigrations: allStatuses.filter(s => s.status === 'completed').length,
      failedMigrations: allStatuses.filter(s => s.status === 'failed').length,
      inProgressMigrations: allStatuses.filter(s => s.status === 'in_progress').length,
    };
  }
}

export const migrationStatusManager = new MigrationStatusManager();

/**
 * Transform query results to include legacy field names for backward compatibility
 */
export function addLegacyFields<T extends Record<string, any>>(
  entity: string,
  records: T[]
): T[] {
  const mappings = LEGACY_FIELD_MAPPINGS[entity as keyof typeof LEGACY_FIELD_MAPPINGS];
  if (!mappings) return records;
  
  return records.map(record => {
    const enhanced = { ...record };
    
    // Add legacy field names that map to new field names
    for (const [legacyField, newField] of Object.entries(mappings)) {
      if (enhanced[newField] !== undefined && enhanced[legacyField] === undefined) {
        enhanced[legacyField] = enhanced[newField];
      }
    }
    
    return enhanced;
  });
}

/**
 * Transform input data to use new field names
 */
export function transformLegacyInput<T extends Record<string, any>>(
  entity: string,
  input: T
): T {
  const mappings = LEGACY_FIELD_MAPPINGS[entity as keyof typeof LEGACY_FIELD_MAPPINGS];
  if (!mappings) return input;
  
  const transformed = { ...input };
  
  // Convert legacy field names to new field names
  for (const [legacyField, newField] of Object.entries(mappings)) {
    if (transformed[legacyField] !== undefined) {
      // If new field doesn't exist, use legacy field value
      if (transformed[newField] === undefined) {
        transformed[newField] = transformed[legacyField];
      }
      // Always remove legacy field after transformation
      delete transformed[legacyField];
    }
  }
  
  return transformed;
}

/**
 * Backward compatible query wrapper for products
 */
export async function queryProducts(storeId: string, options: {
  where?: Record<string, any>;
  limit?: number;
  includeLegacyFields?: boolean;
} = {}) {
  const { where = {}, limit, includeLegacyFields = true } = options;
  
  // Transform legacy field names in where clause
  const transformedWhere = transformLegacyInput('products', { ...where, storeId });
  
  // Execute query
  const { data } = await db.query({
    products: { 
      $: { 
        where: transformedWhere,
        ...(limit && { limit })
      } 
    },
  });
  
  const products = data.products || [];
  
  // Add legacy fields if requested and not fully migrated
  if (includeLegacyFields && !migrationStatusManager.isEntityMigrated(storeId, 'products')) {
    return addLegacyFields('products', products);
  }
  
  return products;
}

/**
 * Backward compatible query wrapper for orders
 */
export async function queryOrders(storeId: string, options: {
  where?: Record<string, any>;
  limit?: number;
  includeLegacyFields?: boolean;
} = {}) {
  const { where = {}, limit, includeLegacyFields = true } = options;
  
  // Transform legacy field names in where clause
  const transformedWhere = transformLegacyInput('orders', { ...where, storeId });
  
  // Execute query
  const { data } = await db.query({
    orders: { 
      $: { 
        where: transformedWhere,
        ...(limit && { limit })
      } 
    },
  });
  
  const orders = data.orders || [];
  
  // Add legacy fields if requested and not fully migrated
  if (includeLegacyFields && !migrationStatusManager.isEntityMigrated(storeId, 'orders')) {
    return addLegacyFields('orders', orders);
  }
  
  return orders;
}

/**
 * Backward compatible query wrapper for order items
 */
export async function queryOrderItems(storeId: string, options: {
  where?: Record<string, any>;
  limit?: number;
  includeLegacyFields?: boolean;
} = {}) {
  const { where = {}, limit, includeLegacyFields = true } = options;
  
  // Transform legacy field names in where clause
  const transformedWhere = transformLegacyInput('orderitems', { ...where, storeId });
  
  // Execute query
  const { data } = await db.query({
    orderitems: { 
      $: { 
        where: transformedWhere,
        ...(limit && { limit })
      } 
    },
  });
  
  const orderItems = data.orderitems || [];
  
  // Add legacy fields if requested and not fully migrated
  if (includeLegacyFields && !migrationStatusManager.isEntityMigrated(storeId, 'orderitems')) {
    return addLegacyFields('orderitems', orderItems);
  }
  
  return orderItems;
}

/**
 * Backward compatible query wrapper for customers
 */
export async function queryCustomers(storeId: string, options: {
  where?: Record<string, any>;
  limit?: number;
  includeLegacyFields?: boolean;
} = {}) {
  const { where = {}, limit, includeLegacyFields = true } = options;
  
  // Transform legacy field names in where clause
  const transformedWhere = transformLegacyInput('customers', { ...where, storeId });
  
  // Execute query
  const { data } = await db.query({
    customers: { 
      $: { 
        where: transformedWhere,
        ...(limit && { limit })
      } 
    },
  });
  
  const customers = data.customers || [];
  
  // Add legacy fields if requested and not fully migrated
  if (includeLegacyFields && !migrationStatusManager.isEntityMigrated(storeId, 'customers')) {
    return addLegacyFields('customers', customers);
  }
  
  return customers;
}

/**
 * Backward compatible update wrapper
 */
export async function updateRecord(
  entity: string,
  recordId: string,
  updates: Record<string, any>
) {
  // Transform legacy field names in updates
  const transformedUpdates = transformLegacyInput(entity, updates);
  
  // Execute update
  await db.transact([
    db.tx[entity][recordId].update(transformedUpdates),
  ]);
}

/**
 * Backward compatible create wrapper
 */
export async function createRecord(
  entity: string,
  data: Record<string, any>
) {
  // Transform legacy field names in data
  const transformedData = transformLegacyInput(entity, data);
  
  // Execute create
  const result = await db.transact([
    db.tx[entity][db.id()].update(transformedData),
  ]);
  
  return result;
}

/**
 * Enhanced migration rollback capabilities with versioning and validation
 */
export class MigrationRollback {
  private backups = new Map<string, BackupData>();
  private rollbackHistory = new Map<string, RollbackHistoryEntry[]>();
  
  /**
   * Create backup before migration with metadata
   */
  async createBackup(storeId: string, entity: string, options: {
    version?: string;
    description?: string;
    validateIntegrity?: boolean;
  } = {}): Promise<void> {
    const { version = '1.0.0', description, validateIntegrity = true } = options;
    
    const { data } = await db.query({
      [entity]: { $: { where: { storeId } } },
    });
    
    const records = data[entity] || [];
    const backupKey = `${storeId}:${entity}`;
    
    // Validate data integrity if requested
    if (validateIntegrity) {
      await this.validateBackupIntegrity(entity, records);
    }
    
    const backupData: BackupData = {
      storeId,
      entity,
      records,
      metadata: {
        version,
        description,
        createdAt: new Date(),
        recordCount: records.length,
        checksum: this.calculateChecksum(records),
      },
    };
    
    this.backups.set(backupKey, backupData);
  }
  
  /**
   * Restore from backup with validation and rollback tracking
   */
  async restoreFromBackup(storeId: string, entity: string, options: {
    validateBeforeRestore?: boolean;
    createRestorePoint?: boolean;
  } = {}): Promise<void> {
    const { validateBeforeRestore = true, createRestorePoint = true } = options;
    const backupKey = `${storeId}:${entity}`;
    const backup = this.backups.get(backupKey);
    
    if (!backup) {
      throw new Error(`No backup found for ${entity} in store ${storeId}`);
    }
    
    // Create restore point before rollback
    if (createRestorePoint) {
      await this.createRestorePoint(storeId, entity);
    }
    
    // Validate backup integrity
    if (validateBeforeRestore) {
      await this.validateBackupIntegrity(entity, backup.records);
      
      const currentChecksum = this.calculateChecksum(backup.records);
      if (currentChecksum !== backup.metadata.checksum) {
        throw new Error(`Backup integrity check failed for ${entity} in store ${storeId}`);
      }
    }
    
    try {
      // Delete current records
      const { data } = await db.query({
        [entity]: { $: { where: { storeId } } },
      });
      
      const currentRecords = data[entity] || [];
      const deleteTransactions = currentRecords.map(record => 
        db.tx[entity][record.id].delete()
      );
      
      if (deleteTransactions.length > 0) {
        await db.transact(deleteTransactions);
      }
      
      // Restore backup records in batches
      const batchSize = 100;
      for (let i = 0; i < backup.records.length; i += batchSize) {
        const batch = backup.records.slice(i, i + batchSize);
        const restoreTransactions = batch.map(record => 
          db.tx[entity][record.id].update(record)
        );
        
        if (restoreTransactions.length > 0) {
          await db.transact(restoreTransactions);
        }
      }
      
      // Record rollback in history
      this.recordRollback(storeId, entity, backup.metadata.version);
      
    } catch (error) {
      throw new Error(`Rollback failed for ${entity} in store ${storeId}: ${error}`);
    }
  }
  
  /**
   * Create a restore point before performing rollback
   */
  private async createRestorePoint(storeId: string, entity: string): Promise<void> {
    const restorePointKey = `${storeId}:${entity}:restore_point`;
    
    const { data } = await db.query({
      [entity]: { $: { where: { storeId } } },
    });
    
    const records = data[entity] || [];
    
    const restorePointData: BackupData = {
      storeId,
      entity,
      records,
      metadata: {
        version: 'restore_point',
        description: 'Automatic restore point before rollback',
        createdAt: new Date(),
        recordCount: records.length,
        checksum: this.calculateChecksum(records),
      },
    };
    
    this.backups.set(restorePointKey, restorePointData);
  }
  
  /**
   * Validate backup data integrity
   */
  private async validateBackupIntegrity(entity: string, records: any[]): Promise<void> {
    const requiredFields = this.getRequiredFields(entity);
    
    for (const record of records) {
      for (const field of requiredFields) {
        if (record[field] === undefined || record[field] === null) {
          throw new Error(`Missing required field '${field}' in ${entity} record ${record.id}`);
        }
      }
    }
  }
  
  /**
   * Get required fields for entity validation
   */
  private getRequiredFields(entity: string): string[] {
    const requiredFieldsMap: Record<string, string[]> = {
      products: ['id', 'storeId', 'title'],
      orders: ['id', 'storeId', 'orderNumber', 'total'],
      orderitems: ['id', 'orderId', 'storeId', 'title', 'quantity', 'price'],
      customers: ['id', 'storeId', 'name'],
      items: ['id', 'storeId', 'productId', 'sku'],
    };
    
    return requiredFieldsMap[entity] || ['id', 'storeId'];
  }
  
  /**
   * Calculate checksum for data integrity
   */
  private calculateChecksum(records: any[]): string {
    const dataString = JSON.stringify(records.sort((a, b) => a.id.localeCompare(b.id)));
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }
  
  /**
   * Record rollback operation in history
   */
  private recordRollback(storeId: string, entity: string, version: string): void {
    const historyKey = `${storeId}:${entity}`;
    const history = this.rollbackHistory.get(historyKey) || [];
    
    const entry: RollbackHistoryEntry = {
      timestamp: new Date(),
      version,
      action: 'rollback',
      success: true,
    };
    
    history.push(entry);
    this.rollbackHistory.set(historyKey, history);
  }
  
  /**
   * Get rollback history for an entity
   */
  getRollbackHistory(storeId: string, entity: string): RollbackHistoryEntry[] {
    const historyKey = `${storeId}:${entity}`;
    return this.rollbackHistory.get(historyKey) || [];
  }
  
  /**
   * Clear backup with confirmation
   */
  clearBackup(storeId: string, entity: string, options: {
    force?: boolean;
  } = {}): void {
    const { force = false } = options;
    const backupKey = `${storeId}:${entity}`;
    const backup = this.backups.get(backupKey);
    
    if (!backup && !force) {
      throw new Error(`No backup found for ${entity} in store ${storeId}`);
    }
    
    this.backups.delete(backupKey);
    
    // Also clear restore point if it exists
    const restorePointKey = `${backupKey}:restore_point`;
    this.backups.delete(restorePointKey);
  }
  
  /**
   * List available backups with metadata
   */
  listBackups(): BackupInfo[] {
    return Array.from(this.backups.entries())
      .filter(([key]) => !key.includes(':restore_point'))
      .map(([key, backup]) => {
        const [storeId, entity] = key.split(':');
        return {
          storeId,
          entity,
          recordCount: backup.metadata.recordCount,
          version: backup.metadata.version,
          createdAt: backup.metadata.createdAt,
          description: backup.metadata.description,
          checksum: backup.metadata.checksum,
        };
      });
  }
  
  /**
   * Get backup details
   */
  getBackupDetails(storeId: string, entity: string): BackupData | null {
    const backupKey = `${storeId}:${entity}`;
    return this.backups.get(backupKey) || null;
  }
  
  /**
   * Verify backup exists and is valid
   */
  verifyBackup(storeId: string, entity: string): {
    exists: boolean;
    valid: boolean;
    issues: string[];
  } {
    const backup = this.getBackupDetails(storeId, entity);
    const issues: string[] = [];
    
    if (!backup) {
      return { exists: false, valid: false, issues: ['Backup does not exist'] };
    }
    
    // Check data integrity
    const currentChecksum = this.calculateChecksum(backup.records);
    if (currentChecksum !== backup.metadata.checksum) {
      issues.push('Checksum mismatch - backup may be corrupted');
    }
    
    // Check required fields
    try {
      this.validateBackupIntegrity(entity, backup.records);
    } catch (error) {
      issues.push(`Data validation failed: ${error}`);
    }
    
    return {
      exists: true,
      valid: issues.length === 0,
      issues,
    };
  }
}

// Supporting interfaces
interface BackupData {
  storeId: string;
  entity: string;
  records: any[];
  metadata: {
    version: string;
    description?: string;
    createdAt: Date;
    recordCount: number;
    checksum: string;
  };
}

interface BackupInfo {
  storeId: string;
  entity: string;
  recordCount: number;
  version: string;
  createdAt: Date;
  description?: string;
  checksum: string;
}

interface RollbackHistoryEntry {
  timestamp: Date;
  version: string;
  action: 'rollback' | 'restore';
  success: boolean;
  error?: string;
}

export const migrationRollback = new MigrationRollback();

/**
 * Migration status tracking functions
 */
export async function initializeMigrationStatus(storeId: string): Promise<void> {
  const entities = ['products', 'orders', 'orderitems', 'customers', 'items'];
  
  for (const entity of entities) {
    // Get record count for the entity
    const { data } = await db.query({
      [entity]: { $: { where: { storeId } } },
    });
    
    const records = data[entity] || [];
    
    const status: MigrationStatus = {
      storeId,
      entity,
      status: 'not_started',
      recordsTotal: records.length,
      recordsMigrated: 0,
      recordsFailed: 0,
      version: '1.0.0',
    };
    
    migrationStatusManager.setStatus(status);
  }
}

export function startMigration(storeId: string, entity: string): void {
  const status = migrationStatusManager.getStatus(storeId, entity);
  if (status) {
    status.status = 'in_progress';
    status.startedAt = new Date();
    migrationStatusManager.setStatus(status);
  }
}

export function completeMigration(storeId: string, entity: string): void {
  const status = migrationStatusManager.getStatus(storeId, entity);
  if (status) {
    status.status = 'completed';
    status.completedAt = new Date();
    status.recordsMigrated = status.recordsTotal - status.recordsFailed;
    migrationStatusManager.setStatus(status);
  }
}

export function failMigration(storeId: string, entity: string, error: string): void {
  const status = migrationStatusManager.getStatus(storeId, entity);
  if (status) {
    status.status = 'failed';
    status.lastError = error;
    migrationStatusManager.setStatus(status);
  }
}

export function updateMigrationProgress(
  storeId: string, 
  entity: string, 
  migrated: number, 
  failed: number
): void {
  const status = migrationStatusManager.getStatus(storeId, entity);
  if (status) {
    status.recordsMigrated = migrated;
    status.recordsFailed = failed;
    migrationStatusManager.setStatus(status);
  }
}

/**
 * Get migration status for a store
 */
export function getStoreMigrationStatus(storeId: string): {
  statuses: MigrationStatus[];
  overall: {
    isComplete: boolean;
    totalRecords: number;
    migratedRecords: number;
    failedRecords: number;
    progressPercentage: number;
  };
} {
  const statuses = migrationStatusManager.getAllStatuses(storeId);
  
  const totalRecords = statuses.reduce((sum, status) => sum + status.recordsTotal, 0);
  const migratedRecords = statuses.reduce((sum, status) => sum + status.recordsMigrated, 0);
  const failedRecords = statuses.reduce((sum, status) => sum + status.recordsFailed, 0);
  const isComplete = statuses.every(status => status.status === 'completed');
  const progressPercentage = totalRecords > 0 ? (migratedRecords / totalRecords) * 100 : 0;
  
  return {
    statuses,
    overall: {
      isComplete,
      totalRecords,
      migratedRecords,
      failedRecords,
      progressPercentage,
    },
  };
}

/**
 * Enhanced data transformation middleware for existing queries
 */
export function createCompatibilityMiddleware() {
  const middleware = {
    /**
     * Transform query parameters to use new field names
     */
    transformQuery: (entity: string, query: any) => {
      const transformedQuery = { ...query };
      
      if (transformedQuery.where) {
        transformedQuery.where = transformLegacyInput(entity, transformedQuery.where);
      }
      
      // Transform sort/order fields
      if (transformedQuery.order) {
        transformedQuery.order = middleware.transformOrderClause(entity, transformedQuery.order);
      }
      
      // Transform select fields
      if (transformedQuery.select) {
        transformedQuery.select = middleware.transformSelectClause(entity, transformedQuery.select);
      }
      
      return transformedQuery;
    },
    
    /**
     * Transform query results to include legacy field names
     */
    transformResults: (entity: string, results: any[], storeId: string) => {
      if (!migrationStatusManager.isEntityMigrated(storeId, entity)) {
        return addLegacyFields(entity, results);
      }
      return results;
    },
    
    /**
     * Transform input data for create/update operations
     */
    transformInput: (entity: string, input: any) => {
      return transformLegacyInput(entity, input);
    },
    
    /**
     * Transform order/sort clauses
     */
    transformOrderClause: (entity: string, orderClause: any) => {
      if (typeof orderClause === 'string') {
        return middleware.transformFieldName(entity, orderClause);
      }
      
      if (Array.isArray(orderClause)) {
        return orderClause.map(clause => 
          typeof clause === 'string' 
            ? middleware.transformFieldName(entity, clause)
            : {
                ...clause,
                field: middleware.transformFieldName(entity, clause.field)
              }
        );
      }
      
      if (typeof orderClause === 'object' && orderClause.field) {
        return {
          ...orderClause,
          field: middleware.transformFieldName(entity, orderClause.field)
        };
      }
      
      return orderClause;
    },
    
    /**
     * Transform select clauses
     */
    transformSelectClause: (entity: string, selectClause: string[] | string) => {
      if (typeof selectClause === 'string') {
        return middleware.transformFieldName(entity, selectClause);
      }
      
      if (Array.isArray(selectClause)) {
        return selectClause.map(field => middleware.transformFieldName(entity, field));
      }
      
      return selectClause;
    },
    
    /**
     * Transform individual field names
     */
    transformFieldName: (entity: string, fieldName: string) => {
      const mappings = LEGACY_FIELD_MAPPINGS[entity as keyof typeof LEGACY_FIELD_MAPPINGS];
      if (!mappings) return fieldName;
      
      return mappings[fieldName as keyof typeof mappings] || fieldName;
    },
    
    /**
     * Check if middleware should be applied for an entity
     */
    shouldApplyMiddleware: (entity: string, storeId: string) => {
      return !migrationStatusManager.isEntityMigrated(storeId, entity);
    },
    
    /**
     * Wrap database query with compatibility layer
     */
    wrapQuery: async (entity: string, storeId: string, queryFn: () => Promise<any>) => {
      try {
        const result = await queryFn();
        
        if (result.data && result.data[entity]) {
          result.data[entity] = middleware.transformResults(entity, result.data[entity], storeId);
        }
        
        return result;
      } catch (error) {
        throw error;
      }
    },
    
    /**
     * Wrap database transaction with compatibility layer
     */
    wrapTransaction: async (transactions: any[], entityMappings: Record<string, string>) => {
      const transformedTransactions = transactions.map(tx => {
        // Extract entity and operation from transaction
        const entityKey = Object.keys(tx)[0];
        const entity = entityMappings[entityKey] || entityKey;
        
        if (tx[entityKey] && tx[entityKey].update) {
          tx[entityKey].update = middleware.transformInput(entity, tx[entityKey].update);
        }
        
        return tx;
      });
      
      return transformedTransactions;
    }
  };
  
  return middleware;
}

/**
 * Compatibility layer status check
 */
export function getCompatibilityStatus(storeId: string): {
  isActive: boolean;
  migrationProgress: number;
  entitiesNeedingCompatibility: string[];
  recommendedActions: string[];
} {
  const migrationStatus = getStoreMigrationStatus(storeId);
  const entitiesNeedingCompatibility = migrationStatus.statuses
    .filter(status => status.status !== 'completed')
    .map(status => status.entity);
  
  const recommendedActions: string[] = [];
  
  if (entitiesNeedingCompatibility.length > 0) {
    recommendedActions.push('Complete migration for remaining entities');
  }
  
  if (migrationStatus.overall.failedRecords > 0) {
    recommendedActions.push('Review and fix failed migration records');
  }
  
  if (migrationStatus.overall.progressPercentage > 90) {
    recommendedActions.push('Consider disabling compatibility layer after full migration');
  }
  
  return {
    isActive: entitiesNeedingCompatibility.length > 0,
    migrationProgress: migrationStatus.overall.progressPercentage,
    entitiesNeedingCompatibility,
    recommendedActions,
  };
}/**
 
* Advanced compatibility utilities
 */

/**
 * Batch migration utility for processing large datasets
 */
export class BatchMigrationProcessor {
  private batchSize: number;
  private concurrency: number;
  
  constructor(batchSize = 100, concurrency = 3) {
    this.batchSize = batchSize;
    this.concurrency = concurrency;
  }
  
  /**
   * Process migration in batches with progress tracking
   */
  async processBatchMigration(
    storeId: string,
    entity: string,
    migrationFn: (records: any[]) => Promise<any[]>,
    options: {
      onProgress?: (processed: number, total: number) => void;
      onBatchComplete?: (batchIndex: number, batchSize: number) => void;
      onError?: (error: Error, batchIndex: number) => void;
    } = {}
  ): Promise<{
    success: boolean;
    totalProcessed: number;
    totalFailed: number;
    errors: Array<{ batchIndex: number; error: string }>;
  }> {
    const { onProgress, onBatchComplete, onError } = options;
    
    // Get all records for the entity
    const { data } = await db.query({
      [entity]: { $: { where: { storeId } } },
    });
    
    const records = data[entity] || [];
    const totalRecords = records.length;
    const batches = [];
    
    // Split into batches
    for (let i = 0; i < records.length; i += this.batchSize) {
      batches.push(records.slice(i, i + this.batchSize));
    }
    
    let totalProcessed = 0;
    let totalFailed = 0;
    const errors: Array<{ batchIndex: number; error: string }> = [];
    
    // Process batches with concurrency control
    const processBatch = async (batch: any[], batchIndex: number) => {
      try {
        const migratedRecords = await migrationFn(batch);
        
        // Update records in database
        const transactions = migratedRecords.map(record => 
          db.tx[entity][record.id].update(record)
        );
        
        await db.transact(transactions);
        
        totalProcessed += batch.length;
        onBatchComplete?.(batchIndex, batch.length);
        onProgress?.(totalProcessed, totalRecords);
        
      } catch (error) {
        totalFailed += batch.length;
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push({ batchIndex, error: errorMessage });
        onError?.(error as Error, batchIndex);
      }
    };
    
    // Process batches with concurrency limit
    for (let i = 0; i < batches.length; i += this.concurrency) {
      const concurrentBatches = batches.slice(i, i + this.concurrency);
      const promises = concurrentBatches.map((batch, index) => 
        processBatch(batch, i + index)
      );
      
      await Promise.all(promises);
    }
    
    return {
      success: totalFailed === 0,
      totalProcessed,
      totalFailed,
      errors,
    };
  }
}

/**
 * Migration validation utilities
 */
export class MigrationValidator {
  /**
   * Validate field mappings are correctly applied
   */
  static validateFieldMappings(
    entity: string,
    originalRecord: Record<string, any>,
    transformedRecord: Record<string, any>
  ): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    const mappings = LEGACY_FIELD_MAPPINGS[entity as keyof typeof LEGACY_FIELD_MAPPINGS];
    
    if (!mappings) {
      return { isValid: true, issues: [] };
    }
    
    // Check that legacy fields are properly transformed
    for (const [legacyField, newField] of Object.entries(mappings)) {
      if (originalRecord[legacyField] !== undefined) {
        if (transformedRecord[newField] === undefined) {
          issues.push(`Legacy field '${legacyField}' was not transformed to '${newField}'`);
        } else if (originalRecord[legacyField] !== transformedRecord[newField]) {
          issues.push(`Value mismatch: '${legacyField}' -> '${newField}'`);
        }
      }
    }
    
    return {
      isValid: issues.length === 0,
      issues,
    };
  }
  
  /**
   * Validate data consistency after migration
   */
  static async validateDataConsistency(
    storeId: string,
    entity: string,
    sampleSize = 100
  ): Promise<{
    isConsistent: boolean;
    issues: string[];
    samplesChecked: number;
  }> {
    const issues: string[] = [];
    
    // Get sample records
    const { data } = await db.query({
      [entity]: { 
        $: { 
          where: { storeId },
          limit: sampleSize
        } 
      },
    });
    
    const records = data[entity] || [];
    const mappings = LEGACY_FIELD_MAPPINGS[entity as keyof typeof LEGACY_FIELD_MAPPINGS];
    
    if (!mappings) {
      return { isConsistent: true, issues: [], samplesChecked: records.length };
    }
    
    // Check each record for consistency
    for (const record of records) {
      for (const [legacyField, newField] of Object.entries(mappings)) {
        // Check if both legacy and new fields exist with different values
        if (record[legacyField] !== undefined && 
            record[newField] !== undefined && 
            record[legacyField] !== record[newField]) {
          issues.push(`Inconsistent values in record ${record.id}: ${legacyField}=${record[legacyField]}, ${newField}=${record[newField]}`);
        }
      }
    }
    
    return {
      isConsistent: issues.length === 0,
      issues,
      samplesChecked: records.length,
    };
  }
}

/**
 * Performance monitoring for compatibility layer
 */
export class CompatibilityPerformanceMonitor {
  private metrics = new Map<string, PerformanceMetric>();
  
  /**
   * Start timing an operation
   */
  startTiming(operation: string): string {
    const timingId = `${operation}_${Date.now()}_${Math.random()}`;
    const metric: PerformanceMetric = {
      operation,
      startTime: performance.now(),
      endTime: 0,
      duration: 0,
      success: false,
    };
    
    this.metrics.set(timingId, metric);
    return timingId;
  }
  
  /**
   * End timing an operation
   */
  endTiming(timingId: string, success = true): void {
    const metric = this.metrics.get(timingId);
    if (metric) {
      metric.endTime = performance.now();
      metric.duration = metric.endTime - metric.startTime;
      metric.success = success;
    }
  }
  
  /**
   * Get performance statistics
   */
  getStatistics(): {
    totalOperations: number;
    averageDuration: number;
    successRate: number;
    operationBreakdown: Record<string, {
      count: number;
      averageDuration: number;
      successRate: number;
    }>;
  } {
    const allMetrics = Array.from(this.metrics.values());
    const operationBreakdown: Record<string, any> = {};
    
    // Group by operation type
    for (const metric of allMetrics) {
      if (!operationBreakdown[metric.operation]) {
        operationBreakdown[metric.operation] = {
          metrics: [],
          count: 0,
          totalDuration: 0,
          successCount: 0,
        };
      }
      
      const breakdown = operationBreakdown[metric.operation];
      breakdown.metrics.push(metric);
      breakdown.count++;
      breakdown.totalDuration += metric.duration;
      if (metric.success) breakdown.successCount++;
    }
    
    // Calculate statistics
    const totalOperations = allMetrics.length;
    const averageDuration = totalOperations > 0 
      ? allMetrics.reduce((sum, m) => sum + m.duration, 0) / totalOperations 
      : 0;
    const successRate = totalOperations > 0 
      ? allMetrics.filter(m => m.success).length / totalOperations 
      : 0;
    
    // Calculate per-operation statistics
    const finalBreakdown: Record<string, any> = {};
    for (const [operation, data] of Object.entries(operationBreakdown)) {
      finalBreakdown[operation] = {
        count: data.count,
        averageDuration: data.count > 0 ? data.totalDuration / data.count : 0,
        successRate: data.count > 0 ? data.successCount / data.count : 0,
      };
    }
    
    return {
      totalOperations,
      averageDuration,
      successRate,
      operationBreakdown: finalBreakdown,
    };
  }
  
  /**
   * Clear metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
  }
}

interface PerformanceMetric {
  operation: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
}

// Global instances
export const batchMigrationProcessor = new BatchMigrationProcessor();
export const compatibilityPerformanceMonitor = new CompatibilityPerformanceMonitor();

/**
 * Utility function to safely disable compatibility layer
 */
export async function safelyDisableCompatibilityLayer(storeId: string): Promise<{
  canDisable: boolean;
  issues: string[];
  recommendations: string[];
}> {
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  // Check migration status
  const migrationStatus = getStoreMigrationStatus(storeId);
  
  if (!migrationStatus.overall.isComplete) {
    issues.push('Migration is not complete for all entities');
    recommendations.push('Complete migration for all entities before disabling compatibility layer');
  }
  
  if (migrationStatus.overall.failedRecords > 0) {
    issues.push(`${migrationStatus.overall.failedRecords} records failed migration`);
    recommendations.push('Fix failed migration records before disabling compatibility layer');
  }
  
  // Check data consistency
  const entities = ['products', 'orders', 'orderitems', 'customers', 'items'];
  for (const entity of entities) {
    const consistency = await MigrationValidator.validateDataConsistency(storeId, entity, 50);
    if (!consistency.isConsistent) {
      issues.push(`Data inconsistency found in ${entity}: ${consistency.issues.length} issues`);
      recommendations.push(`Fix data consistency issues in ${entity} entity`);
    }
  }
  
  // Performance check
  const performanceStats = compatibilityPerformanceMonitor.getStatistics();
  if (performanceStats.successRate < 0.95) {
    issues.push(`Low success rate in compatibility operations: ${(performanceStats.successRate * 100).toFixed(1)}%`);
    recommendations.push('Investigate and fix compatibility operation failures');
  }
  
  const canDisable = issues.length === 0;
  
  if (canDisable) {
    recommendations.push('Compatibility layer can be safely disabled');
    recommendations.push('Consider keeping backups for a rollback period');
    recommendations.push('Monitor application performance after disabling');
  }
  
  return {
    canDisable,
    issues,
    recommendations,
  };
}

/**
 * Emergency rollback function for critical issues
 */
export async function emergencyRollback(
  storeId: string,
  options: {
    entities?: string[];
    reason?: string;
    createEmergencyBackup?: boolean;
  } = {}
): Promise<{
  success: boolean;
  rolledBackEntities: string[];
  errors: Array<{ entity: string; error: string }>;
}> {
  const { entities = ['products', 'orders', 'orderitems', 'customers', 'items'], reason, createEmergencyBackup = true } = options;
  const rolledBackEntities: string[] = [];
  const errors: Array<{ entity: string; error: string }> = [];
  
  for (const entity of entities) {
    try {
      // Create emergency backup if requested
      if (createEmergencyBackup) {
        await migrationRollback.createBackup(storeId, entity, {
          version: 'emergency_backup',
          description: `Emergency backup before rollback. Reason: ${reason}`,
          validateIntegrity: false, // Skip validation for speed
        });
      }
      
      // Perform rollback
      await migrationRollback.restoreFromBackup(storeId, entity, {
        validateBeforeRestore: false, // Skip validation for speed
        createRestorePoint: false, // Already created emergency backup
      });
      
      rolledBackEntities.push(entity);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push({ entity, error: errorMessage });
    }
  }
  
  const success = errors.length === 0;
  
  return {
    success,
    rolledBackEntities,
    errors,
  };
}