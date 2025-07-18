// Order calculation utilities for sales system

export interface OrderItem {
  id: string;
  productId: string;
  itemId?: string;
  sku: string;
  title: string;
  variantTitle?: string;
  qty: number;
  price: number;
  compareAtPrice?: number;
  cost?: number;
  lineTotal: number;
  discountAmount?: number;
  taxRate?: number;
  taxAmount?: number;
}

export interface OrderTotals {
  subtotal: number;
  discountAmount: number;
  shippingAmount: number;
  taxAmount: number;
  total: number;
  itemCount: number;
}

export interface TaxSettings {
  enabled: boolean;
  rate: number; // Percentage (e.g., 8.5 for 8.5%)
  inclusive: boolean; // Whether tax is included in prices
  name?: string; // e.g., "Sales Tax", "VAT"
}

export interface DiscountSettings {
  type: 'percentage' | 'fixed';
  value: number;
  code?: string;
  minimumAmount?: number;
  maximumDiscount?: number;
}

export interface ShippingSettings {
  type: 'fixed' | 'calculated';
  amount: number;
  freeShippingThreshold?: number;
}

/**
 * Calculate line total for an order item
 */
export function calculateLineTotal(item: Omit<OrderItem, 'lineTotal'>): number {
  return item.price * item.qty;
}

/**
 * Calculate discount amount for an item or order
 */
export function calculateDiscount(
  amount: number,
  discount: DiscountSettings
): number {
  if (discount.minimumAmount && amount < discount.minimumAmount) {
    return 0;
  }

  let discountAmount = 0;
  
  if (discount.type === 'percentage') {
    discountAmount = amount * (discount.value / 100);
  } else {
    discountAmount = discount.value;
  }

  // Apply maximum discount limit if set
  if (discount.maximumDiscount && discountAmount > discount.maximumDiscount) {
    discountAmount = discount.maximumDiscount;
  }

  // Ensure discount doesn't exceed the amount
  return Math.min(discountAmount, amount);
}

/**
 * Calculate shipping amount
 */
export function calculateShipping(
  subtotal: number,
  shipping: ShippingSettings
): number {
  if (shipping.freeShippingThreshold && subtotal >= shipping.freeShippingThreshold) {
    return 0;
  }

  if (shipping.type === 'fixed') {
    return shipping.amount;
  }

  // For calculated shipping, you would integrate with shipping APIs
  // For now, return the fixed amount
  return shipping.amount;
}

/**
 * Calculate tax amount
 */
export function calculateTax(
  taxableAmount: number,
  tax: TaxSettings
): number {
  if (!tax.enabled) {
    return 0;
  }

  if (tax.inclusive) {
    // Tax is already included in the price
    return taxableAmount - (taxableAmount / (1 + tax.rate / 100));
  } else {
    // Tax is added to the price
    return taxableAmount * (tax.rate / 100);
  }
}

/**
 * Calculate complete order totals
 */
export function calculateOrderTotals(
  items: OrderItem[],
  discount?: DiscountSettings,
  shipping?: ShippingSettings,
  tax?: TaxSettings
): OrderTotals {
  // Calculate subtotal from all items
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  
  // Calculate discount amount
  const discountAmount = discount ? calculateDiscount(subtotal, discount) : 0;
  
  // Calculate shipping amount
  const shippingAmount = shipping ? calculateShipping(subtotal, shipping) : 0;
  
  // Calculate taxable amount (subtotal - discount + shipping)
  const taxableAmount = subtotal - discountAmount + shippingAmount;
  
  // Calculate tax amount
  const taxAmount = tax ? calculateTax(taxableAmount, tax) : 0;
  
  // Calculate total
  const total = subtotal - discountAmount + shippingAmount + taxAmount;
  
  // Calculate item count
  const itemCount = items.reduce((sum, item) => sum + item.qty, 0);

  return {
    subtotal,
    discountAmount,
    shippingAmount,
    taxAmount,
    total,
    itemCount
  };
}

/**
 * Update order item quantities and recalculate line totals
 */
export function updateOrderItem(
  item: OrderItem,
  updates: Partial<Pick<OrderItem, 'qty' | 'price' | 'discountAmount'>>
): OrderItem {
  const updatedItem = { ...item, ...updates };
  updatedItem.lineTotal = calculateLineTotal(updatedItem);
  return updatedItem;
}

/**
 * Add item to order with proper calculations
 */
export function addItemToOrder(
  items: OrderItem[],
  newItem: Omit<OrderItem, 'lineTotal'>
): OrderItem[] {
  const itemWithTotal = {
    ...newItem,
    lineTotal: calculateLineTotal(newItem)
  };
  
  return [...items, itemWithTotal];
}

/**
 * Remove item from order
 */
export function removeItemFromOrder(
  items: OrderItem[],
  itemId: string
): OrderItem[] {
  return items.filter(item => item.id !== itemId);
}

/**
 * Update item quantity in order
 */
export function updateItemQuantity(
  items: OrderItem[],
  itemId: string,
  qty: number
): OrderItem[] {
  if (qty <= 0) {
    return removeItemFromOrder(items, itemId);
  }

  return items.map(item =>
    item.id === itemId
      ? updateOrderItem(item, { qty })
      : item
  );
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Validate order before creation
 */
export function validateOrder(
  items: OrderItem[],
  totals: OrderTotals
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (items.length === 0) {
    errors.push('Order must contain at least one item');
  }

  if (totals.total < 0) {
    errors.push('Order total cannot be negative');
  }

  // Check for items with invalid quantities
  const invalidItems = items.filter(item => item.qty <= 0);
  if (invalidItems.length > 0) {
    errors.push('All items must have a quantity greater than 0');
  }

  // Check for items with invalid prices
  const invalidPrices = items.filter(item => item.price < 0);
  if (invalidPrices.length > 0) {
    errors.push('All items must have a valid price');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Generate order number
 */
export function generateOrderNumber(prefix = '#', lastOrderNumber?: string): string {
  if (lastOrderNumber) {
    // Extract number from last order and increment
    const match = lastOrderNumber.match(/(\d+)$/);
    if (match) {
      const lastNumber = parseInt(match[1], 10);
      return `${prefix}${(lastNumber + 1).toString().padStart(4, '0')}`;
    }
  }
  
  // Default starting number
  return `${prefix}1001`;
}

/**
 * Default tax settings
 */
export const DEFAULT_TAX_SETTINGS: TaxSettings = {
  enabled: true,
  rate: 8.5, // 8.5%
  inclusive: false,
  name: 'Sales Tax'
};

/**
 * Default shipping settings
 */
export const DEFAULT_SHIPPING_SETTINGS: ShippingSettings = {
  type: 'fixed',
  amount: 0,
  freeShippingThreshold: 100
};
