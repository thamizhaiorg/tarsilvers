/**
 * Inventory Audit Hook
 * 
 * React hook for managing inventory adjustments with comprehensive audit trails.
 * Provides functions for creating, tracking, and querying inventory adjustments
 * with full audit capabilities.
 */

import { useState, useCallback, useEffect } from 'react';
import { useQuery, tx, id } from '@instantdb/react-native';
import { InventoryAuditService, type AuditType, type AuditReason, type UserRole, type BatchType } from '../services/inventory-audit-service';
import { AuditValidation, AuditFormatting } from '../lib/audit-utils';
import type { AppSchema } from '../../instant.schema';

interface UseInventoryAuditOptions {
  userId?: string;
  userName?: string;
  userRole?: UserRole;
  deviceId?: string;
}

interface AdjustmentOptions {
  reason?: AuditReason;
  reference?: string;
  notes?: string;
  unitCost?: number;
  requiresApproval?: boolean;
}

interface SessionInfo {
  sessionId: string;
  isActive: boolean;
  totalAdjustments: number;
  totalQuantityChange: number;
  totalCostImpact: number;
}

interface BatchInfo {
  batchId: string;
  batchType: BatchType;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalItems: number;
  processedItems: number;
  totalQuantityChange: number;
  totalCostImpact: number;
}

export function useInventoryAudit(options: UseInventoryAuditOptions) {
  const [currentSession, setCurrentSession] = useState<SessionInfo | null>(null);
  const [currentBatch, setCurrentBatch] = useState<BatchInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Query recent audit records (no store filtering needed)
  const { data: auditRecords, isLoading: auditLoading } = useQuery({
    iadjust: {
      $: {
        where: {},
        order: {
          serverCreatedAt: 'desc',
        },
        limit: 100,
      },
    },
  });

  // Query active sessions (no store filtering needed)
  const { data: activeSessions } = useQuery({
    audit_sessions: {
      $: {
        where: {
          isActive: true,
        },
      },
    },
  });

  // Query pending approvals
  const { data: pendingApprovals } = useQuery({
    iadjust: {
      $: {
        where: {
          storeId: options.storeId,
          requiresApproval: true,
          approvedAt: null,
        },
      },
    },
  });

  /**
   * Start a new audit session
   */
  const startAuditSession = useCallback(async (notes?: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const { sessionId, transaction } = await InventoryAuditService.createAuditSession({
        storeId: options.storeId,
        userId: options.userId,
        userName: options.userName,
        userRole: options.userRole,
        deviceId: options.deviceId,
        notes,
      });

      await transaction;

      setCurrentSession({
        sessionId,
        isActive: true,
        totalAdjustments: 0,
        totalQuantityChange: 0,
        totalCostImpact: 0,
      });

      return sessionId;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start audit session');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [options]);

  /**
   * End current audit session
   */
  const endAuditSession = useCallback(async (notes?: string) => {
    if (!currentSession) return;

    try {
      setIsLoading(true);
      await InventoryAuditService.closeAuditSession(currentSession.sessionId, notes);
      setCurrentSession(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end audit session');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentSession]);

  /**
   * Start a new audit batch
   */
  const startAuditBatch = useCallback(async (
    batchType: BatchType,
    description?: string,
    totalItems?: number
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      const { batchId, transaction } = await InventoryAuditService.createAuditBatch({
        storeId: options.storeId,
        sessionId: currentSession?.sessionId,
        userId: options.userId,
        userName: options.userName,
        batchType,
        description,
        totalItems,
      });

      await transaction;

      setCurrentBatch({
        batchId,
        batchType,
        status: 'pending',
        totalItems: totalItems || 0,
        processedItems: 0,
        totalQuantityChange: 0,
        totalCostImpact: 0,
      });

      return batchId;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start audit batch');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [options, currentSession]);

  /**
   * Complete current audit batch
   */
  const completeAuditBatch = useCallback(async (status: 'completed' | 'failed', notes?: string) => {
    if (!currentBatch) return;

    try {
      setIsLoading(true);
      await InventoryAuditService.completeAuditBatch(currentBatch.batchId, status, notes);
      setCurrentBatch(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete audit batch');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentBatch]);

  /**
   * Record inventory adjustment with full audit trail
   */
  const recordAdjustment = useCallback(async (
    itemId: string,
    locationId: string,
    quantityBefore: number,
    quantityAfter: number,
    type: AuditType,
    adjustmentOptions: AdjustmentOptions = {}
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      // Validate adjustment data
      const validation = AuditValidation.validateAdjustmentData({
        storeId: options.storeId,
        itemId,
        locationId,
        quantityBefore,
        quantityAfter,
        type,
        reason: adjustmentOptions.reason,
        userId: options.userId,
        userRole: options.userRole,
      });

      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Check if approval is required
      const quantityChange = quantityAfter - quantityBefore;
      const requiresApproval = adjustmentOptions.requiresApproval ?? 
        AuditValidation.requiresApproval(
          quantityChange,
          adjustmentOptions.reason,
          options.userRole,
          adjustmentOptions.unitCost
        );

      // Create audit record
      const transaction = await InventoryAuditService.recordInventoryAdjustment(
        options.storeId,
        itemId,
        locationId,
        quantityBefore,
        quantityAfter,
        type,
        {
          ...adjustmentOptions,
          userId: options.userId,
          userName: options.userName,
          userRole: options.userRole,
          deviceId: options.deviceId,
          sessionId: currentSession?.sessionId,
          batchId: currentBatch?.batchId,
          requiresApproval,
        }
      );

      await transaction;

      // Update session and batch counters
      if (currentSession) {
        const newTotalAdjustments = currentSession.totalAdjustments + 1;
        const newTotalQuantityChange = currentSession.totalQuantityChange + quantityChange;
        const newTotalCostImpact = currentSession.totalCostImpact + 
          (adjustmentOptions.unitCost ? quantityChange * adjustmentOptions.unitCost : 0);

        await InventoryAuditService.updateAuditSession(
          currentSession.sessionId,
          newTotalAdjustments,
          newTotalQuantityChange,
          newTotalCostImpact
        );

        setCurrentSession({
          ...currentSession,
          totalAdjustments: newTotalAdjustments,
          totalQuantityChange: newTotalQuantityChange,
          totalCostImpact: newTotalCostImpact,
        });
      }

      if (currentBatch) {
        const newProcessedItems = currentBatch.processedItems + 1;
        const newTotalQuantityChange = currentBatch.totalQuantityChange + quantityChange;
        const newTotalCostImpact = currentBatch.totalCostImpact + 
          (adjustmentOptions.unitCost ? quantityChange * adjustmentOptions.unitCost : 0);

        await InventoryAuditService.updateAuditBatch(
          currentBatch.batchId,
          newProcessedItems,
          newTotalQuantityChange,
          newTotalCostImpact
        );

        setCurrentBatch({
          ...currentBatch,
          processedItems: newProcessedItems,
          totalQuantityChange: newTotalQuantityChange,
          totalCostImpact: newTotalCostImpact,
        });
      }

      return { requiresApproval };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record adjustment');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [options, currentSession, currentBatch]);

  /**
   * Record sale adjustment
   */
  const recordSale = useCallback(async (
    itemId: string,
    locationId: string,
    quantityBefore: number,
    quantitySold: number,
    orderId: string,
    unitCost?: number
  ) => {
    return recordAdjustment(
      itemId,
      locationId,
      quantityBefore,
      quantityBefore - quantitySold,
      'sale',
      {
        reference: orderId,
        notes: `Sale of ${quantitySold} units`,
        unitCost,
      }
    );
  }, [recordAdjustment]);

  /**
   * Record receiving adjustment
   */
  const recordReceiving = useCallback(async (
    itemId: string,
    locationId: string,
    quantityBefore: number,
    quantityReceived: number,
    referenceNumber?: string,
    unitCost?: number
  ) => {
    return recordAdjustment(
      itemId,
      locationId,
      quantityBefore,
      quantityBefore + quantityReceived,
      'receive',
      {
        reference: referenceNumber,
        notes: `Received ${quantityReceived} units`,
        unitCost,
      }
    );
  }, [recordAdjustment]);

  /**
   * Record cycle count adjustment
   */
  const recordCycleCount = useCallback(async (
    itemId: string,
    locationId: string,
    systemQuantity: number,
    countedQuantity: number,
    countId: string,
    unitCost?: number,
    notes?: string
  ) => {
    const variance = countedQuantity - systemQuantity;
    const reason: AuditReason = variance > 0 ? 'found' : variance < 0 ? 'shrinkage' : 'correction';
    
    return recordAdjustment(
      itemId,
      locationId,
      systemQuantity,
      countedQuantity,
      'count',
      {
        reason,
        reference: countId,
        notes: notes || `Cycle count variance: ${variance} units`,
        unitCost,
        requiresApproval: Math.abs(variance) > 10,
      }
    );
  }, [recordAdjustment]);

  /**
   * Approve a pending adjustment
   */
  const approveAdjustment = useCallback(async (
    adjustmentId: string,
    approvalNotes?: string
  ) => {
    if (!options.userId) {
      throw new Error('User ID required for approval');
    }

    try {
      setIsLoading(true);
      await InventoryAuditService.approveAdjustment(adjustmentId, options.userId, approvalNotes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve adjustment');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [options.userId]);

  /**
   * Get audit summary for display
   */
  const getAuditSummary = useCallback(() => {
    const records = auditRecords?.iadjust || [];
    const totalAdjustments = records.length;
    const totalQuantityChange = records.reduce((sum, record) => sum + (record.quantityChange || 0), 0);
    const totalCostImpact = records.reduce((sum, record) => sum + (record.totalCostImpact || 0), 0);
    const pendingCount = pendingApprovals?.iadjust?.length || 0;

    return {
      totalAdjustments,
      totalQuantityChange,
      totalCostImpact,
      pendingApprovals: pendingCount,
      recentRecords: records.slice(0, 10),
    };
  }, [auditRecords, pendingApprovals]);

  return {
    // State
    currentSession,
    currentBatch,
    isLoading: isLoading || auditLoading,
    error,
    
    // Data
    auditRecords: auditRecords?.iadjust || [],
    pendingApprovals: pendingApprovals?.iadjust || [],
    activeSessions: activeSessions?.audit_sessions || [],
    
    // Session management
    startAuditSession,
    endAuditSession,
    
    // Batch management
    startAuditBatch,
    completeAuditBatch,
    
    // Adjustment recording
    recordAdjustment,
    recordSale,
    recordReceiving,
    recordCycleCount,
    
    // Approval
    approveAdjustment,
    
    // Utilities
    getAuditSummary,
    formatters: AuditFormatting,
    validation: AuditValidation,
  };
}