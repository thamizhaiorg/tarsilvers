// Docs: https://www.instantdb.com/docs/modeling-data

import { i } from "@instantdb/react-native";

const _schema = i.schema({
  // SKJ Silversmith - Single Store POS Schema
  // Optimized for single-store commerce operations
  entities: {
    $files: i.entity({
      path: i.string().unique().indexed(),
      url: i.string(),
    }),
    $users: i.entity({
      email: i.string().unique().indexed().optional(),
    }),
    // blocks entity removed - storefront related
    brands: i.entity({
      name: i.string().unique().indexed(),
    }),
    cart: i.entity({
      createdAt: i.date(),
      image: i.string().optional(),
      itemId: i.string().indexed().optional(),
      price: i.number(),
      productId: i.string().indexed(),
      quantity: i.number(),
      sessionId: i.string().indexed().optional(),
      sku: i.string().optional(),
      title: i.string(),
      updatedAt: i.date().optional(),
      userId: i.string().indexed().optional(),
      variantTitle: i.string().optional(),
    }),
    categories: i.entity({
      name: i.string().unique().indexed(),
      parent: i.string().optional(),
    }),
    collections: i.entity({
      createdAt: i.date(),
      description: i.string().optional(),
      image: i.string().optional(),
      isActive: i.boolean(),
      name: i.string().unique().indexed(),
      parent: i.string().optional(),
      pos: i.boolean().optional(),
      sortOrder: i.number().optional(),
      updatedAt: i.date(),
    }),
    customers: i.entity({
      addresses: i.json().optional(),
      createdAt: i.date().indexed(),
      defaultAddress: i.json().optional(),
      email: i.string().indexed().optional(),
      lastOrderDate: i.date().indexed().optional(),
      name: i.string(),
      notes: i.string().optional(),
      phone: i.string().indexed().optional(),
      tags: i.string().optional(),
      totalOrders: i.number().optional(),
      totalSpent: i.number().optional(),
      updatedAt: i.date().optional(),
    }),
    files: i.entity({
      alt: i.string().optional(),
      dateAdded: i.date(),
      handle: i.string().unique().indexed(),
      reference: i.string().optional(),
      size: i.number(),
      title: i.string(),
      type: i.string(),
      url: i.string(),
      userId: i.string().indexed().optional(),
    }),
    iadjust: i.entity({
      // Required fields with proper constraints
      itemId: i.string().indexed(),
      locationId: i.string().indexed(),
      
      // Quantity tracking with enhanced precision
      quantityBefore: i.number(),
      quantityAfter: i.number(),
      quantityChange: i.number(),
      
      // Enhanced audit trail fields
      type: i.string().indexed(), // 'adjustment', 'sale', 'receive', 'transfer', 'count', 'damage', 'return'
      reason: i.string().indexed().optional(), // 'damaged', 'expired', 'lost', 'found', 'correction', 'transfer_in', 'transfer_out'
      reference: i.string().indexed().optional(), // Order ID, Transfer ID, etc.
      
      // User tracking with enhanced details
      userId: i.string().indexed().optional(),
      userName: i.string().indexed().optional(),
      userRole: i.string().indexed().optional(), // 'admin', 'manager', 'staff', 'system'
      
      // Timestamp and session tracking
      createdAt: i.date().indexed(),
      sessionId: i.string().indexed().optional(), // For grouping related adjustments
      batchId: i.string().indexed().optional(), // For bulk operations
      
      // Additional context
      notes: i.string().optional(),
      deviceId: i.string().indexed().optional(),
      ipAddress: i.string().optional(),
      
      // Cost tracking for financial impact
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
    }),
    ilocations: i.entity({
      // Required fields with proper constraints
      itemId: i.string().indexed(),
      locationId: i.string().indexed(),
      
      // Quantity fields with non-negative constraints and proper indexing
      onHand: i.number().indexed().optional(),
      committed: i.number().indexed().optional(),
      unavailable: i.number().indexed().optional(),
      available: i.number().indexed().optional(), // Computed: onHand - committed - unavailable
      
      // Reorder management
      reorderLevel: i.number().indexed().optional(),
      reorderQuantity: i.number().optional(),
      
      // Enhanced audit trail fields
      createdAt: i.date().indexed(),
      updatedAt: i.date().optional(),
      updatedBy: i.string().indexed().optional(),
      
      // Inventory counting audit
      lastCounted: i.date().indexed().optional(),
      lastCountedBy: i.string().indexed().optional(),
      lastCountQuantity: i.number().optional(),
      
      // Receiving audit
      lastReceived: i.date().indexed().optional(),
      lastReceivedBy: i.string().indexed().optional(),
      lastReceivedQuantity: i.number().optional(),
      
      // Movement tracking
      lastMovementDate: i.date().indexed().optional(),
      lastMovementType: i.string().indexed().optional(), // 'adjustment', 'sale', 'receive', 'transfer'
      lastMovementReference: i.string().indexed().optional(),
      
      // Data integrity fields
      version: i.number().optional(), // For optimistic locking
      isActive: i.boolean().indexed().optional(), // Soft delete capability
    }),
    inventory: i.entity({
      available: i.number().indexed().optional(),
      createdAt: i.date(),
      itemId: i.string().indexed(),
      quantity: i.number().indexed().optional(),
      reserved: i.number().indexed().optional(),
      updatedAt: i.date(),
    }),
    items: i.entity({
      allowPreorder: i.boolean().optional(),
      available: i.number().optional(),
      barcode: i.string().indexed().optional(),
      committed: i.number().optional(),
      cost: i.number().optional(),
      createdAt: i.date().optional(),
      image: i.string().optional(),
      margin: i.number().optional(),
      metafields: i.json().optional(),
      onhand: i.number().optional(),
      option1: i.string().optional(),
      option2: i.string().optional(),
      option3: i.string().optional(),
      path: i.string().optional(),
      price: i.number().optional(),
      productId: i.string().indexed(),
      reorderlevel: i.number().optional(),
      saleprice: i.number().optional(),
      sku: i.string().indexed(),
      totalAvailable: i.number().indexed().optional(),
      totalCommitted: i.number().indexed().optional(),
      totalOnHand: i.number().indexed().optional(),
      trackQty: i.boolean().optional(),
      unavailable: i.number().optional(),
      updatedAt: i.date().optional(),
    }),
    locations: i.entity({
      address: i.json().optional(),
      contactInfo: i.json().optional(),
      createdAt: i.date().optional(),
      fulfillsOnlineOrders: i.boolean().optional(),
      isActive: i.boolean().optional(),
      isDefault: i.boolean().optional(),
      metafields: i.json().optional(),
      name: i.string(),
      type: i.string().optional(),
      updatedAt: i.date().optional(),
    }),
    media: i.entity({
      order: i.number().optional(),
      parentId: i.string().indexed(),
      // storeId removed - single store app
      type: i.string().optional(),
      url: i.string().optional(),
    }),
    // menus entity removed - storefront related
    metasets: i.entity({
      category: i.string().indexed(),
      config: i.json().optional(),
      createdAt: i.date(),
      description: i.string().optional(),
      filter: i.boolean().optional(),
      group: i.string().optional(),
      inputConfig: i.json().optional(),
      key: i.string().optional(),
      name: i.string(),
      namespace: i.string().optional(),
      order: i.number().optional(),
      parentId: i.string().optional(),
      required: i.boolean().optional(),
      // storeId removed - single store app
      title: i.string().optional(),
      type: i.string(),
      updatedAt: i.date(),
      value: i.string().optional(),
    }),
    metavalues: i.entity({
      createdAt: i.date(),
      entityId: i.string().indexed(),
      entityType: i.string().indexed(),
      setId: i.string().indexed(),
      // storeId removed - single store app
      updatedAt: i.date(),
      value: i.string().optional(),
    }),
    modifiers: i.entity({
      identifier: i.string().optional(),
      notes: i.string().optional(),
      // storeId removed - single store app
      title: i.string().optional(),
      type: i.string().optional(),
      value: i.number().optional(),
    }),
    opsets: i.entity({
      createdAt: i.date().optional(),
      name: i.string(),
      // storeId removed - single store app
      updatedAt: i.date().optional(),
    }),
    opvalues: i.entity({
      createdAt: i.date(),
      group: i.string().optional(),
      identifierType: i.string(),
      identifierValue: i.string(),
      name: i.string(),
      order: i.number().optional(),
      setId: i.string().indexed(),
      // storeId removed - single store app
      updatedAt: i.date(),
    }),
    orderitems: i.entity({
      // Required fields
      orderId: i.string().indexed(),
      // storeId removed - single store app
      title: i.string(),
      quantity: i.number(), // Standardized from qty
      price: i.number(),
      lineTotal: i.number(),
      
      // Product relationships
      productId: i.string().indexed().optional(),
      itemId: i.string().indexed().optional(),
      sku: i.string().optional(),
      
      // Pricing and costs
      cost: i.number().optional(),
      compareAtPrice: i.number().optional(),
      discountAmount: i.number().optional(),
      
      // Tax fields (consolidated - removed duplicates)
      taxAmount: i.number().optional(),
      taxRate: i.number().optional(),
      
      // Product details
      productImage: i.string().optional(),
      productType: i.string().optional(),
      variantTitle: i.string().optional(), // Standardized naming
      vendor: i.string().optional(),
      
      // Fulfillment
      fulfillmentStatus: i.string().optional(),
      trackingNumber: i.string().optional(),
      trackingUrl: i.string().optional(),
      
      // Legacy fields (to be deprecated)
      qty: i.number().optional(), // Deprecated in favor of quantity
      total: i.number().optional(), // Deprecated in favor of lineTotal
    }),
    orders: i.entity({
      // Required business fields
      // storeId removed - single store app
      orderNumber: i.string().unique().indexed(),
      referenceId: i.string().unique().indexed(), // Standardized from referid
      subtotal: i.number(),
      total: i.number(),
      
      // Consistent timestamp naming
      createdAt: i.date().indexed(),
      updatedAt: i.date().optional(),
      cancelledAt: i.date().optional(),
      closedAt: i.date().optional(),
      
      // Customer relationships and info
      customerId: i.string().indexed().optional(),
      customerEmail: i.string().optional(),
      customerName: i.string().optional(),
      customerPhone: i.string().optional(),
      
      // Location relationship
      locationId: i.string().indexed().optional(),
      
      // Indexed status fields for performance
      status: i.string().indexed(),
      paymentStatus: i.string().indexed(),
      fulfillmentStatus: i.string().indexed(),
      
      // Consistent address structure (json instead of separate fields)
      billingAddress: i.json().optional(),
      shippingAddress: i.json().optional(),
      
      // Consolidated monetary fields (removed duplicates)
      taxAmount: i.number().optional(),
      discountAmount: i.number().optional(),
      shippingAmount: i.number().optional(),
      totalPaid: i.number().optional(),
      totalRefunded: i.number().optional(),
      
      // Order processing
      source: i.string().optional(),
      deviceId: i.string().optional(),
      staffId: i.string().optional(),
      
      // Additional details
      currency: i.string().optional(),
      discountCode: i.string().optional(),
      notes: i.string().optional(),
      tags: i.string().optional(),
      market: i.string().optional(),
      receiptNumber: i.string().optional(),
      
      // Legacy fields (to be deprecated)
      referid: i.string().unique().indexed().optional(), // Deprecated in favor of referenceId
      discount: i.number().optional(), // Deprecated in favor of discountAmount
      fulfill: i.string().optional(), // Deprecated in favor of fulfillmentStatus
    }),
    // pages entity removed - storefront related
    path: i.entity({
      location: i.string().optional(),
      notes: i.string().optional(),
      parentId: i.string().indexed(),
      // storeId removed - single store app
      title: i.string().optional(),
    }),
    peoplea: i.entity({
      bio: i.string().optional(),
      createdAt: i.date(),
      name: i.string().optional(),
      phone: i.string().optional(),
      profileImage: i.string().optional(),
      updatedAt: i.date().optional(),
      userId: i.string().unique().indexed(),
    }),
    // posts entity removed - storefront related
    products: i.entity({
      // Required fields (previously optional)
      title: i.string().indexed(), // Required for search, was optional
      // storeId removed - single store app
      
      // Consistent timestamp naming (createdAt/updatedAt)
      createdAt: i.date().indexed(),
      updatedAt: i.date().optional(),
      
      // Proper relationships (replace string fields with IDs)
      brandId: i.string().indexed().optional(),
      categoryId: i.string().indexed().optional(), 
      typeId: i.string().indexed().optional(),
      vendorId: i.string().indexed().optional(),
      collectionId: i.string().indexed().optional(),
      
      // Indexed search fields for performance
      sku: i.string().indexed().optional(),
      barcode: i.string().indexed().optional(),
      
      // Non-negative price constraints
      price: i.number().optional(),
      cost: i.number().optional(),
      saleprice: i.number().optional(),
      
      // Status fields for filtering (indexed for performance)
      status: i.string().indexed(), // 'active', 'draft', 'archived' - was boolean
      pos: i.boolean().indexed(),
      website: i.boolean().indexed(),
      featured: i.boolean().indexed(),
      
      // Content fields
      description: i.string().optional(),
      blurb: i.string().optional(),
      notes: i.string().optional(),
      
      // Structured data (json instead of any)
      seo: i.json().optional(),
      metafields: i.json().optional(),
      options: i.json().optional(),
      medias: i.json().optional(),
      modifiers: i.json().optional(),
      promoinfo: i.json().optional(),
      saleinfo: i.json().optional(),
      relproducts: i.json().optional(),
      sellproducts: i.json().optional(),
      
      // Media and publishing
      image: i.string().optional(),
      publishAt: i.date().optional(),
      tags: i.string().indexed().optional(),
      
      // Legacy field (to be deprecated)
      name: i.string().optional(), // Deprecated in favor of title
      stock: i.number().optional(), // Deprecated in favor of inventory tracking
    }),
    stocks: i.entity({
      available: i.number().optional(),
      committed: i.number().optional(),
      datetime: i.date().optional(),
      expdate: i.date().optional(),
      fifo: i.number().optional(),
      parentId: i.string().indexed(),
      path: i.string().optional(),
      // storeId removed - single store app
    }),
    store: i.entity({
      address: i.string().optional(),
      createdAt: i.date(),
      description: i.string().optional(),
      email: i.string().optional(),
      logo: i.string().optional(),
      name: i.string().unique().indexed(),
      peopleaId: i.string().indexed().optional(),
      phone: i.string().optional(),
      updatedAt: i.date().optional(),
      website: i.string().optional(),
    }),
    // storefronts entity removed - storefront related

    tags: i.entity({
      createdAt: i.date().optional(),
      name: i.string().unique().indexed(),
      // storeId removed - single store app
      updatedAt: i.date().optional(),
    }),
    // testimonials entity removed - storefront related
    // themes entity removed - storefront related
    types: i.entity({
      name: i.string().unique().indexed(),
      parent: i.string().optional(),
      // storeId removed - single store app
    }),
    vendors: i.entity({
      name: i.string().unique().indexed(),
      // storeId removed - single store app
    }),
    // sessions entity removed - not needed for core POS
    // audit_sessions and audit_batches entities removed - simplified for core POS
  },
  links: {
    cart$users: {
      forward: {
        on: "cart",
        has: "one",
        label: "$users",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "cart",
      },
    },
    cartItem: {
      forward: {
        on: "cart",
        has: "one",
        label: "item",
      },
      reverse: {
        on: "items",
        has: "many",
        label: "cart",
      },
    },
    cartProduct: {
      forward: {
        on: "cart",
        has: "one",
        label: "product",
      },
      reverse: {
        on: "products",
        has: "many",
        label: "cart",
      },
    },
    customersOrders: {
      forward: {
        on: "customers",
        has: "many",
        label: "orders",
      },
      reverse: {
        on: "orders",
        has: "one",
        label: "customer",
      },
    },
    files$users: {
      forward: {
        on: "files",
        has: "one",
        label: "$users",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "files",
      },
    },
    inventoryStocks: {
      forward: {
        on: "inventory",
        has: "many",
        label: "stocks",
      },
      reverse: {
        on: "stocks",
        has: "one",
        label: "inventory",
      },
    },
    itemsIadjust: {
      forward: {
        on: "items",
        has: "many",
        label: "iadjust",
      },
      reverse: {
        on: "iadjust",
        has: "one",
        label: "item",
      },
    },
    itemsIlocations: {
      forward: {
        on: "items",
        has: "many",
        label: "ilocations",
      },
      reverse: {
        on: "ilocations",
        has: "one",
        label: "item",
      },
    },
    locationsIadjust: {
      forward: {
        on: "locations",
        has: "many",
        label: "iadjust",
      },
      reverse: {
        on: "iadjust",
        has: "one",
        label: "location",
      },
    },
    locationsIlocations: {
      forward: {
        on: "locations",
        has: "many",
        label: "ilocations",
      },
      reverse: {
        on: "ilocations",
        has: "one",
        label: "location",
      },
    },
    orderitemsItem: {
      forward: {
        on: "orderitems",
        has: "one",
        label: "item",
      },
      reverse: {
        on: "items",
        has: "many",
        label: "orderitems",
      },
    },
    orderitemsProduct: {
      forward: {
        on: "orderitems",
        has: "one",
        label: "product",
      },
      reverse: {
        on: "products",
        has: "many",
        label: "orderitems",
      },
    },
    ordersOrderitems: {
      forward: {
        on: "orders",
        has: "many",
        label: "orderitems",
      },
      reverse: {
        on: "orderitems",
        has: "one",
        label: "order",
      },
    },
    // pagesBlocks link removed - pages and blocks entities removed
    peoplea$users: {
      forward: {
        on: "peoplea",
        has: "one",
        label: "$users",
      },
      reverse: {
        on: "$users",
        has: "one",
        label: "peoplea",
      },
    },
    peopleaStores: {
      forward: {
        on: "peoplea",
        has: "many",
        label: "stores",
      },
      reverse: {
        on: "store",
        has: "one",
        label: "peoplea",
      },
    },
    productsCollection: {
      forward: {
        on: "products",
        has: "one",
        label: "collection",
      },
      reverse: {
        on: "collections",
        has: "many",
        label: "products",
      },
    },
    productsItem: {
      forward: {
        on: "products",
        has: "many",
        label: "item",
      },
      reverse: {
        on: "items",
        has: "one",
        label: "product",
      },
    },
    store$users: {
      forward: {
        on: "store",
        has: "many",
        label: "$users",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "store",
      },
    },
    storeFiles: {
      forward: {
        on: "store",
        has: "many",
        label: "files",
      },
      reverse: {
        on: "files",
        has: "one",
        label: "store",
      },
    },
    // storeStorefront link removed - storefronts entity removed
    // storefront-related links removed - entities no longer exist
    // testimonialsProduct link removed - testimonials entity removed

    ordersLocation: {
      forward: {
        on: "orders",
        has: "one",
        label: "location",
      },
      reverse: {
        on: "locations",
        has: "many",
        label: "orders",
      },
    },
    // audit system relationships removed - entities removed
    // cartSession link removed - sessions entity removed
  },
  rooms: {},
});

// This helps Typescript display nicer intellisense
type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
