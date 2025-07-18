// Validation service for form and data validation
import { log } from '../lib/logger';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings?: Record<string, string>;
}

export interface ProductValidationData {
  title?: string;
  price?: number;
  cost?: number;
  saleprice?: number;
  stock?: number;
  weight?: number;
  email?: string;
  phone?: string;
  website?: string;
  tags?: string[];
  sku?: string;
  barcode?: string;
  status?: string;
  brandId?: string;
  categoryId?: string;
  typeId?: string;
  vendorId?: string;
}

export interface CollectionValidationData {
  name?: string;
  description?: string;
}

export interface StoreValidationData {
  name?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
}

export interface OrderValidationData {
  orderNumber?: string;
  referenceId?: string;
  storeId?: string;
  customerId?: string;
  customerEmail?: string;
  locationId?: string;
  subtotal?: number;
  total?: number;
  taxAmount?: number;
  discountAmount?: number;
  shippingAmount?: number;
  status?: string;
  paymentStatus?: string;
  fulfillmentStatus?: string;
}

export interface InventoryValidationData {
  storeId?: string;
  itemId?: string;
  locationId?: string;
  onHand?: number;
  committed?: number;
  unavailable?: number;
  available?: number;
  reorderLevel?: number;
  reorderQuantity?: number;
}

export class ValidationService {
  private static instance: ValidationService;

  private constructor() {}

  static getInstance(): ValidationService {
    if (!ValidationService.instance) {
      ValidationService.instance = new ValidationService();
    }
    return ValidationService.instance;
  }

  // Email validation
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Phone validation (basic)
  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  }

  // URL validation
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // Validate product data
  validateProduct(data: ProductValidationData, isRequired: boolean = false): ValidationResult {
    const errors: Record<string, string> = {};
    const warnings: Record<string, string> = {};

    // Title validation
    if (isRequired && !data.title?.trim()) {
      errors.title = 'Product title is required';
    } else if (data.title && data.title.length > 255) {
      errors.title = 'Product title must be less than 255 characters';
    } else if (data.title && data.title.length < 2) {
      errors.title = 'Product title must be at least 2 characters';
    }

    // Price validation
    if (data.price !== undefined) {
      if (data.price < 0) {
        errors.price = 'Price cannot be negative';
      } else if (data.price > 999999.99) {
        errors.price = 'Price cannot exceed $999,999.99';
      } else if (data.price === 0) {
        warnings.price = 'Price is set to $0.00';
      }
    }

    // Cost validation
    if (data.cost !== undefined) {
      if (data.cost < 0) {
        errors.cost = 'Cost cannot be negative';
      } else if (data.cost > 999999.99) {
        errors.cost = 'Cost cannot exceed $999,999.99';
      }
    }

    // Price vs Cost validation
    if (data.price !== undefined && data.cost !== undefined && data.price > 0 && data.cost > 0) {
      if (data.cost > data.price) {
        warnings.cost = 'Cost is higher than selling price';
      }
    }

    // Stock validation
    if (data.stock !== undefined) {
      if (data.stock < 0) {
        errors.stock = 'Stock cannot be negative';
      } else if (data.stock > 999999) {
        errors.stock = 'Stock cannot exceed 999,999';
      } else if (data.stock === 0) {
        warnings.stock = 'Product is out of stock';
      } else if (data.stock <= 5) {
        warnings.stock = 'Low stock level';
      }
    }

    // Weight validation
    if (data.weight !== undefined) {
      if (data.weight < 0) {
        errors.weight = 'Weight cannot be negative';
      } else if (data.weight > 99999) {
        errors.weight = 'Weight seems unusually high';
      }
    }

    // Email validation
    if (data.email && !this.isValidEmail(data.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Phone validation
    if (data.phone && !this.isValidPhone(data.phone)) {
      errors.phone = 'Please enter a valid phone number';
    }

    // Website validation
    if (data.website) {
      if (!data.website.startsWith('http://') && !data.website.startsWith('https://')) {
        data.website = 'https://' + data.website;
      }
      if (!this.isValidUrl(data.website)) {
        errors.website = 'Please enter a valid website URL';
      }
    }

    // Sale price validation (new field from optimized schema)
    if (data.saleprice !== undefined) {
      if (data.saleprice < 0) {
        errors.saleprice = 'Sale price cannot be negative';
      } else if (data.saleprice > 999999.99) {
        errors.saleprice = 'Sale price cannot exceed $999,999.99';
      }
    }

    // Sale price vs regular price validation
    if (data.price !== undefined && data.saleprice !== undefined && data.price > 0 && data.saleprice > 0) {
      if (data.saleprice >= data.price) {
        warnings.saleprice = 'Sale price should be lower than regular price';
      }
    }

    // SKU validation (now indexed field)
    if (data.sku && data.sku.length > 100) {
      errors.sku = 'SKU must be less than 100 characters';
    }

    // Barcode validation (now indexed field)
    if (data.barcode && data.barcode.length > 100) {
      errors.barcode = 'Barcode must be less than 100 characters';
    }

    // Status validation (new required field values)
    if (data.status && !['active', 'draft', 'archived'].includes(data.status)) {
      errors.status = 'Status must be active, draft, or archived';
    }

    // Relationship ID validations (new required relationships)
    if (data.brandId && data.brandId.length > 50) {
      errors.brandId = 'Brand ID is invalid';
    }

    if (data.categoryId && data.categoryId.length > 50) {
      errors.categoryId = 'Category ID is invalid';
    }

    if (data.typeId && data.typeId.length > 50) {
      errors.typeId = 'Type ID is invalid';
    }

    if (data.vendorId && data.vendorId.length > 50) {
      errors.vendorId = 'Vendor ID is invalid';
    }

    // Tags validation
    if (data.tags) {
      if (data.tags.length > 20) {
        errors.tags = 'Maximum 20 tags allowed';
      }
      
      const invalidTags = data.tags.filter(tag => tag.length > 50);
      if (invalidTags.length > 0) {
        errors.tags = 'Tags must be less than 50 characters each';
      }
    }

    const result: ValidationResult = {
      isValid: Object.keys(errors).length === 0,
      errors,
      warnings: Object.keys(warnings).length > 0 ? warnings : undefined,
    };

    log.debug('Product validation result', 'ValidationService', { data, result });
    return result;
  }

  // Validate collection data
  validateCollection(data: CollectionValidationData, isRequired: boolean = false): ValidationResult {
    const errors: Record<string, string> = {};

    // Name validation
    if (isRequired && !data.name?.trim()) {
      errors.name = 'Collection name is required';
    } else if (data.name && data.name.length > 255) {
      errors.name = 'Collection name must be less than 255 characters';
    } else if (data.name && data.name.length < 2) {
      errors.name = 'Collection name must be at least 2 characters';
    }

    // Description validation
    if (data.description && data.description.length > 1000) {
      errors.description = 'Description must be less than 1000 characters';
    }

    const result: ValidationResult = {
      isValid: Object.keys(errors).length === 0,
      errors,
    };

    log.debug('Collection validation result', 'ValidationService', { data, result });
    return result;
  }

  // Validate store data
  validateStore(data: StoreValidationData, isRequired: boolean = false): ValidationResult {
    const errors: Record<string, string> = {};

    // Name validation
    if (isRequired && !data.name?.trim()) {
      errors.name = 'Store name is required';
    } else if (data.name && data.name.length > 255) {
      errors.name = 'Store name must be less than 255 characters';
    } else if (data.name && data.name.length < 2) {
      errors.name = 'Store name must be at least 2 characters';
    }

    // Email validation
    if (data.email && !this.isValidEmail(data.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Phone validation
    if (data.phone && !this.isValidPhone(data.phone)) {
      errors.phone = 'Please enter a valid phone number';
    }

    // Website validation
    if (data.website) {
      if (!data.website.startsWith('http://') && !data.website.startsWith('https://')) {
        data.website = 'https://' + data.website;
      }
      if (!this.isValidUrl(data.website)) {
        errors.website = 'Please enter a valid website URL';
      }
    }

    // Address validation
    if (data.address && data.address.length > 500) {
      errors.address = 'Address must be less than 500 characters';
    }

    const result: ValidationResult = {
      isValid: Object.keys(errors).length === 0,
      errors,
    };

    log.debug('Store validation result', 'ValidationService', { data, result });
    return result;
  }

  // Validate file upload
  validateFile(file: { name: string; size: number; type: string }, maxSize: number = 10 * 1024 * 1024): ValidationResult {
    const errors: Record<string, string> = {};

    // File size validation
    if (file.size > maxSize) {
      errors.size = `File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`;
    }

    // File name validation
    if (!file.name || file.name.length > 255) {
      errors.name = 'File name must be less than 255 characters';
    }

    // File type validation (basic)
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/mov', 'video/avi',
      'application/pdf', 'text/plain', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(file.type)) {
      errors.type = 'File type not supported';
    }

    const result: ValidationResult = {
      isValid: Object.keys(errors).length === 0,
      errors,
    };

    log.debug('File validation result', 'ValidationService', { file, result });
    return result;
  }

  // Validate search query
  validateSearchQuery(query: string): ValidationResult {
    const errors: Record<string, string> = {};

    if (query.length > 100) {
      errors.query = 'Search query must be less than 100 characters';
    }

    // Check for potentially harmful characters
    const dangerousChars = /[<>\"'&]/;
    if (dangerousChars.test(query)) {
      errors.query = 'Search query contains invalid characters';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  // Validate order data - updated for optimized schema
  validateOrder(data: OrderValidationData, isRequired: boolean = false): ValidationResult {
    const errors: Record<string, string> = {};
    const warnings: Record<string, string> = {};

    // Order number validation (now unique and indexed)
    if (isRequired && !data.orderNumber?.trim()) {
      errors.orderNumber = 'Order number is required';
    } else if (data.orderNumber && data.orderNumber.length > 100) {
      errors.orderNumber = 'Order number must be less than 100 characters';
    }

    // Reference ID validation (now unique and indexed)
    if (isRequired && !data.referenceId?.trim()) {
      errors.referenceId = 'Reference ID is required';
    } else if (data.referenceId && data.referenceId.length > 100) {
      errors.referenceId = 'Reference ID must be less than 100 characters';
    }

    // Store ID validation (required field)
    if (isRequired && !data.storeId?.trim()) {
      errors.storeId = 'Store ID is required';
    }

    // Customer email validation (when provided)
    if (data.customerEmail && !this.isValidEmail(data.customerEmail)) {
      errors.customerEmail = 'Please enter a valid customer email address';
    }

    // Subtotal validation (required field, non-negative)
    if (isRequired && data.subtotal === undefined) {
      errors.subtotal = 'Subtotal is required';
    } else if (data.subtotal !== undefined && data.subtotal < 0) {
      errors.subtotal = 'Subtotal cannot be negative';
    }

    // Total validation (required field, non-negative)
    if (isRequired && data.total === undefined) {
      errors.total = 'Total is required';
    } else if (data.total !== undefined && data.total < 0) {
      errors.total = 'Total cannot be negative';
    }

    // Tax amount validation (non-negative)
    if (data.taxAmount !== undefined && data.taxAmount < 0) {
      errors.taxAmount = 'Tax amount cannot be negative';
    }

    // Discount amount validation (non-negative)
    if (data.discountAmount !== undefined && data.discountAmount < 0) {
      errors.discountAmount = 'Discount amount cannot be negative';
    }

    // Shipping amount validation (non-negative)
    if (data.shippingAmount !== undefined && data.shippingAmount < 0) {
      errors.shippingAmount = 'Shipping amount cannot be negative';
    }

    // Status validation (indexed field with specific values)
    if (data.status && !['pending', 'processing', 'completed', 'cancelled', 'open', 'closed'].includes(data.status)) {
      errors.status = 'Invalid order status';
    }

    // Payment status validation (indexed field with specific values)
    if (data.paymentStatus && !['pending', 'paid', 'partial', 'refunded', 'unpaid'].includes(data.paymentStatus)) {
      errors.paymentStatus = 'Invalid payment status';
    }

    // Fulfillment status validation (indexed field with specific values)
    if (data.fulfillmentStatus && !['unfulfilled', 'partial', 'fulfilled'].includes(data.fulfillmentStatus)) {
      errors.fulfillmentStatus = 'Invalid fulfillment status';
    }

    // Total calculation validation
    if (data.subtotal !== undefined && data.total !== undefined && data.taxAmount !== undefined && data.discountAmount !== undefined && data.shippingAmount !== undefined) {
      const calculatedTotal = data.subtotal + (data.taxAmount || 0) + (data.shippingAmount || 0) - (data.discountAmount || 0);
      if (Math.abs(calculatedTotal - data.total) > 0.01) {
        warnings.total = 'Total does not match calculated amount';
      }
    }

    const result: ValidationResult = {
      isValid: Object.keys(errors).length === 0,
      errors,
      warnings: Object.keys(warnings).length > 0 ? warnings : undefined,
    };

    log.debug('Order validation result', 'ValidationService', { data, result });
    return result;
  }

  // Validate inventory data - updated for enhanced tracking system
  validateInventory(data: InventoryValidationData, isRequired: boolean = false): ValidationResult {
    const errors: Record<string, string> = {};
    const warnings: Record<string, string> = {};

    // Store ID validation (required field)
    if (isRequired && !data.storeId?.trim()) {
      errors.storeId = 'Store ID is required';
    }

    // Item ID validation (required field, indexed)
    if (isRequired && !data.itemId?.trim()) {
      errors.itemId = 'Item ID is required';
    }

    // Location ID validation (required field, indexed)
    if (isRequired && !data.locationId?.trim()) {
      errors.locationId = 'Location ID is required';
    }

    // On hand quantity validation (non-negative, indexed)
    if (data.onHand !== undefined && data.onHand < 0) {
      errors.onHand = 'On hand quantity cannot be negative';
    }

    // Committed quantity validation (non-negative, indexed)
    if (data.committed !== undefined && data.committed < 0) {
      errors.committed = 'Committed quantity cannot be negative';
    }

    // Unavailable quantity validation (non-negative)
    if (data.unavailable !== undefined && data.unavailable < 0) {
      errors.unavailable = 'Unavailable quantity cannot be negative';
    }

    // Available quantity validation (computed field)
    if (data.available !== undefined && data.available < 0) {
      errors.available = 'Available quantity cannot be negative';
    }

    // Reorder level validation (non-negative, indexed)
    if (data.reorderLevel !== undefined && data.reorderLevel < 0) {
      errors.reorderLevel = 'Reorder level cannot be negative';
    }

    // Reorder quantity validation (non-negative)
    if (data.reorderQuantity !== undefined && data.reorderQuantity < 0) {
      errors.reorderQuantity = 'Reorder quantity cannot be negative';
    }

    // Available quantity calculation validation
    if (data.onHand !== undefined && data.committed !== undefined && data.unavailable !== undefined && data.available !== undefined) {
      const calculatedAvailable = data.onHand - (data.committed || 0) - (data.unavailable || 0);
      if (calculatedAvailable !== data.available) {
        warnings.available = 'Available quantity does not match calculated amount';
      }
    }

    // Low stock warning
    if (data.onHand !== undefined && data.reorderLevel !== undefined && data.onHand <= data.reorderLevel) {
      warnings.onHand = 'Stock level is at or below reorder level';
    }

    // Committed quantity validation against on hand
    if (data.onHand !== undefined && data.committed !== undefined && data.committed > data.onHand) {
      errors.committed = 'Committed quantity cannot exceed on hand quantity';
    }

    const result: ValidationResult = {
      isValid: Object.keys(errors).length === 0,
      errors,
      warnings: Object.keys(warnings).length > 0 ? warnings : undefined,
    };

    log.debug('Inventory validation result', 'ValidationService', { data, result });
    return result;
  }

  // Batch validation
  validateBatch<T>(items: T[], validator: (item: T) => ValidationResult): { valid: T[]; invalid: Array<{ item: T; errors: Record<string, string> }> } {
    const valid: T[] = [];
    const invalid: Array<{ item: T; errors: Record<string, string> }> = [];

    items.forEach(item => {
      const result = validator(item);
      if (result.isValid) {
        valid.push(item);
      } else {
        invalid.push({ item, errors: result.errors });
      }
    });

    log.debug('Batch validation result', 'ValidationService', { 
      totalItems: items.length, 
      validCount: valid.length, 
      invalidCount: invalid.length 
    });

    return { valid, invalid };
  }
}
