/**
 * Backward Compatibility Layer
 * 
 * This module provides fallback queries and data transformation middleware
 * to maintain compatibility with legacy field access during schema migration.
 * 
 * Note: Store-related functionality has been removed as the schema no longer includes stores.
 */

import { db } from './instant';

// Migration status tracking (simplified without store references)
export interface MigrationStatus {
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
 * Transform legacy field names to new field names in input data
 */
export function transformLegacyInput(entity: string, input: Record<string, any>): Record<string, any> {
  const mappings = LEGACY_FIELD_MAPPINGS[entity as keyof typeof LEGACY_FIELD_MAPPINGS];
  if (!mappings) return input;
  
  const transformed = { ...input };
  
  for (const [legacyField, newField] of Object.entries(mappings)) {
    if (transformed[legacyField] !== undefined) {
      transformed[newField] = transformed[legacyField];
      delete transformed[legacyField];
    }
  }
  
  return transformed;
}

/**
 * Migration status storage (simplified without store references)
 */
class MigrationStatusManager {
  private statuses = new Map<string, MigrationStatus>();
  
  constructor() {
    this.loadPersistedStatuses();
  }
  
  getStatus(entity: string): MigrationStatus | null {
    return this.statuses.get(entity) || null;
  }
  
  setStatus(status: MigrationStatus): void {
    this.statuses.set(status.entity, status);
    
    // Persist to storage
    this.persistStatus(status);
  }
  
  getAllStatuses(): MigrationStatus[] {
    return Array.from(this.statuses.values());
  }
  
  isEntityMigrated(entity: string): boolean {
    const status = this.getStatus(entity);
    return status?.status === 'completed';
  }
  
  isAllMigrated(): boolean {
    const entities = ['products', 'orders', 'orderitems', 'customers', 'items'];
    return entities.every(entity => this.isEntityMigrated(entity));
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
   * Clear all migration statuses
   */
  clearAllStatuses(): void {
    this.statuses.clear();
  }
  
  /**
   * Get migration statistics
   */
  getStatistics(): {
    totalEntities: number;
    completedMigrations: number;
    failedMigrations: number;
    inProgressMigrations: number;
  } {
    const allStatuses = Array.from(this.statuses.values());
    
    return {
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
 * Backward compatible query wrapper for products
 */
export async function queryProducts(options: {
  where?: Record<string, any>;
  limit?: number;
  includeLegacyFields?: boolean;
} = {}) {
  const { where = {}, limit, includeLegacyFields = true } = options;
  
  // Transform legacy field names in where clause
  const transformedWhere = transformLegacyInput('products', where);
  
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
  if (includeLegacyFields && !migrationStatusManager.isEntityMigrated('products')) {
    return addLegacyFields('products', products);
  }
  
  return products;
}

/**
 * Backward compatible query wrapper for orders
 */
export async function queryOrders(options: {
  where?: Record<string, any>;
  limit?: number;
  includeLegacyFields?: boolean;
} = {}) {
  const { where = {}, limit, includeLegacyFields = true } = options;
  
  // Transform legacy field names in where clause
  const transformedWhere = transformLegacyInput('orders', where);
  
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
  if (includeLegacyFields && !migrationStatusManager.isEntityMigrated('orders')) {
    return addLegacyFields('orders', orders);
  }
  
  return orders;
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

// Note: Complex migration and rollback functionality has been removed
// since the schema no longer supports store-based filtering.
