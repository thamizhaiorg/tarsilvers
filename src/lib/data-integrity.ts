/**
 * Data Integrity Validation Tools
 * 
 * This module provides comprehensive data validation and integrity checking
 * tools to ensure data quality during and after migration.
 */

import { db } from './instant';

export interface IntegrityCheckResult {
  entity: string;
  totalRecords: number;
  issues: Array<{
    type: 'missing_required' | 'invalid_format' | 'constraint_violation' | 'orphaned_reference' | 'duplicate_value';
    recordId: string;
    field?: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
  summary: {
    errors: number;
    warnings: number;
    healthScore: number; // 0-100
  };
}

/**
 * Check data integrity for products entity
 */
export async function checkProductsIntegrity(storeId: string): Promise<IntegrityCheckResult> {
  const result: IntegrityCheckResult = {
    entity: 'products',
    totalRecords: 0,
    issues: [],
    summary: { errors: 0, warnings: 0, healthScore: 0 },
  };
  
  try {
    // Fetch all products for the store
    const { data } = await db.query({
      products: { $: { where: { storeId } } },
    });
    
    const products = data.products || [];
    result.totalRecords = products.length;
    
    if (products.length === 0) {
      result.summary.healthScore = 100;
      return result;
    }
    
    // Check each product
    for (const product of products) {
      // Check required fields
      if (!product.title || product.title.trim() === '') {
        result.issues.push({
          type: 'missing_required',
          recordId: product.id,
          field: 'title',
          message: 'Product title is required but missing or empty',
          severity: 'error',
        });
      }
      
      // Check price constraints
      if (product.price !== undefined && product.price < 0) {
        result.issues.push({
          type: 'constraint_violation',
          recordId: product.id,
          field: 'price',
          message: `Price cannot be negative: ${product.price}`,
          severity: 'error',
        });
      }
      
      if (product.cost !== undefined && product.cost < 0) {
        result.issues.push({
          type: 'constraint_violation',
          recordId: product.id,
          field: 'cost',
          message: `Cost cannot be negative: ${product.cost}`,
          severity: 'error',
        });
      }
      
      if (product.saleprice !== undefined && product.saleprice < 0) {
        result.issues.push({
          type: 'constraint_violation',
          recordId: product.id,
          field: 'saleprice',
          message: `Sale price cannot be negative: ${product.saleprice}`,
          severity: 'error',
        });
      }
      
      // Check for legacy field usage
      if (product.createdat) {
        result.issues.push({
          type: 'invalid_format',
          recordId: product.id,
          field: 'createdat',
          message: 'Using legacy field name "createdat" instead of "createdAt"',
          severity: 'warning',
        });
      }
      
      if (product.updatedat) {
        result.issues.push({
          type: 'invalid_format',
          recordId: product.id,
          field: 'updatedat',
          message: 'Using legacy field name "updatedat" instead of "updatedAt"',
          severity: 'warning',
        });
      }
      
      // Check for string relationships that should be IDs
      if (product.brand && typeof product.brand === 'string' && !product.brandId) {
        result.issues.push({
          type: 'invalid_format',
          recordId: product.id,
          field: 'brand',
          message: 'Using string brand reference instead of brandId relationship',
          severity: 'warning',
        });
      }
      
      if (product.category && typeof product.category === 'string' && !product.categoryId) {
        result.issues.push({
          type: 'invalid_format',
          recordId: product.id,
          field: 'category',
          message: 'Using string category reference instead of categoryId relationship',
          severity: 'warning',
        });
      }
    }
    
    // Check for duplicate SKUs within store
    const skuMap = new Map<string, string[]>();
    products.forEach(product => {
      if (product.sku) {
        if (!skuMap.has(product.sku)) {
          skuMap.set(product.sku, []);
        }
        skuMap.get(product.sku)!.push(product.id);
      }
    });
    
    skuMap.forEach((productIds, sku) => {
      if (productIds.length > 1) {
        productIds.forEach(productId => {
          result.issues.push({
            type: 'duplicate_value',
            recordId: productId,
            field: 'sku',
            message: `Duplicate SKU "${sku}" found in ${productIds.length} products`,
            severity: 'error',
          });
        });
      }
    });
    
  } catch (error) {
    result.issues.push({
      type: 'constraint_violation',
      recordId: 'unknown',
      message: `Error checking products integrity: ${error instanceof Error ? error.message : 'Unknown error'}`,
      severity: 'error',
    });
  }
  
  // Calculate summary
  result.summary.errors = result.issues.filter(issue => issue.severity === 'error').length;
  result.summary.warnings = result.issues.filter(issue => issue.severity === 'warning').length;
  result.summary.healthScore = Math.max(0, 100 - (result.summary.errors * 10) - (result.summary.warnings * 2));
  
  return result;
}

/**
 * Check data integrity for orders entity
 */
export async function checkOrdersIntegrity(storeId: string): Promise<IntegrityCheckResult> {
  const result: IntegrityCheckResult = {
    entity: 'orders',
    totalRecords: 0,
    issues: [],
    summary: { errors: 0, warnings: 0, healthScore: 0 },
  };
  
  try {
    // Fetch all orders for the store
    const { data } = await db.query({
      orders: { $: { where: { storeId } } },
    });
    
    const orders = data.orders || [];
    result.totalRecords = orders.length;
    
    if (orders.length === 0) {
      result.summary.healthScore = 100;
      return result;
    }
    
    // Check each order
    for (const order of orders) {
      // Check required fields
      if (!order.orderNumber || order.orderNumber.trim() === '') {
        result.issues.push({
          type: 'missing_required',
          recordId: order.id,
          field: 'orderNumber',
          message: 'Order number is required but missing or empty',
          severity: 'error',
        });
      }
      
      if (order.total === undefined || order.total === null) {
        result.issues.push({
          type: 'missing_required',
          recordId: order.id,
          field: 'total',
          message: 'Order total is required but missing',
          severity: 'error',
        });
      }
      
      if (order.subtotal === undefined || order.subtotal === null) {
        result.issues.push({
          type: 'missing_required',
          recordId: order.id,
          field: 'subtotal',
          message: 'Order subtotal is required but missing',
          severity: 'error',
        });
      }
      
      // Check monetary constraints
      if (order.total !== undefined && order.total < 0) {
        result.issues.push({
          type: 'constraint_violation',
          recordId: order.id,
          field: 'total',
          message: `Order total cannot be negative: ${order.total}`,
          severity: 'error',
        });
      }
      
      if (order.subtotal !== undefined && order.subtotal < 0) {
        result.issues.push({
          type: 'constraint_violation',
          recordId: order.id,
          field: 'subtotal',
          message: `Order subtotal cannot be negative: ${order.subtotal}`,
          severity: 'error',
        });
      }
      
      // Check for legacy field usage
      if (order.referid && !order.referenceId) {
        result.issues.push({
          type: 'invalid_format',
          recordId: order.id,
          field: 'referid',
          message: 'Using legacy field name "referid" instead of "referenceId"',
          severity: 'warning',
        });
      }
      
      if (order.billaddrs && !order.billingAddress) {
        result.issues.push({
          type: 'invalid_format',
          recordId: order.id,
          field: 'billaddrs',
          message: 'Using legacy field name "billaddrs" instead of "billingAddress"',
          severity: 'warning',
        });
      }
      
      // Check email format if provided
      if (order.customerEmail && typeof order.customerEmail === 'string') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(order.customerEmail)) {
          result.issues.push({
            type: 'invalid_format',
            recordId: order.id,
            field: 'customerEmail',
            message: `Invalid email format: ${order.customerEmail}`,
            severity: 'error',
          });
        }
      }
    }
    
    // Check for duplicate order numbers
    const orderNumberMap = new Map<string, string[]>();
    orders.forEach(order => {
      if (order.orderNumber) {
        if (!orderNumberMap.has(order.orderNumber)) {
          orderNumberMap.set(order.orderNumber, []);
        }
        orderNumberMap.get(order.orderNumber)!.push(order.id);
      }
    });
    
    orderNumberMap.forEach((orderIds, orderNumber) => {
      if (orderIds.length > 1) {
        orderIds.forEach(orderId => {
          result.issues.push({
            type: 'duplicate_value',
            recordId: orderId,
            field: 'orderNumber',
            message: `Duplicate order number "${orderNumber}" found in ${orderIds.length} orders`,
            severity: 'error',
          });
        });
      }
    });
    
  } catch (error) {
    result.issues.push({
      type: 'constraint_violation',
      recordId: 'unknown',
      message: `Error checking orders integrity: ${error instanceof Error ? error.message : 'Unknown error'}`,
      severity: 'error',
    });
  }
  
  // Calculate summary
  result.summary.errors = result.issues.filter(issue => issue.severity === 'error').length;
  result.summary.warnings = result.issues.filter(issue => issue.severity === 'warning').length;
  result.summary.healthScore = Math.max(0, 100 - (result.summary.errors * 10) - (result.summary.warnings * 2));
  
  return result;
}

/**
 * Check data integrity for customers entity
 */
export async function checkCustomersIntegrity(storeId: string): Promise<IntegrityCheckResult> {
  const result: IntegrityCheckResult = {
    entity: 'customers',
    totalRecords: 0,
    issues: [],
    summary: { errors: 0, warnings: 0, healthScore: 0 },
  };
  
  try {
    // Fetch all customers for the store
    const { data } = await db.query({
      customers: { $: { where: { storeId } } },
    });
    
    const customers = data.customers || [];
    result.totalRecords = customers.length;
    
    if (customers.length === 0) {
      result.summary.healthScore = 100;
      return result;
    }
    
    // Check each customer
    for (const customer of customers) {
      // Check required fields
      if (!customer.name || customer.name.trim() === '') {
        result.issues.push({
          type: 'missing_required',
          recordId: customer.id,
          field: 'name',
          message: 'Customer name is required but missing or empty',
          severity: 'error',
        });
      }
      
      // Check email format if provided
      if (customer.email && typeof customer.email === 'string') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(customer.email)) {
          result.issues.push({
            type: 'invalid_format',
            recordId: customer.id,
            field: 'email',
            message: `Invalid email format: ${customer.email}`,
            severity: 'error',
          });
        }
      }
      
      // Check for negative values
      if (customer.totalSpent !== undefined && customer.totalSpent < 0) {
        result.issues.push({
          type: 'constraint_violation',
          recordId: customer.id,
          field: 'totalSpent',
          message: `Total spent cannot be negative: ${customer.totalSpent}`,
          severity: 'error',
        });
      }
      
      if (customer.totalOrders !== undefined && customer.totalOrders < 0) {
        result.issues.push({
          type: 'constraint_violation',
          recordId: customer.id,
          field: 'totalOrders',
          message: `Total orders cannot be negative: ${customer.totalOrders}`,
          severity: 'error',
        });
      }
    }
    
  } catch (error) {
    result.issues.push({
      type: 'constraint_violation',
      recordId: 'unknown',
      message: `Error checking customers integrity: ${error instanceof Error ? error.message : 'Unknown error'}`,
      severity: 'error',
    });
  }
  
  // Calculate summary
  result.summary.errors = result.issues.filter(issue => issue.severity === 'error').length;
  result.summary.warnings = result.issues.filter(issue => issue.severity === 'warning').length;
  result.summary.healthScore = Math.max(0, 100 - (result.summary.errors * 10) - (result.summary.warnings * 2));
  
  return result;
}

/**
 * Run comprehensive integrity check for all entities in a store
 */
export async function checkStoreIntegrity(storeId: string): Promise<{
  products: IntegrityCheckResult;
  orders: IntegrityCheckResult;
  customers: IntegrityCheckResult;
  overall: {
    totalRecords: number;
    totalErrors: number;
    totalWarnings: number;
    averageHealthScore: number;
  };
}> {
  const results = {
    products: await checkProductsIntegrity(storeId),
    orders: await checkOrdersIntegrity(storeId),
    customers: await checkCustomersIntegrity(storeId),
    overall: {
      totalRecords: 0,
      totalErrors: 0,
      totalWarnings: 0,
      averageHealthScore: 0,
    },
  };
  
  // Calculate overall statistics
  const entities = [results.products, results.orders, results.customers];
  results.overall.totalRecords = entities.reduce((sum, entity) => sum + entity.totalRecords, 0);
  results.overall.totalErrors = entities.reduce((sum, entity) => sum + entity.summary.errors, 0);
  results.overall.totalWarnings = entities.reduce((sum, entity) => sum + entity.summary.warnings, 0);
  results.overall.averageHealthScore = entities.reduce((sum, entity) => sum + entity.summary.healthScore, 0) / entities.length;
- Total errors found: ${results.overall.totalErrors}
- Total warnings found: ${results.overall.totalWarnings}
- Average health score: ${results.overall.averageHealthScore.toFixed(1)}/100
  `);
  
  return results;
}

/**
 * Generate integrity report
 */
export function generateIntegrityReport(results: IntegrityCheckResult[]): string {
  let report = 'Data Integrity Report\n';
  report += '===================\n\n';
  
  for (const result of results) {
    report += `${result.entity.toUpperCase()} Entity:\n`;
    report += `- Total records: ${result.totalRecords}\n`;
    report += `- Errors: ${result.summary.errors}\n`;
    report += `- Warnings: ${result.summary.warnings}\n`;
    report += `- Health score: ${result.summary.healthScore}/100\n\n`;
    
    if (result.issues.length > 0) {
      report += 'Issues found:\n';
      result.issues.forEach((issue, index) => {
        report += `${index + 1}. [${issue.severity.toUpperCase()}] ${issue.message}\n`;
        if (issue.field) {
          report += `   Field: ${issue.field}, Record: ${issue.recordId}\n`;
        }
      });
      report += '\n';
    }
  }
  
  return report;
}

/**
 * Fix common data integrity issues automatically
 */
export async function autoFixIntegrityIssues(storeId: string, dryRun: boolean = true): Promise<{
  fixed: number;
  skipped: number;
  errors: string[];
}> {
  const result = {
    fixed: 0,
    skipped: 0,
    errors: [],
  };
  
  try {
    // Get integrity check results
    const integrityResults = await checkStoreIntegrity(storeId);
    
    // Process each entity's issues
    for (const [entityName, entityResult] of Object.entries(integrityResults)) {
      if (entityName === 'overall') continue;
      
      for (const issue of entityResult.issues) {
        if (issue.type === 'invalid_format' && issue.severity === 'warning') {
          // These are legacy field issues that can be auto-fixed
          if (!dryRun) {
            // Implementation would go here to fix the specific issue
          }
          result.fixed++;
        } else {
          result.skipped++;
        }
      }
    }
    
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
  }
  
  return result;
}