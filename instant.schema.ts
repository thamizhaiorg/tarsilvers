// Docs: https://www.instantdb.com/docs/modeling-data

import { i } from "@instantdb/react-native";

const _schema = i.schema({
  // We inferred 15 attributes!
  // Take a look at this schema, and if everything looks good,
  // run `push schema` again to enforce the types.
  entities: {
    $files: i.entity({
      path: i.string().unique().indexed(),
      url: i.string(),
    }),
    $users: i.entity({
      email: i.string().unique().indexed().optional(),
    }),
    blocks: i.entity({
      content: i.json().optional(),
      createdAt: i.date().optional(),
      order: i.number().optional(),
      pageId: i.string().indexed().optional(),
      storeId: i.string().indexed().optional(),
      style: i.json().optional(),
      type: i.string().indexed().optional(),
      updatedAt: i.date().optional(),
      visible: i.boolean().optional(),
    }),
    brands: i.entity({
      name: i.string().unique().indexed(),
      storeId: i.string().indexed(),
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
      storeId: i.string().indexed(),
      title: i.string(),
      updatedAt: i.date().optional(),
      userId: i.string().indexed().optional(),
      variantTitle: i.string().optional(),
    }),
    categories: i.entity({
      name: i.string().unique().indexed(),
      parent: i.string().optional(),
      storeId: i.string().indexed(),
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
      storefront: i.boolean().optional(),
      storeId: i.string().indexed(),
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
      storeId: i.string().indexed(),
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
      storeId: i.string().indexed(),
      title: i.string(),
      type: i.string(),
      url: i.string(),
      userId: i.string().indexed().optional(),
    }),
    iadjust: i.entity({
      // Required fields with proper constraints
      storeId: i.string().indexed(),
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
      storeId: i.string().indexed(),
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
      storeId: i.string().indexed(),
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
      storeId: i.string().indexed(),
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
      storeId: i.string().indexed(),
      type: i.string().optional(),
      updatedAt: i.date().optional(),
    }),
    media: i.entity({
      order: i.number().optional(),
      parentId: i.string().indexed(),
      storeId: i.string().indexed(),
      type: i.string().optional(),
      url: i.string().optional(),
    }),
    menus: i.entity({
      createdAt: i.date(),
      items: i.json(),
      name: i.string(),
      order: i.number().optional(),
      storefrontId: i.string().indexed(),
      storeId: i.string().indexed(),
      type: i.string().indexed(),
      updatedAt: i.date().optional(),
      visible: i.boolean().optional(),
    }),
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
      storeId: i.string().indexed(),
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
      storeId: i.string().indexed(),
      updatedAt: i.date(),
      value: i.string().optional(),
    }),
    modifiers: i.entity({
      identifier: i.string().optional(),
      notes: i.string().optional(),
      storeId: i.string().indexed(),
      title: i.string().optional(),
      type: i.string().optional(),
      value: i.number().optional(),
    }),
    opsets: i.entity({
      createdAt: i.date().optional(),
      name: i.string(),
      storeId: i.string().indexed(),
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
      storeId: i.string().indexed(),
      updatedAt: i.date(),
    }),
    orderitems: i.entity({
      // Required fields
      orderId: i.string().indexed(),
      storeId: i.string().indexed(),
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
      storeId: i.string().indexed(),
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
    pages: i.entity({
      content: i.json().optional(),
      createdAt: i.date().optional(),
      isHomepage: i.boolean().optional(),
      order: i.number().optional(),
      published: i.boolean().optional(),
      seoDescription: i.string().optional(),
      seoTitle: i.string().optional(),
      slug: i.string().indexed().optional(),
      storefrontId: i.string().indexed().optional(),
      storeId: i.string().indexed().optional(),
      title: i.string().optional(),
      type: i.string().indexed().optional(),
      updatedAt: i.date().optional(),
    }),
    path: i.entity({
      location: i.string().optional(),
      notes: i.string().optional(),
      parentId: i.string().indexed(),
      storeId: i.string().indexed(),
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
    posts: i.entity({
      author: i.string().optional(),
      content: i.json().optional(),
      createdAt: i.date(),
      excerpt: i.string().optional(),
      featuredImage: i.string().optional(),
      published: i.boolean().optional(),
      publishedAt: i.date().optional(),
      seoDescription: i.string().optional(),
      seoTitle: i.string().optional(),
      slug: i.string().indexed(),
      storefrontId: i.string().indexed(),
      storeId: i.string().indexed(),
      tags: i.json().optional(),
      title: i.string(),
      updatedAt: i.date().optional(),
    }),
    products: i.entity({
      // Required fields (previously optional)
      title: i.string().indexed(), // Required for search, was optional
      storeId: i.string().indexed(),
      
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
      storeId: i.string().indexed(),
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
    storefronts: i.entity({
      createdAt: i.date().optional(),
      customDomain: i.string().unique().indexed().optional(),
      description: i.string().optional(),
      favicon: i.string().optional(),
      fontFamily: i.string().optional(),
      logo: i.string().optional(),
      name: i.string().optional(),
      ownerId: i.string().indexed().optional(),
      primaryColor: i.string().optional(),
      published: i.boolean().optional(),
      secondaryColor: i.string().optional(),
      seoDescription: i.string().optional(),
      seoTitle: i.string().optional(),
      storeId: i.string().unique().indexed().optional(),
      subdomain: i.string().unique().indexed().optional(),
      theme: i.string().optional(),
      updatedAt: i.date().optional(),
    }),

    tags: i.entity({
      createdAt: i.date().optional(),
      name: i.string().unique().indexed(),
      storeId: i.string().indexed(),
      updatedAt: i.date().optional(),
    }),
    testimonials: i.entity({
      approved: i.boolean().optional(),
      content: i.string(),
      createdAt: i.date(),
      customerImage: i.string().optional(),
      customerName: i.string(),
      featured: i.boolean().optional(),
      productId: i.string().indexed().optional(),
      rating: i.number().optional(),
      storefrontId: i.string().indexed(),
      storeId: i.string().indexed(),
      updatedAt: i.date().optional(),
    }),
    themes: i.entity({
      category: i.string().optional(),
      createdAt: i.date(),
      description: i.string().optional(),
      isPremium: i.boolean().optional(),
      name: i.string().unique().indexed(),
      preview: i.string().optional(),
      variables: i.json(),
    }),
    types: i.entity({
      name: i.string().unique().indexed(),
      parent: i.string().optional(),
      storeId: i.string().indexed(),
    }),
    vendors: i.entity({
      name: i.string().unique().indexed(),
      storeId: i.string().indexed(),
    }),
    // Session entity for cart management (anonymous and authenticated users)
    sessions: i.entity({
      sessionId: i.string().unique().indexed(),
      userId: i.string().indexed().optional(), // null for anonymous sessions
      storeId: i.string().indexed(),
      deviceId: i.string().indexed().optional(),
      ipAddress: i.string().optional(),
      userAgent: i.string().optional(),
      createdAt: i.date().indexed(),
      lastActivity: i.date().indexed(),
      expiresAt: i.date().indexed(),
      isActive: i.boolean().indexed(),
      metadata: i.json().optional(),
    }),
    // Enhanced audit system entities
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
    }),
    audit_batches: i.entity({
      batchId: i.string().unique().indexed(),
      storeId: i.string().indexed(),
      sessionId: i.string().indexed().optional(),
      userId: i.string().indexed().optional(),
      userName: i.string().indexed().optional(),
      batchType: i.string().indexed(), // 'bulk_adjustment', 'cycle_count', 'transfer', 'receiving'
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
    }),
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
    pagesBlocks: {
      forward: {
        on: "pages",
        has: "many",
        label: "blocks",
      },
      reverse: {
        on: "blocks",
        has: "one",
        label: "page",
      },
    },
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
    storeStorefront: {
      forward: {
        on: "store",
        has: "one",
        label: "storefront",
      },
      reverse: {
        on: "storefronts",
        has: "one",
        label: "store",
      },
    },
    storefrontsMenus: {
      forward: {
        on: "storefronts",
        has: "many",
        label: "menus",
      },
      reverse: {
        on: "menus",
        has: "one",
        label: "storefront",
      },
    },
    storefrontsPages: {
      forward: {
        on: "storefronts",
        has: "many",
        label: "pages",
      },
      reverse: {
        on: "pages",
        has: "one",
        label: "storefront",
      },
    },
    storefrontsPosts: {
      forward: {
        on: "storefronts",
        has: "many",
        label: "posts",
      },
      reverse: {
        on: "posts",
        has: "one",
        label: "storefront",
      },
    },
    storefrontsTestimonials: {
      forward: {
        on: "storefronts",
        has: "many",
        label: "testimonials",
      },
      reverse: {
        on: "testimonials",
        has: "one",
        label: "storefront",
      },
    },
    testimonialsProduct: {
      forward: {
        on: "testimonials",
        has: "one",
        label: "product",
      },
      reverse: {
        on: "products",
        has: "many",
        label: "testimonials",
      },
    },

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
    // Enhanced audit system relationships
    auditSessionsAdjustments: {
      forward: {
        on: "audit_sessions",
        has: "many",
        label: "adjustments",
      },
      reverse: {
        on: "iadjust",
        has: "one",
        label: "session",
      },
    },
    auditBatchesAdjustments: {
      forward: {
        on: "audit_batches",
        has: "many",
        label: "adjustments",
      },
      reverse: {
        on: "iadjust",
        has: "one",
        label: "batch",
      },
    },
    auditSessionsBatches: {
      forward: {
        on: "audit_sessions",
        has: "many",
        label: "batches",
      },
      reverse: {
        on: "audit_batches",
        has: "one",
        label: "session",
      },
    },
    // Cart session relationship for anonymous and authenticated users
    cartSession: {
      forward: {
        on: "cart",
        has: "one",
        label: "session",
      },
      reverse: {
        on: "sessions",
        has: "many",
        label: "cart",
      },
    },
  },
  rooms: {},
});

// This helps Typescript display nicer intellisense
type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
