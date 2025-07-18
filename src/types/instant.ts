// InstantDB specific types and utilities
// Provides type-safe database operations with the optimized schema

import type { AppSchema } from '../../instant.schema';
import type { InstaQLEntity, InstaQLResult } from '@instantdb/react-native';

// Extract entity types from the schema
export type SchemaEntities = AppSchema['entities'];

// Individual entity types from InstantDB schema
export type InstantProduct = InstaQLEntity<SchemaEntities, 'products'>;
export type InstantOrder = InstaQLEntity<SchemaEntities, 'orders'>;
export type InstantOrderItem = InstaQLEntity<SchemaEntities, 'orderitems'>;
export type InstantCustomer = InstaQLEntity<SchemaEntities, 'customers'>;
export type InstantItem = InstaQLEntity<SchemaEntities, 'items'>;
export type InstantInventoryLocation = InstaQLEntity<SchemaEntities, 'ilocations'>;
export type InstantInventoryAdjustment = InstaQLEntity<SchemaEntities, 'iadjust'>;
export type InstantLocation = InstaQLEntity<SchemaEntities, 'locations'>;
export type InstantBrand = InstaQLEntity<SchemaEntities, 'brands'>;
export type InstantCategory = InstaQLEntity<SchemaEntities, 'categories'>;
export type InstantProductType = InstaQLEntity<SchemaEntities, 'types'>;
export type InstantVendor = InstaQLEntity<SchemaEntities, 'vendors'>;
export type InstantCollection = InstaQLEntity<SchemaEntities, 'collections'>;
export type InstantCart = InstaQLEntity<SchemaEntities, 'cart'>;
export type InstantSession = InstaQLEntity<SchemaEntities, 'sessions'>;
export type InstantAuditSession = InstaQLEntity<SchemaEntities, 'audit_sessions'>;
export type InstantAuditBatch = InstaQLEntity<SchemaEntities, 'audit_batches'>;

// Query result types with relationships
export type ProductWithBrand = InstaQLResult<{
  products: {
    brand: {};
  };
}>;

export type ProductWithCategory = InstaQLResult<{
  products: {
    category: {};
  };
}>;

export type ProductWithType = InstaQLResult<{
  products: {
    type: {};
  };
}>;

export type ProductWithVendor = InstaQLResult<{
  products: {
    vendor: {};
  };
}>;

export type ProductWithAllRelations = InstaQLResult<{
  products: {
    brand: {};
    category: {};
    type: {};
    vendor: {};
    collection: {};
    item: {};
  };
}>;

export type OrderWithCustomer = InstaQLResult<{
  orders: {
    customer: {};
  };
}>;

export type OrderWithLocation = InstaQLResult<{
  orders: {
    location: {};
  };
}>;

export type OrderWithItems = InstaQLResult<{
  orders: {
    orderitems: {
      product: {};
      item: {};
    };
  };
}>;

export type OrderWithAllRelations = InstaQLResult<{
  orders: {
    customer: {};
    location: {};
    orderitems: {
      product: {};
      item: {};
    };
  };
}>;

export type ItemWithProduct = InstaQLResult<{
  items: {
    product: {
      brand: {};
      category: {};
      type: {};
      vendor: {};
    };
  };
}>;

export type ItemWithInventory = InstaQLResult<{
  items: {
    ilocations: {
      location: {};
    };
    iadjust: {};
  };
}>;

export type InventoryLocationWithItem = InstaQLResult<{
  ilocations: {
    item: {
      product: {};
    };
    location: {};
  };
}>;

export type CartWithProduct = InstaQLResult<{
  cart: {
    product: {};
    item: {};
    session: {};
  };
}>;

// Common query patterns as type-safe functions
export interface QueryPatterns {
  // Product queries
  getProductsWithBrand: () => {
    products: {
      brand: {};
    };
  };
  
  getProductsWithAllRelations: () => {
    products: {
      brand: {};
      category: {};
      type: {};
      vendor: {};
      collection: {};
      item: {
        ilocations: {
          location: {};
        };
      };
    };
  };
  
  // Order queries
  getOrdersWithCustomer: () => {
    orders: {
      customer: {};
    };
  };
  
  getOrdersWithAllRelations: () => {
    orders: {
      customer: {};
      location: {};
      orderitems: {
        product: {};
        item: {};
      };
    };
  };
  
  // Inventory queries
  getInventoryWithDetails: () => {
    ilocations: {
      item: {
        product: {
          brand: {};
          category: {};
        };
      };
      location: {};
    };
  };
  
  // Cart queries
  getCartWithDetails: () => {
    cart: {
      product: {
        brand: {};
      };
      item: {};
      session: {};
    };
  };
}

// Database operation types
export interface DatabaseOperations {
  // Create operations
  createProduct: (data: Partial<InstantProduct>) => Promise<InstantProduct>;
  createOrder: (data: Partial<InstantOrder>) => Promise<InstantOrder>;
  createCustomer: (data: Partial<InstantCustomer>) => Promise<InstantCustomer>;
  createItem: (data: Partial<InstantItem>) => Promise<InstantItem>;
  
  // Update operations
  updateProduct: (id: string, data: Partial<InstantProduct>) => Promise<InstantProduct>;
  updateOrder: (id: string, data: Partial<InstantOrder>) => Promise<InstantOrder>;
  updateCustomer: (id: string, data: Partial<InstantCustomer>) => Promise<InstantCustomer>;
  updateItem: (id: string, data: Partial<InstantItem>) => Promise<InstantItem>;
  
  // Delete operations
  deleteProduct: (id: string) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  
  // Inventory operations
  adjustInventory: (data: Partial<InstantInventoryAdjustment>) => Promise<InstantInventoryAdjustment>;
  updateInventoryLocation: (id: string, data: Partial<InstantInventoryLocation>) => Promise<InstantInventoryLocation>;
}

// Validation helpers for InstantDB entities
export interface EntityValidation {
  validateProduct: (data: Partial<InstantProduct>) => ValidationResult;
  validateOrder: (data: Partial<InstantOrder>) => ValidationResult;
  validateCustomer: (data: Partial<InstantCustomer>) => ValidationResult;
  validateItem: (data: Partial<InstantItem>) => ValidationResult;
  validateInventoryAdjustment: (data: Partial<InstantInventoryAdjustment>) => ValidationResult;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    code: string;
  }>;
}

// Search and filter types specific to InstantDB
export interface InstantDBFilters {
  products: {
    storeId?: string;
    status?: string;
    pos?: boolean;
    website?: boolean;
    featured?: boolean;
    brandId?: string;
    categoryId?: string;
    typeId?: string;
    vendorId?: string;
    title?: string;
    sku?: string;
    barcode?: string;
  };
  
  orders: {
    storeId?: string;
    status?: string;
    paymentStatus?: string;
    fulfillmentStatus?: string;
    customerId?: string;
    locationId?: string;
    orderNumber?: string;
    referenceId?: string;
  };
  
  customers: {
    storeId?: string;
    name?: string;
    email?: string;
    phone?: string;
  };
  
  items: {
    storeId?: string;
    productId?: string;
    sku?: string;
    barcode?: string;
    trackQty?: boolean;
  };
  
  inventory: {
    storeId?: string;
    itemId?: string;
    locationId?: string;
    onHand?: number;
    available?: number;
  };
}

// Real-time subscription types
export interface SubscriptionOptions {
  products: {
    where?: InstantDBFilters['products'];
    include?: QueryPatterns['getProductsWithAllRelations'];
  };
  
  orders: {
    where?: InstantDBFilters['orders'];
    include?: QueryPatterns['getOrdersWithAllRelations'];
  };
  
  inventory: {
    where?: InstantDBFilters['inventory'];
    include?: QueryPatterns['getInventoryWithDetails'];
  };
  
  cart: {
    where?: { sessionId?: string; userId?: string; storeId?: string };
    include?: QueryPatterns['getCartWithDetails'];
  };
}

// Batch operation types
export interface BatchOperations {
  createProducts: (products: Partial<InstantProduct>[]) => Promise<InstantProduct[]>;
  updateProducts: (updates: Array<{ id: string; data: Partial<InstantProduct> }>) => Promise<InstantProduct[]>;
  deleteProducts: (ids: string[]) => Promise<void>;
  
  createItems: (items: Partial<InstantItem>[]) => Promise<InstantItem[]>;
  updateItems: (updates: Array<{ id: string; data: Partial<InstantItem> }>) => Promise<InstantItem[]>;
  
  bulkInventoryAdjustment: (adjustments: Partial<InstantInventoryAdjustment>[]) => Promise<InstantInventoryAdjustment[]>;
}

// Transaction types for complex operations
export interface TransactionOperations {
  createOrderWithItems: (order: Partial<InstantOrder>, items: Partial<InstantOrderItem>[]) => Promise<{
    order: InstantOrder;
    items: InstantOrderItem[];
  }>;
  
  transferInventory: (fromLocationId: string, toLocationId: string, items: Array<{
    itemId: string;
    quantity: number;
  }>) => Promise<InstantInventoryAdjustment[]>;
  
  processReturn: (orderId: string, items: Array<{
    orderItemId: string;
    quantity: number;
    reason: string;
  }>) => Promise<{
    adjustments: InstantInventoryAdjustment[];
    refundAmount: number;
  }>;
}

// Export utility functions for type conversion
export const convertToAppTypes = {
  product: (instant: InstantProduct): Product => ({
    id: instant.id,
    storeId: instant.storeId,
    title: instant.title,
    description: instant.description,
    sku: instant.sku,
    barcode: instant.barcode,
    brandId: instant.brandId,
    categoryId: instant.categoryId,
    typeId: instant.typeId,
    vendorId: instant.vendorId,
    collectionId: instant.collectionId,
    price: instant.price,
    cost: instant.cost,
    saleprice: instant.saleprice,
    status: instant.status as Product['status'],
    pos: instant.pos,
    website: instant.website,
    featured: instant.featured,
    seo: instant.seo,
    metafields: instant.metafields,
    options: instant.options,
    medias: instant.medias,
    image: instant.image,
    publishAt: instant.publishAt,
    tags: instant.tags,
    createdAt: instant.createdAt,
    updatedAt: instant.updatedAt,
  } as Product),
  
  order: (instant: InstantOrder): Order => ({
    id: instant.id,
    storeId: instant.storeId,
    orderNumber: instant.orderNumber,
    referenceId: instant.referenceId,
    subtotal: instant.subtotal,
    total: instant.total,
    customerId: instant.customerId,
    customerEmail: instant.customerEmail,
    customerName: instant.customerName,
    customerPhone: instant.customerPhone,
    locationId: instant.locationId,
    status: instant.status as Order['status'],
    paymentStatus: instant.paymentStatus as Order['paymentStatus'],
    fulfillmentStatus: instant.fulfillmentStatus as Order['fulfillmentStatus'],
    billingAddress: instant.billingAddress,
    shippingAddress: instant.shippingAddress,
    taxAmount: instant.taxAmount,
    discountAmount: instant.discountAmount,
    shippingAmount: instant.shippingAmount,
    totalPaid: instant.totalPaid,
    totalRefunded: instant.totalRefunded,
    createdAt: instant.createdAt,
    updatedAt: instant.updatedAt,
    cancelledAt: instant.cancelledAt,
    closedAt: instant.closedAt,
  } as Order),
};

// Import the enhanced types from database.ts
import type {
  Product,
  Order,
  OrderItem,
  Customer,
  Item,
  InventoryLocation,
  InventoryAdjustment,
  Location,
  Brand,
  Category,
  ProductType,
  Vendor,
  Collection,
  Cart,
  Session,
} from './database';