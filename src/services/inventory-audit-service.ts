/**
 * Inventory Adjustment Audit Service
 * 
 * Provides comprehensive audit trail functionality for all inventory movements
 * including stock adjustments, sales, receiving, transfers, and cycle counts.
 * 
 * Features:
 * - Complete audit trail for all stock movements
 * - User tracking with role-based permissions
 * - Reason codes and reference tracking
 * - Session and batch management for bulk operations
 * - Cost impact tracking for financial reporting
 * - Approval workflow for significant adjustments
 */

import { tx, id } from '@instantdb/react-native';
import type { AppSchema } from '../../instant.schema';

// Audit types for different inventory movements
export type AuditType = 
  | 'adjustment'     // Manual stock adjustment
  | 'sale'          // Stock reduction from sale
  | 'receive'       // Stock increase from receiving
  | 'transfer'      // Stock movement between locations
  | 'count'         // Cycle count adjustment
  | 'damage'        // Stock reduction due to damage
  | 'return'        // Stock increase from return
  | 'correction';   // Data correction

// Reason codes for adjustments
export type AuditReason = 
  | 'damaged'       // Items damaged/broken
  | 'expired'       // Items past expiration
  | 'lost'          // Items lost/stolen
  | 'found'         // Items found during count
  | 'correction'    // Data entry correction
  | 'transfer_in'   // Incoming transfer
  | 'transfer_out'  // Outgoing transfer
  | 'shrinkage'     // Unexplained loss
  | 'promotion'     // Promotional giveaway
  | 'sample';       // Sample/demo usage

// User roles for audit tracking
export type UserRole = 'admin' | 'manager' | 'staff' | 'system';

// Batch types for bulk operations
export type BatchType = 
  | 'bulk_adjustment' 
  | 'cycle_count' 
  | 'transfer' 
  | 'receiving';

export interface AuditAdjustmentData {
  storeId: string;
  itemId: string;
  locationId: string;
  quantityBefore: number;
  quantityAfter: number;
  type: AuditType;
  reason?: AuditReason;
  reference?: string;
  userId?: string;
  userName?: string;
  userRole?: UserRole;
  notes?: string;
  deviceId?: string;
  ipAddress?: string;
  unitCost?: number;
  sessionId?: string;
  batchId?: string;
  requiresApproval?: boolean;
}

export interface AuditSessionData {
  storeId: string;
  userId?: string;
  userName?: string;
  userRole?: UserRole;
  deviceId?: string;
  ipAddress?: string;
  notes?: string;
}

export interface AuditBatchData {
  storeId: string;
  sessionId?: string;
  userId?: string;
  userName?: string;
  batchType: BatchType;
  description?: string;
  totalItems?: number;
  notes?: string;
}

export class InventoryAuditService {
  /**
   * Create a comprehensive audit record for inventory adjustment
   */
  static async createAuditRecord(data: AuditAdjustmentData) {
    const adjustmentId = id();
    const quantityChange = data.quantityAfter - data.quantityBefore;
    const totalCostImpact = data.unitCost ? quantityChange * data.unitCost : undefined;
    
    const auditRecord = {
      id: adjustmentId,
      storeId: data.storeId,
      itemId: data.itemId,
      locationId: data.locationId,
      quantityBefore: data.quantityBefore,
      quantityAfter: data.quantityAfter,
      quantityChange,
      type: data.type,
      reason: data.reason,
      reference: data.reference,
      userId: data.userId,
      userName: data.userName,
      userRole: data.userRole,
      createdAt: new Date(),
      sessionId: data.sessionId,
      batchId: data.batchId,
      notes: data.notes,
      deviceId: data.deviceId,
      ipAddress: data.ipAddress,
      unitCost: data.unitCost,
      totalCostImpact,
      requiresApproval: data.requiresApproval || false,
      version: 1,
      isReversed: false,
    };

    return tx.iadjust[adjustmentId].update(auditRecord);
  }

  /**
   * Create audit session for tracking related adjustments
   */
  static async createAuditSession(data: AuditSessionData) {
    const sessionId = id();
    
    const sessionRecord = {
      id: sessionId,
      sessionId,
      storeId: data.storeId,
      userId: data.userId,
      userName: data.userName,
      userRole: data.userRole,
      deviceId: data.deviceId,
      ipAddress: data.ipAddress,
      startedAt: new Date(),
      totalAdjustments: 0,
      totalQuantityChange: 0,
      totalCostImpact: 0,
      notes: data.notes,
      isActive: true,
    };

    return {
      sessionId,
      transaction: tx.audit_sessions[sessionId].update(sessionRecord)
    };
  }

  /**
   * Create audit batch for bulk operations
   */
  static async createAuditBatch(data: AuditBatchData) {
    const batchId = id();
    
    const batchRecord = {
      id: batchId,
      batchId,
      storeId: data.storeId,
      sessionId: data.sessionId,
      userId: data.userId,
      userName: data.userName,
      batchType: data.batchType,
      description: data.description,
      createdAt: new Date(),
      totalItems: data.totalItems || 0,
      processedItems: 0,
      totalQuantityChange: 0,
      totalCostImpact: 0,
      status: 'pending' as const,
      errorCount: 0,
      notes: data.notes,
    };

    return {
      batchId,
      transaction: tx.audit_batches[batchId].update(batchRecord)
    };
  }

  /**
   * Update audit session with aggregated data
   */
  static async updateAuditSession(
    sessionId: string, 
    adjustmentCount: number, 
    quantityChange: number, 
    costImpact?: number
  ) {
    return tx.audit_sessions[sessionId].update({
      totalAdjustments: adjustmentCount,
      totalQuantityChange: quantityChange,
      totalCostImpact: costImpact || 0,
    });
  }

  /**
   * Close audit session
   */
  static async closeAuditSession(sessionId: string, notes?: string) {
    return tx.audit_sessions[sessionId].update({
      endedAt: new Date(),
      isActive: false,
      notes,
    });
  }

  /**
   * Update audit batch progress
   */
  static async updateAuditBatch(
    batchId: string, 
    processedItems: number, 
    quantityChange: number, 
    costImpact?: number,
    errorCount?: number
  ) {
    return tx.audit_batches[batchId].update({
      processedItems,
      totalQuantityChange: quantityChange,
      totalCostImpact: costImpact || 0,
      errorCount: errorCount || 0,
    });
  }

  /**
   * Complete audit batch
   */
  static async completeAuditBatch(batchId: string, status: 'completed' | 'failed', notes?: string) {
    return tx.audit_batches[batchId].update({
      completedAt: new Date(),
      status,
      notes,
    });
  }

  /**
   * Create audit record for inventory adjustment with automatic session tracking
   */
  static async recordInventoryAdjustment(
    storeId: string,
    itemId: string,
    locationId: string,
    quantityBefore: number,
    quantityAfter: number,
    type: AuditType,
    options: {
      reason?: AuditReason;
      reference?: string;
      userId?: string;
      userName?: string;
      userRole?: UserRole;
      notes?: string;
      deviceId?: string;
      ipAddress?: string;
      unitCost?: number;
      sessionId?: string;
      batchId?: string;
      requiresApproval?: boolean;
    } = {}
  ) {
    return this.createAuditRecord({
      storeId,
      itemId,
      locationId,
      quantityBefore,
      quantityAfter,
      type,
      ...options,
    });
  }

  /**
   * Create audit record for sale transaction
   */
  static async recordSaleAdjustment(
    storeId: string,
    itemId: string,
    locationId: string,
    quantityBefore: number,
    quantitySold: number,
    orderId: string,
    options: {
      userId?: string;
      userName?: string;
      userRole?: UserRole;
      deviceId?: string;
      unitCost?: number;
      sessionId?: string;
    } = {}
  ) {
    return this.recordInventoryAdjustment(
      storeId,
      itemId,
      locationId,
      quantityBefore,
      quantityBefore - quantitySold,
      'sale',
      {
        reference: orderId,
        notes: `Sale of ${quantitySold} units`,
        ...options,
      }
    );
  }

  /**
   * Create audit record for receiving inventory
   */
  static async recordReceivingAdjustment(
    storeId: string,
    itemId: string,
    locationId: string,
    quantityBefore: number,
    quantityReceived: number,
    referenceNumber?: string,
    options: {
      userId?: string;
      userName?: string;
      userRole?: UserRole;
      deviceId?: string;
      unitCost?: number;
      sessionId?: string;
      batchId?: string;
    } = {}
  ) {
    return this.recordInventoryAdjustment(
      storeId,
      itemId,
      locationId,
      quantityBefore,
      quantityBefore + quantityReceived,
      'receive',
      {
        reference: referenceNumber,
        notes: `Received ${quantityReceived} units`,
        ...options,
      }
    );
  }

  /**
   * Create audit record for transfer between locations
   */
  static async recordTransferAdjustment(
    storeId: string,
    itemId: string,
    fromLocationId: string,
    toLocationId: string,
    quantityBefore: number,
    quantityTransferred: number,
    transferId: string,
    options: {
      userId?: string;
      userName?: string;
      userRole?: UserRole;
      deviceId?: string;
      unitCost?: number;
      sessionId?: string;
      batchId?: string;
    } = {}
  ) {
    // Record outgoing transfer
    const outgoingAdjustment = this.recordInventoryAdjustment(
      storeId,
      itemId,
      fromLocationId,
      quantityBefore,
      quantityBefore - quantityTransferred,
      'transfer',
      {
        reason: 'transfer_out',
        reference: transferId,
        notes: `Transfer out ${quantityTransferred} units to location ${toLocationId}`,
        ...options,
      }
    );

    // Record incoming transfer (assuming destination starts at 0 for simplicity)
    const incomingAdjustment = this.recordInventoryAdjustment(
      storeId,
      itemId,
      toLocationId,
      0, // This should be fetched from actual location inventory
      quantityTransferred,
      'transfer',
      {
        reason: 'transfer_in',
        reference: transferId,
        notes: `Transfer in ${quantityTransferred} units from location ${fromLocationId}`,
        ...options,
      }
    );

    return [outgoingAdjustment, incomingAdjustment];
  }

  /**
   * Create audit record for cycle count adjustment
   */
  static async recordCycleCountAdjustment(
    storeId: string,
    itemId: string,
    locationId: string,
    systemQuantity: number,
    countedQuantity: number,
    countId: string,
    options: {
      userId?: string;
      userName?: string;
      userRole?: UserRole;
      deviceId?: string;
      unitCost?: number;
      sessionId?: string;
      batchId?: string;
      notes?: string;
    } = {}
  ) {
    const variance = countedQuantity - systemQuantity;
    const reason: AuditReason = variance > 0 ? 'found' : variance < 0 ? 'shrinkage' : 'correction';
    
    return this.recordInventoryAdjustment(
      storeId,
      itemId,
      locationId,
      systemQuantity,
      countedQuantity,
      'count',
      {
        reason,
        reference: countId,
        notes: options.notes || `Cycle count variance: ${variance} units`,
        requiresApproval: Math.abs(variance) > 10, // Require approval for large variances
        ...options,
      }
    );
  }

  /**
   * Approve a pending adjustment
   */
  static async approveAdjustment(
    adjustmentId: string,
    approvedBy: string,
    approvalNotes?: string
  ) {
    return tx.iadjust[adjustmentId].update({
      approvedBy,
      approvedAt: new Date(),
      approvalNotes,
    });
  }

  /**
   * Reverse an adjustment (create compensating entry)
   */
  static async reverseAdjustment(
    originalAdjustmentId: string,
    reversalReason: string,
    options: {
      userId?: string;
      userName?: string;
      userRole?: UserRole;
      deviceId?: string;
    } = {}
  ) {
    // This would need to fetch the original adjustment and create a reverse entry
    // Implementation would depend on the specific business rules for reversals
    return tx.iadjust[originalAdjustmentId].update({
      isReversed: true,
      reversalReference: `Reversed: ${reversalReason}`,
    });
  }
}