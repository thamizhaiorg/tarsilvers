# TAR POS Database Development Best Practices

## Overview

This document establishes best practices for database schema development, query optimization, and data validation in the TAR POS system. These guidelines ensure consistency, performance, and maintainability across the application.

## Schema Design Principles

### 1. Entity Design Standards

#### Field Naming Conventions
```typescript
// ✅ Good: Consistent camelCase naming
createdAt: i.date()
updatedAt: i.date().optional()
billingAddress: i.json().optional()

// ❌ Bad: Inconsistent naming
createdat: i.date()
updatedat: i.date().optional()
billaddrs: i.string().optional()
```

#### Required vs Optional Fields
```typescript
// ✅ Good: Business-critical fields are required
products: i.entity({
  title: i.string(),           // Required - essential for product
  storeId: i.string().indexed(), // Required - business constraint
  description: i.string().optional(), // Optional - supplementary info
})

// ❌ Bad: Critical fields marked optional
products: i.entity({
  title: i.string().optional(),  // Should be required
  storeId: i.string().optional(), // Should be required
})
```

#### Data Type Selection
```typescript
// ✅ Good: Appropriate data types
price: i.number(),              // Numeric for calculations
status: i.string().indexed(),   // String for enums
metadata: i.json(),             // JSON for structured data
createdAt: i.date(),           // Date for timestamps

// ❌ Bad: Inappropriate types
price: i.string(),             // Should be number
metadata: i.any(),             // Should be json
createdAt: i.string(),         // Should be date
```

### 2. Relationship Design

#### Proper Foreign Key Relationships
```typescript
// ✅ Good: Proper relationship fields
products: i.entity({
  brandId: i.string().indexed().optional(),    // Links to brands entity
  categoryId: i.string().indexed().optional(), // Links to categories entity
})

// Define the relationship
links: {
  productsBrand: {
    forward: { on: "products", has: "one", label: "brand" },
    reverse: { on: "brands", has: "many", label: "products" }
  }
}

// ❌ Bad: String fields instead of relationships
products: i.entity({
  brand: i.string().optional(),    // Should be brandId relationship
  category: i.string().optional(), // Should be categoryId relationship
})
```

#### Relationship Naming Conventions
```typescript
// ✅ Good: Clear relationship names
productsBrand: { /* relationship definition */ }
ordersCustomer: { /* relationship definition */ }
inventoryLocation: { /* relationship definition */ }

// ❌ Bad: Unclear relationship names
prodBrand: { /* unclear */ }
orderCust: { /* abbreviated */ }
```

### 3. Index Strategy

#### Search Field Indexing
```typescript
// ✅ Good: Index fields used for search
products: i.entity({
  title: i.string().indexed(),    // Searched frequently
  sku: i.string().indexed().optional(),     // Looked up by value
  barcode: i.string().indexed().optional(), // Scanned frequently
})
```

#### Filter Field Indexing
```typescript
// ✅ Good: Index fields used for filtering
products: i.entity({
  status: i.string().indexed(),     // Filtered by status
  pos: i.boolean().indexed(),       // Filtered for POS visibility
  featured: i.boolean().indexed(),  // Filtered for featured products
})
```

#### Relationship Field Indexing
```typescript
// ✅ Good: Index foreign key fields
products: i.entity({
  storeId: i.string().indexed(),    // Always filtered by store
  brandId: i.string().indexed().optional(),   // Used in joins
  categoryId: i.string().indexed().optional(), // Used in joins
})
```

## Query Optimization Patterns

### 1. Efficient Query Structure

#### Use Specific Field Selection
```typescript
// ✅ Good: Select only needed fields
const { data: products } = db.useQuery({
  products: {
    title: true,
    price: true,
    status: true,
    brand: {
      name: true
    }
  }
});

// ❌ Bad: Select all fields when not needed
const { data: products } = db.useQuery({
  products: {} // Selects all fields
});
```

#### Optimize Filtering
```typescript
// ✅ Good: Use indexed fields for filtering
const { data: products } = db.useQuery({
  products: {
    $: {
      where: {
        storeId: currentStore.id,  // Indexed field
        status: 'active',          // Indexed field
        pos: true                  // Indexed field
      }
    }
  }
});

// ❌ Bad: Filter on non-indexed fields
const { data: products } = db.useQuery({
  products: {
    $: {
      where: {
        description: { $like: '%keyword%' } // Not indexed
      }
    }
  }
});
```

#### Limit Result Sets
```typescript
// ✅ Good: Use pagination for large datasets
const { data: orders } = db.useQuery({
  orders: {
    $: {
      where: { storeId: currentStore.id },
      limit: 50,
      offset: page * 50
    }
  }
});
```

### 2. Relationship Query Optimization

#### Efficient Relationship Loading
```typescript
// ✅ Good: Load related data in single query
const { data: orders } = db.useQuery({
  orders: {
    customer: {
      firstName: true,
      lastName: true,
      email: true
    },
    orderitems: {
      title: true,
      quantity: true,
      price: true,
      product: {
        title: true,
        sku: true
      }
    }
  }
});

// ❌ Bad: Multiple separate queries
const { data: orders } = db.useQuery({ orders: {} });
// Then separate queries for customers and items
```

#### Composite Index Usage
```typescript
// ✅ Good: Query patterns that use composite indexes
const { data: inventory } = db.useQuery({
  inventory: {
    $: {
      where: {
        storeId: store.id,      // First part of composite index
        locationId: location.id  // Second part of composite index
      }
    }
  }
});
```

### 3. Performance Monitoring

#### Query Performance Tracking
```typescript
// ✅ Good: Monitor query performance
const startTime = performance.now();
const { data } = db.useQuery(query);
const endTime = performance.now();

if (endTime - startTime > 1000) {
  console.warn('Slow query detected:', query, `${endTime - startTime}ms`);
}
```

## Data Validation Standards

### 1. Field Validation Rules

#### Numeric Field Validation
```typescript
// ✅ Good: Proper numeric constraints
products: i.entity({
  price: i.number().min(0),        // Non-negative prices
  cost: i.number().min(0),         // Non-negative costs
  weight: i.number().min(0),       // Non-negative weights
})

// Validation in service layer
export const validatePrice = (price: number): boolean => {
  return price >= 0 && price <= 999999.99; // Reasonable range
};
```

#### String Field Validation
```typescript
// ✅ Good: String length and format validation
customers: i.entity({
  email: i.string().optional(),    // Validated separately for format
  phone: i.string().optional(),    // Validated separately for format
  firstName: i.string().optional(),
})

// Validation functions
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
  return phoneRegex.test(phone) && phone.length >= 10;
};
```

#### Required Field Enforcement
```typescript
// ✅ Good: Validate required fields before saving
export const validateProduct = (product: Partial<Product>): ValidationResult => {
  const errors: string[] = [];
  
  if (!product.title?.trim()) {
    errors.push('Product title is required');
  }
  
  if (!product.storeId) {
    errors.push('Store ID is required');
  }
  
  if (product.price !== undefined && product.price < 0) {
    errors.push('Price cannot be negative');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
```

### 2. Uniqueness Constraints

#### SKU Uniqueness Within Store
```typescript
// ✅ Good: Validate SKU uniqueness within store scope
export const validateSKUUniqueness = async (
  sku: string, 
  storeId: string, 
  excludeProductId?: string
): Promise<boolean> => {
  const { data: existingProducts } = await db.query({
    products: {
      $: {
        where: {
          sku: sku,
          storeId: storeId,
          ...(excludeProductId && { id: { $ne: excludeProductId } })
        }
      }
    }
  });
  
  return existingProducts.length === 0;
};
```

#### Order Number Uniqueness
```typescript
// ✅ Good: Generate unique order numbers
export const generateOrderNumber = async (storeId: string): Promise<string> => {
  let orderNumber: string;
  let isUnique = false;
  
  while (!isUnique) {
    orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    
    const { data: existing } = await db.query({
      orders: {
        $: {
          where: { orderNumber }
        }
      }
    });
    
    isUnique = existing.length === 0;
  }
  
  return orderNumber!;
};
```

### 3. Data Integrity Checks

#### Relationship Integrity
```typescript
// ✅ Good: Validate relationships before saving
export const validateProductRelationships = async (product: Partial<Product>): Promise<ValidationResult> => {
  const errors: string[] = [];
  
  if (product.brandId) {
    const { data: brand } = await db.query({
      brands: {
        $: { where: { id: product.brandId } }
      }
    });
    if (brand.length === 0) {
      errors.push('Invalid brand ID');
    }
  }
  
  if (product.categoryId) {
    const { data: category } = await db.query({
      categories: {
        $: { where: { id: product.categoryId } }
      }
    });
    if (category.length === 0) {
      errors.push('Invalid category ID');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
```

## Schema Modification Guidelines

### 1. Planning Schema Changes

#### Change Impact Assessment
```typescript
// ✅ Good: Document change impact
interface SchemaChange {
  type: 'add_field' | 'remove_field' | 'modify_field' | 'add_index' | 'add_relationship';
  entity: string;
  field?: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  breakingChange: boolean;
  migrationRequired: boolean;
  affectedQueries: string[];
  affectedComponents: string[];
}

const schemaChange: SchemaChange = {
  type: 'add_field',
  entity: 'products',
  field: 'brandId',
  description: 'Add relationship to brands entity',
  impact: 'medium',
  breakingChange: false,
  migrationRequired: true,
  affectedQueries: ['product-list', 'product-detail'],
  affectedComponents: ['ProductForm', 'ProductList']
};
```

#### Migration Strategy
```typescript
// ✅ Good: Plan migration steps
interface MigrationPlan {
  version: string;
  changes: SchemaChange[];
  steps: MigrationStep[];
  rollbackPlan: string[];
  testingPlan: string[];
}

interface MigrationStep {
  order: number;
  description: string;
  script?: string;
  validation?: string;
  rollback?: string;
}
```

### 2. Schema Versioning

#### Version Management
```typescript
// ✅ Good: Track schema versions
export const SCHEMA_VERSION = '2.0.0';

export const SCHEMA_HISTORY = [
  {
    version: '1.0.0',
    date: '2024-01-01',
    description: 'Initial schema',
    changes: []
  },
  {
    version: '2.0.0',
    date: '2024-07-17',
    description: 'Optimized schema with proper relationships and indexes',
    changes: [
      'Standardized field naming',
      'Added proper relationships',
      'Optimized indexes',
      'Added validation constraints'
    ]
  }
];
```

#### Backward Compatibility
```typescript
// ✅ Good: Maintain compatibility during transitions
export const FIELD_MAPPINGS = {
  // Legacy field name -> New field name
  'createdat': 'createdAt',
  'updatedat': 'updatedAt',
  'billaddrs': 'billingAddress',
  'shipaddrs': 'shippingAddress',
  'taxamt': 'taxAmount',
  'varianttitle': 'variantTitle'
};

export const mapLegacyFields = (data: any): any => {
  const mapped = { ...data };
  
  Object.entries(FIELD_MAPPINGS).forEach(([oldField, newField]) => {
    if (mapped[oldField] !== undefined) {
      mapped[newField] = mapped[oldField];
      delete mapped[oldField];
    }
  });
  
  return mapped;
};
```

### 3. Testing Schema Changes

#### Schema Validation Tests
```typescript
// ✅ Good: Test schema constraints
describe('Schema Validation', () => {
  test('should enforce required fields', async () => {
    const invalidProduct = {
      // Missing required title
      storeId: 'store-1',
      price: 10.99
    };
    
    await expect(
      db.transact([db.tx.products[newId()].update(invalidProduct)])
    ).rejects.toThrow('title is required');
  });
  
  test('should validate numeric constraints', async () => {
    const invalidProduct = {
      title: 'Test Product',
      storeId: 'store-1',
      price: -10.99 // Negative price should be rejected
    };
    
    await expect(
      db.transact([db.tx.products[newId()].update(invalidProduct)])
    ).rejects.toThrow('price must be non-negative');
  });
});
```

#### Performance Tests
```typescript
// ✅ Good: Test query performance
describe('Query Performance', () => {
  test('should execute product search within acceptable time', async () => {
    const startTime = performance.now();
    
    const { data } = await db.query({
      products: {
        $: {
          where: {
            title: { $like: '%test%' },
            storeId: 'store-1',
            status: 'active'
          }
        }
      }
    });
    
    const endTime = performance.now();
    const executionTime = endTime - startTime;
    
    expect(executionTime).toBeLessThan(500); // Should complete within 500ms
    expect(data.length).toBeGreaterThan(0);
  });
});
```

## Error Handling Best Practices

### 1. Database Error Handling

#### Connection Errors
```typescript
// ✅ Good: Handle connection errors gracefully
export const handleDatabaseError = (error: any): DatabaseError => {
  if (error.code === 'NETWORK_ERROR') {
    return {
      type: 'connection',
      message: 'Unable to connect to database',
      retryable: true
    };
  }
  
  if (error.code === 'VALIDATION_ERROR') {
    return {
      type: 'validation',
      message: error.message,
      retryable: false
    };
  }
  
  return {
    type: 'unknown',
    message: 'An unexpected database error occurred',
    retryable: false
  };
};
```

#### Constraint Violation Errors
```typescript
// ✅ Good: Handle constraint violations
export const handleConstraintError = (error: any): string => {
  if (error.message.includes('unique constraint')) {
    if (error.message.includes('sku')) {
      return 'SKU already exists for this store';
    }
    if (error.message.includes('orderNumber')) {
      return 'Order number already exists';
    }
    return 'Duplicate value detected';
  }
  
  if (error.message.includes('not null constraint')) {
    return 'Required field is missing';
  }
  
  return 'Data validation error';
};
```

### 2. Transaction Error Handling

#### Rollback on Errors
```typescript
// ✅ Good: Use transactions for data consistency
export const createOrderWithItems = async (
  orderData: Partial<Order>,
  items: Partial<OrderItem>[]
): Promise<{ success: boolean; orderId?: string; error?: string }> => {
  try {
    const orderId = newId();
    
    const transactions = [
      db.tx.orders[orderId].update(orderData),
      ...items.map(item => 
        db.tx.orderitems[newId()].update({
          ...item,
          orderId
        })
      )
    ];
    
    await db.transact(transactions);
    
    return { success: true, orderId };
  } catch (error) {
    console.error('Order creation failed:', error);
    return { 
      success: false, 
      error: handleDatabaseError(error).message 
    };
  }
};
```

## Monitoring and Maintenance

### 1. Performance Monitoring

#### Query Performance Metrics
```typescript
// ✅ Good: Track query performance
export class QueryPerformanceMonitor {
  private metrics: Map<string, QueryMetric[]> = new Map();
  
  trackQuery(queryName: string, executionTime: number, resultCount: number) {
    if (!this.metrics.has(queryName)) {
      this.metrics.set(queryName, []);
    }
    
    this.metrics.get(queryName)!.push({
      timestamp: Date.now(),
      executionTime,
      resultCount
    });
    
    // Alert on slow queries
    if (executionTime > 1000) {
      console.warn(`Slow query detected: ${queryName} took ${executionTime}ms`);
    }
  }
  
  getAverageExecutionTime(queryName: string): number {
    const metrics = this.metrics.get(queryName) || [];
    if (metrics.length === 0) return 0;
    
    const total = metrics.reduce((sum, metric) => sum + metric.executionTime, 0);
    return total / metrics.length;
  }
}
```

### 2. Data Quality Monitoring

#### Integrity Checks
```typescript
// ✅ Good: Regular data integrity checks
export const runDataIntegrityChecks = async (): Promise<IntegrityReport> => {
  const issues: string[] = [];
  
  // Check for orphaned records
  const { data: orphanedItems } = await db.query({
    items: {
      $: {
        where: {
          productId: { $notIn: await getExistingProductIds() }
        }
      }
    }
  });
  
  if (orphanedItems.length > 0) {
    issues.push(`Found ${orphanedItems.length} orphaned items`);
  }
  
  // Check for invalid prices
  const { data: invalidPrices } = await db.query({
    products: {
      $: {
        where: {
          price: { $lt: 0 }
        }
      }
    }
  });
  
  if (invalidPrices.length > 0) {
    issues.push(`Found ${invalidPrices.length} products with negative prices`);
  }
  
  return {
    timestamp: new Date(),
    issuesFound: issues.length,
    issues
  };
};
```

## Development Workflow

### 1. Schema Change Process

1. **Plan the Change**
   - Document the change requirements
   - Assess impact on existing code
   - Plan migration strategy

2. **Create Migration Script**
   - Write data transformation code
   - Include validation checks
   - Plan rollback procedure

3. **Test in Development**
   - Test migration with sample data
   - Verify application compatibility
   - Run performance tests

4. **Code Review**
   - Review schema changes
   - Review migration scripts
   - Review affected application code

5. **Deploy with Monitoring**
   - Deploy to staging first
   - Monitor performance metrics
   - Verify data integrity

### 2. Code Review Checklist

#### Schema Changes
- [ ] Field names follow camelCase convention
- [ ] Required fields are properly marked
- [ ] Indexes are added for search/filter fields
- [ ] Relationships use proper foreign keys
- [ ] Data types are appropriate
- [ ] Constraints are properly defined

#### Query Optimization
- [ ] Queries use indexed fields for filtering
- [ ] Result sets are limited appropriately
- [ ] Relationships are loaded efficiently
- [ ] Query performance is acceptable

#### Data Validation
- [ ] Required fields are validated
- [ ] Numeric constraints are enforced
- [ ] Format validation is implemented
- [ ] Uniqueness constraints are checked
- [ ] Error handling is comprehensive

This document should be reviewed and updated regularly as the schema evolves and new patterns emerge.