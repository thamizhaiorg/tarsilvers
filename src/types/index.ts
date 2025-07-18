// Main types export file for TAR POS
// Provides centralized access to all TypeScript interfaces

// Database entity types
export * from './database';

// Re-export commonly used types for convenience
export type {
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
  AuditSession,
  AuditBatch,
  
  // Extended types with relations
  ProductWithRelations,
  OrderWithRelations,
  ItemWithInventory,
  
  // Filter types
  ProductFilters,
  OrderFilters,
  
  // Utility types
  Address,
  SEOData,
  ProductOptions,
  MediaItem,
  ValidationError,
  ValidationResult,
  
  // Base types
  BaseEntity,
  TimestampFields,
  DatabaseEntity,
} from './database';

// Additional utility types for the application
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

export interface SearchParams {
  query?: string;
  filters?: Record<string, any>;
  sort?: SortParams;
  pagination?: PaginationParams;
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// Form types for common operations
export interface ProductFormData {
  title: string;
  description?: string;
  price?: number;
  cost?: number;
  saleprice?: number;
  sku?: string;
  barcode?: string;
  brandId?: string;
  categoryId?: string;
  typeId?: string;
  vendorId?: string;
  status: Product['status'];
  pos: boolean;
  website: boolean;
  featured: boolean;
  seo?: SEOData;
  options?: ProductOptions;
  tags?: string;
}

export interface OrderFormData {
  customerId?: string;
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  locationId?: string;
  billingAddress?: Address;
  shippingAddress?: Address;
  notes?: string;
  tags?: string;
}

export interface CustomerFormData {
  name: string;
  email?: string;
  phone?: string;
  defaultAddress?: Address;
  notes?: string;
  tags?: string;
}

// Inventory management types
export interface InventoryAdjustmentFormData {
  itemId: string;
  locationId: string;
  quantityChange: number;
  type: InventoryAdjustment['type'];
  reason?: InventoryAdjustment['reason'];
  reference?: string;
  notes?: string;
}

export interface StockLevelAlert {
  itemId: string;
  locationId: string;
  currentQuantity: number;
  reorderLevel: number;
  productTitle: string;
  itemSku: string;
  locationName: string;
}

// Dashboard and analytics types
export interface SalesMetrics {
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  period: 'today' | 'week' | 'month' | 'year';
  previousPeriod?: {
    totalSales: number;
    totalOrders: number;
    averageOrderValue: number;
  };
}

export interface TopProduct {
  productId: string;
  title: string;
  quantitySold: number;
  revenue: number;
  image?: string;
}

export interface InventorySummary {
  totalItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalValue: number;
}

// Export configuration types
export interface ExportOptions {
  format: 'csv' | 'xlsx' | 'json';
  fields?: string[];
  filters?: Record<string, any>;
  dateRange?: {
    from: Date;
    to: Date;
  };
}

// Import configuration types
export interface ImportOptions {
  format: 'csv' | 'xlsx' | 'json';
  mapping?: Record<string, string>;
  skipFirstRow?: boolean;
  validateOnly?: boolean;
}

export interface ImportResult {
  success: boolean;
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  errors: Array<{
    row: number;
    errors: ValidationError[];
  }>;
}

// Theme and UI types
export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  error: string;
  warning: string;
  success: string;
  info: string;
}

export interface UIPreferences {
  theme: 'light' | 'dark' | 'auto';
  colors: ThemeColors;
  fontSize: 'small' | 'medium' | 'large';
  compactMode: boolean;
}

// User and permissions types
export interface UserRole {
  id: string;
  name: string;
  permissions: string[];
  description?: string;
}

export interface UserPermissions {
  products: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
  };
  orders: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    refund: boolean;
  };
  customers: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
  };
  inventory: {
    view: boolean;
    adjust: boolean;
    transfer: boolean;
    count: boolean;
  };
  reports: {
    view: boolean;
    export: boolean;
  };
  settings: {
    view: boolean;
    edit: boolean;
  };
}

// Notification types
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

// Webhook and integration types
export interface WebhookEvent {
  id: string;
  event: string;
  data: Record<string, any>;
  timestamp: Date;
  storeId: string;
}

export interface IntegrationConfig {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  config: Record<string, any>;
  lastSync?: Date;
  status: 'active' | 'error' | 'disabled';
}