/**
 * Entity-specific migration tools
 * 
 * This module provides specialized migration functions for each entity type,
 * handling the specific transformation logic required for each entity.
 */

import { db } from './instant';
import {
  transformRecord,
  createRelationshipLookups,
  applyRelationshipLookups,
  createMigrationProgress,
  updateMigrationProgress,
  getMigrationSummary,
  type MigrationProgress,
} from './migration-utils';

/**
 * Migrate products entity
 */
export async function migrateProducts(storeId: string, batchSize: number = 100): Promise<MigrationProgress> {
  // Fetch all products for the store
  const { data } = await db.query({
    products: { $: { where: { storeId } } },
  });
  
  const products = data.products || [];
  const progress = createMigrationProgress('products', products.length);
  
  if (products.length === 0) {
    return progress;
  }
  
  // Create relationship lookups
  const lookups = await createRelationshipLookups(storeId);
  
  // Process products in batches
  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    
    for (const product of batch) {
      try {
        // Transform the product record
        const { transformed, validation } = transformRecord('products', product);
        
        if (!validation.isValid) {
          updateMigrationProgress(progress, false, product.id, validation.errors);
          continue;
        }
        
        // Apply relationship lookups
        const finalTransformed = applyRelationshipLookups('products', transformed, lookups);
        
        // Update the product in the database
        await db.transact([
          db.tx.products[product.id].update(finalTransformed),
        ]);
        
        updateMigrationProgress(progress, true);
        
      } catch (error) {
        updateMigrationProgress(progress, false, product.id, [error instanceof Error ? error.message : 'Unknown error']);
      }
    }
    
  }
  return progress;
}

/**
 * Migrate orders entity
 */
export async function migrateOrders(batchSize: number = 100): Promise<MigrationProgress> {
  // Fetch all orders
  const { data } = await db.query({
    orders: {},
  });

  const orders = data.orders || [];
  const progress = createMigrationProgress('orders', orders.length);
  
  if (orders.length === 0) {
    return progress;
  }
  
  // Process orders in batches
  for (let i = 0; i < orders.length; i += batchSize) {
    const batch = orders.slice(i, i + batchSize);
    
    for (const order of batch) {
      try {
        // Transform the order record
        const { transformed, validation } = transformRecord('orders', order);
        
        if (!validation.isValid) {
          updateMigrationProgress(progress, false, order.id, validation.errors);
          continue;
        }
        
        // Special handling for address consolidation
        const finalTransformed = consolidateOrderAddresses(transformed);
        
        // Update the order in the database
        await db.transact([
          db.tx.orders[order.id].update(finalTransformed),
        ]);
        
        updateMigrationProgress(progress, true);
        
      } catch (error) {
        updateMigrationProgress(progress, false, order.id, [error instanceof Error ? error.message : 'Unknown error']);
      }
    }
    
  }
  return progress;
}

/**
 * Migrate order items entity
 */
export async function migrateOrderItems(batchSize: number = 100): Promise<MigrationProgress> {
  // Fetch all order items
  const { data } = await db.query({
    orderitems: {},
  });

  const orderItems = data.orderitems || [];
  const progress = createMigrationProgress('orderitems', orderItems.length);
  
  if (orderItems.length === 0) {
    return progress;
  }
  
  // Process order items in batches
  for (let i = 0; i < orderItems.length; i += batchSize) {
    const batch = orderItems.slice(i, i + batchSize);
    
    for (const orderItem of batch) {
      try {
        // Transform the order item record
        const { transformed, validation } = transformRecord('orderitems', orderItem);
        
        if (!validation.isValid) {
          updateMigrationProgress(progress, false, orderItem.id, validation.errors);
          continue;
        }
        
        // Special handling for tax field consolidation
        const finalTransformed = consolidateOrderItemFields(transformed);
        
        // Update the order item in the database
        await db.transact([
          db.tx.orderitems[orderItem.id].update(finalTransformed),
        ]);
        
        updateMigrationProgress(progress, true);
        
      } catch (error) {
        updateMigrationProgress(progress, false, orderItem.id, [error instanceof Error ? error.message : 'Unknown error']);
      }
    }
    
  }
  return progress;
}

/**
 * Migrate customers entity
 */
export async function migrateCustomers(batchSize: number = 100): Promise<MigrationProgress> {
  // Fetch all customers
  const { data } = await db.query({
    customers: {},
  });

  const customers = data.customers || [];
  const progress = createMigrationProgress('customers', customers.length);
  
  if (customers.length === 0) {
    return progress;
  }
  
  // Process customers in batches
  for (let i = 0; i < customers.length; i += batchSize) {
    const batch = customers.slice(i, i + batchSize);
    
    for (const customer of batch) {
      try {
        // Transform the customer record
        const { transformed, validation } = transformRecord('customers', customer);
        
        if (!validation.isValid) {
          updateMigrationProgress(progress, false, customer.id, validation.errors);
          continue;
        }
        
        // Update the customer in the database
        await db.transact([
          db.tx.customers[customer.id].update(transformed),
        ]);
        
        updateMigrationProgress(progress, true);
        
      } catch (error) {
        updateMigrationProgress(progress, false, customer.id, [error instanceof Error ? error.message : 'Unknown error']);
      }
    }
    
  }
  return progress;
}

/**
 * Migrate items entity
 */
export async function migrateItems(storeId: string, batchSize: number = 100): Promise<MigrationProgress> {
  // Fetch all items for the store
  const { data } = await db.query({
    items: { $: { where: { storeId } } },
  });
  
  const items = data.items || [];
  const progress = createMigrationProgress('items', items.length);
  
  if (items.length === 0) {
    return progress;
  }
  
  // Process items in batches
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    for (const item of batch) {
      try {
        // Transform the item record
        const { transformed, validation } = transformRecord('items', item);
        
        if (!validation.isValid) {
          updateMigrationProgress(progress, false, item.id, validation.errors);
          continue;
        }
        
        // Update the item in the database
        await db.transact([
          db.tx.items[item.id].update(transformed),
        ]);
        
        updateMigrationProgress(progress, true);
        
      } catch (error) {
        updateMigrationProgress(progress, false, item.id, [error instanceof Error ? error.message : 'Unknown error']);
      }
    }
    
  }
  return progress;
}

/**
 * Helper function to consolidate order address fields
 */
function consolidateOrderAddresses(order: Record<string, any>): Record<string, any> {
  const consolidated = { ...order };
  
  // Consolidate billing address
  if (consolidated.billaddrs && !consolidated.billingAddress) {
    try {
      consolidated.billingAddress = typeof consolidated.billaddrs === 'string' 
        ? JSON.parse(consolidated.billaddrs)
        : consolidated.billaddrs;
      delete consolidated.billaddrs;
    } catch {
      // If parsing fails, create a simple address object
      consolidated.billingAddress = { address: consolidated.billaddrs };
      delete consolidated.billaddrs;
    }
  }
  
  // Consolidate shipping address
  if (consolidated.shipaddrs && !consolidated.shippingAddress) {
    try {
      consolidated.shippingAddress = typeof consolidated.shipaddrs === 'string'
        ? JSON.parse(consolidated.shipaddrs)
        : consolidated.shipaddrs;
      delete consolidated.shipaddrs;
    } catch {
      // If parsing fails, create a simple address object
      consolidated.shippingAddress = { address: consolidated.shipaddrs };
      delete consolidated.shipaddrs;
    }
  }
  
  return consolidated;
}

/**
 * Helper function to consolidate order item fields
 */
function consolidateOrderItemFields(orderItem: Record<string, any>): Record<string, any> {
  const consolidated = { ...orderItem };
  
  // Consolidate tax fields - prefer the newer naming convention
  if (consolidated.taxamt && !consolidated.taxAmount) {
    consolidated.taxAmount = consolidated.taxamt;
    delete consolidated.taxamt;
  }
  
  if (consolidated.taxrate && !consolidated.taxRate) {
    consolidated.taxRate = consolidated.taxrate;
    delete consolidated.taxrate;
  }
  
  // Consolidate variant title field
  if (consolidated.varianttitle && !consolidated.variantTitle) {
    consolidated.variantTitle = consolidated.varianttitle;
    delete consolidated.varianttitle;
  }
  
  return consolidated;
}

/**
 * Run complete migration for all entities
 */
export async function migrateAllEntities(): Promise<{
  products: MigrationProgress;
  orders: MigrationProgress;
  orderItems: MigrationProgress;
  customers: MigrationProgress;
  items: MigrationProgress;
}> {
  const results = {
    products: await migrateProducts(),
    orders: await migrateOrders(),
    orderItems: await migrateOrderItems(),
    customers: await migrateCustomers(),
    items: await migrateItems(),
  };
  
  // Print overall summary
  const totalRecords = Object.values(results).reduce((sum, progress) => sum + progress.total, 0);
  const totalSuccessful = Object.values(results).reduce((sum, progress) => sum + progress.successful, 0);
  const totalFailed = Object.values(results).reduce((sum, progress) => sum + progress.failed, 0);
  
  return results;
}

/**
 * Dry run migration to preview changes without applying them
 */
export async function dryRunMigration(storeId: string, entity: string, limit: number = 10): Promise<{
  samples: Array<{
    original: Record<string, any>;
    transformed: Record<string, any>;
    validation: { isValid: boolean; errors: string[] };
  }>;
}> {
  // Fetch sample records
  const { data } = await db.query({
    [entity]: { $: { where: { storeId }, limit } },
  });
  
  const records = data[entity] || [];
  const samples: Array<{
    original: Record<string, any>;
    transformed: Record<string, any>;
    validation: { isValid: boolean; errors: string[] };
  }> = [];
  
  // Create relationship lookups if needed
  const lookups = entity === 'products' ? await createRelationshipLookups(storeId) : null;
  
  for (const record of records) {
    const { transformed, validation } = transformRecord(entity, record);
    
    let finalTransformed = transformed;
    if (entity === 'products' && lookups) {
      finalTransformed = applyRelationshipLookups(entity, transformed, lookups);
    } else if (entity === 'orders') {
      finalTransformed = consolidateOrderAddresses(transformed);
    } else if (entity === 'orderitems') {
      finalTransformed = consolidateOrderItemFields(transformed);
    }
    
    samples.push({
      original: record,
      transformed: finalTransformed,
      validation,
    });
  }
  
  return { samples };
}