// Validation utilities for enhanced database schema
// Provides type-safe validation functions with detailed error reporting

import type {
  Product,
  Order,
  OrderItem,
  Customer,
  Item,
  InventoryLocation,
  InventoryAdjustment,
  ValidationError,
  ValidationResult,
} from './database';

// Validation helper functions
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
};

const isNonNegativeNumber = (value: number): boolean => {
  return typeof value === 'number' && value >= 0;
};

const isValidSKU = (sku: string): boolean => {
  // SKU should be alphanumeric with optional hyphens and underscores
  const skuRegex = /^[A-Za-z0-9\-_]+$/;
  return skuRegex.test(sku);
};

const isValidBarcode = (barcode: string): boolean => {
  // Basic barcode validation (UPC, EAN, etc.)
  const barcodeRegex = /^[0-9]{8,14}$/;
  return barcodeRegex.test(barcode);
};

// Product validation
export const validateProduct = (data: Partial<Product>): ValidationResult => {
  const errors: ValidationError[] = [];

  // Required fields
  if (!data.title || data.title.trim().length === 0) {
    errors.push({
      field: 'title',
      message: 'Product title is required',
      code: 'REQUIRED_FIELD'
    });
  }

  if (!data.storeId || data.storeId.trim().length === 0) {
    errors.push({
      field: 'storeId',
      message: 'Store ID is required',
      code: 'REQUIRED_FIELD'
    });
  }

  // Status validation
  if (data.status && !['active', 'draft', 'archived'].includes(data.status)) {
    errors.push({
      field: 'status',
      message: 'Status must be active, draft, or archived',
      code: 'INVALID_VALUE'
    });
  }

  // Price validation (non-negative)
  if (data.price !== undefined && !isNonNegativeNumber(data.price)) {
    errors.push({
      field: 'price',
      message: 'Price must be a non-negative number',
      code: 'INVALID_NUMBER'
    });
  }

  if (data.cost !== undefined && !isNonNegativeNumber(data.cost)) {
    errors.push({
      field: 'cost',
      message: 'Cost must be a non-negative number',
      code: 'INVALID_NUMBER'
    });
  }

  if (data.saleprice !== undefined && !isNonNegativeNumber(data.saleprice)) {
    errors.push({
      field: 'saleprice',
      message: 'Sale price must be a non-negative number',
      code: 'INVALID_NUMBER'
    });
  }

  // SKU validation
  if (data.sku && !isValidSKU(data.sku)) {
    errors.push({
      field: 'sku',
      message: 'SKU must contain only alphanumeric characters, hyphens, and underscores',
      code: 'INVALID_FORMAT'
    });
  }

  // Barcode validation
  if (data.barcode && !isValidBarcode(data.barcode)) {
    errors.push({
      field: 'barcode',
      message: 'Barcode must be 8-14 digits',
      code: 'INVALID_FORMAT'
    });
  }

  // Title length validation
  if (data.title && data.title.length > 255) {
    errors.push({
      field: 'title',
      message: 'Product title must be 255 characters or less',
      code: 'MAX_LENGTH_EXCEEDED'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Order validation
export const validateOrder = (data: Partial<Order>): ValidationResult => {
  const errors: ValidationError[] = [];

  // Required fields
  if (!data.storeId || data.storeId.trim().length === 0) {
    errors.push({
      field: 'storeId',
      message: 'Store ID is required',
      code: 'REQUIRED_FIELD'
    });
  }

  if (!data.orderNumber || data.orderNumber.trim().length === 0) {
    errors.push({
      field: 'orderNumber',
      message: 'Order number is required',
      code: 'REQUIRED_FIELD'
    });
  }

  if (!data.referenceId || data.referenceId.trim().length === 0) {
    errors.push({
      field: 'referenceId',
      message: 'Reference ID is required',
      code: 'REQUIRED_FIELD'
    });
  }

  if (data.subtotal === undefined || data.subtotal === null) {
    errors.push({
      field: 'subtotal',
      message: 'Subtotal is required',
      code: 'REQUIRED_FIELD'
    });
  }

  if (data.total === undefined || data.total === null) {
    errors.push({
      field: 'total',
      message: 'Total is required',
      code: 'REQUIRED_FIELD'
    });
  }

  // Monetary field validation (non-negative)
  if (data.subtotal !== undefined && !isNonNegativeNumber(data.subtotal)) {
    errors.push({
      field: 'subtotal',
      message: 'Subtotal must be a non-negative number',
      code: 'INVALID_NUMBER'
    });
  }

  if (data.total !== undefined && !isNonNegativeNumber(data.total)) {
    errors.push({
      field: 'total',
      message: 'Total must be a non-negative number',
      code: 'INVALID_NUMBER'
    });
  }

  if (data.taxAmount !== undefined && !isNonNegativeNumber(data.taxAmount)) {
    errors.push({
      field: 'taxAmount',
      message: 'Tax amount must be a non-negative number',
      code: 'INVALID_NUMBER'
    });
  }

  if (data.discountAmount !== undefined && !isNonNegativeNumber(data.discountAmount)) {
    errors.push({
      field: 'discountAmount',
      message: 'Discount amount must be a non-negative number',
      code: 'INVALID_NUMBER'
    });
  }

  if (data.shippingAmount !== undefined && !isNonNegativeNumber(data.shippingAmount)) {
    errors.push({
      field: 'shippingAmount',
      message: 'Shipping amount must be a non-negative number',
      code: 'INVALID_NUMBER'
    });
  }

  // Status validation
  if (data.status && !['pending', 'processing', 'completed', 'cancelled'].includes(data.status)) {
    errors.push({
      field: 'status',
      message: 'Status must be pending, processing, completed, or cancelled',
      code: 'INVALID_VALUE'
    });
  }

  if (data.paymentStatus && !['pending', 'paid', 'partial', 'refunded'].includes(data.paymentStatus)) {
    errors.push({
      field: 'paymentStatus',
      message: 'Payment status must be pending, paid, partial, or refunded',
      code: 'INVALID_VALUE'
    });
  }

  if (data.fulfillmentStatus && !['unfulfilled', 'partial', 'fulfilled'].includes(data.fulfillmentStatus)) {
    errors.push({
      field: 'fulfillmentStatus',
      message: 'Fulfillment status must be unfulfilled, partial, or fulfilled',
      code: 'INVALID_VALUE'
    });
  }

  // Email validation
  if (data.customerEmail && !isValidEmail(data.customerEmail)) {
    errors.push({
      field: 'customerEmail',
      message: 'Customer email must be a valid email address',
      code: 'INVALID_FORMAT'
    });
  }

  // Phone validation
  if (data.customerPhone && !isValidPhone(data.customerPhone)) {
    errors.push({
      field: 'customerPhone',
      message: 'Customer phone must be a valid phone number',
      code: 'INVALID_FORMAT'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Order Item validation
export const validateOrderItem = (data: Partial<OrderItem>): ValidationResult => {
  const errors: ValidationError[] = [];

  // Required fields
  if (!data.orderId || data.orderId.trim().length === 0) {
    errors.push({
      field: 'orderId',
      message: 'Order ID is required',
      code: 'REQUIRED_FIELD'
    });
  }

  if (!data.storeId || data.storeId.trim().length === 0) {
    errors.push({
      field: 'storeId',
      message: 'Store ID is required',
      code: 'REQUIRED_FIELD'
    });
  }

  if (!data.title || data.title.trim().length === 0) {
    errors.push({
      field: 'title',
      message: 'Item title is required',
      code: 'REQUIRED_FIELD'
    });
  }

  if (data.quantity === undefined || data.quantity === null) {
    errors.push({
      field: 'quantity',
      message: 'Quantity is required',
      code: 'REQUIRED_FIELD'
    });
  }

  if (data.price === undefined || data.price === null) {
    errors.push({
      field: 'price',
      message: 'Price is required',
      code: 'REQUIRED_FIELD'
    });
  }

  if (data.lineTotal === undefined || data.lineTotal === null) {
    errors.push({
      field: 'lineTotal',
      message: 'Line total is required',
      code: 'REQUIRED_FIELD'
    });
  }

  // Quantity validation (positive number)
  if (data.quantity !== undefined && (typeof data.quantity !== 'number' || data.quantity <= 0)) {
    errors.push({
      field: 'quantity',
      message: 'Quantity must be a positive number',
      code: 'INVALID_NUMBER'
    });
  }

  // Price validation (non-negative)
  if (data.price !== undefined && !isNonNegativeNumber(data.price)) {
    errors.push({
      field: 'price',
      message: 'Price must be a non-negative number',
      code: 'INVALID_NUMBER'
    });
  }

  if (data.lineTotal !== undefined && !isNonNegativeNumber(data.lineTotal)) {
    errors.push({
      field: 'lineTotal',
      message: 'Line total must be a non-negative number',
      code: 'INVALID_NUMBER'
    });
  }

  if (data.cost !== undefined && !isNonNegativeNumber(data.cost)) {
    errors.push({
      field: 'cost',
      message: 'Cost must be a non-negative number',
      code: 'INVALID_NUMBER'
    });
  }

  if (data.taxAmount !== undefined && !isNonNegativeNumber(data.taxAmount)) {
    errors.push({
      field: 'taxAmount',
      message: 'Tax amount must be a non-negative number',
      code: 'INVALID_NUMBER'
    });
  }

  if (data.discountAmount !== undefined && !isNonNegativeNumber(data.discountAmount)) {
    errors.push({
      field: 'discountAmount',
      message: 'Discount amount must be a non-negative number',
      code: 'INVALID_NUMBER'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Customer validation
export const validateCustomer = (data: Partial<Customer>): ValidationResult => {
  const errors: ValidationError[] = [];

  // Required fields
  if (!data.storeId || data.storeId.trim().length === 0) {
    errors.push({
      field: 'storeId',
      message: 'Store ID is required',
      code: 'REQUIRED_FIELD'
    });
  }

  if (!data.name || data.name.trim().length === 0) {
    errors.push({
      field: 'name',
      message: 'Customer name is required',
      code: 'REQUIRED_FIELD'
    });
  }

  // Email validation (optional but must be valid if provided)
  if (data.email && !isValidEmail(data.email)) {
    errors.push({
      field: 'email',
      message: 'Email must be a valid email address',
      code: 'INVALID_FORMAT'
    });
  }

  // Phone validation (optional but must be valid if provided)
  if (data.phone && !isValidPhone(data.phone)) {
    errors.push({
      field: 'phone',
      message: 'Phone must be a valid phone number',
      code: 'INVALID_FORMAT'
    });
  }

  // Name length validation
  if (data.name && data.name.length > 255) {
    errors.push({
      field: 'name',
      message: 'Customer name must be 255 characters or less',
      code: 'MAX_LENGTH_EXCEEDED'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Item validation
export const validateItem = (data: Partial<Item>): ValidationResult => {
  const errors: ValidationError[] = [];

  // Required fields
  if (!data.storeId || data.storeId.trim().length === 0) {
    errors.push({
      field: 'storeId',
      message: 'Store ID is required',
      code: 'REQUIRED_FIELD'
    });
  }

  if (!data.productId || data.productId.trim().length === 0) {
    errors.push({
      field: 'productId',
      message: 'Product ID is required',
      code: 'REQUIRED_FIELD'
    });
  }

  if (!data.sku || data.sku.trim().length === 0) {
    errors.push({
      field: 'sku',
      message: 'SKU is required',
      code: 'REQUIRED_FIELD'
    });
  }

  // SKU validation
  if (data.sku && !isValidSKU(data.sku)) {
    errors.push({
      field: 'sku',
      message: 'SKU must contain only alphanumeric characters, hyphens, and underscores',
      code: 'INVALID_FORMAT'
    });
  }

  // Barcode validation
  if (data.barcode && !isValidBarcode(data.barcode)) {
    errors.push({
      field: 'barcode',
      message: 'Barcode must be 8-14 digits',
      code: 'INVALID_FORMAT'
    });
  }

  // Price validation (non-negative)
  if (data.price !== undefined && !isNonNegativeNumber(data.price)) {
    errors.push({
      field: 'price',
      message: 'Price must be a non-negative number',
      code: 'INVALID_NUMBER'
    });
  }

  if (data.cost !== undefined && !isNonNegativeNumber(data.cost)) {
    errors.push({
      field: 'cost',
      message: 'Cost must be a non-negative number',
      code: 'INVALID_NUMBER'
    });
  }

  if (data.saleprice !== undefined && !isNonNegativeNumber(data.saleprice)) {
    errors.push({
      field: 'saleprice',
      message: 'Sale price must be a non-negative number',
      code: 'INVALID_NUMBER'
    });
  }

  // Quantity validation (non-negative)
  if (data.totalOnHand !== undefined && !isNonNegativeNumber(data.totalOnHand)) {
    errors.push({
      field: 'totalOnHand',
      message: 'Total on hand must be a non-negative number',
      code: 'INVALID_NUMBER'
    });
  }

  if (data.totalAvailable !== undefined && !isNonNegativeNumber(data.totalAvailable)) {
    errors.push({
      field: 'totalAvailable',
      message: 'Total available must be a non-negative number',
      code: 'INVALID_NUMBER'
    });
  }

  if (data.totalCommitted !== undefined && !isNonNegativeNumber(data.totalCommitted)) {
    errors.push({
      field: 'totalCommitted',
      message: 'Total committed must be a non-negative number',
      code: 'INVALID_NUMBER'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Inventory Location validation
export const validateInventoryLocation = (data: Partial<InventoryLocation>): ValidationResult => {
  const errors: ValidationError[] = [];

  // Required fields
  if (!data.storeId || data.storeId.trim().length === 0) {
    errors.push({
      field: 'storeId',
      message: 'Store ID is required',
      code: 'REQUIRED_FIELD'
    });
  }

  if (!data.itemId || data.itemId.trim().length === 0) {
    errors.push({
      field: 'itemId',
      message: 'Item ID is required',
      code: 'REQUIRED_FIELD'
    });
  }

  if (!data.locationId || data.locationId.trim().length === 0) {
    errors.push({
      field: 'locationId',
      message: 'Location ID is required',
      code: 'REQUIRED_FIELD'
    });
  }

  // Quantity validation (non-negative)
  if (data.onHand !== undefined && !isNonNegativeNumber(data.onHand)) {
    errors.push({
      field: 'onHand',
      message: 'On hand quantity must be a non-negative number',
      code: 'INVALID_NUMBER'
    });
  }

  if (data.committed !== undefined && !isNonNegativeNumber(data.committed)) {
    errors.push({
      field: 'committed',
      message: 'Committed quantity must be a non-negative number',
      code: 'INVALID_NUMBER'
    });
  }

  if (data.unavailable !== undefined && !isNonNegativeNumber(data.unavailable)) {
    errors.push({
      field: 'unavailable',
      message: 'Unavailable quantity must be a non-negative number',
      code: 'INVALID_NUMBER'
    });
  }

  if (data.available !== undefined && !isNonNegativeNumber(data.available)) {
    errors.push({
      field: 'available',
      message: 'Available quantity must be a non-negative number',
      code: 'INVALID_NUMBER'
    });
  }

  if (data.reorderLevel !== undefined && !isNonNegativeNumber(data.reorderLevel)) {
    errors.push({
      field: 'reorderLevel',
      message: 'Reorder level must be a non-negative number',
      code: 'INVALID_NUMBER'
    });
  }

  if (data.reorderQuantity !== undefined && !isNonNegativeNumber(data.reorderQuantity)) {
    errors.push({
      field: 'reorderQuantity',
      message: 'Reorder quantity must be a non-negative number',
      code: 'INVALID_NUMBER'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Inventory Adjustment validation
export const validateInventoryAdjustment = (data: Partial<InventoryAdjustment>): ValidationResult => {
  const errors: ValidationError[] = [];

  // Required fields
  if (!data.storeId || data.storeId.trim().length === 0) {
    errors.push({
      field: 'storeId',
      message: 'Store ID is required',
      code: 'REQUIRED_FIELD'
    });
  }

  if (!data.itemId || data.itemId.trim().length === 0) {
    errors.push({
      field: 'itemId',
      message: 'Item ID is required',
      code: 'REQUIRED_FIELD'
    });
  }

  if (!data.locationId || data.locationId.trim().length === 0) {
    errors.push({
      field: 'locationId',
      message: 'Location ID is required',
      code: 'REQUIRED_FIELD'
    });
  }

  if (data.quantityBefore === undefined || data.quantityBefore === null) {
    errors.push({
      field: 'quantityBefore',
      message: 'Quantity before is required',
      code: 'REQUIRED_FIELD'
    });
  }

  if (data.quantityAfter === undefined || data.quantityAfter === null) {
    errors.push({
      field: 'quantityAfter',
      message: 'Quantity after is required',
      code: 'REQUIRED_FIELD'
    });
  }

  if (data.quantityChange === undefined || data.quantityChange === null) {
    errors.push({
      field: 'quantityChange',
      message: 'Quantity change is required',
      code: 'REQUIRED_FIELD'
    });
  }

  if (!data.type || data.type.trim().length === 0) {
    errors.push({
      field: 'type',
      message: 'Adjustment type is required',
      code: 'REQUIRED_FIELD'
    });
  }

  // Type validation
  const validTypes = ['adjustment', 'sale', 'receive', 'transfer', 'count', 'damage', 'return'];
  if (data.type && !validTypes.includes(data.type)) {
    errors.push({
      field: 'type',
      message: `Adjustment type must be one of: ${validTypes.join(', ')}`,
      code: 'INVALID_VALUE'
    });
  }

  // Reason validation
  const validReasons = ['damaged', 'expired', 'lost', 'found', 'correction', 'transfer_in', 'transfer_out'];
  if (data.reason && !validReasons.includes(data.reason)) {
    errors.push({
      field: 'reason',
      message: `Adjustment reason must be one of: ${validReasons.join(', ')}`,
      code: 'INVALID_VALUE'
    });
  }

  // User role validation
  const validRoles = ['admin', 'manager', 'staff', 'system'];
  if (data.userRole && !validRoles.includes(data.userRole)) {
    errors.push({
      field: 'userRole',
      message: `User role must be one of: ${validRoles.join(', ')}`,
      code: 'INVALID_VALUE'
    });
  }

  // Quantity validation (non-negative for before/after, any number for change)
  if (data.quantityBefore !== undefined && !isNonNegativeNumber(data.quantityBefore)) {
    errors.push({
      field: 'quantityBefore',
      message: 'Quantity before must be a non-negative number',
      code: 'INVALID_NUMBER'
    });
  }

  if (data.quantityAfter !== undefined && !isNonNegativeNumber(data.quantityAfter)) {
    errors.push({
      field: 'quantityAfter',
      message: 'Quantity after must be a non-negative number',
      code: 'INVALID_NUMBER'
    });
  }

  // Cost validation (non-negative)
  if (data.unitCost !== undefined && !isNonNegativeNumber(data.unitCost)) {
    errors.push({
      field: 'unitCost',
      message: 'Unit cost must be a non-negative number',
      code: 'INVALID_NUMBER'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Batch validation function
export const validateBatch = <T>(
  items: T[],
  validator: (item: T) => ValidationResult
): { isValid: boolean; results: Array<{ index: number; result: ValidationResult }> } => {
  const results = items.map((item, index) => ({
    index,
    result: validator(item)
  }));

  const isValid = results.every(r => r.result.isValid);

  return { isValid, results };
};

// Export all validation functions
export const validators = {
  product: validateProduct,
  order: validateOrder,
  orderItem: validateOrderItem,
  customer: validateCustomer,
  item: validateItem,
  inventoryLocation: validateInventoryLocation,
  inventoryAdjustment: validateInventoryAdjustment,
  batch: validateBatch,
};