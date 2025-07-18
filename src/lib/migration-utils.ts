/**
 * Data Migration Utilities for Database Schema Optimization
 * 
 * This module provides utilities to migrate existing data to the new optimized schema.
 * It handles field name changes, type conversions, and data validation during migration.
 */

import { db } from './instant';

// Migration configuration for field name changes
export const FIELD_MIGRATIONS = {
  // Products entity field migrations
  products: {
    // Timestamp field standardization
    createdat: 'createdAt',
    updatedat: 'updatedAt',
    
    // String to relationship ID migrations
    brand: 'brandId',
    category: 'categoryId',
    type: 'typeId',
    vendor: 'vendorId',
    collection: 'collectionId',
    
    // Field name standardization
    name: 'title', // Deprecated field
  },
  
  // Orders entity field migrations
  orders: {
    // Timestamp field standardization
    createdat: 'createdAt',
    updatedat: 'updatedAt',
    
    // Reference field standardization
    referid: 'referenceId',
    
    // Address field consolidation
    billaddrs: 'billingAddress',
    shipaddrs: 'shippingAddress',
    
    // Monetary field consolidation
    taxamt: 'taxAmount',
    discount: 'discountAmount',
    
    // Status field standardization
    fulfill: 'fulfillmentStatus',
  },
  
  // Order Items entity field migrations
  orderitems: {
    // Quantity field standardization
    qty: 'quantity',
    total: 'lineTotal',
    
    // Tax field consolidation
    taxamt: 'taxAmount',
    taxrate: 'taxRate',
    
    // Variant field standardization
    varianttitle: 'variantTitle',
  },
  
  // Items entity field migrations
  items: {
    createdat: 'createdAt',
    updatedat: 'updatedAt',
  },
  
  // Customers entity field migrations
  customers: {
    createdat: 'createdAt',
    updatedat: 'updatedAt',
  },
} as const;

// Type conversion mappings
export const TYPE_CONVERSIONS = {
  // Convert 'any' types to 'json' for structured data
  anyToJson: [
    'seo',
    'metafields',
    'options',
    'medias',
    'modifiers',
    'promoinfo',
    'saleinfo',
    'relproducts',
    'sellproducts',
    'addresses',
    'defaultAddress',
    'billingAddress',
    'shippingAddress',
  ],
  
  // Convert string fields to proper relationships
  stringToRelationship: {
    products: {
      brand: 'brandId',
      category: 'categoryId',
      type: 'typeId',
      vendor: 'vendorId',
      collection: 'collectionId',
    },
  },
} as const;

// Data validation rules
export const VALIDATION_RULES = {
  required: {
    products: ['title', 'storeId'],
    orders: ['storeId', 'orderNumber', 'referenceId', 'subtotal', 'total'],
    orderitems: ['orderId', 'storeId', 'title', 'quantity', 'price', 'lineTotal'],
    customers: ['name', 'storeId'],
  },
  
  nonNegative: [
    'price',
    'cost',
    'saleprice',
    'quantity',
    'total',
    'subtotal',
    'taxAmount',
    'discountAmount',
    'shippingAmount',
    'onHand',
    'available',
    'committed',
    'unavailable',
  ],
  
  unique: {
    products: ['sku'], // Within store scope
    orders: ['orderNumber', 'referenceId'],
    items: ['sku'], // Within store scope
  },
  
  email: ['email', 'customerEmail'],
} as const;

/**
 * Transform field names according to migration mapping
 */
export function transformFieldNames<T extends Record<string, any>>(
  entity: string,
  data: T
): Record<string, any> {
  const migrations = FIELD_MIGRATIONS[entity as keyof typeof FIELD_MIGRATIONS];
  if (!migrations) return data;

  const transformed: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(data)) {
    const newKey = migrations[key as keyof typeof migrations] || key;
    transformed[newKey] = value;
  }
  
  return transformed;
}

/**
 * Convert data types according to type conversion rules
 */
export function convertDataTypes(entity: string, data: Record<string, any>): Record<string, any> {
  const converted = { ...data };
  
  // Convert 'any' types to 'json'
  for (const field of TYPE_CONVERSIONS.anyToJson) {
    if (converted[field] !== undefined && typeof converted[field] === 'string') {
      try {
        converted[field] = JSON.parse(converted[field]);
      } catch {
        // If parsing fails, keep as string but wrap in object
        converted[field] = { value: converted[field] };
      }
    }
  }
  
  // Convert string relationships to IDs
  const relationshipMappings = TYPE_CONVERSIONS.stringToRelationship[entity as keyof typeof TYPE_CONVERSIONS.stringToRelationship];
  if (relationshipMappings) {
    for (const [oldField, newField] of Object.entries(relationshipMappings)) {
      if (converted[oldField] && typeof converted[oldField] === 'string') {
        // For now, we'll need to look up the actual ID based on the string value
        // This would require additional lookup logic in a real migration
        converted[newField] = converted[oldField];
        delete converted[oldField];
      }
    }
  }
  
  return converted;
}

/**
 * Validate data according to validation rules
 */
export function validateData(entity: string, data: Record<string, any>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Check required fields
  const requiredFields = VALIDATION_RULES.required[entity as keyof typeof VALIDATION_RULES.required];
  if (requiredFields) {
    for (const field of requiredFields) {
      if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
        errors.push(`Required field '${field}' is missing or empty`);
      }
    }
  }
  
  // Check non-negative numeric fields
  for (const field of VALIDATION_RULES.nonNegative) {
    if (data[field] !== undefined && typeof data[field] === 'number' && data[field] < 0) {
      errors.push(`Field '${field}' must be non-negative, got ${data[field]}`);
    }
  }
  
  // Check email format
  for (const field of VALIDATION_RULES.email) {
    if (data[field] && typeof data[field] === 'string') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data[field])) {
        errors.push(`Field '${field}' must be a valid email address`);
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Transform a single record for migration
 */
export function transformRecord(entity: string, record: Record<string, any>): {
  transformed: Record<string, any>;
  validation: { isValid: boolean; errors: string[] };
} {
  // Step 1: Transform field names
  let transformed = transformFieldNames(entity, record);
  
  // Step 2: Convert data types
  transformed = convertDataTypes(entity, transformed);
  
  // Step 3: Validate the transformed data
  const validation = validateData(entity, transformed);
  
  return {
    transformed,
    validation,
  };
}

/**
 * Batch transform multiple records
 */
export function transformRecords(entity: string, records: Record<string, any>[]): {
  successful: Array<{ original: Record<string, any>; transformed: Record<string, any> }>;
  failed: Array<{ original: Record<string, any>; errors: string[] }>;
} {
  const successful: Array<{ original: Record<string, any>; transformed: Record<string, any> }> = [];
  const failed: Array<{ original: Record<string, any>; errors: string[] }> = [];
  
  for (const record of records) {
    const { transformed, validation } = transformRecord(entity, record);
    
    if (validation.isValid) {
      successful.push({ original: record, transformed });
    } else {
      failed.push({ original: record, errors: validation.errors });
    }
  }
  
  return { successful, failed };
}

/**
 * Create lookup tables for string-to-ID relationship conversions
 */
export async function createRelationshipLookups(storeId: string): Promise<{
  brands: Map<string, string>;
  categories: Map<string, string>;
  types: Map<string, string>;
  vendors: Map<string, string>;
  collections: Map<string, string>;
}> {
  const lookups = {
    brands: new Map<string, string>(),
    categories: new Map<string, string>(),
    types: new Map<string, string>(),
    vendors: new Map<string, string>(),
    collections: new Map<string, string>(),
  };
  
  try {
    // Fetch all reference entities for the store
    const { data } = await db.query({
      brands: { $: { where: { storeId } } },
      categories: { $: { where: { storeId } } },
      types: { $: { where: { storeId } } },
      vendors: { $: { where: { storeId } } },
      collections: { $: { where: { storeId } } },
    });
    
    // Build lookup maps
    data.brands?.forEach(brand => lookups.brands.set(brand.name, brand.id));
    data.categories?.forEach(category => lookups.categories.set(category.name, category.id));
    data.types?.forEach(type => lookups.types.set(type.name, type.id));
    data.vendors?.forEach(vendor => lookups.vendors.set(vendor.name, vendor.id));
    data.collections?.forEach(collection => lookups.collections.set(collection.name, collection.id));
    
  } catch (error) {
    // Error creating relationship lookups
  }
  
  return lookups;
}

/**
 * Apply relationship lookups to transform string references to IDs
 */
export function applyRelationshipLookups(
  entity: string,
  data: Record<string, any>,
  lookups: {
    brands: Map<string, string>;
    categories: Map<string, string>;
    types: Map<string, string>;
    vendors: Map<string, string>;
    collections: Map<string, string>;
  }
): Record<string, any> {
  const transformed = { ...data };
  
  if (entity === 'products') {
    // Transform string references to IDs
    if (transformed.brand && typeof transformed.brand === 'string') {
      const brandId = lookups.brands.get(transformed.brand);
      if (brandId) {
        transformed.brandId = brandId;
        delete transformed.brand;
      }
    }
    
    if (transformed.category && typeof transformed.category === 'string') {
      const categoryId = lookups.categories.get(transformed.category);
      if (categoryId) {
        transformed.categoryId = categoryId;
        delete transformed.category;
      }
    }
    
    if (transformed.type && typeof transformed.type === 'string') {
      const typeId = lookups.types.get(transformed.type);
      if (typeId) {
        transformed.typeId = typeId;
        delete transformed.type;
      }
    }
    
    if (transformed.vendor && typeof transformed.vendor === 'string') {
      const vendorId = lookups.vendors.get(transformed.vendor);
      if (vendorId) {
        transformed.vendorId = vendorId;
        delete transformed.vendor;
      }
    }
    
    if (transformed.collection && typeof transformed.collection === 'string') {
      const collectionId = lookups.collections.get(transformed.collection);
      if (collectionId) {
        transformed.collectionId = collectionId;
        delete transformed.collection;
      }
    }
  }
  
  return transformed;
}

/**
 * Migration progress tracking
 */
export interface MigrationProgress {
  entity: string;
  total: number;
  processed: number;
  successful: number;
  failed: number;
  errors: Array<{ recordId: string; errors: string[] }>;
  startTime: Date;
  endTime?: Date;
}

/**
 * Create a migration progress tracker
 */
export function createMigrationProgress(entity: string, total: number): MigrationProgress {
  return {
    entity,
    total,
    processed: 0,
    successful: 0,
    failed: 0,
    errors: [],
    startTime: new Date(),
  };
}

/**
 * Update migration progress
 */
export function updateMigrationProgress(
  progress: MigrationProgress,
  success: boolean,
  recordId?: string,
  errors?: string[]
): void {
  progress.processed++;
  
  if (success) {
    progress.successful++;
  } else {
    progress.failed++;
    if (recordId && errors) {
      progress.errors.push({ recordId, errors });
    }
  }
  
  if (progress.processed === progress.total) {
    progress.endTime = new Date();
  }
}

/**
 * Get migration progress summary
 */
export function getMigrationSummary(progress: MigrationProgress): string {
  const duration = progress.endTime 
    ? progress.endTime.getTime() - progress.startTime.getTime()
    : Date.now() - progress.startTime.getTime();
    
  const durationSeconds = Math.round(duration / 1000);
  
  return `
Migration Summary for ${progress.entity}:
- Total records: ${progress.total}
- Processed: ${progress.processed}
- Successful: ${progress.successful}
- Failed: ${progress.failed}
- Duration: ${durationSeconds}s
- Success rate: ${((progress.successful / progress.total) * 100).toFixed(1)}%
${progress.errors.length > 0 ? `\nErrors:\n${progress.errors.map(e => `- ${e.recordId}: ${e.errors.join(', ')}`).join('\n')}` : ''}
  `.trim();
}