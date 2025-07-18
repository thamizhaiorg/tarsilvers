/**
 * Format Validation Utilities
 * 
 * This module provides validation for data formats like emails, SKUs, phone numbers, etc.
 */

export interface FormatValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Email format validation
 */
export class EmailValidator {
  private static readonly EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  private static readonly MAX_LENGTH = 254;

  /**
   * Validates email format
   */
  static validate(email: string): FormatValidationResult {
    const errors: string[] = [];

    if (!email) {
      return { isValid: true, errors: [] }; // Empty email is valid (optional field)
    }

    if (email.length > this.MAX_LENGTH) {
      errors.push('Email address is too long (maximum 254 characters)');
    }

    if (!this.EMAIL_REGEX.test(email)) {
      errors.push('Email address format is invalid');
    }

    // Additional checks
    if (email.includes('..')) {
      errors.push('Email address cannot contain consecutive dots');
    }

    if (email.startsWith('.') || email.endsWith('.')) {
      errors.push('Email address cannot start or end with a dot');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Normalizes email address (lowercase, trim)
   */
  static normalize(email: string): string {
    return email.trim().toLowerCase();
  }
}

/**
 * SKU format validation
 */
export class SKUValidator {
  private static readonly SKU_REGEX = /^[A-Z0-9\-_]{1,50}$/;
  private static readonly MIN_LENGTH = 1;
  private static readonly MAX_LENGTH = 50;

  /**
   * Validates SKU format
   */
  static validate(sku: string): FormatValidationResult {
    const errors: string[] = [];

    if (!sku) {
      errors.push('SKU is required');
      return { isValid: false, errors };
    }

    if (sku.length < this.MIN_LENGTH) {
      errors.push(`SKU must be at least ${this.MIN_LENGTH} character long`);
    }

    if (sku.length > this.MAX_LENGTH) {
      errors.push(`SKU cannot exceed ${this.MAX_LENGTH} characters`);
    }

    if (!this.SKU_REGEX.test(sku)) {
      errors.push('SKU can only contain uppercase letters, numbers, hyphens, and underscores');
    }

    // Check for reserved patterns
    if (sku.startsWith('SYS-') || sku.startsWith('TEMP-')) {
      errors.push('SKU cannot start with reserved prefixes (SYS-, TEMP-)');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Normalizes SKU (uppercase, trim)
   */
  static normalize(sku: string): string {
    return sku.trim().toUpperCase();
  }

  /**
   * Generates a random SKU
   */
  static generate(prefix: string = ''): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}${timestamp}-${random}`;
  }
}

/**
 * Phone number format validation
 */
export class PhoneValidator {
  private static readonly PHONE_REGEX = /^[\+]?[1-9][\d]{0,15}$/;
  private static readonly US_PHONE_REGEX = /^(\+1)?[2-9]\d{2}[2-9]\d{2}\d{4}$/;

  /**
   * Validates phone number format
   */
  static validate(phone: string, country: string = 'US'): FormatValidationResult {
    const errors: string[] = [];

    if (!phone) {
      return { isValid: true, errors: [] }; // Empty phone is valid (optional field)
    }

    // Remove common formatting characters
    const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, '');

    if (country === 'US') {
      if (!this.US_PHONE_REGEX.test(cleanPhone)) {
        errors.push('Phone number format is invalid (US format expected)');
      }
    } else {
      if (!this.PHONE_REGEX.test(cleanPhone)) {
        errors.push('Phone number format is invalid');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Normalizes phone number (removes formatting)
   */
  static normalize(phone: string): string {
    return phone.replace(/[\s\-\(\)\.]/g, '');
  }

  /**
   * Formats phone number for display
   */
  static format(phone: string, country: string = 'US'): string {
    const clean = this.normalize(phone);
    
    if (country === 'US' && clean.length === 10) {
      return `(${clean.slice(0, 3)}) ${clean.slice(3, 6)}-${clean.slice(6)}`;
    } else if (country === 'US' && clean.length === 11 && clean.startsWith('1')) {
      return `+1 (${clean.slice(1, 4)}) ${clean.slice(4, 7)}-${clean.slice(7)}`;
    }
    
    return phone; // Return original if can't format
  }
}

/**
 * Order number format validation
 */
export class OrderNumberValidator {
  private static readonly ORDER_NUMBER_REGEX = /^[A-Z0-9\-]{6,20}$/;

  /**
   * Validates order number format
   */
  static validate(orderNumber: string): FormatValidationResult {
    const errors: string[] = [];

    if (!orderNumber) {
      errors.push('Order number is required');
      return { isValid: false, errors };
    }

    if (!this.ORDER_NUMBER_REGEX.test(orderNumber)) {
      errors.push('Order number must be 6-20 characters and contain only uppercase letters, numbers, and hyphens');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generates a unique order number
   */
  static generate(storeId: string): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const storePrefix = storeId.substring(0, 3).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${storePrefix}-${timestamp}-${random}`;
  }
}

/**
 * Comprehensive format validator
 */
export class FormatValidator {
  /**
   * Validates customer data formats
   */
  static validateCustomer(data: {
    email?: string;
    phone?: string;
    name?: string;
  }): FormatValidationResult {
    const errors: string[] = [];

    if (data.email) {
      const emailResult = EmailValidator.validate(data.email);
      errors.push(...emailResult.errors);
    }

    if (data.phone) {
      const phoneResult = PhoneValidator.validate(data.phone);
      errors.push(...phoneResult.errors);
    }

    if (data.name && data.name.length < 1) {
      errors.push('Customer name cannot be empty');
    }

    if (data.name && data.name.length > 100) {
      errors.push('Customer name cannot exceed 100 characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates item data formats
   */
  static validateItem(data: {
    sku?: string;
    productId?: string;
    storeId?: string;
  }): FormatValidationResult {
    const errors: string[] = [];

    if (data.sku) {
      const skuResult = SKUValidator.validate(data.sku);
      errors.push(...skuResult.errors);
    }

    if (!data.productId) {
      errors.push('Product ID is required for items');
    }

    if (!data.storeId) {
      errors.push('Store ID is required for items');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates order data formats
   */
  static validateOrder(data: {
    orderNumber?: string;
    storeId?: string;
    total?: number;
    subtotal?: number;
  }): FormatValidationResult {
    const errors: string[] = [];

    if (data.orderNumber) {
      const orderNumberResult = OrderNumberValidator.validate(data.orderNumber);
      errors.push(...orderNumberResult.errors);
    }

    if (!data.storeId) {
      errors.push('Store ID is required for orders');
    }

    if (data.total !== undefined && data.total <= 0) {
      errors.push('Order total must be positive');
    }

    if (data.subtotal !== undefined && data.subtotal < 0) {
      errors.push('Order subtotal cannot be negative');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * Uniqueness validation utilities (for application-level enforcement)
 */
export class UniquenessValidator {
  /**
   * Validates SKU uniqueness within store scope
   * Note: This would need to be implemented with actual database queries
   */
  static async validateSKUUniqueness(
    sku: string,
    storeId: string,
    excludeItemId?: string
  ): Promise<FormatValidationResult> {
    // This is a placeholder - in real implementation, you would:
    // 1. Query the database for existing items with this SKU in this store
    // 2. Exclude the current item if updating (excludeItemId)
    // 3. Return validation result
    
    // Placeholder implementation
    return {
      isValid: true,
      errors: []
    };
  }

  /**
   * Validates order number uniqueness
   * Note: This would need to be implemented with actual database queries
   */
  static async validateOrderNumberUniqueness(
    orderNumber: string,
    excludeOrderId?: string
  ): Promise<FormatValidationResult> {
    // This is a placeholder - in real implementation, you would:
    // 1. Query the database for existing orders with this order number
    // 2. Exclude the current order if updating (excludeOrderId)
    // 3. Return validation result
    
    // Placeholder implementation
    return {
      isValid: true,
      errors: []
    };
  }

  /**
   * Validates email uniqueness for customers
   * Note: This would need to be implemented with actual database queries
   */
  static async validateEmailUniqueness(
    email: string,
    storeId: string,
    excludeCustomerId?: string
  ): Promise<FormatValidationResult> {
    // This is a placeholder - in real implementation, you would:
    // 1. Query the database for existing customers with this email in this store
    // 2. Exclude the current customer if updating (excludeCustomerId)
    // 3. Return validation result
    
    // Placeholder implementation
    return {
      isValid: true,
      errors: []
    };
  }
}