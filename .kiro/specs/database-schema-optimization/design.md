# Database Schema Optimization Design

## Overview

This design addresses critical issues in the current InstantDB schema for TAR POS, focusing on data consistency, performance optimization, proper relationships, and schema cleanup. The improvements will enhance system reliability, query performance, and developer experience while maintaining backward compatibility where possible.

## Architecture

### Schema Migration Strategy

The schema optimization will follow a phased approach:

1. **Phase 1**: Field consistency and data type standardization
2. **Phase 2**: Index optimization and performance improvements  
3. **Phase 3**: Relationship restructuring and entity cleanup
4. **Phase 4**: Data validation and constraint enforcement

### Backward Compatibility Approach

- Maintain existing field names during transition period
- Use schema versioning for gradual migration
- Provide data transformation utilities for existing records
- Implement fallback queries for legacy field access

## Components and Interfaces

### 1. Core Entity Standardization

#### Products Entity Improvements
```typescript
products: i.entity({
  // Required fields (currently optional)
  title: i.string().indexed(), // Required for search
  storeId: i.string().indexed(),
  
  // Consistent naming (fix createdat -> createdAt)
  createdAt: i.date(),
  updatedAt: i.date().optional(),
  
  // Proper relationships (replace string fields)
  brandId: i.string().indexed().optional(),
  categoryId: i.string().indexed().optional(), 
  typeId: i.string().indexed().optional(),
  vendorId: i.string().indexed().optional(),
  
  // Indexed search fields
  sku: i.string().indexed().optional(),
  barcode: i.string().indexed().optional(),
  
  // Consistent data types
  price: i.number().optional(),
  cost: i.number().optional(),
  saleprice: i.number().optional(),
  
  // Status fields for filtering
  status: i.string().indexed(), // 'active', 'draft', 'archived'
  pos: i.boolean().indexed(),
  website: i.boolean().indexed(),
  featured: i.boolean().indexed(),
  
  // Structured data
  seo: i.json().optional(),
  metafields: i.json().optional(),
  options: i.json().optional(),
})
```

#### Orders Entity Cleanup
```typescript
orders: i.entity({
  // Remove duplicate fields (createdat vs createdAt, etc.)
  createdAt: i.date(),
  updatedAt: i.date().optional(),
  
  // Consistent field naming (remove duplicates)
  orderNumber: i.string().unique().indexed(),
  referenceId: i.string().unique().indexed(),
  
  // Required business fields
  storeId: i.string().indexed(),
  total: i.number(),
  subtotal: i.number(),
  
  // Indexed status fields
  status: i.string().indexed(),
  paymentStatus: i.string().indexed(),
  fulfillmentStatus: i.string().indexed(),
  
  // Proper relationships
  customerId: i.string().indexed().optional(),
  locationId: i.string().indexed().optional(),
  
  // Consistent address structure
  billingAddress: i.json().optional(),
  shippingAddress: i.json().optional(),
  
  // Remove redundant fields (tax vs taxAmount, etc.)
  taxAmount: i.number().optional(),
  discountAmount: i.number().optional(),
  shippingAmount: i.number().optional(),
})
```

#### Order Items Entity Standardization
```typescript
orderitems: i.entity({
  // Required fields
  orderId: i.string().indexed(),
  storeId: i.string().indexed(),
  title: i.string(),
  quantity: i.number(),
  price: i.number(),
  lineTotal: i.number(),
  
  // Remove duplicate fields (keep consistent naming)
  taxAmount: i.number().optional(),
  taxRate: i.number().optional(),
  variantTitle: i.string().optional(),
  
  // Proper relationships
  productId: i.string().indexed().optional(),
  itemId: i.string().indexed().optional(),
})
```

### 2. Enhanced Relationship Structure

#### New Relationship Links
```typescript
links: {
  // Product relationships
  productsBrand: {
    forward: { on: "products", has: "one", label: "brand" },
    reverse: { on: "brands", has: "many", label: "products" }
  },
  productsCategory: {
    forward: { on: "products", has: "one", label: "category" },
    reverse: { on: "categories", has: "many", label: "products" }
  },
  productsType: {
    forward: { on: "products", has: "one", label: "type" },
    reverse: { on: "types", has: "many", label: "products" }
  },
  productsVendor: {
    forward: { on: "products", has: "one", label: "vendor" },
    reverse: { on: "vendors", has: "many", label: "products" }
  },
  
  // Order relationships
  ordersLocation: {
    forward: { on: "orders", has: "one", label: "location" },
    reverse: { on: "locations", has: "many", label: "orders" }
  },
  
  // Cart session relationships
  cartSession: {
    forward: { on: "cart", has: "one", label: "session" },
    reverse: { on: "sessions", has: "many", label: "cart" }
  }
}
```

### 3. Performance Optimization Indexes

#### Search and Filter Indexes
- **Products**: title, sku, barcode, status, pos, website, featured
- **Orders**: orderNumber, status, paymentStatus, fulfillmentStatus, createdAt
- **Items**: sku, barcode, productId, totalOnHand, totalAvailable
- **Customers**: email, phone, name
- **Inventory**: itemId, locationId, onHand, available

#### Composite Indexes for Common Queries
- **Products**: (storeId, status), (storeId, pos), (storeId, website)
- **Orders**: (storeId, status), (storeId, createdAt), (customerId, createdAt)
- **Items**: (storeId, productId), (productId, sku)
- **Inventory**: (storeId, locationId), (itemId, locationId)

### 4. Data Validation Layer

#### Field Validation Rules
```typescript
// Price validation
price: i.number().min(0).optional(),
cost: i.number().min(0).optional(),

// Quantity validation  
quantity: i.number().min(0),
onHand: i.number().min(0).optional(),

// Email validation (when provided)
email: i.string().email().optional(),

// Required business fields
title: i.string().min(1), // Not empty
orderNumber: i.string().min(1),
```

### 5. Entity Cleanup Strategy

#### Entities to Remove/Consolidate
- **stores** entity (duplicate of **store**)
- Redundant fields in orders (createdat, updatedat, billaddrs, shipaddrs)
- Duplicate tax fields (taxamt vs taxAmount)
- Duplicate variant fields (varianttitle vs variantTitle)

#### Entities to Enhance
- **sessions** entity for cart session management
- **audit_log** entity for inventory adjustments tracking
- **product_variants** entity for better variant management

## Data Models

### Enhanced Product Model
```typescript
interface Product {
  id: string;
  storeId: string;
  title: string; // Required
  description?: string;
  sku?: string;
  barcode?: string;
  
  // Relationships (IDs instead of strings)
  brandId?: string;
  categoryId?: string;
  typeId?: string;
  vendorId?: string;
  collectionId?: string;
  
  // Pricing
  price?: number;
  cost?: number;
  saleprice?: number;
  
  // Status
  status: 'active' | 'draft' | 'archived';
  pos: boolean;
  website: boolean;
  featured: boolean;
  
  // Timestamps
  createdAt: Date;
  updatedAt?: Date;
  publishAt?: Date;
  
  // Structured data
  seo?: SEOData;
  metafields?: Record<string, any>;
  options?: ProductOptions;
  media?: MediaItem[];
}
```

### Enhanced Order Model
```typescript
interface Order {
  id: string;
  storeId: string;
  orderNumber: string;
  referenceId: string;
  
  // Customer
  customerId?: string;
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  
  // Location
  locationId?: string;
  
  // Totals
  subtotal: number;
  taxAmount?: number;
  discountAmount?: number;
  shippingAmount?: number;
  total: number;
  
  // Status
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'partial' | 'refunded';
  fulfillmentStatus: 'unfulfilled' | 'partial' | 'fulfilled';
  
  // Addresses
  billingAddress?: Address;
  shippingAddress?: Address;
  
  // Timestamps
  createdAt: Date;
  updatedAt?: Date;
  cancelledAt?: Date;
  closedAt?: Date;
}
```

### Enhanced Inventory Model
```typescript
interface InventoryLocation {
  id: string;
  storeId: string;
  itemId: string;
  locationId: string;
  
  // Quantities
  onHand: number;
  available: number;
  committed: number;
  unavailable: number;
  
  // Reorder settings
  reorderLevel?: number;
  reorderQuantity?: number;
  
  // Tracking
  lastCounted?: Date;
  lastReceived?: Date;
  updatedAt?: Date;
}
```

## Error Handling

### Schema Migration Errors
- **Field Type Conflicts**: Provide data transformation utilities
- **Missing Required Data**: Implement default value strategies
- **Relationship Integrity**: Validate foreign key constraints before migration
- **Index Creation Failures**: Implement retry mechanisms with backoff

### Data Validation Errors
- **Invalid Prices**: Reject negative values, provide clear error messages
- **Duplicate SKUs**: Enforce uniqueness within store scope
- **Invalid Emails**: Validate format before saving
- **Missing Required Fields**: Provide specific field-level error messages

### Performance Monitoring
- **Query Performance**: Monitor slow queries and optimize indexes
- **Index Usage**: Track index effectiveness and adjust as needed
- **Data Growth**: Monitor entity sizes and implement archiving strategies

## Testing Strategy

### Schema Validation Tests
- **Field Type Validation**: Test all data type constraints
- **Required Field Enforcement**: Verify required fields are enforced
- **Unique Constraint Testing**: Test uniqueness across all unique fields
- **Relationship Integrity**: Verify foreign key relationships work correctly

### Performance Tests
- **Query Performance**: Benchmark common queries before/after optimization
- **Index Effectiveness**: Measure query execution times with new indexes
- **Bulk Operation Performance**: Test large data operations
- **Concurrent Access**: Test schema under concurrent load

### Migration Tests
- **Data Transformation**: Test conversion of existing data to new schema
- **Backward Compatibility**: Verify existing queries still work during transition
- **Rollback Procedures**: Test ability to revert schema changes
- **Data Integrity**: Verify no data loss during migration

### Integration Tests
- **Application Compatibility**: Test all app components with new schema
- **Query Optimization**: Verify improved query performance in real scenarios
- **Relationship Queries**: Test complex queries with new relationships
- **Error Handling**: Test application behavior with validation errors