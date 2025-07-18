# Inventory Adjustment Audit System

## Overview

The Inventory Adjustment Audit System provides comprehensive tracking and auditing capabilities for all inventory movements in the TAR POS system. This system ensures complete accountability, regulatory compliance, and operational transparency for all stock adjustments.

## Features

### 1. Comprehensive Audit Trail
- **Complete Transaction History**: Every inventory adjustment is recorded with full context
- **User Tracking**: Detailed user information including ID, name, role, and device
- **Timestamp Precision**: Exact timing of all adjustments with timezone support
- **Reference Tracking**: Links to orders, transfers, counts, and other business processes
- **Cost Impact Analysis**: Financial impact tracking for all adjustments

### 2. Reason Code System
- **Standardized Reasons**: Predefined reason codes for consistent categorization
- **Approval Requirements**: Automatic approval workflows for sensitive reasons
- **Custom Notes**: Additional context and explanations for adjustments
- **Damage Tracking**: Specific handling for damaged, expired, or lost inventory

### 3. Session and Batch Management
- **Audit Sessions**: Group related adjustments into logical sessions
- **Batch Operations**: Handle bulk adjustments with progress tracking
- **Session Analytics**: Real-time statistics and summaries
- **Batch Status Tracking**: Monitor progress of large operations

### 4. Approval Workflow
- **Risk-Based Approval**: Automatic approval requirements based on value and quantity
- **Role-Based Permissions**: Different approval thresholds for different user roles
- **Approval History**: Complete record of who approved what and when
- **Escalation Support**: Framework for complex approval workflows

### 5. Data Validation
- **Input Validation**: Comprehensive validation of all adjustment data
- **Permission Checking**: Ensure users can only perform authorized adjustments
- **Business Rule Enforcement**: Prevent invalid adjustments and maintain data integrity
- **Constraint Validation**: Enforce business constraints and limits

## Architecture

### Core Components

#### 1. InventoryAuditService
The main service class that handles all audit operations:

```typescript
// Record a basic inventory adjustment
await InventoryAuditService.recordInventoryAdjustment(
  storeId,
  itemId,
  locationId,
  quantityBefore,
  quantityAfter,
  'adjustment',
  {
    reason: 'damaged',
    notes: 'Items damaged during handling',
    userId: 'user-123',
    userName: 'John Doe',
    userRole: 'staff',
  }
);

// Record a sale adjustment
await InventoryAuditService.recordSaleAdjustment(
  storeId,
  itemId,
  locationId,
  quantityBefore,
  quantitySold,
  orderId,
  { userId, userName, unitCost }
);

// Record a cycle count adjustment
await InventoryAuditService.recordCycleCountAdjustment(
  storeId,
  itemId,
  locationId,
  systemQuantity,
  countedQuantity,
  countId,
  { userId, userName, notes }
);
```

#### 2. AuditValidation Utilities
Validation and permission checking:

```typescript
// Check user permissions
const canAdjust = AuditValidation.canUserPerformAdjustment('staff', 'adjustment');

// Check if approval is required
const needsApproval = AuditValidation.requiresApproval(
  quantityChange,
  reason,
  userRole,
  unitCost
);

// Validate adjustment data
const validation = AuditValidation.validateAdjustmentData(adjustmentData);
```

#### 3. AuditFormatting Utilities
Display and formatting helpers:

```typescript
// Format quantity changes
const changeText = AuditFormatting.formatQuantityChange(-5); // "-5"

// Format cost impact
const costText = AuditFormatting.formatCostImpact(-52.50); // "-$52.50"

// Generate audit summary
const summary = AuditFormatting.generateAuditSummary(
  'sale',
  -5,
  undefined,
  'order-123'
); // "Sale: -5 units - Ref: order-123"
```

#### 4. useInventoryAudit Hook
React hook for managing audit operations:

```typescript
const {
  currentSession,
  currentBatch,
  auditRecords,
  pendingApprovals,
  startAuditSession,
  recordAdjustment,
  approveAdjustment,
  getAuditSummary,
} = useInventoryAudit({
  storeId,
  userId,
  userName,
  userRole,
});
```

### Database Schema

#### iadjust Entity
The main audit record entity:

```typescript
iadjust: i.entity({
  // Required tracking fields
  storeId: i.string().indexed(),
  itemId: i.string().indexed(),
  locationId: i.string().indexed(),
  
  // Quantity tracking
  quantityBefore: i.number(),
  quantityAfter: i.number(),
  quantityChange: i.number(),
  
  // Audit metadata
  type: i.string().indexed(), // 'adjustment', 'sale', 'receive', etc.
  reason: i.string().indexed().optional(),
  reference: i.string().indexed().optional(),
  
  // User tracking
  userId: i.string().indexed().optional(),
  userName: i.string().indexed().optional(),
  userRole: i.string().indexed().optional(),
  
  // Timestamps and session tracking
  createdAt: i.date().indexed(),
  sessionId: i.string().indexed().optional(),
  batchId: i.string().indexed().optional(),
  
  // Additional context
  notes: i.string().optional(),
  deviceId: i.string().indexed().optional(),
  ipAddress: i.string().optional(),
  
  // Financial tracking
  unitCost: i.number().optional(),
  totalCostImpact: i.number().optional(),
  
  // Approval workflow
  requiresApproval: i.boolean().indexed().optional(),
  approvedBy: i.string().indexed().optional(),
  approvedAt: i.date().indexed().optional(),
  approvalNotes: i.string().optional(),
  
  // Data integrity
  version: i.number().optional(),
  isReversed: i.boolean().indexed().optional(),
  reversalReference: i.string().indexed().optional(),
})
```

#### audit_sessions Entity
Session management for grouped adjustments:

```typescript
audit_sessions: i.entity({
  sessionId: i.string().unique().indexed(),
  storeId: i.string().indexed(),
  userId: i.string().indexed().optional(),
  userName: i.string().indexed().optional(),
  userRole: i.string().indexed().optional(),
  deviceId: i.string().indexed().optional(),
  ipAddress: i.string().optional(),
  startedAt: i.date().indexed(),
  endedAt: i.date().indexed().optional(),
  totalAdjustments: i.number().optional(),
  totalQuantityChange: i.number().optional(),
  totalCostImpact: i.number().optional(),
  notes: i.string().optional(),
  isActive: i.boolean().indexed().optional(),
})
```

#### audit_batches Entity
Batch operation tracking:

```typescript
audit_batches: i.entity({
  batchId: i.string().unique().indexed(),
  storeId: i.string().indexed(),
  sessionId: i.string().indexed().optional(),
  userId: i.string().indexed().optional(),
  userName: i.string().indexed().optional(),
  batchType: i.string().indexed(), // 'bulk_adjustment', 'cycle_count', etc.
  description: i.string().optional(),
  createdAt: i.date().indexed(),
  completedAt: i.date().indexed().optional(),
  totalItems: i.number().optional(),
  processedItems: i.number().optional(),
  totalQuantityChange: i.number().optional(),
  totalCostImpact: i.number().optional(),
  status: i.string().indexed(), // 'pending', 'processing', 'completed', 'failed'
  errorCount: i.number().optional(),
  notes: i.string().optional(),
})
```

## Usage Examples

### Basic Inventory Adjustment

```typescript
import { useInventoryAudit } from '../hooks/useInventoryAudit';

function InventoryAdjustmentForm() {
  const { recordAdjustment } = useInventoryAudit({
    storeId: 'store-123',
    userId: 'user-456',
    userName: 'John Doe',
    userRole: 'staff',
  });

  const handleAdjustment = async () => {
    try {
      const result = await recordAdjustment(
        'item-789',      // itemId
        'location-123',  // locationId
        100,             // quantityBefore
        95,              // quantityAfter
        'adjustment',    // type
        {
          reason: 'damaged',
          notes: 'Items damaged during handling',
          unitCost: 10.50,
        }
      );

      if (result.requiresApproval) {
        alert('Adjustment recorded and sent for approval');
      } else {
        alert('Adjustment recorded successfully');
      }
    } catch (error) {
      alert('Failed to record adjustment: ' + error.message);
    }
  };

  return (
    <button onClick={handleAdjustment}>
      Record Adjustment
    </button>
  );
}
```

### Session Management

```typescript
function CycleCountSession() {
  const {
    currentSession,
    startAuditSession,
    endAuditSession,
    recordCycleCount,
  } = useInventoryAudit({
    storeId: 'store-123',
    userId: 'user-456',
    userName: 'Jane Smith',
    userRole: 'manager',
  });

  const handleStartSession = async () => {
    await startAuditSession('Monthly cycle count session');
  };

  const handleEndSession = async () => {
    await endAuditSession('Cycle count completed');
  };

  const handleCycleCount = async (itemId, locationId, systemQty, countedQty) => {
    await recordCycleCount(
      itemId,
      locationId,
      systemQty,
      countedQty,
      'count-' + Date.now(),
      10.50, // unitCost
      'Physical count variance noted'
    );
  };

  return (
    <div>
      {currentSession ? (
        <div>
          <p>Active Session: {currentSession.sessionId}</p>
          <p>Adjustments: {currentSession.totalAdjustments}</p>
          <button onClick={handleEndSession}>End Session</button>
        </div>
      ) : (
        <button onClick={handleStartSession}>Start Cycle Count</button>
      )}
    </div>
  );
}
```

### Approval Workflow

```typescript
function ApprovalPanel() {
  const {
    pendingApprovals,
    approveAdjustment,
    formatters,
  } = useInventoryAudit({
    storeId: 'store-123',
    userId: 'manager-123',
    userName: 'Manager Smith',
    userRole: 'manager',
  });

  const handleApprove = async (adjustmentId) => {
    try {
      await approveAdjustment(adjustmentId, 'Approved after review');
      alert('Adjustment approved');
    } catch (error) {
      alert('Failed to approve: ' + error.message);
    }
  };

  return (
    <div>
      <h3>Pending Approvals ({pendingApprovals.length})</h3>
      {pendingApprovals.map(record => (
        <div key={record.id} className="approval-item">
          <p>
            {formatters.getAuditTypeIcon(record.type)} 
            {formatters.formatAuditType(record.type)}
          </p>
          <p>
            Change: {formatters.formatQuantityChange(record.quantityChange)}
            {record.totalCostImpact && 
              ` (${formatters.formatCostImpact(record.totalCostImpact)})`
            }
          </p>
          <p>Reason: {formatters.formatAuditReason(record.reason)}</p>
          <button onClick={() => handleApprove(record.id)}>
            Approve
          </button>
        </div>
      ))}
    </div>
  );
}
```

## Audit Types and Reasons

### Audit Types
- **adjustment**: Manual stock adjustment
- **sale**: Stock reduction from sale transaction
- **receive**: Stock increase from receiving inventory
- **transfer**: Stock movement between locations
- **count**: Adjustment from physical inventory count
- **damage**: Stock reduction due to damage
- **return**: Stock increase from customer return
- **correction**: System or data correction

### Reason Codes
- **damaged**: Items damaged or broken beyond use
- **expired**: Items past expiration date
- **lost**: Items lost, stolen, or missing
- **found**: Items found during inventory count
- **correction**: Data entry or system correction
- **transfer_in**: Incoming transfer from another location
- **transfer_out**: Outgoing transfer to another location
- **shrinkage**: Unexplained inventory loss
- **promotion**: Promotional giveaway or marketing sample
- **sample**: Used for demonstration or sampling

## User Roles and Permissions

### Admin
- All adjustment types
- Approve all adjustments
- Reverse adjustments
- Bulk operations

### Manager
- Manual adjustments
- Approve small adjustments
- Cycle counts
- Transfers

### Staff
- Basic adjustments
- Sales
- Receiving
- Limited approval authority

### System
- Automated adjustments
- Sales
- System corrections

## Best Practices

### 1. Session Management
- Start sessions for related adjustments
- Use descriptive session notes
- End sessions promptly after completion
- Monitor session statistics

### 2. Batch Operations
- Use batches for bulk adjustments
- Monitor batch progress
- Handle errors gracefully
- Complete batches properly

### 3. Approval Workflow
- Set appropriate approval thresholds
- Review high-value adjustments carefully
- Document approval decisions
- Monitor pending approvals regularly

### 4. Data Quality
- Always provide reason codes for manual adjustments
- Include detailed notes for unusual adjustments
- Validate data before submission
- Monitor for patterns that indicate issues

### 5. Security
- Implement proper user authentication
- Log all audit activities
- Monitor for suspicious patterns
- Regular audit trail reviews

## Monitoring and Reporting

### Key Metrics
- Total adjustments per period
- Adjustment types distribution
- User activity patterns
- Approval rates and times
- Cost impact analysis
- Error rates and patterns

### Alerts and Notifications
- Large adjustments requiring approval
- Unusual adjustment patterns
- Failed batch operations
- Pending approvals exceeding thresholds
- System errors and exceptions

## Integration Points

### Inventory Management
- Real-time inventory updates
- Location-based tracking
- Quantity validation
- Cost basis updates

### Order Processing
- Automatic sale adjustments
- Return processing
- Fulfillment tracking
- Allocation management

### Reporting System
- Audit trail reports
- Financial impact reports
- User activity reports
- Compliance reports

### External Systems
- ERP integration
- Accounting system sync
- Regulatory reporting
- Third-party auditing tools

## Compliance and Regulatory

### Audit Requirements
- Complete transaction history
- User accountability
- Timestamp accuracy
- Data immutability
- Approval documentation

### Data Retention
- Long-term audit trail storage
- Archival strategies
- Backup and recovery
- Data integrity verification

### Regulatory Compliance
- SOX compliance support
- Industry-specific requirements
- Data privacy regulations
- International standards

This comprehensive audit system ensures complete accountability and transparency for all inventory movements while providing the flexibility and usability required for daily operations.