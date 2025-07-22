// Inventory service for enhanced tracking system with optimized schema
import { db } from '../lib/instant';
import { log, trackError, PerformanceMonitor } from '../lib/logger';
import { ValidationService, InventoryValidationData } from './validation-service';
import { id } from '@instantdb/react-native';

export interface InventoryFilters {
  search?: string;
  locationId?: string;
  lowStock?: boolean;
  outOfStock?: boolean;
  itemId?: string;
  productId?: string;
}

export interface InventoryAdjustmentData {
  itemId: string;
  locationId: string;
  quantityBefore: number;
  quantityAfter: number;
  quantityChange: number;
  type: 'adjustment' | 'sale' | 'receive' | 'transfer' | 'count' | 'damage' | 'return';
  reason?: string;
  reference?: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  notes?: string;
  unitCost?: number;
  requiresApproval?: boolean;
}

export interface InventoryLocationData {
  itemId: string;
  locationId: string;
  onHand: number;
  committed?: number;
  unavailable?: number;
  reorderLevel?: number;
  reorderQuantity?: number;
}

export class InventoryService {
  private static instance: InventoryService;
  private validationService: ValidationService;

  private constructor() {
    this.validationService = ValidationService.getInstance();
  }

  static getInstance(): InventoryService {
    if (!InventoryService.instance) {
      InventoryService.instance = new InventoryService();
    }
    return InventoryService.instance;
  }

  // Filter inventory locations based on criteria
  filterInventoryLocations(locations: any[], filters: InventoryFilters): any[] {
    return PerformanceMonitor.measure('filter-inventory-locations', () => {
      let filtered = locations;

      // Search filter - use indexed fields
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filtered = filtered.filter(location => {
          const itemSku = location.item?.[0]?.sku?.toLowerCase() || '';
          const itemTitle = location.item?.[0]?.product?.[0]?.title?.toLowerCase() || '';
          const locationName = location.location?.[0]?.name?.toLowerCase() || '';

          return itemSku.includes(searchTerm) ||
                 itemTitle.includes(searchTerm) ||
                 locationName.includes(searchTerm);
        });
      }

      // Location filter
      if (filters.locationId) {
        filtered = filtered.filter(location => location.locationId === filters.locationId);
      }

      // Item filter
      if (filters.itemId) {
        filtered = filtered.filter(location => location.itemId === filters.itemId);
      }

      // Product filter
      if (filters.productId) {
        filtered = filtered.filter(location => 
          location.item?.[0]?.productId === filters.productId
        );
      }

      // Low stock filter
      if (filters.lowStock) {
        filtered = filtered.filter(location => {
          const onHand = location.onHand || 0;
          const reorderLevel = location.reorderLevel || 5;
          return onHand > 0 && onHand <= reorderLevel;
        });
      }

      // Out of stock filter
      if (filters.outOfStock) {
        filtered = filtered.filter(location => (location.onHand || 0) === 0);
      }

      return filtered;
    });
  }

  // Create or update inventory location - enhanced tracking
  async updateInventoryLocation(data: InventoryLocationData): Promise<{ success: boolean; error?: string }> {
    try {
      log.info('Updating inventory location', 'InventoryService', { data });

      // Validate inventory data
      const validation = this.validationService.validateInventory(data, true);
      if (!validation.isValid) {
        return { success: false, error: `Validation failed: ${Object.values(validation.errors).join(', ')}` };
      }

      const timestamp = new Date();
      const locationKey = `${data.itemId}-${data.locationId}`;

      // Calculate available quantity
      const available = data.onHand - (data.committed || 0) - (data.unavailable || 0);

      const inventoryLocation = {
        itemId: data.itemId,
        locationId: data.locationId,
        onHand: data.onHand,
        committed: data.committed || 0,
        unavailable: data.unavailable || 0,
        available: Math.max(0, available), // Ensure non-negative
        reorderLevel: data.reorderLevel,
        reorderQuantity: data.reorderQuantity,
        updatedAt: timestamp,
        lastMovementDate: timestamp,
        lastMovementType: 'adjustment',
        version: 1, // For optimistic locking
        isActive: true,
      };

      await db.transact([
        db.tx.ilocations[locationKey].update(inventoryLocation)
      ]);

      log.info('Inventory location updated successfully', 'InventoryService', { locationKey });
      return { success: true };
    } catch (error) {
      trackError(error as Error, 'InventoryService', { operation: 'updateInventoryLocation', data });
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Record inventory adjustment with enhanced audit trail
  async recordInventoryAdjustment(data: InventoryAdjustmentData): Promise<{ success: boolean; adjustmentId?: string; error?: string }> {
    try {
      log.info('Recording inventory adjustment', 'InventoryService', { data });

      const adjustmentId = id();
      const timestamp = new Date();

      // Calculate cost impact
      const totalCostImpact = data.unitCost ? data.quantityChange * data.unitCost : undefined;

      // Determine if approval is required (large adjustments)
      const requiresApproval = data.requiresApproval || Math.abs(data.quantityChange) > 100 || (totalCostImpact && Math.abs(totalCostImpact) > 1000);

      const adjustment = {
        id: adjustmentId,
        itemId: data.itemId,
        locationId: data.locationId,
        quantityBefore: data.quantityBefore,
        quantityAfter: data.quantityAfter,
        quantityChange: data.quantityChange,
        type: data.type,
        reason: data.reason,
        reference: data.reference,
        userId: data.userId,
        userName: data.userName,
        userRole: data.userRole || 'staff',
        createdAt: timestamp,
        notes: data.notes,
        unitCost: data.unitCost,
        totalCostImpact,
        requiresApproval,
        version: 1,
        isReversed: false,
      };

      // Update inventory location
      const locationKey = `${data.itemId}-${data.locationId}`;
      const locationUpdate = {
        onHand: data.quantityAfter,
        updatedAt: timestamp,
        updatedBy: data.userId,
        lastMovementDate: timestamp,
        lastMovementType: data.type,
        lastMovementReference: data.reference,
      };

      await db.transact([
        db.tx.iadjust[adjustmentId].update(adjustment),
        db.tx.ilocations[locationKey].update(locationUpdate)
      ]);

      log.info('Inventory adjustment recorded successfully', 'InventoryService', { adjustmentId });
      return { success: true, adjustmentId };
    } catch (error) {
      trackError(error as Error, 'InventoryService', { operation: 'recordInventoryAdjustment', data });
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Perform cycle count with variance tracking
  async performCycleCount(
    itemId: string,
    locationId: string,
    countedQuantity: number,
    userId?: string,
    userName?: string,
    notes?: string
  ): Promise<{ success: boolean; adjustmentId?: string; variance?: number; error?: string }> {
    try {
      log.info('Performing cycle count', 'InventoryService', { itemId, locationId, countedQuantity });

      // Get current inventory level
      const locationKey = `${itemId}-${locationId}`;
      // In a real implementation, you would query the current inventory level
      // For now, we'll assume it's passed or retrieved from the database
      const currentQuantity = 0; // This should be retrieved from the database

      const variance = countedQuantity - currentQuantity;

      if (variance !== 0) {
        // Record adjustment for the variance
        const adjustmentData: InventoryAdjustmentData = {
          itemId,
          locationId,
          quantityBefore: currentQuantity,
          quantityAfter: countedQuantity,
          quantityChange: variance,
          type: 'count',
          reason: 'cycle_count',
          userId,
          userName,
          notes: notes || `Cycle count adjustment. Variance: ${variance}`,
          requiresApproval: Math.abs(variance) > 10, // Require approval for large variances
        };

        const result = await this.recordInventoryAdjustment(adjustmentData);
        if (!result.success) {
          return result;
        }

        // Update count tracking
        const timestamp = new Date();
        const countUpdate = {
          lastCounted: timestamp,
          lastCountedBy: userId,
          lastCountQuantity: countedQuantity,
          updatedAt: timestamp,
        };

        await db.transact([
          db.tx.ilocations[locationKey].update(countUpdate)
        ]);

        return { success: true, adjustmentId: result.adjustmentId, variance };
      } else {
        // No variance, just update count tracking
        const timestamp = new Date();
        const countUpdate = {
          lastCounted: timestamp,
          lastCountedBy: userId,
          lastCountQuantity: countedQuantity,
          updatedAt: timestamp,
        };

        await db.transact([
          db.tx.ilocations[locationKey].update(countUpdate)
        ]);

        return { success: true, variance: 0 };
      }
    } catch (error) {
      trackError(error as Error, 'InventoryService', { operation: 'performCycleCount', itemId, locationId });
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Transfer inventory between locations
  async transferInventory(
    itemId: string,
    fromLocationId: string,
    toLocationId: string,
    quantity: number,
    userId?: string,
    userName?: string,
    reference?: string,
    notes?: string
  ): Promise<{ success: boolean; transferId?: string; error?: string }> {
    try {
      log.info('Transferring inventory', 'InventoryService', {
        itemId, fromLocationId, toLocationId, quantity
      });

      const transferId = id();
      const timestamp = new Date();

      // Get current quantities (in a real implementation, query from database)
      const fromCurrentQuantity = 0; // This should be retrieved from the database
      const toCurrentQuantity = 0; // This should be retrieved from the database

      // Validate sufficient quantity at source location
      if (fromCurrentQuantity < quantity) {
        return { success: false, error: 'Insufficient quantity at source location' };
      }

      // Record outgoing adjustment
      const outgoingAdjustment: InventoryAdjustmentData = {
        itemId,
        locationId: fromLocationId,
        quantityBefore: fromCurrentQuantity,
        quantityAfter: fromCurrentQuantity - quantity,
        quantityChange: -quantity,
        type: 'transfer',
        reason: 'transfer_out',
        reference: reference || transferId,
        userId,
        userName,
        notes: notes || `Transfer to ${toLocationId}`,
      };

      // Record incoming adjustment
      const incomingAdjustment: InventoryAdjustmentData = {
        itemId,
        locationId: toLocationId,
        quantityBefore: toCurrentQuantity,
        quantityAfter: toCurrentQuantity + quantity,
        quantityChange: quantity,
        type: 'transfer',
        reason: 'transfer_in',
        reference: reference || transferId,
        userId,
        userName,
        notes: notes || `Transfer from ${fromLocationId}`,
      };

      // Execute both adjustments
      const outgoingResult = await this.recordInventoryAdjustment(outgoingAdjustment);
      if (!outgoingResult.success) {
        return outgoingResult;
      }

      const incomingResult = await this.recordInventoryAdjustment(incomingAdjustment);
      if (!incomingResult.success) {
        return incomingResult;
      }

      log.info('Inventory transfer completed successfully', 'InventoryService', { transferId });
      return { success: true, transferId };
    } catch (error) {
      trackError(error as Error, 'InventoryService', { operation: 'transferInventory', itemId });
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Get inventory statistics
  getInventoryStats(locations: any[]): {
    totalLocations: number;
    totalItems: number;
    totalOnHand: number;
    totalCommitted: number;
    totalAvailable: number;
    lowStockItems: number;
    outOfStockItems: number;
    totalValue: number;
  } {
    return PerformanceMonitor.measure('calculate-inventory-stats', () => {
      const stats = {
        totalLocations: locations.length,
        totalItems: new Set(locations.map(loc => loc.itemId)).size,
        totalOnHand: 0,
        totalCommitted: 0,
        totalAvailable: 0,
        lowStockItems: 0,
        outOfStockItems: 0,
        totalValue: 0,
      };

      locations.forEach(location => {
        const onHand = location.onHand || 0;
        const committed = location.committed || 0;
        const available = location.available || 0;
        const reorderLevel = location.reorderLevel || 5;
        const unitCost = location.item?.[0]?.cost || 0;

        stats.totalOnHand += onHand;
        stats.totalCommitted += committed;
        stats.totalAvailable += available;
        stats.totalValue += onHand * unitCost;

        // Stock level analysis
        if (onHand === 0) {
          stats.outOfStockItems++;
        } else if (onHand <= reorderLevel) {
          stats.lowStockItems++;
        }
      });

      return stats;
    });
  }

  // Generate reorder suggestions
  getReorderSuggestions(locations: any[]): Array<{
    itemId: string;
    locationId: string;
    currentQuantity: number;
    reorderLevel: number;
    suggestedQuantity: number;
    itemDetails?: any;
  }> {
    return PerformanceMonitor.measure('generate-reorder-suggestions', () => {
      return locations
        .filter(location => {
          const onHand = location.onHand || 0;
          const reorderLevel = location.reorderLevel || 0;
          return reorderLevel > 0 && onHand <= reorderLevel;
        })
        .map(location => ({
          itemId: location.itemId,
          locationId: location.locationId,
          currentQuantity: location.onHand || 0,
          reorderLevel: location.reorderLevel || 0,
          suggestedQuantity: location.reorderQuantity || Math.max(location.reorderLevel * 2, 10),
          itemDetails: location.item?.[0],
        }))
        .sort((a, b) => a.currentQuantity - b.currentQuantity); // Prioritize lowest stock first
    });
  }
}