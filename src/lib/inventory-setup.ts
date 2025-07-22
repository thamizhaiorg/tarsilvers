import { db } from './instant';
import { id } from '@instantdb/react-native';
import { log, trackError } from './logger';

export interface Location {
  id: string;
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
  onHand: number;
  committed: number;
  unavailable: number;
  reorderLevel?: number;
  reorderQuantity?: number;
  updatedAt: string;
}

/**
 * Creates a default location if it doesn't exist (simplified for single-store system)
 */
export async function createDefaultLocation(locationId?: string, locationName?: string): Promise<string> {
  try {
    // Check if any location already exists
    const existingLocations = await db.queryOnce({
      locations: {}
    });

    // If any location exists, return the first one (or the default one)
    if (existingLocations.data.locations && existingLocations.data.locations.length > 0) {
      const defaultLocation = existingLocations.data.locations.find(loc => loc.isDefault) || existingLocations.data.locations[0];
      return defaultLocation.id;
    }

    // Create default location only if none exists
    const newLocationId = locationId || id();
    const timestamp = new Date().toISOString();

    const locationData = {
      name: locationName || 'Main Location',
      type: 'warehouse',
      isDefault: true,
      isActive: true,
      fulfillsOnlineOrders: true,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    await db.transact([
      db.tx.locations[newLocationId].update(locationData)
    ]);

    // ...removed debug log...
    return newLocationId;
  } catch (error) {
    // ...removed debug log...

    // If creation fails, try to find any existing location
    try {
      const fallbackLocations = await db.queryOnce({
        locations: {}
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
 * Migrates existing item stock data to the new location-based system (simplified for single-store)
 */
export async function migrateItemsToLocationSystem(): Promise<void> {
  try {
    // Migration log removed. Migration is complete.

    // Get default location
    const defaultLocationId = await createDefaultLocation();

    // Get all items
    const items = await db.queryOnce({
      items: {}
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
 * Creates an inventory adjustment record (simplified for single-store)
 */
export async function createInventoryAdjustment(
  itemId: string,
  locationId: string,
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
 * Gets all active locations
 */
export async function getActiveLocations(): Promise<Location[]> {
  try {
    const result = await db.queryOnce({
      locations: {
        $: {
          where: {
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
 * Initializes inventory system (simplified for single-store)
 * This should be called once to set up the inventory system
 */
export async function initializeInventorySystem(): Promise<void> {
  try {
    // Create default location
    await createDefaultLocation();

    // Migrate existing items to location system
    await migrateItemsToLocationSystem();

    // ...removed debug log...
  } catch (error) {
    // ...removed debug log...
    throw error;
  }
}
