/**
 * Audit Utilities
 * 
 * Utility functions for managing audit trails, reason codes, and validation
 * for inventory adjustments and stock movements.
 */

import type { AuditType, AuditReason, UserRole, BatchType } from '../services/inventory-audit-service';

// Reason code definitions with descriptions
export const AUDIT_REASONS: Record<AuditReason, { label: string; description: string; requiresApproval?: boolean }> = {
  damaged: {
    label: 'Damaged',
    description: 'Items damaged or broken beyond use',
    requiresApproval: true,
  },
  expired: {
    label: 'Expired',
    description: 'Items past expiration date',
    requiresApproval: true,
  },
  lost: {
    label: 'Lost/Stolen',
    description: 'Items lost, stolen, or missing',
    requiresApproval: true,
  },
  found: {
    label: 'Found',
    description: 'Items found during inventory count',
  },
  correction: {
    label: 'Correction',
    description: 'Data entry or system correction',
  },
  transfer_in: {
    label: 'Transfer In',
    description: 'Incoming transfer from another location',
  },
  transfer_out: {
    label: 'Transfer Out',
    description: 'Outgoing transfer to another location',
  },
  shrinkage: {
    label: 'Shrinkage',
    description: 'Unexplained inventory loss',
    requiresApproval: true,
  },
  promotion: {
    label: 'Promotion',
    description: 'Promotional giveaway or marketing sample',
  },
  sample: {
    label: 'Sample/Demo',
    description: 'Used for demonstration or sampling',
  },
};

// Audit type definitions with descriptions
export const AUDIT_TYPES: Record<AuditType, { label: string; description: string; icon?: string }> = {
  adjustment: {
    label: 'Manual Adjustment',
    description: 'Manual stock level adjustment',
    icon: '⚖️',
  },
  sale: {
    label: 'Sale',
    description: 'Stock reduction from sale transaction',
    icon: '💰',
  },
  receive: {
    label: 'Receiving',
    description: 'Stock increase from receiving inventory',
    icon: '📦',
  },
  transfer: {
    label: 'Transfer',
    description: 'Stock movement between locations',
    icon: '🔄',
  },
  count: {
    label: 'Cycle Count',
    description: 'Adjustment from physical inventory count',
    icon: '📊',
  },
  damage: {
    label: 'Damage',
    description: 'Stock reduction due to damage',
    icon: '💥',
  },
  return: {
    label: 'Return',
    description: 'Stock increase from customer return',
    icon: '↩️',
  },
  correction: {
    label: 'Correction',
    description: 'System or data correction',
    icon: '🔧',
  },
};

// User role definitions
export const USER_ROLES: Record<UserRole, { label: string; permissions: string[] }> = {
  admin: {
    label: 'Administrator',
    permissions: ['all_adjustments', 'approve_adjustments', 'reverse_adjustments', 'bulk_operations'],
  },
  manager: {
    label: 'Manager',
    permissions: ['manual_adjustments', 'approve_small_adjustments', 'cycle_counts', 'transfers'],
  },
  staff: {
    label: 'Staff',
    permissions: ['basic_adjustments', 'sales', 'receiving'],
  },
  system: {
    label: 'System',
    permissions: ['automated_adjustments', 'sales', 'system_corrections'],
  },
};

// Batch type definitions
export const BATCH_TYPES: Record<BatchType, { label: string; description: string }> = {
  bulk_adjustment: {
    label: 'Bulk Adjustment',
    description: 'Multiple inventory adjustments processed together',
  },
  cycle_count: {
    label: 'Cycle Count',
    description: 'Physical inventory count batch',
  },
  transfer: {
    label: 'Transfer',
    description: 'Inventory transfer between locations',
  },
  receiving: {
    label: 'Receiving',
    description: 'Batch receiving of inventory',
  },
};

/**
 * Validation utilities for audit data
 */
export class AuditValidation {
  /**
   * Validate if user has permission for adjustment type
   */
  static canUserPerformAdjustment(userRole: UserRole, adjustmentType: AuditType): boolean {
    const rolePermissions = USER_ROLES[userRole]?.permissions || [];
    
    switch (adjustmentType) {
      case 'adjustment':
        return rolePermissions.includes('manual_adjustments') || rolePermissions.includes('all_adjustments');
      case 'sale':
        return rolePermissions.includes('sales') || rolePermissions.includes('all_adjustments');
      case 'receive':
        return rolePermissions.includes('receiving') || rolePermissions.includes('all_adjustments');
      case 'transfer':
        return rolePermissions.includes('transfers') || rolePermissions.includes('all_adjustments');
      case 'count':
        return rolePermissions.includes('cycle_counts') || rolePermissions.includes('all_adjustments');
      case 'correction':
        return rolePermissions.includes('system_corrections') || rolePermissions.includes('all_adjustments');
      default:
        return rolePermissions.includes('all_adjustments');
    }
  }

  /**
   * Check if adjustment requires approval based on quantity and reason
   */
  static requiresApproval(
    quantityChange: number, 
    reason?: AuditReason, 
    userRole?: UserRole,
    unitCost?: number
  ): boolean {
    // Large quantity changes always require approval
    if (Math.abs(quantityChange) > 100) {
      return true;
    }

    // High-value adjustments require approval
    if (unitCost && Math.abs(quantityChange * unitCost) > 1000) {
      return true;
    }

    // Certain reasons always require approval
    if (reason && AUDIT_REASONS[reason]?.requiresApproval) {
      return true;
    }

    // Staff-level users need approval for significant adjustments
    if (userRole === 'staff' && Math.abs(quantityChange) > 10) {
      return true;
    }

    return false;
  }

  /**
   * Validate adjustment data
   */
  static validateAdjustmentData(data: {
    storeId: string;
    itemId: string;
    locationId: string;
    quantityBefore: number;
    quantityAfter: number;
    type: AuditType;
    reason?: AuditReason;
    userId?: string;
    userRole?: UserRole;
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!data.storeId) errors.push('Store ID is required');
    if (!data.itemId) errors.push('Item ID is required');
    if (!data.locationId) errors.push('Location ID is required');
    if (typeof data.quantityBefore !== 'number') errors.push('Quantity before must be a number');
    if (typeof data.quantityAfter !== 'number') errors.push('Quantity after must be a number');
    if (!data.type) errors.push('Adjustment type is required');

    // Quantity validation
    if (data.quantityBefore < 0) errors.push('Quantity before cannot be negative');
    if (data.quantityAfter < 0) errors.push('Quantity after cannot be negative');

    // User permission validation
    if (data.userId && data.userRole && !this.canUserPerformAdjustment(data.userRole, data.type)) {
      errors.push(`User role ${data.userRole} cannot perform ${data.type} adjustments`);
    }

    // Reason validation for certain types
    if (data.type === 'adjustment' && !data.reason) {
      errors.push('Reason is required for manual adjustments');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Formatting utilities for audit display
 */
export class AuditFormatting {
  /**
   * Format quantity change for display
   */
  static formatQuantityChange(quantityChange: number): string {
    const sign = quantityChange >= 0 ? '+' : '';
    return `${sign}${quantityChange}`;
  }

  /**
   * Format cost impact for display
   */
  static formatCostImpact(costImpact: number, currency = 'USD'): string {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    });
    
    const sign = costImpact >= 0 ? '+' : '';
    return `${sign}${formatter.format(Math.abs(costImpact))}`;
  }

  /**
   * Format audit type for display
   */
  static formatAuditType(type: AuditType): string {
    return AUDIT_TYPES[type]?.label || type;
  }

  /**
   * Format audit reason for display
   */
  static formatAuditReason(reason: AuditReason): string {
    return AUDIT_REASONS[reason]?.label || reason;
  }

  /**
   * Get audit type icon
   */
  static getAuditTypeIcon(type: AuditType): string {
    return AUDIT_TYPES[type]?.icon || '📝';
  }

  /**
   * Format date for audit display
   */
  static formatAuditDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  /**
   * Generate audit summary text
   */
  static generateAuditSummary(
    type: AuditType,
    quantityChange: number,
    reason?: AuditReason,
    reference?: string
  ): string {
    const typeLabel = this.formatAuditType(type);
    const changeText = this.formatQuantityChange(quantityChange);
    const reasonText = reason ? ` (${this.formatAuditReason(reason)})` : '';
    const refText = reference ? ` - Ref: ${reference}` : '';
    
    return `${typeLabel}: ${changeText} units${reasonText}${refText}`;
  }
}

/**
 * Query utilities for audit data
 */
export class AuditQueries {
  /**
   * Generate filter for audit records by date range
   */
  static dateRangeFilter(startDate: Date, endDate: Date) {
    return {
      createdAt: {
        $gte: startDate,
        $lte: endDate,
      },
    };
  }

  /**
   * Generate filter for audit records by user
   */
  static userFilter(userId: string) {
    return { userId };
  }

  /**
   * Generate filter for audit records by type
   */
  static typeFilter(type: AuditType) {
    return { type };
  }

  /**
   * Generate filter for audit records by reason
   */
  static reasonFilter(reason: AuditReason) {
    return { reason };
  }

  /**
   * Generate filter for pending approvals
   */
  static pendingApprovalsFilter() {
    return {
      requiresApproval: true,
      approvedAt: null,
    };
  }

  /**
   * Generate filter for high-value adjustments
   */
  static highValueFilter(threshold = 1000) {
    return {
      totalCostImpact: {
        $gte: threshold,
      },
    };
  }
}