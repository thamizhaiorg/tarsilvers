/**
 * Schema Validation Rules
 * 
 * Comprehensive validation rules for all field types, constraints, and business logic
 * as defined in the optimized database schema.
 * 
 * Requirements covered: 1.1, 1.2, 1.3, 1.4, 1.5, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface NumericValidationRule {
  entity: string;
  field: string;
  rule: 'non-negative' | 'positive' | 'range';
  min?: number;
  max?: number;
  message?: string;
}

export interface FieldValidationRule {
  entity: string;
  field: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'json';
  required: boolean;
  unique?: boolean;
  indexed?: boolean;
  constraints?: {
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    enum?: string[];
  };
}

// Numeric validation rules for all entities
export const NUMERIC_VALIDATION_RULES: NumericValidationRule[] = [
  // Products entity
  { entity: 'products', field: 'price', rule: 'non-negative', message: 'Product price must be non-negative' },
  { entity: 'products', field: 'cost', rule: 'non-negative', message: 'Product cost must be non-negative' },
  { entity: 'products', field: 'saleprice', rule: 'non-negative', message: 'Product sale price must be non-negative' },
  
  // Items entity
  { entity: 'items', field: 'price', rule: 'non-negative', message: 'Item price must be non-negative' },
  { entity: 'items', field: 'cost', rule: 'non-negative', message: 'Item cost must be non-negative' },
  { entity: 'items', field: 'saleprice', rule: 'non-negative', message: 'Item sale price must be non-negative' },
  { entity: 'items', field: 'onhand', rule: 'non-negative', message: 'Item on-hand quantity must be non-negative' },
  { entity: 'items', field: 'available', rule: 'non-negative', message: 'Item available quantity must be non-negative' },
  { entity: 'items', field: 'committed', rule: 'non-negative', message: 'Item committed quantity must be non-negative' },
  { entity: 'items', field: 'unavailable', rule: 'non-negative', message: 'Item unavailable quantity must be non-negative' },
  { entity: 'items', field: 'totalOnHand', rule: 'non-negative', message: 'Item total on-hand must be non-negative' },
  { entity: 'items', field: 'totalAvailable', rule: 'non-negative', message: 'Item total available must be non-negative' },
  { entity: 'items', field: 'totalCommitted', rule: 'non-negative', message: 'Item total committed must be non-negative' },
  
  // Inventory locations entity
  { entity: 'ilocations', field: 'onHand', rule: 'non-negative', message: 'Inventory on-hand must be non-negative' },
  { entity: 'ilocations', field: 'committed', rule: 'non-negative', message: 'Inventory committed must be non-negative' },
  { entity: 'ilocations', field: 'unavailable', rule: 'non-negative', message: 'Inventory unavailable must be non-negative' },
  { entity: 'ilocations', field: 'available', rule: 'non-negative', message: 'Inventory available must be non-negative' },
  { entity: 'ilocations', field: 'reorderLevel', rule: 'non-negative', message: 'Reorder level must be non-negative' },
  { entity: 'ilocations', field: 'reorderQuantity', rule: 'non-negative', message: 'Reorder quantity must be non-negative' },
  
  // Cart entity
  { entity: 'cart', field: 'quantity', rule: 'positive', message: 'Cart quantity must be positive' },
  { entity: 'cart', field: 'price', rule: 'positive', message: 'Cart item price must be positive' },
  
  // Order items entity
  { entity: 'orderitems', field: 'quantity', rule: 'positive', message: 'Order item quantity must be positive' },
  { entity: 'orderitems', field: 'price', rule: 'positive', message: 'Order item price must be positive' },
  { entity: 'orderitems', field: 'lineTotal', rule: 'positive', message: 'Order item line total must be positive' },
  { entity: 'orderitems', field: 'cost', rule: 'non-negative', message: 'Order item cost must be non-negative' },
  { entity: 'orderitems', field: 'taxAmount', rule: 'non-negative', message: 'Order item tax amount must be non-negative' },
  { entity: 'orderitems', field: 'taxRate', rule: 'non-negative', message: 'Order item tax rate must be non-negative' },
  { entity: 'orderitems', field: 'discountAmount', rule: 'non-negative', message: 'Order item discount amount must be non-negative' },
  
  // Orders entity
  { entity: 'orders', field: 'subtotal', rule: 'non-negative', message: 'Order subtotal must be non-negative' },
  { entity: 'orders', field: 'total', rule: 'non-negative', message: 'Order total must be non-negative' },
  { entity: 'orders', field: 'taxAmount', rule: 'non-negative', message: 'Order tax amount must be non-negative' },
  { entity: 'orders', field: 'discountAmount', rule: 'non-negative', message: 'Order discount amount must be non-negative' },
  { entity: 'orders', field: 'shippingAmount', rule: 'non-negative', message: 'Order shipping amount must be non-negative' },
  { entity: 'orders', field: 'totalPaid', rule: 'non-negative', message: 'Order total paid must be non-negative' },
  { entity: 'orders', field: 'totalRefunded', rule: 'non-negative', message: 'Order total refunded must be non-negative' },
  
  // Inventory adjustments entity
  { entity: 'iadjust', field: 'quantityBefore', rule: 'non-negative', message: 'Quantity before adjustment must be non-negative' },
  { entity: 'iadjust', field: 'quantityAfter', rule: 'non-negative', message: 'Quantity after adjustment must be non-negative' },
  { entity: 'iadjust', field: 'unitCost', rule: 'non-negative', message: 'Unit cost must be non-negative' },
  
  // Inventory entity (legacy)
  { entity: 'inventory', field: 'quantity', rule: 'non-negative', message: 'Inventory quantity must be non-negative' },
  { entity: 'inventory', field: 'available', rule: 'non-negative', message: 'Inventory available must be non-negative' },
  { entity: 'inventory', field: 'reserved', rule: 'non-negative', message: 'Inventory reserved must be non-negative' },
];

// Field validation rules for all entities
export const FIELD_VALIDATION_RULES: FieldValidationRule[] = [
  // Products entity
  { entity: 'products', field: 'title', type: 'string', required: true, indexed: true },
  { entity: 'products', field: 'storeId', type: 'string', required: true, indexed: true },
  { entity: 'products', field: 'sku', type: 'string', required: false, indexed: true, unique: true },
  { entity: 'products', field: 'barcode', type: 'string', required: false, indexed: true },
  { entity: 'products', field: 'status', type: 'string', required: true, indexed: true, constraints: { enum: ['active', 'draft', 'archived'] } },
  { entity: 'products', field: 'pos', type: 'boolean', required: true, indexed: true },
  { entity: 'products', field: 'website', type: 'boolean', required: true, indexed: true },
  { entity: 'products', field: 'featured', type: 'boolean', required: true, indexed: true },
  { entity: 'products', field: 'price', type: 'number', required: false },
  { entity: 'products', field: 'cost', type: 'number', required: false },
  { entity: 'products', field: 'saleprice', type: 'number', required: false },
  { entity: 'products', field: 'createdAt', type: 'date', required: true, indexed: true },
  { entity: 'products', field: 'updatedAt', type: 'date', required: false },
  { entity: 'products', field: 'seo', type: 'json', required: false },
  { entity: 'products', field: 'metafields', type: 'json', required: false },
  { entity: 'products', field: 'options', type: 'json', required: false },
  
  // Orders entity
  { entity: 'orders', field: 'storeId', type: 'string', required: true, indexed: true },
  { entity: 'orders', field: 'orderNumber', type: 'string', required: true, indexed: true, unique: true },
  { entity: 'orders', field: 'referenceId', type: 'string', required: true, indexed: true, unique: true },
  { entity: 'orders', field: 'status', type: 'string', required: true, indexed: true, constraints: { enum: ['pending', 'processing', 'completed', 'cancelled'] } },
  { entity: 'orders', field: 'paymentStatus', type: 'string', required: true, indexed: true, constraints: { enum: ['pending', 'paid', 'partial', 'refunded'] } },
  { entity: 'orders', field: 'fulfillmentStatus', type: 'string', required: true, indexed: true, constraints: { enum: ['unfulfilled', 'partial', 'fulfilled'] } },
  { entity: 'orders', field: 'createdAt', type: 'date', required: true, indexed: true },
  { entity: 'orders', field: 'updatedAt', type: 'date', required: false },
  { entity: 'orders', field: 'billingAddress', type: 'json', required: false },
  { entity: 'orders', field: 'shippingAddress', type: 'json', required: false },
  
  // Orders entity - additional fields
  { entity: 'orders', field: 'subtotal', type: 'number', required: true },
  { entity: 'orders', field: 'total', type: 'number', required: true },
  { entity: 'orders', field: 'taxAmount', type: 'number', required: false },
  { entity: 'orders', field: 'discountAmount', type: 'number', required: false },
  { entity: 'orders', field: 'shippingAmount', type: 'number', required: false },
  
  // Order items entity
  { entity: 'orderitems', field: 'orderId', type: 'string', required: true, indexed: true },
  { entity: 'orderitems', field: 'storeId', type: 'string', required: true, indexed: true },
  { entity: 'orderitems', field: 'title', type: 'string', required: true },
  { entity: 'orderitems', field: 'quantity', type: 'number', required: true },
  { entity: 'orderitems', field: 'price', type: 'number', required: true },
  { entity: 'orderitems', field: 'lineTotal', type: 'number', required: true },
  
  // Cart entity
  { entity: 'cart', field: 'quantity', type: 'number', required: true },
  { entity: 'cart', field: 'price', type: 'number', required: true },
  
  // Inventory entity (legacy)
  { entity: 'inventory', field: 'quantity', type: 'number', required: false },
  { entity: 'inventory', field: 'available', type: 'number', required: false },
  { entity: 'inventory', field: 'reserved', type: 'number', required: false },
  
  // Customers entity
  { entity: 'customers', field: 'storeId', type: 'string', required: true, indexed: true },
  { entity: 'customers', field: 'name', type: 'string', required: true },
  { entity: 'customers', field: 'email', type: 'string', required: false, indexed: true, constraints: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ } },
  { entity: 'customers', field: 'phone', type: 'string', required: false, indexed: true },
  { entity: 'customers', field: 'createdAt', type: 'date', required: true, indexed: true },
  { entity: 'customers', field: 'addresses', type: 'json', required: false },
  { entity: 'customers', field: 'defaultAddress', type: 'json', required: false },
  
  // Inventory locations entity
  { entity: 'ilocations', field: 'storeId', type: 'string', required: true, indexed: true },
  { entity: 'ilocations', field: 'itemId', type: 'string', required: true, indexed: true },
  { entity: 'ilocations', field: 'locationId', type: 'string', required: true, indexed: true },
  { entity: 'ilocations', field: 'createdAt', type: 'date', required: true, indexed: true },
  
  // Inventory adjustments entity
  { entity: 'iadjust', field: 'storeId', type: 'string', required: true, indexed: true },
  { entity: 'iadjust', field: 'itemId', type: 'string', required: true, indexed: true },
  { entity: 'iadjust', field: 'locationId', type: 'string', required: true, indexed: true },
  { entity: 'iadjust', field: 'type', type: 'string', required: true, indexed: true, constraints: { enum: ['adjustment', 'sale', 'receive', 'transfer', 'count', 'damage', 'return'] } },
  { entity: 'iadjust', field: 'createdAt', type: 'date', required: true, indexed: true },
];

/**
 * Validates a single field value against its validation rules
 */
export function validateField(entity: string, field: string, value: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Find field validation rule
  const fieldRule = FIELD_VALIDATION_RULES.find(rule => rule.entity === entity && rule.field === field);
  if (!fieldRule) {
    return { isValid: true, errors: [] };
  }
  
  // Check required fields
  if (fieldRule.required && (value === null || value === undefined || value === '')) {
    errors.push(`${field} is required for ${entity}`);
  }
  
  // Skip further validation if value is null/undefined and field is optional
  if (!fieldRule.required && (value === null || value === undefined)) {
    return { isValid: true, errors: [] };
  }
  
  // Type validation
  if (!validateFieldType(value, fieldRule.type)) {
    errors.push(`${field} must be of type ${fieldRule.type}`);
  }
  
  // Constraint validation
  if (fieldRule.constraints) {
    const constraints = fieldRule.constraints;
    
    // String constraints
    if (fieldRule.type === 'string' && typeof value === 'string') {
      if (constraints.minLength && value.length < constraints.minLength) {
        errors.push(`${field} must be at least ${constraints.minLength} characters`);
      }
      if (constraints.maxLength && value.length > constraints.maxLength) {
        errors.push(`${field} must be less than ${constraints.maxLength} characters`);
      }
      if (constraints.pattern && !constraints.pattern.test(value)) {
        errors.push(`${field} format is invalid`);
      }
      if (constraints.enum && !constraints.enum.includes(value)) {
        errors.push(`${field} must be one of: ${constraints.enum.join(', ')}`);
      }
    }
  }
  
  // Numeric validation
  if (typeof value === 'number') {
    const numericRule = NUMERIC_VALIDATION_RULES.find(rule => rule.entity === entity && rule.field === field);
    if (numericRule) {
      const numericResult = validateNumericConstraint(value, numericRule);
      if (!numericResult.isValid) {
        errors.push(...numericResult.errors);
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Validates an entire entity object
 */
export function validateEntity(entity: string, data: Record<string, any>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Get all field rules for this entity
  const entityRules = FIELD_VALIDATION_RULES.filter(rule => rule.entity === entity);
  
  // Validate each field
  for (const rule of entityRules) {
    const fieldResult = validateField(entity, rule.field, data[rule.field]);
    if (!fieldResult.isValid) {
      errors.push(...fieldResult.errors);
    }
    if (fieldResult.warnings) {
      warnings.push(...fieldResult.warnings);
    }
  }
  
  // Business logic validation
  const businessResult = validateBusinessLogic(entity, data);
  if (!businessResult.isValid) {
    errors.push(...businessResult.errors);
  }
  if (businessResult.warnings) {
    warnings.push(...businessResult.warnings);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Validates field type
 */
function validateFieldType(value: any, expectedType: string): boolean {
  switch (expectedType) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !isNaN(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'date':
      return value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)));
    case 'json':
      return typeof value === 'object' && value !== null && !Array.isArray(value) || Array.isArray(value);
    default:
      return true;
  }
}

/**
 * Validates numeric constraints
 */
function validateNumericConstraint(value: number, rule: NumericValidationRule): ValidationResult {
  const errors: string[] = [];
  
  switch (rule.rule) {
    case 'non-negative':
      if (value < 0) {
        errors.push(rule.message || `${rule.field} must be non-negative`);
      }
      break;
    case 'positive':
      if (value <= 0) {
        errors.push(rule.message || `${rule.field} must be positive`);
      }
      break;
    case 'range':
      if (rule.min !== undefined && value < rule.min) {
        errors.push(rule.message || `${rule.field} must be at least ${rule.min}`);
      }
      if (rule.max !== undefined && value > rule.max) {
        errors.push(rule.message || `${rule.field} must be at most ${rule.max}`);
      }
      break;
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates business logic rules
 */
function validateBusinessLogic(entity: string, data: Record<string, any>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  switch (entity) {
    case 'products':
      // Sale price should not exceed regular price
      if (data.price && data.saleprice && data.saleprice > data.price) {
        warnings.push('Sale price is higher than regular price');
      }
      break;
      
    case 'orders':
      // Validate order total calculation
      const subtotal = data.subtotal || 0;
      const taxAmount = data.taxAmount || 0;
      const shippingAmount = data.shippingAmount || 0;
      const discountAmount = data.discountAmount || 0;
      const expectedTotal = subtotal + taxAmount + shippingAmount - discountAmount;
      
      if (data.total && Math.abs(data.total - expectedTotal) > 0.01) {
        errors.push('Order total does not match calculated total');
      }
      break;
      
    case 'ilocations':
      // Validate inventory quantity relationships
      const onHand = data.onHand || 0;
      const committed = data.committed || 0;
      const unavailable = data.unavailable || 0;
      const available = data.available;
      
      if (available !== undefined) {
        const expectedAvailable = onHand - committed - unavailable;
        if (Math.abs(available - expectedAvailable) > 0.01) {
          errors.push('Available quantity does not match calculated value');
        }
      }
      break;
      
    case 'orderitems':
      // Validate line total calculation
      if (data.quantity && data.price && data.lineTotal) {
        const expectedLineTotal = data.quantity * data.price;
        if (Math.abs(data.lineTotal - expectedLineTotal) > 0.01) {
          errors.push('Line total does not match quantity × price');
        }
      }
      break;
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Monetary validation utilities
 */
export const MonetaryValidator = {
  validatePrecision: (amount: number): boolean => {
    // Check if the number has at most 2 decimal places
    const decimalPart = amount.toString().split('.')[1];
    return !decimalPart || decimalPart.length <= 2;
  },
  
  validateRange: (amount: number): boolean => {
    return amount >= 0 && amount < 1000000;
  },
  
  formatAmount: (amount: number): number => {
    return Math.round(amount * 100) / 100;
  },
  
  validate: (amount: number): ValidationResult => {
    const errors: string[] = [];
    
    if (amount < 0) {
      errors.push('Amount cannot be negative');
    }
    
    if (amount >= 1000000) {
      errors.push('Amount must be less than $1,000,000.00');
    }
    
    if (!MonetaryValidator.validatePrecision(amount)) {
      errors.push('Amount must have at most 2 decimal places');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

/**
 * Quantity validation utilities
 */
export const QuantityValidator = {
  validateWholeNumber: (quantity: number): boolean => {
    return Number.isInteger(quantity);
  },
  
  validateRange: (quantity: number): boolean => {
    return quantity >= 0 && quantity < 1000000;
  },
  
  validate: (quantity: number, allowZero: boolean = true): ValidationResult => {
    const errors: string[] = [];
    
    if (!QuantityValidator.validateWholeNumber(quantity)) {
      errors.push('Quantity must be a whole number');
    }
    
    if (!QuantityValidator.validateRange(quantity)) {
      errors.push('Quantity must be between 0 and 999,999');
    }
    
    if (!allowZero && quantity === 0) {
      errors.push('Quantity must be greater than 0');
    }
    
    if (quantity < 0) {
      errors.push('Quantity cannot be negative');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

/**
 * Business rule validation utilities
 */
export const BusinessRuleValidator = {
  validateSalePrice: (regularPrice: number | null, salePrice: number | null): ValidationResult => {
    const errors: string[] = [];
    
    if (regularPrice && salePrice && salePrice > regularPrice) {
      errors.push('Sale price cannot be higher than regular price');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },
  
  validateInventoryConsistency: (onHand: number | null, committed: number | null, available: number | null): ValidationResult => {
    const errors: string[] = [];
    
    if (onHand !== null && committed !== null && available !== null) {
      const expectedAvailable = onHand - committed;
      if (Math.abs(available - expectedAvailable) > 0.01) {
        errors.push('Available quantity must equal on-hand minus committed');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },
  
  validateOrderTotals: (subtotal: number, tax: number | null, shipping: number | null, discount: number | null, total: number): ValidationResult => {
    const errors: string[] = [];
    
    const expectedTotal = subtotal + (tax || 0) + (shipping || 0) - (discount || 0);
    if (Math.abs(total - expectedTotal) > 0.01) {
      errors.push('Order total must equal subtotal + tax + shipping - discount');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
};