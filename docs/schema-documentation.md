# TAR POS Database Schema Documentation

## Overview

This document provides comprehensive documentation for the TAR POS InstantDB schema, including all entity relationships, field purposes, and migration guidance. The schema has been optimized for performance, data consistency, and proper relationships.

## Schema Version

**Current Version**: 2.0 (Optimized)
**Previous Version**: 1.0 (Legacy)
**Migration Status**: Complete

## Core Entities

### Products Entity

The products entity is the central entity for product management in the POS system.

```typescript
products: i.entity({
  // Required identification fields
  id: i.string(),                    // Unique product identifier
  storeId: i.string().indexed(),     // Store association (required)
  title: i.string().indexed(),       // Product name (required, searchable)
  
  // Search and identification fields
  sku: i.string().indexed().optional(),      // Stock Keeping Unit (unique within store)
  barcode: i.string().indexed().optional(),  // Barcode for scanning
  handle: i.string().optional(),             // URL-friendly identifier
  
  // Relationship fields (replaces string fields)
  brandId: i.string().indexed().optional(),     // Links to brands entity
  categoryId: i.string().indexed().optional(),  // Links to categories entity
  typeId: i.string().indexed().optional(),      // Links to types entity
  vendorId: i.string().indexed().optional(),    // Links to vendors entity
  collectionId: i.string().indexed().optional(), // Links to collections entity
  
  // Pricing fields (non-negative constraints)
  price: i.number().optional(),      // Regular selling price
  cost: i.number().optional(),       // Cost price for margin calculation
  saleprice: i.number().optional(),  // Sale/discount price
  
  // Status and visibility fields (indexed for filtering)
  status: i.string().indexed(),      // 'active', 'draft', 'archived'
  pos: i.boolean().indexed(),        // Visible in POS
  website: i.boolean().indexed(),    // Visible on website
  featured: i.boolean().indexed(),   // Featured product flag
  
  // Content fields
  description: i.string().optional(),     // Product description
  shortDescription: i.string().optional(), // Brief description
  
  // Structured data fields
  seo: i.json().optional(),          // SEO metadata
  metafields: i.json().optional(),   // Custom fields
  options: i.json().optional(),      // Product options/variants
  media: i.json().optional(),        // Media attachments
  
  // Inventory tracking
  trackQuantity: i.boolean().optional(), // Whether to track inventory
  
  // Timestamps (consistent naming)
  createdAt: i.date(),               // Creation timestamp
  updatedAt: i.date().optional(),    // Last update timestamp
  publishAt: i.date().optional(),    // Publish date
})
```

**Key Improvements:**
- `title` is now required (was optional)
- Consistent timestamp naming (`createdAt` vs `createdat`)
- Proper relationship fields instead of string values
- All search fields are indexed
- Status fields indexed for efficient filtering

### Orders Entity

The orders entity manages all order information with proper relationships and consistent field naming.

```typescript
orders: i.entity({
  // Required identification
  id: i.string(),
  storeId: i.string().indexed(),           // Store association
  orderNumber: i.string().unique().indexed(), // Unique order number
  referenceId: i.string().unique().indexed(), // External reference
  
  // Customer relationship
  customerId: i.string().indexed().optional(), // Links to customers entity
  customerEmail: i.string().optional(),        // Customer email
  customerName: i.string().optional(),         // Customer name
  customerPhone: i.string().optional(),        // Customer phone
  
  // Location relationship
  locationId: i.string().indexed().optional(), // Links to locations entity
  
  // Financial fields (required for orders)
  subtotal: i.number(),                    // Subtotal amount
  taxAmount: i.number().optional(),        // Tax amount (consolidated)
  discountAmount: i.number().optional(),   // Discount amount
  shippingAmount: i.number().optional(),   // Shipping cost
  total: i.number(),                       // Total amount
  
  // Status fields (indexed for filtering)
  status: i.string().indexed(),            // Order status
  paymentStatus: i.string().indexed(),     // Payment status
  fulfillmentStatus: i.string().indexed(), // Fulfillment status
  
  // Address information (structured)
  billingAddress: i.json().optional(),     // Billing address
  shippingAddress: i.json().optional(),    // Shipping address
  
  // Additional information
  notes: i.string().optional(),            // Order notes
  tags: i.json().optional(),              // Order tags
  
  // Timestamps
  createdAt: i.date(),                     // Order creation
  updatedAt: i.date().optional(),          // Last update
  cancelledAt: i.date().optional(),        // Cancellation date
  closedAt: i.date().optional(),           // Completion date
})
```

**Key Improvements:**
- Removed duplicate fields (`taxamt` vs `taxAmount`)
- Consistent address structure (`billingAddress` vs `billaddrs`)
- All status fields indexed for performance
- Proper location relationship

### Order Items Entity

```typescript
orderitems: i.entity({
  // Required fields
  id: i.string(),
  orderId: i.string().indexed(),       // Links to orders entity
  storeId: i.string().indexed(),       // Store association
  
  // Product information
  productId: i.string().indexed().optional(), // Links to products entity
  itemId: i.string().indexed().optional(),    // Links to items entity
  title: i.string(),                          // Product title
  variantTitle: i.string().optional(),        // Variant title (consolidated)
  
  // Quantity and pricing
  quantity: i.number(),                // Quantity ordered
  price: i.number(),                   // Unit price
  lineTotal: i.number(),               // Line total
  
  // Tax information (consolidated)
  taxAmount: i.number().optional(),    // Tax amount
  taxRate: i.number().optional(),      // Tax rate
  
  // Additional fields
  sku: i.string().optional(),          // Product SKU
  barcode: i.string().optional(),      // Product barcode
  
  // Timestamps
  createdAt: i.date(),
  updatedAt: i.date().optional(),
})
```

**Key Improvements:**
- Consolidated variant fields (`variantTitle` vs `varianttitle`)
- Consolidated tax fields (`taxAmount` vs `taxamt`)
- Proper product and item relationships

### Items Entity

The items entity represents individual product variants or SKUs.

```typescript
items: i.entity({
  // Identification
  id: i.string(),
  storeId: i.string().indexed(),
  productId: i.string().indexed(),     // Links to products entity
  
  // Item details
  title: i.string(),
  sku: i.string().indexed().optional(),
  barcode: i.string().indexed().optional(),
  
  // Pricing
  price: i.number().optional(),
  cost: i.number().optional(),
  
  // Inventory totals (computed fields)
  totalOnHand: i.number().optional(),      // Total across all locations
  totalAvailable: i.number().optional(),   // Available for sale
  totalCommitted: i.number().optional(),   // Committed to orders
  
  // Status
  status: i.string().indexed(),
  
  // Timestamps
  createdAt: i.date(),
  updatedAt: i.date().optional(),
})
```

### Inventory Entity

Location-based inventory tracking with proper constraints.

```typescript
inventory: i.entity({
  // Identification
  id: i.string(),
  storeId: i.string().indexed(),
  itemId: i.string().indexed(),        // Links to items entity
  locationId: i.string().indexed(),    // Links to locations entity
  
  // Quantity tracking (non-negative constraints)
  onHand: i.number().optional(),       // Physical quantity
  available: i.number().optional(),    // Available for sale
  committed: i.number().optional(),    // Committed to orders
  unavailable: i.number().optional(),  // Damaged/reserved
  
  // Reorder management
  reorderLevel: i.number().optional(),    // Minimum stock level
  reorderQuantity: i.number().optional(), // Reorder quantity
  
  // Audit fields
  lastCounted: i.date().optional(),       // Last physical count
  lastReceived: i.date().optional(),      // Last receipt
  lastAdjusted: i.date().optional(),      // Last adjustment
  
  // Timestamps
  createdAt: i.date(),
  updatedAt: i.date().optional(),
})
```

### Customers Entity

```typescript
customers: i.entity({
  // Identification
  id: i.string(),
  storeId: i.string().indexed(),
  
  // Personal information
  firstName: i.string().optional(),
  lastName: i.string().optional(),
  email: i.string().indexed().optional(),  // Indexed for search, validated format
  phone: i.string().indexed().optional(),  // Indexed for search
  
  // Address information
  addresses: i.json().optional(),          // Multiple addresses
  
  // Customer status
  status: i.string().indexed(),            // 'active', 'inactive'
  tags: i.json().optional(),              // Customer tags
  
  // Marketing preferences
  acceptsMarketing: i.boolean().optional(),
  
  // Timestamps
  createdAt: i.date(),
  updatedAt: i.date().optional(),
})
```

## Entity Relationships

### Product Relationships

```typescript
// Product to Brand relationship
productsBrand: {
  forward: { on: "products", has: "one", label: "brand" },
  reverse: { on: "brands", has: "many", label: "products" }
}

// Product to Category relationship
productsCategory: {
  forward: { on: "products", has: "one", label: "category" },
  reverse: { on: "categories", has: "many", label: "products" }
}

// Product to Type relationship
productsType: {
  forward: { on: "products", has: "one", label: "type" },
  reverse: { on: "types", has: "many", label: "products" }
}

// Product to Vendor relationship
productsVendor: {
  forward: { on: "products", has: "one", label: "vendor" },
  reverse: { on: "vendors", has: "many", label: "products" }
}
```

### Order Relationships

```typescript
// Order to Location relationship
ordersLocation: {
  forward: { on: "orders", has: "one", label: "location" },
  reverse: { on: "locations", has: "many", label: "orders" }
}

// Order to Customer relationship
ordersCustomer: {
  forward: { on: "orders", has: "one", label: "customer" },
  reverse: { on: "customers", has: "many", label: "orders" }
}
```

### Inventory Relationships

```typescript
// Inventory to Item relationship
inventoryItem: {
  forward: { on: "inventory", has: "one", label: "item" },
  reverse: { on: "items", has: "many", label: "inventory" }
}

// Inventory to Location relationship
inventoryLocation: {
  forward: { on: "inventory", has: "one", label: "location" },
  reverse: { on: "locations", has: "many", label: "inventory" }
}
```

## Performance Optimizations

### Indexes

**Search Indexes:**
- `products.title` - Product search
- `products.sku` - SKU lookup
- `products.barcode` - Barcode scanning
- `customers.email` - Customer search
- `customers.phone` - Customer search

**Filter Indexes:**
- `products.status` - Product filtering
- `products.pos` - POS visibility
- `products.website` - Website visibility
- `products.featured` - Featured products
- `orders.status` - Order filtering
- `orders.paymentStatus` - Payment filtering
- `orders.fulfillmentStatus` - Fulfillment filtering

**Relationship Indexes:**
- `products.storeId` - Store-based queries
- `products.brandId` - Brand relationships
- `products.categoryId` - Category relationships
- `orders.customerId` - Customer orders
- `orders.locationId` - Location orders
- `inventory.itemId` - Item inventory
- `inventory.locationId` - Location inventory

**Composite Indexes:**
- `(storeId, status)` - Store-specific filtering
- `(storeId, pos)` - POS product queries
- `(itemId, locationId)` - Inventory lookups
- `(customerId, createdAt)` - Customer order history

## Data Validation Rules

### Required Fields
- `products.title` - Product name is mandatory
- `products.storeId` - Store association required
- `orders.storeId` - Store association required
- `orders.total` - Order total required
- `orders.subtotal` - Order subtotal required

### Numeric Constraints
- All price fields (`price`, `cost`, `saleprice`) must be non-negative
- All quantity fields (`quantity`, `onHand`, `available`) must be non-negative
- Tax amounts and rates must be non-negative

### Uniqueness Constraints
- `orders.orderNumber` - Unique across system
- `orders.referenceId` - Unique across system
- `products.sku` - Unique within store scope

### Format Validation
- `customers.email` - Valid email format when provided
- Structured data fields use `json` type for proper validation

## Migration Guide

### From Legacy Schema (v1.0) to Optimized Schema (v2.0)

#### Field Name Changes

**Products Entity:**
```sql
-- Timestamp field standardization
createdat → createdAt
updatedat → updatedAt

-- Relationship field additions
brand (string) → brandId (relationship)
category (string) → categoryId (relationship)
type (string) → typeId (relationship)
vendor (string) → vendorId (relationship)
```

**Orders Entity:**
```sql
-- Remove duplicate fields
taxamt → taxAmount (consolidated)
billaddrs → billingAddress (structured)
shipaddrs → shippingAddress (structured)

-- Timestamp standardization
createdat → createdAt
updatedat → updatedAt
```

**Order Items Entity:**
```sql
-- Consolidate variant fields
varianttitle → variantTitle

-- Consolidate tax fields
taxamt → taxAmount
taxrate → taxRate
```

#### Data Type Changes

```sql
-- Replace 'any' types with proper types
metafields: any → json
options: any → json
seo: any → json

-- Structured address data
billingAddress: string → json
shippingAddress: string → json
```

#### Required Field Changes

```sql
-- Make critical fields required
products.title: optional → required
orders.total: optional → required
orders.subtotal: optional → required
```

### Migration Steps

1. **Backup Current Data**
   ```bash
   # Export current data before migration
   npm run export-data
   ```

2. **Apply Schema Changes**
   ```bash
   # Update schema file
   npm run update-schema
   ```

3. **Run Data Migration**
   ```bash
   # Transform existing data
   npm run migrate-data
   ```

4. **Validate Migration**
   ```bash
   # Verify data integrity
   npm run validate-migration
   ```

5. **Update Application Code**
   ```bash
   # Update queries and components
   npm run update-app-code
   ```

### Backward Compatibility

During the migration period, the system supports both old and new field names through:

- **Query Transformation**: Legacy queries are automatically transformed
- **Data Mapping**: Old field names are mapped to new field names
- **Gradual Migration**: Components can be updated incrementally

## API Documentation Updates

### Query Examples

**Product Queries with New Relationships:**
```typescript
// Get products with brand information
const { data: products } = db.useQuery({
  products: {
    brand: {}  // Uses new productsBrand relationship
  }
});

// Search products by title (now indexed)
const { data: searchResults } = db.useQuery({
  products: {
    $: {
      where: {
        title: { $like: `%${searchTerm}%` }
      }
    }
  }
});
```

**Order Queries with Optimized Indexes:**
```typescript
// Get orders by status (indexed)
const { data: orders } = db.useQuery({
  orders: {
    $: {
      where: {
        status: 'pending',
        storeId: currentStore.id
      }
    },
    location: {}  // Uses new ordersLocation relationship
  }
});
```

**Inventory Queries with Location Relationships:**
```typescript
// Get inventory by location
const { data: inventory } = db.useQuery({
  inventory: {
    $: {
      where: {
        locationId: selectedLocation.id
      }
    },
    item: {
      product: {}
    }
  }
});
```

### Mutation Examples

**Creating Products with Relationships:**
```typescript
// Create product with proper relationships
db.transact([
  db.tx.products[newId()].update({
    title: "New Product",  // Now required
    storeId: store.id,
    brandId: brand.id,     // Relationship instead of string
    categoryId: category.id,
    status: 'active'
  })
]);
```

**Order Creation with Validation:**
```typescript
// Create order with required fields
db.transact([
  db.tx.orders[newId()].update({
    orderNumber: generateOrderNumber(),
    storeId: store.id,
    total: calculateTotal(),      // Required
    subtotal: calculateSubtotal(), // Required
    status: 'pending',
    customerId: customer?.id,
    locationId: location.id
  })
]);
```

## Schema Maintenance

### Regular Maintenance Tasks

1. **Index Performance Monitoring**
   - Monitor query performance metrics
   - Identify slow queries and optimize indexes
   - Review index usage statistics

2. **Data Integrity Checks**
   - Validate relationship integrity
   - Check for orphaned records
   - Verify constraint compliance

3. **Schema Evolution**
   - Plan schema changes carefully
   - Use migration scripts for changes
   - Maintain backward compatibility

### Performance Monitoring

**Key Metrics to Track:**
- Query execution times
- Index hit rates
- Relationship query performance
- Data growth patterns

**Optimization Strategies:**
- Add indexes for frequently filtered fields
- Optimize composite indexes for common query patterns
- Archive old data to maintain performance
- Monitor and adjust based on usage patterns

## Troubleshooting

### Common Issues

**Migration Issues:**
- **Field Type Conflicts**: Use data transformation utilities
- **Missing Required Data**: Implement default value strategies
- **Relationship Integrity**: Validate foreign keys before migration

**Performance Issues:**
- **Slow Queries**: Check index usage and add missing indexes
- **Large Result Sets**: Implement pagination and filtering
- **Complex Relationships**: Optimize query structure

**Data Validation Errors:**
- **Invalid Prices**: Check for negative values
- **Duplicate SKUs**: Ensure uniqueness within store scope
- **Invalid Emails**: Validate format before saving

### Support Resources

- **Schema Analysis Tools**: Use `scripts/analyze-schema.ts`
- **Performance Benchmarks**: Use `scripts/performance-benchmark.ts`
- **Migration Utilities**: Available in `src/lib/migration/`
- **Validation Services**: Use `src/services/validation-service.ts`