import { db } from './instant';
import { id } from '@instantdb/react-native';

/**
 * Single Store Setup Utilities
 * Helps initialize and manage the default single store configuration
 */

export interface SingleStoreConfig {
  storeName: string;
  storeDescription?: string;
  locationName: string;
  defaultCategories?: string[];
  defaultCollections?: string[];
}

const DEFAULT_CONFIG: SingleStoreConfig = {
  storeName: 'skj silversmith',
  storeDescription: 'Professional jewelry and silversmith store',
  locationName: 'Main Location',
  defaultCategories: [
    'Chuttis',
    'Earrings',
    'Nose rings',
    'Necklaces',
    'Bracelets',
    'Hipchains',
    'Anklets'
  ],
  defaultCollections: ['Featured', 'New Arrivals', 'Best Sellers']
};

/**
 * Initialize the single store with default data
 */
export async function initializeSingleStore(config: Partial<SingleStoreConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  try {
    // Check if store already exists
    const { data: stores } = await db.queryOnce({ store: {} });
    
    if (!stores?.store || stores.store.length === 0) {
      // Create default store
      const storeId = id();
      await db.transact([
        db.tx.store[storeId].update({
          name: finalConfig.storeName,
          description: finalConfig.storeDescription,
          createdAt: Date.now(),
          updatedAt: Date.now()
        })
      ]);
      console.log(`Created default store: ${finalConfig.storeName}`);
    }

    // Check if location exists
    const { data: locations } = await db.queryOnce({ locations: {} });
    
    if (!locations?.locations || locations.locations.length === 0) {
      // Create default location
      const locationId = id();
      await db.transact([
        db.tx.locations[locationId].update({
          name: finalConfig.locationName,
          type: 'retail',
          isActive: true,
          isDefault: true,
          fulfillsOnlineOrders: true,
          createdAt: Date.now(),
          updatedAt: Date.now()
        })
      ]);
      console.log(`Created default location: ${finalConfig.locationName}`);
    }

    // Create default categories if they don't exist
    if (finalConfig.defaultCategories) {
      const { data: categories } = await db.queryOnce({ categories: {} });
      const existingCategories = categories?.categories?.map(c => c.name) || [];
      
      const categoriesToCreate = finalConfig.defaultCategories.filter(
        cat => !existingCategories.includes(cat)
      );

      if (categoriesToCreate.length > 0) {
        const categoryTransactions = categoriesToCreate.map(categoryName => {
          const categoryId = id();
          return db.tx.categories[categoryId].update({
            name: categoryName
          });
        });
        
        await db.transact(categoryTransactions);
        console.log(`Created default categories: ${categoriesToCreate.join(', ')}`);
      }
    }

    // Create default collections if they don't exist
    if (finalConfig.defaultCollections) {
      const { data: collections } = await db.queryOnce({ collections: {} });
      const existingCollections = collections?.collections?.map(c => c.name) || [];
      
      const collectionsToCreate = finalConfig.defaultCollections.filter(
        col => !existingCollections.includes(col)
      );

      if (collectionsToCreate.length > 0) {
        const collectionTransactions = collectionsToCreate.map(collectionName => {
          const collectionId = id();
          return db.tx.collections[collectionId].update({
            name: collectionName,
            isActive: true,
            pos: true,
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
        });
        
        await db.transact(collectionTransactions);
        console.log(`Created default collections: ${collectionsToCreate.join(', ')}`);
      }
    }

    return {
      success: true,
      message: 'Single store setup completed successfully'
    };

  } catch (error) {
    console.error('Failed to initialize single store:', error);
    return {
      success: false,
      message: 'Failed to initialize single store',
      error
    };
  }
}

/**
 * Get current single store configuration
 */
export async function getSingleStoreConfig() {
  try {
    const { data } = await db.queryOnce({
      store: {},
      locations: {},
      categories: {},
      collections: {}
    });

    return {
      store: data?.store?.[0] || null,
      location: data?.locations?.find(l => l.isDefault) || data?.locations?.[0] || null,
      categories: data?.categories || [],
      collections: data?.collections || []
    };
  } catch (error) {
    console.error('Failed to get single store config:', error);
    return null;
  }
}

/**
 * Reset single store to default configuration
 * WARNING: This will delete all existing data
 */
export async function resetSingleStore() {
  try {
    // This is a destructive operation - use with caution
    const { data } = await db.queryOnce({
      store: {},
      locations: {},
      categories: {},
      collections: {}
    });

    const deleteTransactions = [];

    // Delete existing stores
    if (data?.store) {
      data.store.forEach(store => {
        deleteTransactions.push(db.tx.store[store.id].delete());
      });
    }

    // Delete existing locations
    if (data?.locations) {
      data.locations.forEach(location => {
        deleteTransactions.push(db.tx.locations[location.id].delete());
      });
    }

    if (deleteTransactions.length > 0) {
      await db.transact(deleteTransactions);
    }

    // Reinitialize with defaults
    return await initializeSingleStore();

  } catch (error) {
    console.error('Failed to reset single store:', error);
    return {
      success: false,
      message: 'Failed to reset single store',
      error
    };
  }
}

/**
 * Update categories to the new jewelry-specific ones
 * This can be called to migrate from old categories to the new jewelry categories
 */
export async function updateToJewelryCategories() {
  const jewelryCategories = [
    'Chuttis',
    'Earrings',
    'Nose rings',
    'Necklaces',
    'Bracelets',
    'Hipchains',
    'Anklets'
  ];

  try {
    const { data: categories } = await db.queryOnce({ categories: {} });
    const existingCategories = categories?.categories?.map(c => c.name) || [];

    const categoriesToCreate = jewelryCategories.filter(
      cat => !existingCategories.includes(cat)
    );

    if (categoriesToCreate.length > 0) {
      const categoryTransactions = categoriesToCreate.map(categoryName => {
        const categoryId = id();
        return db.tx.categories[categoryId].update({
          name: categoryName
        });
      });

      await db.transact(categoryTransactions);
      console.log(`Added jewelry categories: ${categoriesToCreate.join(', ')}`);
      return {
        success: true,
        message: `Added ${categoriesToCreate.length} jewelry categories`,
        categoriesAdded: categoriesToCreate
      };
    } else {
      console.log('All jewelry categories already exist');
      return {
        success: true,
        message: 'All jewelry categories already exist',
        categoriesAdded: []
      };
    }
  } catch (error) {
    console.error('Error updating jewelry categories:', error);
    return {
      success: false,
      message: 'Failed to update jewelry categories',
      error
    };
  }
}