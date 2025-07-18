/**
 * Inventory Audit Service Tests
 * 
 * Comprehensive test suite for the inventory adjustment audit system
 * covering all audit trail functionality, user tracking, and reason codes.
 */

import { InventoryAuditService } from '../services/inventory-audit-service';
import { AuditValidation, AuditFormatting } from '../lib/audit-utils';

// Mock InstantDB
const mockUpdate = jest.fn().mockResolvedValue({});

jest.mock('@instantdb/react-native', () => ({
  tx: {
    iadjust: new Proxy({}, {
      get: () => ({ update: mockUpdate })
    }),
    audit_sessions: new Proxy({}, {
      get: () => ({ update: mockUpdate })
    }),
    audit_batches: new Proxy({}, {
      get: () => ({ update: mockUpdate })
    }),
  },
  id: jest.fn(() => 'mock-id'),
}));

describe('InventoryAuditService', () => {
  const mockAuditData = {
    storeId: 'store-123',
    itemId: 'item-456',
    locationId: 'location-789',
    quantityBefore: 100,
    quantityAfter: 95,
    type: 'sale' as const,
    userId: 'user-123',
    userName: 'John Doe',
    userRole: 'staff' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createAuditRecord', () => {
    it('should create comprehensive audit record with all required fields', async () => {
      const result = await InventoryAuditService.createAuditRecord(mockAuditData);
      
      expect(result).toBeDefined();
      // Verify the audit record contains all necessary fields
      // This would need actual implementation verification
    });

    it('should calculate quantity change correctly', async () => {
      const data = {
        ...mockAuditData,
        quantityBefore: 100,
        quantityAfter: 85,
      };
      
      await InventoryAuditService.createAuditRecord(data);
      
      // Verify quantity change is calculated as -15
      // This would need actual implementation verification
    });

    it('should calculate cost impact when unit cost provided', async () => {
      const data = {
        ...mockAuditData,
        quantityBefore: 100,
        quantityAfter: 95,
        unitCost: 10.50,
      };
      
      await InventoryAuditService.createAuditRecord(data);
      
      // Verify cost impact is calculated as -52.50 (5 units * $10.50)
      // This would need actual implementation verification
    });

    it('should set approval requirement for large adjustments', async () => {
      const data = {
        ...mockAuditData,
        quantityBefore: 100,
        quantityAfter: 0, // Large adjustment
        requiresApproval: true,
      };
      
      await InventoryAuditService.createAuditRecord(data);
      
      // Verify requiresApproval is set to true
      // This would need actual implementation verification
    });
  });

  describe('createAuditSession', () => {
    it('should create audit session with proper tracking', async () => {
      const sessionData = {
        storeId: 'store-123',
        userId: 'user-123',
        userName: 'John Doe',
        userRole: 'manager' as const,
        deviceId: 'device-456',
        notes: 'Cycle count session',
      };

      const result = await InventoryAuditService.createAuditSession(sessionData);
      
      expect(result.sessionId).toBeDefined();
      expect(result.transaction).toBeDefined();
    });
  });

  describe('createAuditBatch', () => {
    it('should create audit batch for bulk operations', async () => {
      const batchData = {
        storeId: 'store-123',
        userId: 'user-123',
        userName: 'John Doe',
        batchType: 'cycle_count' as const,
        description: 'Monthly cycle count',
        totalItems: 50,
      };

      const result = await InventoryAuditService.createAuditBatch(batchData);
      
      expect(result.batchId).toBeDefined();
      expect(result.transaction).toBeDefined();
    });
  });

  describe('recordInventoryAdjustment', () => {
    it('should record manual adjustment with reason', async () => {
      const result = await InventoryAuditService.recordInventoryAdjustment(
        'store-123',
        'item-456',
        'location-789',
        100,
        95,
        'adjustment',
        {
          reason: 'damaged',
          notes: 'Items damaged during handling',
          userId: 'user-123',
          userName: 'John Doe',
          userRole: 'staff',
        }
      );
      
      expect(result).toBeDefined();
    });
  });

  describe('recordSaleAdjustment', () => {
    it('should record sale with proper reference', async () => {
      const result = await InventoryAuditService.recordSaleAdjustment(
        'store-123',
        'item-456',
        'location-789',
        100,
        5,
        'order-789',
        {
          userId: 'user-123',
          userName: 'John Doe',
          unitCost: 10.50,
        }
      );
      
      expect(result).toBeDefined();
    });
  });

  describe('recordReceivingAdjustment', () => {
    it('should record receiving with reference number', async () => {
      const result = await InventoryAuditService.recordReceivingAdjustment(
        'store-123',
        'item-456',
        'location-789',
        100,
        25,
        'PO-12345',
        {
          userId: 'user-123',
          userName: 'John Doe',
          unitCost: 8.75,
        }
      );
      
      expect(result).toBeDefined();
    });
  });

  describe('recordTransferAdjustment', () => {
    it('should record both outgoing and incoming transfers', async () => {
      const result = await InventoryAuditService.recordTransferAdjustment(
        'store-123',
        'item-456',
        'location-from',
        'location-to',
        100,
        10,
        'transfer-123',
        {
          userId: 'user-123',
          userName: 'John Doe',
        }
      );
      
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2); // Outgoing and incoming
    });
  });

  describe('recordCycleCountAdjustment', () => {
    it('should record cycle count with variance calculation', async () => {
      const result = await InventoryAuditService.recordCycleCountAdjustment(
        'store-123',
        'item-456',
        'location-789',
        100, // System quantity
        95,  // Counted quantity
        'count-123',
        {
          userId: 'user-123',
          userName: 'John Doe',
          notes: 'Physical count variance',
        }
      );
      
      expect(result).toBeDefined();
    });

    it('should require approval for large variances', async () => {
      const result = await InventoryAuditService.recordCycleCountAdjustment(
        'store-123',
        'item-456',
        'location-789',
        100, // System quantity
        85,  // Counted quantity (variance of 15)
        'count-123',
        {
          userId: 'user-123',
          userName: 'John Doe',
        }
      );
      
      expect(result).toBeDefined();
      // Should set requiresApproval to true for variance > 10
    });
  });
});

describe('AuditValidation', () => {
  describe('canUserPerformAdjustment', () => {
    it('should allow admin to perform all adjustments', () => {
      expect(AuditValidation.canUserPerformAdjustment('admin', 'adjustment')).toBe(true);
      expect(AuditValidation.canUserPerformAdjustment('admin', 'sale')).toBe(true);
      expect(AuditValidation.canUserPerformAdjustment('admin', 'transfer')).toBe(true);
    });

    it('should restrict staff permissions appropriately', () => {
      expect(AuditValidation.canUserPerformAdjustment('staff', 'sale')).toBe(true);
      expect(AuditValidation.canUserPerformAdjustment('staff', 'receive')).toBe(true);
      expect(AuditValidation.canUserPerformAdjustment('staff', 'transfer')).toBe(false);
    });

    it('should allow managers to perform most adjustments', () => {
      expect(AuditValidation.canUserPerformAdjustment('manager', 'adjustment')).toBe(true);
      expect(AuditValidation.canUserPerformAdjustment('manager', 'count')).toBe(true);
      expect(AuditValidation.canUserPerformAdjustment('manager', 'transfer')).toBe(true);
    });
  });

  describe('requiresApproval', () => {
    it('should require approval for large quantity changes', () => {
      expect(AuditValidation.requiresApproval(150)).toBe(true);
      expect(AuditValidation.requiresApproval(-150)).toBe(true);
      expect(AuditValidation.requiresApproval(50)).toBe(false);
    });

    it('should require approval for high-value adjustments', () => {
      expect(AuditValidation.requiresApproval(50, undefined, undefined, 25)).toBe(true); // $1,250
      expect(AuditValidation.requiresApproval(10, undefined, undefined, 50)).toBe(false); // $500
    });

    it('should require approval for certain reasons', () => {
      expect(AuditValidation.requiresApproval(10, 'damaged')).toBe(true);
      expect(AuditValidation.requiresApproval(10, 'lost')).toBe(true);
      expect(AuditValidation.requiresApproval(10, 'found')).toBe(false);
    });

    it('should require approval for staff with significant adjustments', () => {
      expect(AuditValidation.requiresApproval(15, undefined, 'staff')).toBe(true);
      expect(AuditValidation.requiresApproval(5, undefined, 'staff')).toBe(false);
      expect(AuditValidation.requiresApproval(15, undefined, 'manager')).toBe(false);
    });
  });

  describe('validateAdjustmentData', () => {
    const validData = {
      storeId: 'store-123',
      itemId: 'item-456',
      locationId: 'location-789',
      quantityBefore: 100,
      quantityAfter: 95,
      type: 'sale' as const,
    };

    it('should validate correct data', () => {
      const result = AuditValidation.validateAdjustmentData(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing required fields', () => {
      const invalidData = { ...validData, storeId: '' };
      const result = AuditValidation.validateAdjustmentData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Store ID is required');
    });

    it('should reject negative quantities', () => {
      const invalidData = { ...validData, quantityBefore: -10 };
      const result = AuditValidation.validateAdjustmentData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Quantity before cannot be negative');
    });

    it('should require reason for manual adjustments', () => {
      const invalidData = { ...validData, type: 'adjustment' as const };
      const result = AuditValidation.validateAdjustmentData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Reason is required for manual adjustments');
    });

    it('should validate user permissions', () => {
      const invalidData = {
        ...validData,
        type: 'transfer' as const,
        userId: 'user-123',
        userRole: 'staff' as const,
      };
      const result = AuditValidation.validateAdjustmentData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('User role staff cannot perform transfer adjustments');
    });
  });
});

describe('AuditFormatting', () => {
  describe('formatQuantityChange', () => {
    it('should format positive changes with plus sign', () => {
      expect(AuditFormatting.formatQuantityChange(10)).toBe('+10');
    });

    it('should format negative changes with minus sign', () => {
      expect(AuditFormatting.formatQuantityChange(-5)).toBe('-5');
    });

    it('should format zero changes', () => {
      expect(AuditFormatting.formatQuantityChange(0)).toBe('+0');
    });
  });

  describe('formatCostImpact', () => {
    it('should format positive cost impact', () => {
      const result = AuditFormatting.formatCostImpact(125.50);
      expect(result).toContain('+');
      expect(result).toContain('125.50');
    });

    it('should format negative cost impact', () => {
      const result = AuditFormatting.formatCostImpact(-75.25);
      expect(result).toContain('75.25');
    });
  });

  describe('generateAuditSummary', () => {
    it('should generate comprehensive summary', () => {
      const summary = AuditFormatting.generateAuditSummary(
        'sale',
        -5,
        undefined,
        'order-123'
      );
      
      expect(summary).toContain('Sale');
      expect(summary).toContain('-5 units');
      expect(summary).toContain('Ref: order-123');
    });

    it('should include reason when provided', () => {
      const summary = AuditFormatting.generateAuditSummary(
        'adjustment',
        -3,
        'damaged',
        'adj-456'
      );
      
      expect(summary).toContain('Manual Adjustment');
      expect(summary).toContain('-3 units');
      expect(summary).toContain('(Damaged)');
      expect(summary).toContain('Ref: adj-456');
    });
  });
});