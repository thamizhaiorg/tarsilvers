import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, Modal, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { db, formatCurrency } from '../lib/instant';
import ProductFormScreen from './prod-form';
import InventoryAdjustmentScreen from './inventory';
import { useStore } from '../lib/store-context';
import { log, trackError, PerformanceMonitor } from '../lib/logger';
import { LoadingError, EmptyState } from './ui/error-boundary';

import R2Image from './ui/r2-image';

interface ProductsScreenProps {
  isGridView?: boolean;
  onProductFormOpen?: (product?: any) => void;
  onProductFormClose?: () => void;
  onClose?: () => void;
}

type FilterStatus = 'All' | 'Active' | 'Draft';

// Memoized product item component for better performance
const ProductItem = React.memo(({
  product,
  isSelected,
  isMultiSelectMode,
  onPress,
  onLongPress
}: {
  product: any;
  isSelected: boolean;
  isMultiSelectMode: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) => {
  const getProductStatus = (product: any) => {
    // Simple logic: false = Draft, everything else = Active
    return product.status === false ? 'Draft' : 'Active';
  };

  const getVariantCount = (product: any) => {
    return product.item?.length || 0;
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      className={`px-4 py-4 ${
        isSelected ? 'bg-blue-50' : 'bg-white'
      }`}
      style={{
        opacity: isMultiSelectMode && !isSelected ? 0.6 : 1
      }}
    >
      <View className="flex-row items-center">
        {/* Multi-select checkbox */}
        {isMultiSelectMode && (
          <View className="mr-3">
            <View className={`w-6 h-6 items-center justify-center ${
              isSelected ? 'bg-blue-600' : 'bg-gray-300'
            }`}>
              {isSelected && (
                <Feather name="check" size={14} color="white" />
              )}
            </View>
          </View>
        )}

        {/* Product Image */}
        <View className="w-12 h-12 bg-gray-200 mr-3 overflow-hidden">
          {product.image ? (
            <R2Image
              url={product.image}
              style={{ width: 48, height: 48 }}
              fallback={
                <View className="w-12 h-12 bg-gray-200 items-center justify-center">
                  <Text className="text-lg">📦</Text>
                </View>
              }
            />
          ) : (
            <View className="w-12 h-12 bg-gray-200 items-center justify-center">
              <Text className="text-lg">📦</Text>
            </View>
          )}
        </View>

        {/* Product Details */}
        <View className="flex-1">
          <Text className="text-base font-medium text-gray-900 mb-1">
            {product.title || 'Untitled Product'}
          </Text>
          <Text className="text-sm text-gray-500">
            {getVariantCount(product)} {getVariantCount(product) === 1 ? 'item' : 'items'} • {getProductStatus(product)}
          </Text>
        </View>

        {/* Price */}
        <View className="items-end">
          <Text className="text-base font-semibold text-gray-900">
            {product.price ? formatCurrency(product.price) : '$0.00'}
          </Text>
          {product.saleprice && product.saleprice < product.price && (
            <Text className="text-sm text-red-600 line-through">
              {formatCurrency(product.saleprice)}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

export default function ProductsScreen({ isGridView = false, onProductFormOpen, onProductFormClose, onClose }: ProductsScreenProps) {
  const insets = useSafeAreaInsets();
  const [showForm, setShowForm] = useState(false);
  const [showInventoryAdjustment, setShowInventoryAdjustment] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('All');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [showBottomDrawer, setShowBottomDrawer] = useState(false);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);

  // Removed custom BackHandler logic to allow default navigation behavior

  // Query products with their items (no store filtering needed)
  // Note: Relationship queries removed temporarily until relationships are properly established
  const { isLoading, error, data } = db.useQuery({
    products: {
      $: {
        where: {}, // No store filtering needed
        order: {
          createdAt: 'desc' // Use consistent field naming
        }
      },
      item: {} // Keep item relationship as it's working
    }
  });

  const products = data?.products || [];

  // Log query errors
  if (error) {
    trackError(new Error(`Products query failed: ${error}`), 'ProductsScreen');
  }



  // Filter products based on search and status - memoized for performance
  const filteredProducts = useMemo(() => {
    return PerformanceMonitor.measure('filter-products', () => {
      const searchTerm = searchQuery.toLowerCase();

      return products.filter((product: any) => {
        const title = product.title || '';
        const tags = product.tags || [];

        // Search filter - simplified to work with current schema
        const tagsString = Array.isArray(tags) ? tags.join(' ') : (typeof tags === 'string' ? tags : '');
        const matchesSearch = !searchTerm || (
          title.toLowerCase().includes(searchTerm) ||
          tagsString.toLowerCase().includes(searchTerm) ||
          (product.sku || '').toLowerCase().includes(searchTerm) ||
          (product.barcode || '').toLowerCase().includes(searchTerm) ||
          (product.description || '').toLowerCase().includes(searchTerm)
        );

        // Status filter - Use new status field values
        let matchesStatus = true;
        if (activeFilter === 'Active') {
          // Active: status is 'active' or not 'draft'
          matchesStatus = product.status === 'active' || (product.status !== 'draft' && product.status !== false);
        } else if (activeFilter === 'Draft') {
          // Draft: status is 'draft' or explicitly false
          matchesStatus = product.status === 'draft' || product.status === false;
        }
        // 'All' filter shows everything (matchesStatus remains true)

        return matchesSearch && matchesStatus;
      });
    });
  }, [products, searchQuery, activeFilter]);

  // Get product status for display
  const getProductStatus = (product: any) => {
    // Simple logic: false = Draft, everything else = Active
    return product.status === false ? 'Draft' : 'Active';
  };



  const handleEdit = useCallback((product: any) => {
    setEditingProduct(product);
    setShowForm(true);
    onProductFormOpen?.(product);
  }, [onProductFormOpen]);

  const handleInventoryAdjustment = useCallback((product: any) => {
    setEditingProduct(product);
    setShowInventoryAdjustment(true);
  }, []);

  const handleAddNew = useCallback(() => {
    setEditingProduct(null);
    setShowForm(true);
    onProductFormOpen?.(null);
  }, [onProductFormOpen]);

  const handleLongPress = (product: any) => {
    if (!isMultiSelectMode) {
      setIsMultiSelectMode(true);
      setSelectedProducts(new Set([product.id]));
      setShowBottomDrawer(true);
    }
  };

  const handleProductSelect = useCallback((product: any) => {
    if (isMultiSelectMode) {
      const newSelected = new Set(selectedProducts);
      if (newSelected.has(product.id)) {
        newSelected.delete(product.id);
      } else {
        newSelected.add(product.id);
      }
      setSelectedProducts(newSelected);

      if (newSelected.size === 0) {
        setIsMultiSelectMode(false);
        setShowBottomDrawer(false);
      }
    } else {
      handleEdit(product);
    }
  }, [isMultiSelectMode, selectedProducts, handleEdit]);

  const handleDeleteSelected = () => {
    Alert.alert(
      'Delete Products',
      `Delete ${selectedProducts.size} selected product(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const deletePromises = Array.from(selectedProducts).map(id =>
                db.transact(db.tx.products[id].delete())
              );
              await Promise.all(deletePromises);
              setSelectedProducts(new Set());
              setIsMultiSelectMode(false);
              setShowBottomDrawer(false);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete products');
            }
          },
        },
      ]
    );
  };

  const handleCancelMultiSelect = () => {
    setSelectedProducts(new Set());
    setIsMultiSelectMode(false);
    setShowBottomDrawer(false);
  };



  const handleDelete = (product: any) => {
    const productName = product.title || 'this product';
    Alert.alert(
      'Confirm Delete',
      `Delete "${productName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => db.transact(db.tx.products[product.id].delete()),
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text className="text-lg">Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text className="text-lg text-red-500">Error: {error.message}</Text>
      </View>
    );
  }

  // Show full-screen forms
  if (showForm) {
    return (
      <ProductFormScreen
        product={editingProduct}
        onClose={() => {
          setShowForm(false);
          onProductFormClose?.();
        }}
        onSave={() => {
          // Refresh will happen automatically due to real-time updates
        }}
      />
    );
  }

  if (showInventoryAdjustment) {
    return (
      <InventoryAdjustmentScreen
        product={editingProduct}
        onClose={() => setShowInventoryAdjustment(false)}
        onSave={() => {
          // Refresh will happen automatically due to real-time updates
        }}
      />
    );
  }

  // Filter Modal - Full screen with no spacing above
  if (showFilterModal) {
    return (
      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="bg-white">
          <View className="px-4 py-4">
            <View className="flex-row items-center justify-between">
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Feather name="x" size={24} color="#374151" />
              </TouchableOpacity>

              <Text className="text-lg font-semibold text-gray-900">Filter by</Text>

              <TouchableOpacity>
                <Feather name="rotate-ccw" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Filter Options */}
        <View className="flex-1">
          {[
            'Product vendor',
            'Tag',
            'Status',
            'Category',
            'Sales channel',
            'Market',
            'Product type',
            'Collection',
            'Publishing error',
            'Gift cards',
            'Combined listings'
          ].map((filterOption, index) => (
            <TouchableOpacity
              key={index}
              className="px-4 py-4"
            >
              <Text className="text-base text-gray-700">{filterOption}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  // Handle loading and error states
  if (error) {
    return (
      <LoadingError
        error={error.toString()}
        onRetry={() => {
          log.info('Retrying products query', 'ProductsScreen');
          // The query will automatically retry when component re-renders
        }}
      />
    );
  }

  // Remove currentStore check since we're now using a single-store system

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* Search Bar with top and bottom borders - NO spacing above */}
      <View className="bg-white px-4 py-3">
        <View className="flex-row items-center">
          {/* Add Icon */}
          <TouchableOpacity onPress={handleAddNew}>
            <Feather name="plus" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Search Input */}
          <TextInput
            placeholder="Search"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 text-base text-gray-900 ml-3 mr-3"
            placeholderTextColor="#9CA3AF"
          />

          {/* Filter Icon - Only one icon needed */}
          <TouchableOpacity onPress={() => setShowFilterModal(true)}>
            <MaterialCommunityIcons name="sort-ascending" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Tabs - Always visible */}
      <View className="px-4 py-3 bg-white border-b border-gray-100">
        <View className="flex-row">
          {(['All', 'Active', 'Draft'] as FilterStatus[]).map((filter) => (
            <TouchableOpacity
              key={filter}
              onPress={() => setActiveFilter(filter)}
              className={`mr-6 pb-2 ${
                activeFilter === filter ? 'border-b-2 border-blue-600' : ''
              }`}
            >
              <Text className={`text-base font-medium ${
                activeFilter === filter ? 'text-blue-600' : 'text-gray-500'
              }`}>
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>


      {/* Products List */}
      <View className="flex-1">
        {filteredProducts.length === 0 ? (
          <View className="flex-1 justify-center items-center p-8">
            <View className="items-center">
              <View className="w-16 h-16 bg-gray-200 items-center justify-center mb-4 rounded-lg">
                <Text className="text-2xl">📦</Text>
              </View>
              <Text className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery ? 'No products found' :
                 activeFilter === 'Active' ? 'No active products' :
                 activeFilter === 'Draft' ? 'No draft products' :
                 'No products yet'}
              </Text>
              <Text className="text-gray-500 text-center mb-6">
                {searchQuery ? 'Try adjusting your search terms or filters' :
                 activeFilter === 'Active' ? 'Products will appear here when they are published and available' :
                 activeFilter === 'Draft' ? 'Products will appear here when they are saved as drafts' :
                 'Start by adding your first product to the inventory'}
              </Text>
              {(products.length === 0 || activeFilter === 'All') && (
                <TouchableOpacity
                  onPress={handleAddNew}
                  className="bg-blue-600 px-6 py-3 rounded-lg"
                >
                  <Text className="text-white font-medium">Add Product</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : (
          <FlatList
            data={filteredProducts}
            showsVerticalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={10}
            initialNumToRender={15}
            getItemLayout={(data, index) => ({
              length: 80, // Approximate height of each item
              offset: 80 * index,
              index,
            })}
            renderItem={({ item: product }) => (
              <ProductItem
                product={product}
                isSelected={selectedProducts.has(product.id)}
                isMultiSelectMode={isMultiSelectMode}
                onPress={() => handleProductSelect(product)}
                onLongPress={() => handleLongPress(product)}
              />
            )}
          />
        )}
      </View>

      {/* Bottom Drawer for Multi-select Actions - Fixed overlay issue */}
      {showBottomDrawer && (
        <View className="absolute bottom-0 left-0 right-0 bg-white px-4 py-4"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-base font-medium text-gray-900">
              {selectedProducts.size} selected
            </Text>
            <TouchableOpacity onPress={handleCancelMultiSelect}>
              <Feather name="x" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View className="gap-3">
            <TouchableOpacity
              onPress={handleDeleteSelected}
              className="flex-row items-center justify-center bg-red-50 py-3"
            >
              <Feather name="trash-2" size={18} color="#DC2626" />
              <Text className="text-red-600 font-medium ml-2 text-base">
                Delete Selected
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleCancelMultiSelect}
              className="flex-row items-center justify-center bg-gray-100 py-3"
            >
              <Text className="text-gray-700 font-medium text-base">
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
