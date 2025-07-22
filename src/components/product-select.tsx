import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, FlatList, Modal, BackHandler } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { db } from '../lib/instant';
import { useStore } from '../lib/store-context';
import R2Image from './ui/r2-image';

interface ProductSelectProps {
  collectionId: string;
  onClose: () => void;
}

interface ProductItem {
  id: string;
  title: string;
  image?: string;
  price?: number;
  storeId: string;
}

export default function ProductSelect({ collectionId, onClose }: ProductSelectProps) {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Query all products with optimized schema
  const { isLoading, error, data } = db.useQuery({
    products: {
      $: {
        where: {
          status: 'active' // Filter for active products only
        },
        order: {
          title: 'asc' // Use indexed field for ordering
        }
      },
      collection: {},
      brand: {}, // Include relationship data
      category: {},
      type: {},
      vendor: {}
    }
  });

  const products = data?.products || [];
  
  // Get products currently in this collection
  const collectionProducts = products.filter(product => 
    (product as any).collection?.id === collectionId
  );

  // Initialize selected products with current collection products
  useEffect(() => {
    const currentProductIds = new Set(collectionProducts.map(p => p.id));
    setSelectedProducts(currentProductIds);
  }, [collectionProducts.length]);

  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      onClose();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [onClose]);

  const filteredProducts = products.filter(product =>
    (product.title || '').toLowerCase().includes((searchQuery || '').toLowerCase())
  );

  const handleProductToggle = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Get current collection products
      const currentProductIds = new Set(collectionProducts.map(p => p.id));
      const newProductIds = selectedProducts;

      // Products to add to collection
      const toAdd = Array.from(newProductIds).filter(id => !currentProductIds.has(id));
      
      // Products to remove from collection
      const toRemove = Array.from(currentProductIds).filter(id => !newProductIds.has(id));

      // Create transactions
      const transactions = [];

      // Add products to collection
      for (const productId of toAdd) {
        transactions.push(db.tx.products[productId].link({ collection: collectionId }));
      }

      // Remove products from collection
      for (const productId of toRemove) {
        transactions.push(db.tx.products[productId].unlink({ collection: collectionId }));
      }

      if (transactions.length > 0) {
        await db.transact(transactions);
      }

      onClose();
    } catch (error) {
      console.error('Failed to update collection products:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderProductItem = ({ item }: { item: ProductItem }) => {
    const isSelected = selectedProducts.has(item.id);
    
    return (
      <TouchableOpacity
        onPress={() => handleProductToggle(item.id)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: '#fff',
          borderBottomWidth: 1,
          borderBottomColor: '#F3F4F6',
        }}
      >
        {/* Selection indicator */}
        <View style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          borderWidth: 2,
          borderColor: isSelected ? '#3B82F6' : '#D1D5DB',
          backgroundColor: isSelected ? '#3B82F6' : 'transparent',
          marginRight: 12,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {isSelected && (
            <Feather name="check" size={12} color="#fff" />
          )}
        </View>

        {/* Product image */}
        <View style={{
          width: 48,
          height: 48,
          borderRadius: 8,
          backgroundColor: '#F3F4F6',
          marginRight: 12,
          overflow: 'hidden',
        }}>
          {item.image ? (
            <R2Image
              url={item.image}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <View style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <MaterialIcons name="image" size={20} color="#9CA3AF" />
            </View>
          )}
        </View>

        {/* Product info */}
        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: 16,
            fontWeight: '500',
            color: '#111827',
            marginBottom: 2,
          }} numberOfLines={1}>
            {item.title}
          </Text>
          {item.price && (
            <Text style={{
              fontSize: 14,
              color: '#6B7280',
            }}>
              ${item.price.toFixed(2)}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={{
        flex: 1,
        backgroundColor: '#fff',
        paddingTop: insets.top,
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <Text style={{ fontSize: 16, color: '#6B7280' }}>Loading products...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{
        flex: 1,
        backgroundColor: '#fff',
        paddingTop: insets.top,
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <Text style={{ color: '#EF4444' }}>Error loading products: {error.message}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: insets.top }}>
      {/* Header - Clean minimal design with left-aligned title */}
      <View style={{
        backgroundColor: '#fff',
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 16,
          borderBottomWidth: 1,
          borderBottomColor: '#E5E7EB',
        }}>
          <Text style={{
            fontSize: 18,
            fontWeight: '600',
            color: '#111827',
            flex: 1,
          }}>
            Select Products
          </Text>

          <TouchableOpacity
            onPress={handleSave}
            disabled={loading}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: '#3B82F6',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: loading ? 0.6 : 1,
            }}
          >
            <MaterialIcons name="check" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Search Bar - Clean design like prod-form */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: '#fff',
          borderBottomWidth: 1,
          borderBottomColor: '#E5E7EB',
        }}>
          <Feather name="search" size={20} color="#6B7280" style={{ marginRight: 12 }} />
          <TextInput
            style={{
              flex: 1,
              fontSize: 16,
              color: '#111827',
              paddingVertical: 8,
              paddingHorizontal: 0,
              borderWidth: 0,
              backgroundColor: 'transparent',
            }}
            placeholder="Search products"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Products List */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        renderItem={renderProductItem as any}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 16 }}
      />

      {/* Selected count */}
      <View style={{
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        backgroundColor: '#F9FAFB',
      }}>
        <Text style={{
          fontSize: 14,
          color: '#6B7280',
          textAlign: 'center',
        }}>
          {selectedProducts.size} product{selectedProducts.size !== 1 ? 's' : ''} selected
        </Text>
      </View>
    </View>
  );
}
