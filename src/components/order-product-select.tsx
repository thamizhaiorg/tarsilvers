import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, FlatList, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { db, formatCurrency } from '../lib/instant';
import { useStore } from '../lib/store-context';
import Card from './ui/Card';
import Button from './ui/Button';
import R2Image from './ui/r2-image';

interface Product {
  id: string;
  title: string;
  image?: string;
  price?: number;
  saleprice?: number;
  cost?: number;
  category?: string;
  brand?: string;
  pos?: boolean;
  item?: Array<{
    id: string;
    sku: string;
    price?: number;
    saleprice?: number;
    cost?: number;
    option1?: string;
    option2?: string;
    option3?: string;
  }>;
}

interface SelectedProduct {
  id: string;
  itemId?: string;
  title: string;
  variantTitle?: string;
  sku: string;
  price: number;
  compareAtPrice?: number;
  cost?: number;
  image?: string;
}

interface OrderProductSelectProps {
  onProductsSelect: (products: SelectedProduct[]) => void;
  onClose: () => void;
}

export default function OrderProductSelect({ onProductsSelect, onClose }: OrderProductSelectProps) {
  const insets = useSafeAreaInsets();
  const { currentStore } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [selectedVariants, setSelectedVariants] = useState<Map<string, string>>(new Map());

  // Query products from InstantDB with optimized schema
  const { data, isLoading, error } = db.useQuery({
    products: {
      item: {},
      brand: {}, // Include relationship data
      category: {},
      type: {},
      vendor: {},
      $: {
        where: {
          pos: true, // Only show POS-enabled products
          status: 'active' // Filter for active products only
        },
        order: {
          createdAt: 'desc' // Use consistent field naming
        }
      }
    }
  });

  const products = data?.products || [];

  // Filter products based on search
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    
    const query = searchQuery.toLowerCase();
    return products.filter((product: Product) =>
      (product.title || '').toLowerCase().includes(query) ||
      (product.category || '').toLowerCase().includes(query) ||
      (product.brand || '').toLowerCase().includes(query) ||
      (product.item || []).some(item => 
        (item.sku || '').toLowerCase().includes(query) ||
        (item.option1 || '').toLowerCase().includes(query) ||
        (item.option2 || '').toLowerCase().includes(query) ||
        (item.option3 || '').toLowerCase().includes(query)
      )
    );
  }, [products, searchQuery]);

  const handleProductToggle = (product: Product) => {
    const newSelected = new Set(selectedProducts);
    
    if (newSelected.has(product.id)) {
      newSelected.delete(product.id);
      // Remove any variant selections for this product
      const newVariants = new Map(selectedVariants);
      newVariants.delete(product.id);
      setSelectedVariants(newVariants);
    } else {
      newSelected.add(product.id);
      // If product has variants, select the first one by default
      if (product.item && product.item.length > 0) {
        const newVariants = new Map(selectedVariants);
        newVariants.set(product.id, product.item[0].id);
        setSelectedVariants(newVariants);
      }
    }
    
    setSelectedProducts(newSelected);
  };

  const handleVariantSelect = (productId: string, variantId: string) => {
    const newVariants = new Map(selectedVariants);
    newVariants.set(productId, variantId);
    setSelectedVariants(newVariants);
  };

  const handleAddToOrder = () => {
    const selectedProductsArray: SelectedProduct[] = [];
    
    selectedProducts.forEach(productId => {
      const product = products.find((p: Product) => p.id === productId);
      if (!product) return;
      
      if (product.item && product.item.length > 0) {
        // Product has variants
        const selectedVariantId = selectedVariants.get(productId);
        const variant = product.item.find(item => item.id === selectedVariantId);
        
        if (variant) {
          const variantTitle = [variant.option1, variant.option2, variant.option3]
            .filter(Boolean)
            .join(' / ');
            
          selectedProductsArray.push({
            id: product.id,
            itemId: variant.id,
            title: product.title,
            variantTitle: variantTitle || undefined,
            sku: variant.sku,
            price: variant.saleprice || variant.price || product.saleprice || product.price || 0,
            compareAtPrice: variant.price !== variant.saleprice ? variant.price : undefined,
            cost: variant.cost || product.cost,
            image: product.image
          });
        }
      } else {
        // Product without variants
        selectedProductsArray.push({
          id: product.id,
          title: product.title,
          sku: product.title?.toUpperCase().replace(/\s+/g, '-') || 'PRODUCT',
          price: product.saleprice || product.price || 0,
          compareAtPrice: product.price !== product.saleprice ? product.price : undefined,
          cost: product.cost,
          image: product.image
        });
      }
    });
    
    onProductsSelect(selectedProductsArray);
    onClose();
  };

  const renderProductItem = ({ item: product }: { item: Product }) => {
    const isSelected = selectedProducts.has(product.id);
    const hasVariants = product.item && product.item.length > 0;
    const selectedVariantId = selectedVariants.get(product.id);
    const selectedVariant = hasVariants ? product.item?.find(item => item.id === selectedVariantId) : null;
    
    const displayPrice = hasVariants && selectedVariant 
      ? (selectedVariant.saleprice || selectedVariant.price || 0)
      : (product.saleprice || product.price || 0);

    return (
      <TouchableOpacity
        onPress={() => handleProductToggle(product)}
        className="mb-3"
      >
        <Card padding="medium">
          <View className="flex-row items-center">
            {/* Product Image */}
            <View className="w-12 h-12 bg-gray-100 rounded-lg mr-3 overflow-hidden">
              {product.image ? (
                <R2Image
                  path={product.image}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-full h-full items-center justify-center">
                  <Feather name="image" size={20} color="#9CA3AF" />
                </View>
              )}
            </View>

            {/* Product Info */}
            <View className="flex-1">
              <Text className="text-base font-medium text-gray-900 mb-1">
                {product.title}
              </Text>
              <Text className="text-sm text-gray-500 mb-1">
                {formatCurrency(displayPrice)}
              </Text>
              {product.category && (
                <Text className="text-xs text-gray-400">{product.category}</Text>
              )}
            </View>

            {/* Selection Indicator */}
            <View className="ml-3">
              {isSelected ? (
                <View className="w-6 h-6 bg-blue-600 rounded-full items-center justify-center">
                  <Feather name="check" size={16} color="white" />
                </View>
              ) : (
                <View className="w-6 h-6 border-2 border-gray-300 rounded-full" />
              )}
            </View>
          </View>

          {/* Variant Selection */}
          {isSelected && hasVariants && (
            <View className="mt-3 pt-3 border-t border-gray-200">
              <Text className="text-sm font-medium text-gray-700 mb-2">Select variant:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row space-x-2">
                  {product.item?.map((variant) => {
                    const variantTitle = [variant.option1, variant.option2, variant.option3]
                      .filter(Boolean)
                      .join(' / ');
                    const isVariantSelected = selectedVariantId === variant.id;
                    
                    return (
                      <TouchableOpacity
                        key={variant.id}
                        onPress={() => handleVariantSelect(product.id, variant.id)}
                        className={`px-3 py-2 rounded-lg border ${
                          isVariantSelected
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <Text className={`text-sm ${
                          isVariantSelected ? 'text-blue-700' : 'text-gray-700'
                        }`}>
                          {variantTitle || variant.sku}
                        </Text>
                        <Text className={`text-xs ${
                          isVariantSelected ? 'text-blue-600' : 'text-gray-500'
                        }`}>
                          {formatCurrency(variant.saleprice || variant.price || 0)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          )}
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={true} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
        {/* Header */}
        <View className="bg-white px-4 py-4 border-b border-gray-200">
          <View className="flex-row items-center justify-between mb-4">
            <TouchableOpacity onPress={onClose}>
              <Text className="text-blue-600 text-base">Cancel</Text>
            </TouchableOpacity>
            <Text className="text-lg font-semibold text-gray-900">Add products</Text>
            <TouchableOpacity 
              onPress={handleAddToOrder}
              disabled={selectedProducts.size === 0}
            >
              <Text className={`text-base font-semibold ${
                selectedProducts.size > 0 ? 'text-blue-600' : 'text-gray-400'
              }`}>
                Add ({selectedProducts.size})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2">
            <Feather name="search" size={20} color="#6B7280" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search products..."
              className="flex-1 ml-2 text-base"
            />
          </View>
        </View>

        {/* Products List */}
        <View className="flex-1 px-4 py-4">
          {isLoading ? (
            <Text className="text-center text-gray-500 py-8">Loading products...</Text>
          ) : filteredProducts.length === 0 ? (
            <View className="flex-1 justify-center items-center py-8">
              <Text className="text-lg font-medium text-gray-900 mb-2">No products found</Text>
              <Text className="text-gray-500 text-center">
                {searchQuery ? 'Try adjusting your search' : 'No POS-enabled products available'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredProducts}
              renderItem={renderProductItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        {/* Add Button */}
        {selectedProducts.size > 0 && (
          <View className="bg-white px-4 py-4 border-t border-gray-200">
            <Button
              title={`Add ${selectedProducts.size} product${selectedProducts.size !== 1 ? 's' : ''}`}
              onPress={handleAddToOrder}
              variant="primary"
              fullWidth
            />
          </View>
        )}
      </View>
    </Modal>
  );
}
