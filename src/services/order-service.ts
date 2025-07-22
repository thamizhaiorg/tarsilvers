// Order service for business logic with optimized schema
import { db } from '../lib/instant';
import { log, trackError, PerformanceMonitor } from '../lib/logger';
import { ValidationService, OrderValidationData } from './validation-service';
import { id } from '@instantdb/react-native';

export interface OrderFilters {
  search?: string;
  status?: string;
  paymentStatus?: string;
  fulfillmentStatus?: string;
  customerId?: string;
  locationId?: string;
  dateRange?: {
    start?: Date;
    end?: Date;
  };
}

export interface OrderSortOptions {
  field: 'orderNumber' | 'createdAt' | 'total' | 'customerName';
  direction: 'asc' | 'desc';
}

export interface OrderItemData {
  productId?: string;
  itemId?: string;
  title: string;
  quantity: number; // Use standardized field name
  price: number;
  lineTotal: number;
  sku?: string;
  variantTitle?: string;
  taxAmount?: number;
  taxRate?: number;
}

export interface OrderData {
  orderNumber: string;
  referenceId: string;
  subtotal: number;
  total: number;
  customerId?: string;
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  locationId?: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  billingAddress?: any;
  shippingAddress?: any;
  taxAmount?: number;
  discountAmount?: number;
  shippingAmount?: number;
  items: OrderItemData[];
}

export class OrderService {
  private static instance: OrderService;
  private validationService: ValidationService;

  private constructor() {
    this.validationService = ValidationService.getInstance();
  }

  static getInstance(): OrderService {
    if (!OrderService.instance) {
      OrderService.instance = new OrderService();
    }
    return OrderService.instance;
  }

  // Filter orders based on criteria - updated for optimized schema
  filterOrders(orders: any[], filters: OrderFilters): any[] {
    return PerformanceMonitor.measure('filter-orders', () => {
      let filtered = orders;

      // Search filter - use indexed fields
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filtered = filtered.filter(order => {
          const orderNumber = (order.orderNumber || '').toLowerCase();
          const referenceId = (order.referenceId || '').toLowerCase();
          const customerName = (order.customerName || '').toLowerCase();
          const customerEmail = (order.customerEmail || '').toLowerCase();

          return orderNumber.includes(searchTerm) ||
                 referenceId.includes(searchTerm) ||
                 customerName.includes(searchTerm) ||
                 customerEmail.includes(searchTerm);
        });
      }

      // Status filters - use indexed fields
      if (filters.status) {
        filtered = filtered.filter(order => order.status === filters.status);
      }

      if (filters.paymentStatus) {
        filtered = filtered.filter(order => order.paymentStatus === filters.paymentStatus);
      }

      if (filters.fulfillmentStatus) {
        filtered = filtered.filter(order => order.fulfillmentStatus === filters.fulfillmentStatus);
      }

      // Customer filter
      if (filters.customerId) {
        filtered = filtered.filter(order => order.customerId === filters.customerId);
      }

      // Location filter - use new relationship
      if (filters.locationId) {
        filtered = filtered.filter(order => order.locationId === filters.locationId);
      }

      // Date range filter - use consistent field naming
      if (filters.dateRange) {
        filtered = filtered.filter(order => {
          const orderDate = new Date(order.createdAt);
          const { start, end } = filters.dateRange!;
          
          if (start && orderDate < start) return false;
          if (end && orderDate > end) return false;
          
          return true;
        });
      }

      return filtered;
    });
  }

  // Sort orders - updated for optimized schema
  sortOrders(orders: any[], sortOptions: OrderSortOptions): any[] {
    return PerformanceMonitor.measure('sort-orders', () => {
      return [...orders].sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortOptions.field) {
          case 'orderNumber':
            aValue = (a.orderNumber || '').toLowerCase();
            bValue = (b.orderNumber || '').toLowerCase();
            break;
          case 'createdAt':
            aValue = new Date(a.createdAt).getTime();
            bValue = new Date(b.createdAt).getTime();
            break;
          case 'total':
            aValue = a.total || 0;
            bValue = b.total || 0;
            break;
          case 'customerName':
            aValue = (a.customerName || '').toLowerCase();
            bValue = (b.customerName || '').toLowerCase();
            break;
          default:
            return 0;
        }

        if (aValue < bValue) {
          return sortOptions.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortOptions.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    });
  }

  // Create a new order - updated for optimized schema
  async createOrder(orderData: OrderData): Promise<{ success: boolean; orderId?: string; error?: string }> {
    try {
      log.info('Creating order', 'OrderService', { orderData });

      // Validate order data
      const validation = this.validationService.validateOrder(orderData, true);
      if (!validation.isValid) {
        return { success: false, error: `Validation failed: ${Object.values(validation.errors).join(', ')}` };
      }

      const newOrderId = id();
      const timestamp = new Date();

      // Create order with optimized schema fields
      const order = {
        id: newOrderId,
        orderNumber: orderData.orderNumber,
        referenceId: orderData.referenceId,
        subtotal: orderData.subtotal,
        total: orderData.total,
        customerId: orderData.customerId,
        customerEmail: orderData.customerEmail,
        customerName: orderData.customerName,
        customerPhone: orderData.customerPhone,
        locationId: orderData.locationId,
        status: orderData.status,
        paymentStatus: orderData.paymentStatus,
        fulfillmentStatus: orderData.fulfillmentStatus,
        billingAddress: orderData.billingAddress,
        shippingAddress: orderData.shippingAddress,
        taxAmount: orderData.taxAmount,
        discountAmount: orderData.discountAmount,
        shippingAmount: orderData.shippingAmount,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      // Create order items with standardized field names
      const orderItems = orderData.items.map(item => ({
        id: id(),
        orderId: newOrderId,
        productId: item.productId,
        itemId: item.itemId,
        title: item.title,
        quantity: item.quantity, // Use standardized field name
        price: item.price,
        lineTotal: item.lineTotal,
        sku: item.sku,
        variantTitle: item.variantTitle,
        taxAmount: item.taxAmount,
        taxRate: item.taxRate,
      }));

      // Execute transaction
      const transactions = [
        db.tx.orders[newOrderId].update(order),
        ...orderItems.map(item => db.tx.orderitems[item.id].update(item))
      ];

      await db.transact(transactions);

      log.info('Order created successfully', 'OrderService', { orderId: newOrderId });
      return { success: true, orderId: newOrderId };
    } catch (error) {
      trackError(error as Error, 'OrderService', { operation: 'createOrder', orderData });
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Update an existing order - updated for optimized schema
  async updateOrder(orderId: string, updates: Partial<OrderData>): Promise<{ success: boolean; error?: string }> {
    try {
      log.info('Updating order', 'OrderService', { orderId, updates });

      // Validate updates
      const validation = this.validationService.validateOrder(updates);
      if (!validation.isValid) {
        return { success: false, error: `Validation failed: ${Object.values(validation.errors).join(', ')}` };
      }

      const updateData = {
        ...updates,
        updatedAt: new Date(),
      };

      await db.transact([
        db.tx.orders[orderId].update(updateData)
      ]);

      log.info('Order updated successfully', 'OrderService', { orderId });
      return { success: true };
    } catch (error) {
      trackError(error as Error, 'OrderService', { operation: 'updateOrder', orderId, updates });
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Update order status - optimized for indexed fields
  async updateOrderStatus(orderId: string, status: string, paymentStatus?: string, fulfillmentStatus?: string): Promise<{ success: boolean; error?: string }> {
    try {
      log.info('Updating order status', 'OrderService', { orderId, status, paymentStatus, fulfillmentStatus });

      const updates: any = {
        status,
        updatedAt: new Date(),
      };

      if (paymentStatus) updates.paymentStatus = paymentStatus;
      if (fulfillmentStatus) updates.fulfillmentStatus = fulfillmentStatus;

      // Add completion timestamps based on status
      if (status === 'completed') {
        updates.closedAt = new Date();
      } else if (status === 'cancelled') {
        updates.cancelledAt = new Date();
      }

      await db.transact([
        db.tx.orders[orderId].update(updates)
      ]);

      log.info('Order status updated successfully', 'OrderService', { orderId });
      return { success: true };
    } catch (error) {
      trackError(error as Error, 'OrderService', { operation: 'updateOrderStatus', orderId, status });
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Get order statistics - updated for optimized schema
  getOrderStats(orders: any[]): {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    cancelled: number;
    totalRevenue: number;
    averageOrderValue: number;
    unpaidOrders: number;
    unfulfilledOrders: number;
  } {
    return PerformanceMonitor.measure('calculate-order-stats', () => {
      const stats = {
        total: orders.length,
        pending: 0,
        processing: 0,
        completed: 0,
        cancelled: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        unpaidOrders: 0,
        unfulfilledOrders: 0,
      };

      orders.forEach(order => {
        // Status counts
        switch (order.status) {
          case 'pending':
            stats.pending++;
            break;
          case 'processing':
            stats.processing++;
            break;
          case 'completed':
            stats.completed++;
            break;
          case 'cancelled':
            stats.cancelled++;
            break;
        }

        // Payment status counts
        if (order.paymentStatus === 'unpaid' || order.paymentStatus === 'partial') {
          stats.unpaidOrders++;
        }

        // Fulfillment status counts
        if (order.fulfillmentStatus === 'unfulfilled' || order.fulfillmentStatus === 'partial') {
          stats.unfulfilledOrders++;
        }

        // Revenue calculation (only for completed orders)
        if (order.status === 'completed' && order.total) {
          stats.totalRevenue += order.total;
        }
      });

      stats.averageOrderValue = stats.total > 0 ? stats.totalRevenue / stats.total : 0;

      return stats;
    });
  }

  // Generate unique order number
  generateOrderNumber(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `ORD-${timestamp}-${random}`;
  }

  // Generate unique reference ID
  generateReferenceId(): string {
    return id();
  }
}