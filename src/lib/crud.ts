// CRUD operations for Products and Collections
import { id, lookup } from '@instantdb/react-native';
import { db, getCurrentTimestamp, Product, Collection, MediaItem, SaleInfo, SEOData, PromoInfo } from './instant';
import { trackError } from './logger';

// ============================================================================
// PRODUCTS CRUD OPERATIONS
// ============================================================================

export interface CreateProductData {
  title: string;
  image?: string;
  medias?: MediaItem[];
  excerpt?: string;
  notes?: string;
  type?: string;
  category?: string;
  unit?: string;
  price?: number;
  saleprice?: number;
  vendor?: string;
  brand?: string;
  options?: Record<string, unknown>;
  modifiers?: Record<string, unknown>;
  metafields?: Record<string, unknown>;
  saleinfo?: SaleInfo;
  stores?: string[];
  pos?: boolean;
  website?: boolean;
  seo?: SEOData;
  tags?: string; // Database expects JSON string
  cost?: number;
  qrcode?: string;
  stock?: number;
  publishAt?: number | string;
  publish?: boolean;
  promoinfo?: PromoInfo;
  featured?: boolean;
  relproducts?: string[];
  sellproducts?: string[];
}

// Option Set interfaces
export interface OptionSet {
  id: string;
  set: string; // Option set name (e.g., "Size", "Color")
  storeId: string;
}



export interface UpdateProductData {
  title?: string;
  image?: string;
  medias?: any;
  excerpt?: string;
  notes?: string;
  type?: string;
  category?: string;
  unit?: string;
  price?: number;
  saleprice?: number;
  vendor?: string;
  brand?: string;
  options?: any;
  modifiers?: any;
  metafields?: any;
  saleinfo?: any;
  stores?: any;
  pos?: boolean;
  website?: boolean;
  seo?: any;
  tags?: string; // Database expects JSON string
  cost?: number;
  qrcode?: string;
  stock?: number;
  publishAt?: number | string;
  publish?: boolean;
  promoinfo?: any;
  featured?: boolean;
  relproducts?: any;
  sellproducts?: any;
}

// Create a new product
export const createProduct = async (data: CreateProductData) => {
  try {
    const productId = id();
    const timestamp = getCurrentTimestamp();

    const productData: any = {
      title: data.title,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    // Add optional fields if provided
    if (data.image !== undefined) productData.image = data.image;
    if (data.medias !== undefined) productData.medias = data.medias;
    if (data.excerpt !== undefined) productData.excerpt = data.excerpt;
    if (data.notes !== undefined) productData.notes = data.notes;
    if (data.type !== undefined) productData.type = data.type;
    if (data.category !== undefined) productData.category = data.category;
    if (data.unit !== undefined) productData.unit = data.unit;
    if (data.price !== undefined) productData.price = data.price;
    if (data.saleprice !== undefined) productData.saleprice = data.saleprice;
    if (data.vendor !== undefined) productData.vendor = data.vendor;
    if (data.brand !== undefined) productData.brand = data.brand;
    if (data.options !== undefined) productData.options = data.options;
    if (data.modifiers !== undefined) productData.modifiers = data.modifiers;
    if (data.metafields !== undefined) productData.metafields = data.metafields;
    if (data.saleinfo !== undefined) productData.saleinfo = data.saleinfo;
    if (data.stores !== undefined) productData.stores = data.stores;
    if (data.pos !== undefined) productData.pos = data.pos;
    if (data.website !== undefined) productData.website = data.website;
    if (data.seo !== undefined) productData.seo = data.seo;
    if (data.tags !== undefined) productData.tags = data.tags;
    if (data.cost !== undefined) productData.cost = data.cost;
    if (data.qrcode !== undefined) productData.qrcode = data.qrcode;
    if (data.stock !== undefined) productData.stock = data.stock;
    if (data.publishAt !== undefined) productData.publishAt = data.publishAt;
    if (data.publish !== undefined) productData.publish = data.publish;
    if (data.promoinfo !== undefined) productData.promoinfo = data.promoinfo;
    if (data.featured !== undefined) productData.featured = data.featured;
    if (data.relproducts !== undefined) productData.relproducts = data.relproducts;
    if (data.sellproducts !== undefined) productData.sellproducts = data.sellproducts;

    await db.transact([db.tx.products[productId].update(productData)]);
    return { success: true, id: productId };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Update an existing product
export const updateProduct = async (productId: string, data: UpdateProductData) => {
  try {
    const timestamp = getCurrentTimestamp();

    // Update product data
    const updateData: any = {
      updatedAt: timestamp,
    };

    // Add all possible fields if provided
    if (data.title !== undefined) updateData.title = data.title;
    if (data.image !== undefined) updateData.image = data.image;
    if (data.medias !== undefined) updateData.medias = data.medias;
    if (data.excerpt !== undefined) updateData.excerpt = data.excerpt;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.unit !== undefined) updateData.unit = data.unit;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.saleprice !== undefined) updateData.saleprice = data.saleprice;
    if (data.vendor !== undefined) updateData.vendor = data.vendor;
    if (data.brand !== undefined) updateData.brand = data.brand;
    if (data.options !== undefined) updateData.options = data.options;
    if (data.modifiers !== undefined) updateData.modifiers = data.modifiers;
    if (data.metafields !== undefined) updateData.metafields = data.metafields;
    if (data.saleinfo !== undefined) updateData.saleinfo = data.saleinfo;
    if (data.stores !== undefined) updateData.stores = data.stores;
    if (data.pos !== undefined) updateData.pos = data.pos;
    if (data.website !== undefined) updateData.website = data.website;
    if (data.seo !== undefined) updateData.seo = data.seo;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.cost !== undefined) updateData.cost = data.cost;
    if (data.qrcode !== undefined) updateData.qrcode = data.qrcode;
    if (data.stock !== undefined) updateData.stock = data.stock;
    if (data.publishAt !== undefined) updateData.publishAt = data.publishAt;
    if (data.publish !== undefined) updateData.publish = data.publish;
    if (data.promoinfo !== undefined) updateData.promoinfo = data.promoinfo;
    if (data.featured !== undefined) updateData.featured = data.featured;
    if (data.relproducts !== undefined) updateData.relproducts = data.relproducts;
    if (data.sellproducts !== undefined) updateData.sellproducts = data.sellproducts;

    await db.transact([db.tx.products[productId].update(updateData)]);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Delete a product
export const deleteProduct = async (productId: string) => {
  try {
    await db.transact(db.tx.products[productId].delete());
    return { success: true };
  } catch (error) {
    trackError(error as Error, 'CRUD', { operation: 'deleteProduct', productId });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Get product by title
export const getProductByTitle = async (title: string) => {
  try {
    const { data } = await db.queryOnce({
      products: {
        $: { where: { title } }
      }
    });
    return { success: true, product: data.products[0] || null };
  } catch (error) {
    trackError(error as Error, 'CRUD', { operation: 'getProductByTitle', title });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// ============================================================================
// COLLECTIONS CRUD OPERATIONS
// ============================================================================

export interface CreateCollectionData {
  name: string;
  description?: string;
  sortOrder?: number;
}

export interface UpdateCollectionData {
  name?: string;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
}

// Create a new collection
export const createCollection = async (data: CreateCollectionData) => {
  try {
    const collectionId = id();
    const timestamp = getCurrentTimestamp();
    
    await db.transact(
      db.tx.collections[collectionId].update({
        name: data.name,
        description: data.description || '',
        isActive: true,
        sortOrder: data.sortOrder || 0,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
    );

    return { success: true, id: collectionId };
  } catch (error) {
    trackError(error as Error, 'CRUD', { operation: 'createCollection', data });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Update an existing collection
export const updateCollection = async (collectionId: string, data: UpdateCollectionData) => {
  try {
    const timestamp = getCurrentTimestamp();
    const updateData: any = {
      updatedAt: timestamp,
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

    await db.transact(db.tx.collections[collectionId].update(updateData));
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Delete a collection
export const deleteCollection = async (collectionId: string) => {
  try {
    await db.transact(db.tx.collections[collectionId].delete());
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Get collection by name
export const getCollectionByName = async (name: string) => {
  try {
    const { data } = await db.queryOnce({
      collections: {
        $: { where: { name } },
        products: {}
      }
    });
    return { success: true, collection: data.collections[0] || null };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Bulk operations
export const bulkDeleteProducts = async (productIds: string[]) => {
  try {
    const transactions = productIds.map(id => db.tx.products[id].delete());
    await db.transact(transactions);
    return { success: true };
  } catch (error) {
    trackError(error as Error, 'CRUD', { operation: 'bulkDeleteProducts', productIds });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const bulkUpdateProductsCollection = async (productIds: string[], collectionId: string | null) => {
  try {
    const transactions = productIds.map(id => {
      if (collectionId) {
        return db.tx.products[id].link({ collection: collectionId });
      } else {
        return db.tx.products[id].unlink({ collection: '*' });
      }
    });
    await db.transact(transactions);
    return { success: true };
  } catch (error) {
    trackError(error as Error, 'CRUD', { operation: 'bulkUpdateProductsCollection', productIds, collectionId });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};
