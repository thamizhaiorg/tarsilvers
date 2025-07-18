# Backward Compatibility Layer

The backward compatibility layer provides seamless transition support during database schema migration, ensuring that existing code continues to work while the schema is being updated.

## Overview

This layer provides:
- **Fallback queries** for legacy field access during transition
- **Data transformation middleware** for existing queries
- **Migration status tracking** and rollback capabilities
- **Performance monitoring** and safety checks

## Key Features

### 1. Legacy Field Mappings

The system automatically maps legacy field names to new field names:

```typescript
// Legacy field mappings
const LEGACY_FIELD_MAPPINGS = {
  products: {
    createdat: 'createdAt',
    updatedat: 'updatedAt',
    name: 'title',
    brand: 'brandId',
    category: 'categoryId',
    // ... more mappings
  },
  orders: {
    createdat: 'createdAt',
    updatedat: 'updatedAt',
    referid: 'referenceId',
    billaddrs: 'billingAddress',
    // ... more mappings
  },
  // ... other entities
};
```

### 2. Data Transformation

#### Input Transformation
Automatically converts legacy field names in input data:

```typescript
import { transformLegacyInput } from '../lib/backward-compatibility';

const legacyData = {
  name: 'Product Name',
  createdat: '2023-01-01',
  brand: 'brand-1'
};

const transformedData = transformLegacyInput('products', legacyData);
// Result: { title: 'Product Name', createdAt: '2023-01-01', brandId: 'brand-1' }
```

#### Output Enhancement
Adds legacy field names to query results for backward compatibility:

```typescript
import { addLegacyFields } from '../lib/backward-compatibility';

const products = [
  { id: '1', title: 'Product 1', createdAt: '2023-01-01', brandId: 'brand-1' }
];

const enhanced = addLegacyFields('products', products);
// Result includes both new and legacy field names
```

### 3. Compatibility Middleware

Use the middleware to wrap database operations:

```typescript
import { createCompatibilityMiddleware } from '../lib/backward-compatibility';

const middleware = createCompatibilityMiddleware();

// Transform query parameters
const query = {
  where: { name: 'Product Name', createdat: '2023-01-01' }
};
const transformedQuery = middleware.transformQuery('products', query);

// Wrap database queries
const result = await middleware.wrapQuery('products', storeId, async () => {
  return await db.query({ products: { $: transformedQuery } });
});
```

### 4. Migration Status Tracking

Track migration progress for each entity:

```typescript
import { 
  migrationStatusManager,
  initializeMigrationStatus,
  startMigration,
  completeMigration,
  getStoreMigrationStatus
} from '../lib/backward-compatibility';

// Initialize migration status
await initializeMigrationStatus('store-123');

// Start migration for an entity
startMigration('store-123', 'products');

// Complete migration
completeMigration('store-123', 'products');

// Get overall status
const status = getStoreMigrationStatus('store-123');
console.log(`Migration progress: ${status.overall.progressPercentage}%`);
```

### 5. Rollback Capabilities

Create backups and rollback if needed:

```typescript
import { migrationRollback } from '../lib/backward-compatibility';

// Create backup before migration
await migrationRollback.createBackup('store-123', 'products', {
  version: '1.0.0',
  description: 'Pre-migration backup',
  validateIntegrity: true
});

// Rollback if needed
await migrationRollback.restoreFromBackup('store-123', 'products', {
  validateBeforeRestore: true,
  createRestorePoint: true
});

// Verify backup integrity
const verification = migrationRollback.verifyBackup('store-123', 'products');
if (!verification.valid) {
  console.error('Backup issues:', verification.issues);
}
```

### 6. Batch Processing

Process large datasets in batches:

```typescript
import { BatchMigrationProcessor } from '../lib/backward-compatibility';

const processor = new BatchMigrationProcessor(100, 3); // 100 records per batch, 3 concurrent batches

const result = await processor.processBatchMigration(
  'store-123',
  'products',
  async (records) => {
    // Transform records
    return records.map(record => transformLegacyInput('products', record));
  },
  {
    onProgress: (processed, total) => {
      console.log(`Progress: ${processed}/${total}`);
    },
    onBatchComplete: (batchIndex, batchSize) => {
      console.log(`Batch ${batchIndex} completed: ${batchSize} records`);
    }
  }
);
```

### 7. Safety Checks

Assess if the compatibility layer can be safely disabled:

```typescript
import { safelyDisableCompatibilityLayer } from '../lib/backward-compatibility';

const assessment = await safelyDisableCompatibilityLayer('store-123');

if (assessment.canDisable) {
  console.log('✅ Compatibility layer can be safely disabled');
  console.log('Recommendations:', assessment.recommendations);
} else {
  console.log('❌ Issues found:', assessment.issues);
  console.log('Recommendations:', assessment.recommendations);
}
```

### 8. Emergency Rollback

Perform emergency rollback in case of critical issues:

```typescript
import { emergencyRollback } from '../lib/backward-compatibility';

const result = await emergencyRollback('store-123', {
  entities: ['products', 'orders'],
  reason: 'Critical data corruption detected',
  createEmergencyBackup: true
});

if (result.success) {
  console.log('✅ Emergency rollback completed successfully');
} else {
  console.log('❌ Emergency rollback failed:', result.errors);
}
```

## Usage Patterns

### During Migration

1. **Initialize migration status** for the store
2. **Create backups** before starting migration
3. **Use compatibility middleware** in existing queries
4. **Monitor migration progress** and performance
5. **Validate data consistency** throughout the process

### After Migration

1. **Assess safety** of disabling compatibility layer
2. **Gradually remove legacy field usage** from codebase
3. **Monitor performance** after disabling compatibility
4. **Keep backups** for a rollback period

### In Case of Issues

1. **Use emergency rollback** for critical problems
2. **Analyze rollback history** to understand issues
3. **Fix underlying problems** before retrying migration
4. **Validate data integrity** after rollback

## Performance Considerations

- The compatibility layer adds minimal overhead to queries
- Use `shouldApplyMiddleware()` to check if transformation is needed
- Monitor performance with `CompatibilityPerformanceMonitor`
- Disable the layer once migration is complete for optimal performance

## Best Practices

1. **Test thoroughly** before applying to production data
2. **Create comprehensive backups** before migration
3. **Monitor migration progress** and performance metrics
4. **Validate data integrity** at each step
5. **Plan rollback procedures** in advance
6. **Document migration steps** and decisions
7. **Communicate with team** about migration timeline
8. **Keep compatibility layer** until all systems are updated

## Error Handling

The compatibility layer includes comprehensive error handling:

- **Validation errors** for data integrity issues
- **Rollback failures** with detailed error messages
- **Performance monitoring** for slow operations
- **Safety checks** before disabling compatibility

## Configuration

The layer can be configured for different environments:

```typescript
// Enable persistence for production
migrationStatusManager.enablePersistence();

// Configure batch processing
const processor = new BatchMigrationProcessor(
  50,  // Smaller batches for production
  2    // Lower concurrency for stability
);

// Configure performance monitoring
compatibilityPerformanceMonitor.clearMetrics(); // Reset before migration
```

This backward compatibility layer ensures a smooth transition during schema migration while maintaining data integrity and system stability.