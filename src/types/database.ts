// Enhanced TypeScript interfaces for TAR POS database schema
// Generated from optimized InstantDB schema

// Base types for common fields
export interface BaseEntity {
  id: string;
  storeId: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface TimestampFields {
  createdAt: Date;
  updatedAt?: Date;
}

// Address structure for consistent address handling
export interface Address {
  firstName?: string;
  lastName?: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  province?: string;
  country: string;
  zip: string;
  phone?: string;
}

// SEO data structure
export interface SEOData {
  title?: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
}

// Product option structure
export interface ProductOption {
  name: string;
  values: string[];
}

export interface ProductOptions {
  option1?: ProductOption;
  option2?: ProductOption;
  option3?: ProductOption;
}

// Media item structure
export interface MediaItem {
  id: string;
  url: string;
  alt?: string;
  order?: number;
  type?: 'image' | 'video';
}

// Enhanced Product interface
export interface Product extends BaseEntity {
  // Required fields
  title: string; // Now required (was optional)
  
  // Relationships (proper IDs instead of strings)
  brandId?: string;
  categoryId?: string;
  typeId?: string;
  vendorId?: string;
  collectionId?: string;
  
  // Search and identification
  sku?: string;
  barcode?: string;
  
  // Pricing (non-negative constraints)
  price?: number;
  cost?: number;
  saleprice?: number;
  
  // Status fields (indexed for performance)
  status: 'active' | 'draft' | 'archived'; // Changed from boolean
  pos: boolean;
  website: boolean;
  featured: boolean;
  
  // Content
  description?: string;
  blurb?: string;
  notes?: string;
  
  // Structured data
  seo?: SEOData;
  metafields?: Record<string, any>;
  options?: ProductOptions;
  medias?: MediaItem[];
  modifiers?: Record<string, any>;
  promoinfo?: Record<string, any>;
  saleinfo?: Record<string, any>;
  relproducts?: string[];
  sellproducts?: string[];
  
  // Media and publishing
  image?: string;
  publishAt?: Date;
  tags?: string;
  
  // Legacy fields (deprecated)
  name?: string; // Use title instead
  stock?: number; // Use inventory tracking instead
}

// Enhanced Order interface
export interface Order extends BaseEntity {
  // Required business fields
  orderNumber: string;
  referenceId: string; // Standardized from referid
  subtotal: number;
  total: number;
  
  // Customer information
  customerId?: string;
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  
  // Location relationship
  locationId?: string;
  
  // Status fields (indexed)
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'partial' | 'refunded';
  fulfillmentStatus: 'unfulfilled' | 'partial' | 'fulfilled';
  
  // Addresses
  billingAddress?: Address;
  shippingAddress?: Address;
  
  // Monetary fields
  taxAmount?: number;
  discountAmount?: number;
  shippingAmount?: number;
  totalPaid?: number;
  totalRefunded?: number;
  
  // Processing details
  source?: string;
  deviceId?: string;
  staffId?: string;
  
  // Additional information
  currency?: string;
  discountCode?: string;
  notes?: string;
  tags?: string;
  market?: string;
  receiptNumber?: string;
  
  // Timestamps
  cancelledAt?: Date;
  closedAt?: Date;
  
  // Legacy fields (deprecated)
  referid?: string; // Use referenceId instead
  discount?: number; // Use discountAmount instead
  fulfill?: string; // Use fulfillmentStatus instead
}

// Enhanced OrderItem interface
export interface OrderItem {
  id: string;
  // Required fields
  orderId: string;
  storeId: string;
  title: string;
  quantity: number; // Standardized from qty
  price: number;
  lineTotal: number;
  
  // Product relationships
  productId?: string;
  itemId?: string;
  sku?: string;
  
  // Pricing
  cost?: number;
  compareAtPrice?: number;
  discountAmount?: number;
  
  // Tax (consolidated fields)
  taxAmount?: number;
  taxRate?: number;
  
  // Product details
  productImage?: string;
  productType?: string;
  variantTitle?: string; // Standardized naming
  vendor?: string;
  
  // Fulfillment
  fulfillmentStatus?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  
  // Legacy fields (deprecated)
  qty?: number; // Use quantity instead
  total?: number; // Use lineTotal instead
}

// Enhanced Customer interface
export interface Customer extends BaseEntity {
  name: string;
  email?: string;
  phone?: string;
  
  // Address management
  addresses?: Address[];
  defaultAddress?: Address;
  
  // Customer analytics
  lastOrderDate?: Date;
  totalOrders?: number;
  totalSpent?: number;
  
  // Additional information
  notes?: string;
  tags?: string;
}

// Enhanced Item interface (product variants)
export interface Item extends BaseEntity {
  // Product relationship
  productId: string;
  sku: string;
  
  // Variant options
  option1?: string;
  option2?: string;
  option3?: string;
  
  // Pricing
  price?: number;
  cost?: number;
  saleprice?: number;
  margin?: number;
  
  // Inventory tracking
  trackQty?: boolean;
  allowPreorder?: boolean;
  reorderlevel?: number;
  
  // Quantities (computed from ilocations)
  totalOnHand?: number;
  totalAvailable?: number;
  totalCommitted?: number;
  
  // Legacy fields
  onhand?: number;
  available?: number;
  committed?: number;
  unavailable?: number;
  
  // Media and metadata
  image?: string;
  barcode?: string;
  path?: string;
  metafields?: Record<string, any>;
}

// Enhanced Inventory Location interface
export interface InventoryLocation extends BaseEntity {
  // Required relationships
  itemId: string;
  locationId: string;
  
  // Quantity tracking (non-negative constraints)
  onHand?: number;
  committed?: number;
  unavailable?: number;
  available?: number; // Computed: onHand - committed - unavailable
  
  // Reorder management
  reorderLevel?: number;
  reorderQuantity?: number;
  
  // Audit trail
  updatedBy?: string;
  
  // Counting audit
  lastCounted?: Date;
  lastCountedBy?: string;
  lastCountQuantity?: number;
  
  // Receiving audit
  lastReceived?: Date;
  lastReceivedBy?: string;
  lastReceivedQuantity?: number;
  
  // Movement tracking
  lastMovementDate?: Date;
  lastMovementType?: 'adjustment' | 'sale' | 'receive' | 'transfer';
  lastMovementReference?: string;
  
  // Data integrity
  version?: number;
  isActive?: boolean;
}

// Enhanced Inventory Adjustment interface
export interface InventoryAdjustment extends BaseEntity {
  // Required relationships
  itemId: string;
  locationId: string;
  
  // Quantity tracking
  quantityBefore: number;
  quantityAfter: number;
  quantityChange: number;
  
  // Adjustment details
  type: 'adjustment' | 'sale' | 'receive' | 'transfer' | 'count' | 'damage' | 'return';
  reason?: 'damaged' | 'expired' | 'lost' | 'found' | 'correction' | 'transfer_in' | 'transfer_out';
  reference?: string; // Order ID, Transfer ID, etc.
  
  // User tracking
  userId?: string;
  userName?: string;
  userRole?: 'admin' | 'manager' | 'staff' | 'system';
  
  // Session and batch tracking
  sessionId?: string;
  batchId?: string;
  
  // Additional context
  notes?: string;
  deviceId?: string;
  ipAddress?: string;
  
  // Cost tracking
  unitCost?: number;
  totalCostImpact?: number;
  
  // Approval workflow
  requiresApproval?: boolean;
  approvedBy?: string;
  approvedAt?: Date;
  approvalNotes?: string;
  
  // Data integrity
  version?: number;
  isReversed?: boolean;
  reversalReference?: string;
}

// Location interface
export interface Location extends BaseEntity {
  name: string;
  type?: string;
  
  // Status
  isActive?: boolean;
  isDefault?: boolean;
  fulfillsOnlineOrders?: boolean;
  
  // Contact information
  address?: Address;
  contactInfo?: Record<string, any>;
  
  // Metadata
  metafields?: Record<string, any>;
}

// Brand, Category, Type, Vendor interfaces
export interface Brand extends BaseEntity {
  name: string;
}

export interface Category extends BaseEntity {
  name: string;
  parent?: string;
}

export interface ProductType extends BaseEntity {
  name: string;
  parent?: string;
}

export interface Vendor extends BaseEntity {
  name: string;
}

// Collection interface
export interface Collection extends BaseEntity {
  name: string;
  description?: string;
  image?: string;
  
  // Hierarchy
  parent?: string;
  sortOrder?: number;
  
  // Visibility
  isActive: boolean;
  pos?: boolean;
  storefront?: boolean;
}

// Cart interface
export interface Cart {
  id: string;
  storeId: string;
  productId: string;
  itemId?: string;
  sessionId?: string; // For anonymous users
  userId?: string; // For authenticated users
  
  // Product details
  title: string;
  sku?: string;
  image?: string;
  variantTitle?: string;
  
  // Quantity and pricing
  quantity: number;
  price: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt?: Date;
}

// Session interface for cart management
export interface Session {
  id: string;
  sessionId: string;
  storeId: string;
  userId?: string; // null for anonymous sessions
  
  // Device and tracking
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;
  
  // Session management
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  isActive: boolean;
  
  // Additional data
  metadata?: Record<string, any>;
}

// Audit system interfaces
export interface AuditSession {
  id: string;
  sessionId: string;
  storeId: string;
  
  // User information
  userId?: string;
  userName?: string;
  userRole?: string;
  
  // Device tracking
  deviceId?: string;
  ipAddress?: string;
  
  // Session timing
  startedAt: Date;
  endedAt?: Date;
  
  // Summary statistics
  totalAdjustments?: number;
  totalQuantityChange?: number;
  totalCostImpact?: number;
  
  // Additional information
  notes?: string;
  isActive?: boolean;
}

export interface AuditBatch {
  id: string;
  batchId: string;
  storeId: string;
  sessionId?: string;
  
  // User information
  userId?: string;
  userName?: string;
  
  // Batch details
  batchType: 'bulk_adjustment' | 'cycle_count' | 'transfer' | 'receiving';
  description?: string;
  
  // Timing
  createdAt: Date;
  completedAt?: Date;
  
  // Progress tracking
  totalItems?: number;
  processedItems?: number;
  totalQuantityChange?: number;
  totalCostImpact?: number;
  
  // Status
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorCount?: number;
  notes?: string;
}

// Export all interfaces as a union type for convenience
export type DatabaseEntity = 
  | Product 
  | Order 
  | OrderItem 
  | Customer 
  | Item 
  | InventoryLocation 
  | InventoryAdjustment 
  | Location 
  | Brand 
  | Category 
  | ProductType 
  | Vendor 
  | Collection 
  | Cart 
  | Session 
  | AuditSession 
  | AuditBatch;

// Query result types for common operations
export interface ProductWithRelations extends Product {
  brand?: Brand;
  category?: Category;
  type?: ProductType;
  vendor?: Vendor;
  collection?: Collection;
  items?: Item[];
}

export interface OrderWithRelations extends Order {
  customer?: Customer;
  location?: Location;
  orderItems?: OrderItem[];
}

export interface ItemWithInventory extends Item {
  inventoryLocations?: InventoryLocation[];
  product?: Product;
}

// Search and filter types
export interface ProductFilters {
  storeId?: string;
  status?: Product['status'];
  pos?: boolean;
  website?: boolean;
  featured?: boolean;
  brandId?: string;
  categoryId?: string;
  typeId?: string;
  vendorId?: string;
  collectionId?: string;
  priceMin?: number;
  priceMax?: number;
  search?: string;
}

export interface OrderFilters {
  storeId?: string;
  status?: Order['status'];
  paymentStatus?: Order['paymentStatus'];
  fulfillmentStatus?: Order['fulfillmentStatus'];
  customerId?: string;
  locationId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

// Validation types
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}