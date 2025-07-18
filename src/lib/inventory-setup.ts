import { db } from './instant';
import { id } from '@instantdb/react-native';
import { log, trackError } from './logger';

export interface Location {
  id: string;
  storeId: string;
  name: string;
  type: string;
  isDefault: boolean;
  isActive: boolean;
  fulfillsOnlineOrders: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ItemLocation {
  id: string;
  itemId: string;
  locationId: string;
  storeId: string;
  onHand: number;
  committed: number;
  unavailable: number;
  reorderLevel?: number;
  reorderQuantity?: number;
  updatedAt: string;
}

/**
 * Creates a default location for a store if it doesn't exist
 */
export async function createDefaultLocation(storeId: string, storeName?: string): Promise<string> {
  try {
    // Check if any location already exists for this store
    const existingLocations = await db.queryOnce({
      locations: {
        $: {
          where: {
            storeId: storeId
          }
        }
      }
    });

    // If any location exists, return the first one (or the default one)
    if (existingLocations.data.locations && existingLocations.data.locations.length > 0) {
      const defaultLocation = existingLocations.data.locations.find(loc => loc.isDefault) || existingLocations.data.locations[0];
      return defaultLocation.id;
    }

    // Create default location only if none exists
    const locationId = id();
    const timestamp = new Date().toISOString();

    const locationData = {
      storeId,
      name: storeName ? `${storeName} - Main Location` : 'Main Location',
      type: 'warehouse',
      isDefault: true,
      isActive: true,
      fulfillsOnlineOrders: true,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    await db.transact([
      db.tx.locations[locationId].update(locationData)
    ]);

    // ...removed debug log...
    return locationId;
  } catch (error) {
    // ...removed debug log...

    // If creation fails, try to find any existing location
    try {
      const fallbackLocations = await db.queryOnce({
        locations: {
          $: {
            where: {
              storeId: storeId
            }
          }
        }
      });

      if (fallbackLocations.data.locations && fallbackLocations.data.locations.length > 0) {
        return fallbackLocations.data.locations[0].id;
      }
    } catch (fallbackError) {
      // ...removed debug log...
    }

    throw error;
  }
}

/**
 * Migrates existing item stock data to the new location-based system
 */
export async function migrateItemsToLocationSystem(storeId: string): Promise<void> {
  try {
    // Migration log removed. Migration is complete.

    // Get default location for the store
    const defaultLocationId = await createDefaultLocation(storeId);

    // Get all items for the store
    const items = await db.queryOnce({
      items: {
        $: {
          where: {
            storeId: storeId
          }
        }
      }
    });

    if (!items.data.items || items.data.items.length === 0) {
      return;
    }

    // Process items in smaller batches to avoid transaction limits
    const batchSize = 10;
    let migratedCount = 0;

    for (let i = 0; i < items.data.items.length; i += batchSize) {
      const batch = items.data.items.slice(i, i + batchSize);
      const transactions = [];
      const timestamp = new Date().toISOString();

      for (const item of batch) {
        try {
          // Check if item location already exists
          const existingItemLocation = await db.queryOnce({
            ilocations: {
              $: {
                where: {
                  itemId: item.id,
                  locationId: defaultLocationId
                }
              }
            }
          });

          if (existingItemLocation.data.ilocations && existingItemLocation.data.ilocations.length > 0) {
            continue;
          }

          const itemLocationId = id();
          const onHand = item.onhand || item.available || 0;
          const committed = item.committed || 0;
          const unavailable = item.unavailable || 0;
          const available = Math.max(0, onHand - committed - unavailable);

          // Create item location record
          transactions.push(
            db.tx.ilocations[itemLocationId].update({
              itemId: item.id,
              locationId: defaultLocationId,
              storeId: storeId,
              onHand,
              committed,
              unavailable,
              reorderLevel: item.reorderlevel || undefined,
              updatedAt: timestamp
            })
          );

          // Update item with calculated totals and inventory settings
          transactions.push(
            db.tx.items[item.id].update({
              totalOnHand: onHand,
              totalAvailable: available,
              totalCommitted: committed,
              trackQty: true,
              allowPreorder: false,
              updatedAt: timestamp
            })
          );

          migratedCount++;
        } catch (itemError) {
          trackError(itemError as Error, 'InventorySetup', { itemId: item.id, operation: 'migrateItemsToLocationSystem' });
          // Continue with other items
        }
      }

      // Execute batch transaction
      if (transactions.length > 0) {
        try {
          await db.transact(transactions);
          log.info(`Migrated batch of ${transactions.length / 2} items`, 'InventorySetup');
        } catch (batchError) {
          trackError(batchError as Error, 'InventorySetup', { operation: 'batchTransaction', transactionCount: transactions.length });
          // Continue with next batch
        }
      }
    }

    log.info(`Migration complete: ${migratedCount} items migrated to location system`, 'InventorySetup', { migratedCount });
  } catch (error) {
    trackError(error as Error, 'InventorySetup', { operation: 'migrateItemsToLocationSystem' });
    // Don't throw error to prevent app startup failure
    log.warn('Migration failed but continuing app startup', 'InventorySetup');
  }
}

/**
 * Calculates available stock for an item location
 */
export function calculateAvailable(itemLocation: ItemLocation): number {
  return (itemLocation.onHand || 0) - (itemLocation.committed || 0) - (itemLocation.unavailable || 0);
}

/**
 * Updates item totals across all locations
 */
export async function updateItemTotals(itemId: string): Promise<void> {
  try {
    const itemLocations = await db.queryOnce({
      ilocations: {
        $: {
          where: {
            itemId: itemId
          }
        }
      }
    });

    if (!itemLocations.data.ilocations) {
      return;
    }

    const totals = itemLocations.data.ilocations.reduce(
      (acc, loc) => ({
        totalOnHand: acc.totalOnHand + (loc.onHand || 0),
        totalAvailable: acc.totalAvailable + calculateAvailable(loc),
        totalCommitted: acc.totalCommitted + (loc.committed || 0)
      }),
      { totalOnHand: 0, totalAvailable: 0, totalCommitted: 0 }
    );

    await db.transact([
      db.tx.items[itemId].update({
        ...totals,
        updatedAt: new Date().toISOString()
      })
    ]);
  } catch (error) {
    throw error;
  }
}

/**
 * Creates an inventory adjustment record
 */
export async function createInventoryAdjustment(
  itemId: string,
  locationId: string,
  storeId: string,
  quantityBefore: number,
  quantityAfter: number,
  type: string = 'adjustment',
  reason?: string,
  reference?: string,
  notes?: string,
  userId?: string,
  userName?: string
): Promise<void> {
  try {
    const adjustmentId = id();
    const timestamp = new Date().toISOString();

    const adjustmentData = {
      storeId,
      itemId,
      locationId,
      type,
      quantityBefore,
      quantityAfter,
      quantityChange: quantityAfter - quantityBefore,
      reason,
      reference,
      notes,
      userId,
      userName,
      createdAt: timestamp
    };

    await db.transact([
      db.tx.iadjust[adjustmentId].update(adjustmentData)
    ]);
  } catch (error) {
    throw error;
  }
}

/**
 * Gets all locations for a store
 */
export async function getStoreLocations(storeId: string): Promise<Location[]> {
  try {
    const result = await db.queryOnce({
      locations: {
        $: {
          where: {
            storeId: storeId,
            isActive: true
          }
        }
      }
    });

    return result.data.locations || [];
  } catch (error) {
    return [];
  }
}

/**
 * Gets item stock across all locations
 */
export async function getItemStock(itemId: string): Promise<ItemLocation[]> {
  try {
    const result = await db.queryOnce({
      ilocations: {
        $: {
          where: {
            itemId: itemId
          }
        },
        location: {}
      }
    });

    return result.data.ilocations || [];
  } catch (error) {
    return [];
  }
}

/**
 * Initializes inventory system for all stores
 * This should be called once to set up the inventory system
 */
export async function initializeInventorySystem(): Promise<void> {
  try {
    // Get all stores
    const storesResult = await db.queryOnce({
      store: {}
    });

    const stores = storesResult.data.store || [];

    if (stores.length === 0) {
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const store of stores) {
      try {
        // Create default location for the store
        await createDefaultLocation(store.id, store.name);

        // Migrate existing items to location system
        await migrateItemsToLocationSystem(store.id);

        successCount++;
      } catch (storeError) {
        errorCount++;
        // Continue with other stores
      }
    }

    log.info(`Inventory system initialization complete: ${successCount} successful, ${errorCount} failed`, 'InventorySetup', { successCount, errorCount });
  } catch (error) {
    trackError(error as Error, 'InventorySetup', { operation: 'initializeInventorySystem' });
    // Don't throw error to prevent app startup failure
    log.warn('Inventory initialization failed but continuing app startup', 'InventorySetup');
  }
}
