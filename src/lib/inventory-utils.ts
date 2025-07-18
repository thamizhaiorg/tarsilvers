/**
 * Inventory Management Utilities
 * Enhanced location-based inventory tracking with proper constraints and audit trails
 */

import { AppSchema } from '../../instant.schema';

// Type definitions for enhanced inventory tracking
export interface InventoryLocationData {
  storeId: string;
  itemId: string;
  locationId: string;
  onHand?: number;
  committed?: number;
  unavailable?: number;
  available?: number;
  reorderLevel?: number;
  reorderQuantity?: number;
  version?: number;
  isActive?: boolean;
}

export interface InventoryAdjustmentData {
  storeId: string;
  itemId: string;
  locationId: string;
  quantityBefore: number;
  quantityAfter: number;
  quantityChange: number;
  type: 'adjustment' | 'sale' | 'receive' | 'transfer' | 'count' | 'damage' | 'return';
  reason?: 'damaged' | 'expired' | 'lost' | 'found' | 'correction' | 'transfer_in' | 'transfer_out';
  reference?: string;
  userId?: string;
  userName?: string;
  userRole?: 'admin' | 'manager' | 'staff' | 'system';
  sessionId?: string;
  batchId?: string;
  notes?: string;
  deviceId?: string;
  unitCost?: number;
  requiresApproval?: boolean;
}

/**
 * Calculate available quantity with proper constraints
 * Available = OnHand - Committed - Unavailable
 */
export function calculateAvailableQuantity(
  onHand: number = 0,
  committed: number = 0,
  unavailable: number = 0
): number {
  // Ensure all values are non-negative
  const safeOnHand = Math.max(0, onHand);
  const safeCommitted = Math.max(0, committed);
  const safeUnavailable = Math.max(0, unavailable);
  
  // Calculate available, ensuring it doesn't go negative
  const available = safeOnHand - safeCommitted - safeUnavailable;
  return Math.max(0, available);
}

/**
 * Validate inventory location data with proper constraints
 */
export function validateInventoryLocationData(data: InventoryLocationData): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Required fields validation
  if (!data.storeId) errors.push('Store ID is required');
  if (!data.itemId) errors.push('Item ID is required');
  if (!data.locationId) errors.push('Location ID is required');

  // Quantity constraints - must be non-negative
  if (data.onHand !== undefined && data.onHand < 0) {
    errors.push('On hand quantity cannot be negative');
  }
  if (data.committed !== undefined && data.committed < 0) {
    errors.push('Committed quantity cannot be negative');
  }
  if (data.unavailable !== undefined && data.unavailable < 0) {
    errors.push('Unavailable quantity cannot be negative');
  }
  if (data.reorderLevel !== undefined && data.reorderLevel < 0) {
    errors.push('Reorder level cannot be negative');
  }
  if (data.reorderQuantity !== undefined && data.reorderQuantity < 0) {
    errors.push('Reorder quantity cannot be negative');
  }

  // Logical constraints
  const available = calculateAvailableQuantity(
    data.onHand,
    data.committed,
    data.unavailable
  );
  
  if (data.available !== undefined && Math.abs(data.available - available) > 0.01) {
    errors.push('Available quantity does not match calculated value');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate inventory adjustment data
 */
export function validateInventoryAdjustment(data: InventoryAdjustmentData): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Required fields validation
  if (!data.storeId) errors.push('Store ID is required');
  if (!data.itemId) errors.push('Item ID is required');
  if (!data.locationId) errors.push('Location ID is required');
  if (!data.type) errors.push('Adjustment type is required');

  // Quantity validation
  if (typeof data.quantityBefore !== 'number') {
    errors.push('Quantity before is required and must be a number');
  }
  if (typeof data.quantityAfter !== 'number') {
    errors.push('Quantity after is required and must be a number');
  }
  if (typeof data.quantityChange !== 'number') {
    errors.push('Quantity change is required and must be a number');
  }

  // Logical validation
  if (data.quantityBefore !== undefined && data.quantityAfter !== undefined && data.quantityChange !== undefined) {
    const expectedChange = data.quantityAfter - data.quantityBefore;
    if (Math.abs(data.quantityChange - expectedChange) > 0.01) {
      errors.push('Quantity change does not match the difference between before and after quantities');
    }
  }

  // Type validation
  const validTypes = ['adjustment', 'sale', 'receive', 'transfer', 'count', 'damage', 'return'];
  if (data.type && !validTypes.includes(data.type)) {
    errors.push(`Invalid adjustment type. Must be one of: ${validTypes.join(', ')}`);
  }

  // Reason validation (if provided)
  if (data.reason) {
    const validReasons = ['damaged', 'expired', 'lost', 'found', 'correction', 'transfer_in', 'transfer_out'];
    if (!validReasons.includes(data.reason)) {
      errors.push(`Invalid reason. Must be one of: ${validReasons.join(', ')}`);
    }
  }

  // Role validation (if provided)
  if (data.userRole) {
    const validRoles = ['admin', 'manager', 'staff', 'system'];
    if (!validRoles.includes(data.userRole)) {
      errors.push(`Invalid user role. Must be one of: ${validRoles.join(', ')}`);
    }
  }

  // Cost validation
  if (data.unitCost !== undefined && data.unitCost < 0) {
    errors.push('Unit cost cannot be negative');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Create a complete inventory location record with calculated fields
 */
export function createInventoryLocationRecord(data: InventoryLocationData): InventoryLocationData & {
  available: number;
  createdAt: Date;
  version: number;
  isActive: boolean;
} {
  const available = calculateAvailableQuantity(
    data.onHand,
    data.committed,
    data.unavailable
  );

  return {
    ...data,
    available,
    createdAt: new Date(),
    version: data.version || 1,
    isActive: data.isActive !== false, // Default to true unless explicitly false
  };
}

/**
 * Create a complete inventory adjustment record with audit trail
 */
export function createInventoryAdjustmentRecord(
  data: InventoryAdjustmentData,
  options: {
    generateSessionId?: boolean;
    calculateCostImpact?: boolean;
  } = {}
): InventoryAdjustmentData & {
  createdAt: Date;
  sessionId?: string;
  totalCostImpact?: number;
} {
  const record: any = {
    ...data,
    createdAt: new Date(),
  };

  // Generate session ID if requested
  if (options.generateSessionId) {
    record.sessionId = `adj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Calculate cost impact if unit cost is provided
  if (options.calculateCostImpact && data.unitCost !== undefined) {
    record.totalCostImpact = data.quantityChange * data.unitCost;
  }

  return record;
}

/**
 * Check if inventory location needs reordering
 */
export function needsReorder(locationData: InventoryLocationData): boolean {
  if (!locationData.reorderLevel || locationData.reorderLevel <= 0) {
    return false;
  }

  const available = calculateAvailableQuantity(
    locationData.onHand,
    locationData.committed,
    locationData.unavailable
  );

  return available <= locationData.reorderLevel;
}

/**
 * Generate audit trail summary for inventory adjustments
 */
export function generateAuditSummary(adjustments: InventoryAdjustmentData[]): {
  totalAdjustments: number;
  netQuantityChange: number;
  totalCostImpact: number;
  adjustmentsByType: Record<string, number>;
  adjustmentsByReason: Record<string, number>;
  adjustmentsByUser: Record<string, number>;
} {
  const summary = {
    totalAdjustments: adjustments.length,
    netQuantityChange: 0,
    totalCostImpact: 0,
    adjustmentsByType: {} as Record<string, number>,
    adjustmentsByReason: {} as Record<string, number>,
    adjustmentsByUser: {} as Record<string, number>,
  };

  adjustments.forEach(adj => {
    // Net quantity change
    summary.netQuantityChange += adj.quantityChange;

    // Total cost impact
    if (adj.totalCostImpact) {
      summary.totalCostImpact += adj.totalCostImpact;
    }

    // Group by type
    summary.adjustmentsByType[adj.type] = (summary.adjustmentsByType[adj.type] || 0) + 1;

    // Group by reason
    if (adj.reason) {
      summary.adjustmentsByReason[adj.reason] = (summary.adjustmentsByReason[adj.reason] || 0) + 1;
    }

    // Group by user
    if (adj.userName) {
      summary.adjustmentsByUser[adj.userName] = (summary.adjustmentsByUser[adj.userName] || 0) + 1;
    }
  });

  return summary;
}

/**
 * Validate item-location relationship constraints
 */
export function validateItemLocationConstraints(
  itemId: string,
  locationId: string,
  storeId: string,
  existingLocations: InventoryLocationData[]
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for duplicate item-location combinations
  const duplicate = existingLocations.find(
    loc => loc.itemId === itemId && 
           loc.locationId === locationId && 
           loc.storeId === storeId
  );

  if (duplicate) {
    errors.push('Item-location combination already exists');
  }

  // Check for inactive locations
  const inactiveLocation = existingLocations.find(
    loc => loc.locationId === locationId && loc.isActive === false
  );

  if (inactiveLocation) {
    warnings.push('Location is marked as inactive');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}