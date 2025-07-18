import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, FlatList, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { db, formatCurrency } from '../lib/instant';
import { useStore } from '../lib/store-context';
import { id } from '@instantdb/react-native';
import { hapticFeedback } from '../lib/haptics';
import R2Image from './ui/r2-image';

interface Product {
  id: string;
  title: string;
  image?: string;
  price?: number;
  saleprice?: number;
  pos?: boolean;
  item?: Array<{
    id: string;
    sku: string;
    price?: number;
    saleprice?: number;
    option1?: string;
    option2?: string;
    option3?: string;
  }>;
}

interface CartItem {
  id: string;
  productId: string;
  itemId?: string;
  title: string;
  variantTitle?: string;
  price: number;
  qty: number;
  total: number;
  image?: string;
}

interface QuickSaleProps {
  onClose: () => void;
  onOrderCreated: (orderId: string) => void;
}

export default function QuickSale({ onClose, onOrderCreated }: QuickSaleProps) {
  const insets = useSafeAreaInsets();
  const { currentStore } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null);
  const [showProductSelection, setShowProductSelection] = useState(false);

  // Handle navigation back to product selection from cart
  const goBackToProducts = () => {
    setShowProductSelection(true);
  };

  // Handle adding products and returning to cart
  const handleProductAdded = () => {
    setShowProductSelection(false);
  };

  // Query products from InstantDB with optimized schema
  const { data, isLoading } = db.useQuery({
    products: {
      item: {},
      brand: {}, // Use new relationship links
      category: {},
      type: {},
      vendor: {},
      $: {
        where: {
          storeId: currentStore?.id || '',
          pos: true,
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
    if (!searchQuery.trim()) return products.slice(0, 20); // Show first 20 products
    
    const query = searchQuery.toLowerCase();
    return products.filter((product: Product) =>
      (product.title || '').toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  // Calculate cart total
  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.total, 0);
  }, [cart]);

  const addToCart = (product: Product) => {
    hapticFeedback.light();
    
    // Check if product has variants
    if (product.item && product.item.length > 0) {
      const firstVariant = product.item[0];
      const variantTitle = [firstVariant.option1, firstVariant.option2, firstVariant.option3]
        .filter(Boolean)
        .join(' / ');
      
      const price = firstVariant.saleprice || firstVariant.price || product.saleprice || product.price || 0;
      
      const existingItem = cart.find(item => 
        item.productId === product.id && item.itemId === firstVariant.id
      );
      
      if (existingItem) {
        updateQuantity(existingItem.id, existingItem.qty + 1);
      } else {
        const newItem: CartItem = {
          id: id(),
          productId: product.id,
          itemId: firstVariant.id,
          title: product.title,
          variantTitle: variantTitle || undefined,
          price,
          qty: 1,
          total: price,
          image: product.image
        };
        setCart(prev => {
          const newCart = [...prev, newItem];
          // Auto-navigate to cart view when first item is added
          if (prev.length === 0) {
            setTimeout(() => setShowProductSelection(false), 100);
          }
          return newCart;
        });
      }
    } else {
      // Product without variants
      const price = product.saleprice || product.price || 0;
      const existingItem = cart.find(item => item.productId === product.id);
      
      if (existingItem) {
        updateQuantity(existingItem.id, existingItem.qty + 1);
      } else {
        const newItem: CartItem = {
          id: id(),
          productId: product.id,
          title: product.title,
          price,
          qty: 1,
          total: price,
          image: product.image
        };
        setCart(prev => {
          const newCart = [...prev, newItem];
          // Auto-navigate to cart view when first item is added
          if (prev.length === 0) {
            setTimeout(() => setShowProductSelection(false), 100);
          }
          return newCart;
        });
      }
    }
  };

  const updateQuantity = (itemId: string, newQty: number) => {
    if (newQty <= 0) {
      setCart(prev => prev.filter(item => item.id !== itemId));
      return;
    }
    
    setCart(prev => prev.map(item =>
      item.id === itemId
        ? { ...item, qty: newQty, total: item.price * newQty }
        : item
    ));
  };

  const removeFromCart = (itemId: string) => {
    hapticFeedback.warning();
    setCart(prev => prev.filter(item => item.id !== itemId));
  };

  const generateOrderNumber = () => {
    const timestamp = Date.now().toString().slice(-6);
    return `#${1000 + parseInt(timestamp.slice(-3))}`;
  };

  const processPayment = async () => {
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to your cart');
      return;
    }

    if (!currentStore?.id) {
      Alert.alert('Error', 'Please select a store first');
      return;
    }

    setIsProcessing(true);
    try {
      const orderId = id();
      const orderNumber = generateOrderNumber();
      
      const orderData = {
        storeId: currentStore.id,
        orderNumber,
        referid: orderId,
        createdat: new Date(),
        status: 'completed',
        fulfillmentStatus: 'fulfilled',
        paymentStatus: 'paid',
        currency: 'USD',
        subtotal: cartTotal,
        discountAmount: 0,
        shippingAmount: 0,
        taxAmount: 0,
        total: cartTotal,
        totalPaid: cartTotal,
        totalRefunded: 0,
        source: 'pos',
        market: 'pos',
      };

      // Create order items
      const orderItemTransactions = cart.map(item => {
        const itemId = id();
        return db.tx.orderitems[itemId].update({
          orderid: orderId,
          productId: item.productId,
          itemId: item.itemId,
          sku: item.title?.toUpperCase().replace(/\s+/g, '-') || 'ITEM',
          title: item.title,
          variantTitle: item.variantTitle,
          qty: item.qty,
          price: item.price,
          taxRate: 0,
          taxAmount: 0,
          discountAmount: 0,
          lineTotal: item.total,
          storeId: currentStore.id,
          productImage: item.image,
          fulfillmentStatus: 'fulfilled'
        });
      });

      // Execute transaction
      await db.transact([
        db.tx.orders[orderId].update(orderData),
        ...orderItemTransactions
      ]);

      hapticFeedback.success();
      
      // Show success screen briefly before closing
      setCompletedOrderId(orderId);
      setShowSuccess(true);
      
      // Auto-close after 2 seconds
      setTimeout(() => {
        setCart([]);
        setShowSuccess(false);
        setCompletedOrderId(null);
        onOrderCreated(orderId);
      }, 2000);
      
    } catch (error) {
      console.error('Error processing payment:', error);
      hapticFeedback.error();
      Alert.alert('Error', 'Failed to process payment');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderProductItem = ({ item: product }: { item: Product }) => {
    const price = product.saleprice || product.price || 0;
    
    return (
      <TouchableOpacity
        onPress={() => addToCart(product)}
        className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100"
        activeOpacity={0.8}
        style={{ minHeight: 80 }}
      >
        <View className="flex-row items-center">
          {/* Product Image - Larger and better styled */}
          <View className="w-16 h-16 bg-gray-50 rounded-xl mr-4 overflow-hidden border border-gray-100">
            {product.image ? (
              <R2Image
                url={product.image}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
                fallback={
                  <View className="w-full h-full items-center justify-center bg-gray-100">
                    <Feather name="image" size={24} color="#9CA3AF" />
                  </View>
                }
              />
            ) : (
              <View className="w-full h-full items-center justify-center bg-gray-100">
                <Feather name="package" size={24} color="#9CA3AF" />
              </View>
            )}
          </View>

          {/* Product Info */}
          <View className="flex-1 mr-3">
            <Text className="text-lg font-semibold text-gray-900 mb-1" numberOfLines={2}>
              {product.title || 'Untitled Product'}
            </Text>
            <Text className="text-xl font-bold text-gray-900">
              {formatCurrency(price)}
            </Text>
          </View>

          {/* Add Button - Larger and more prominent */}
          <View className="w-12 h-12 bg-blue-600 rounded-full items-center justify-center shadow-sm">
            <Feather name="plus" size={24} color="white" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };



  // Success Screen - Show after completing sale
  if (showSuccess) {
    return (
      <View className="flex-1 bg-green-50" style={{ paddingTop: insets.top }}>
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-24 h-24 bg-green-600 rounded-full items-center justify-center mb-8">
            <Feather name="check" size={48} color="white" />
          </View>
          
          <Text className="text-3xl font-bold text-gray-900 mb-4 text-center">
            Sale Complete!
          </Text>
          
          <Text className="text-xl text-gray-600 mb-8 text-center">
            Payment processed successfully
          </Text>
          
          <View className="bg-white rounded-2xl p-6 w-full shadow-sm">
            <View className="flex-row justify-between items-center">
              <Text className="text-lg font-semibold text-gray-900">Total</Text>
              <Text className="text-2xl font-bold text-green-600">
                {formatCurrency(cartTotal)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  if (cart.length > 0 && !showProductSelection) {
    // Cart View - Show cart items and checkout
    return (
      <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
        {/* Header */}
        <View className="bg-white px-4 py-4 border-b border-gray-200">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={onClose}>
              <Feather name="arrow-left" size={24} color="#3B82F6" />
            </TouchableOpacity>
            <Text className="text-lg font-bold text-gray-900">New Sale</Text>
            <TouchableOpacity onPress={goBackToProducts}>
              <Text className="text-blue-600 text-base font-semibold">Add More</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Cart Items */}
        <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={false}>
          {cart.map((item) => (
            <View key={item.id} className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100">
              {/* Product Header */}
              <View className="flex-row items-start justify-between mb-4">
                <View className="flex-1 mr-4">
                  <Text className="text-xl font-bold text-gray-900 mb-1" numberOfLines={2}>
                    {item.title}
                  </Text>
                  {item.variantTitle && (
                    <Text className="text-base text-gray-500 mb-2">{item.variantTitle}</Text>
                  )}
                  <Text className="text-lg text-gray-600">
                    {formatCurrency(item.price)} each
                  </Text>
                </View>
                <Text className="text-2xl font-bold text-gray-900">
                  {formatCurrency(item.total)}
                </Text>
              </View>

              {/* Quantity Controls - Larger touch targets */}
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center bg-gray-50 rounded-2xl p-2">
                  <TouchableOpacity
                    onPress={() => updateQuantity(item.id, item.qty - 1)}
                    className="w-14 h-14 bg-white rounded-xl items-center justify-center shadow-sm"
                    activeOpacity={0.7}
                  >
                    <Feather name="minus" size={24} color="#6B7280" />
                  </TouchableOpacity>
                  <Text className="mx-6 text-2xl font-bold text-gray-900 min-w-[50px] text-center">
                    {item.qty}
                  </Text>
                  <TouchableOpacity
                    onPress={() => updateQuantity(item.id, item.qty + 1)}
                    className="w-14 h-14 bg-blue-600 rounded-xl items-center justify-center shadow-sm"
                    activeOpacity={0.7}
                  >
                    <Feather name="plus" size={24} color="white" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={() => removeFromCart(item.id)}
                  className="w-14 h-14 bg-red-100 rounded-xl items-center justify-center"
                  activeOpacity={0.7}
                >
                  <Feather name="trash-2" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {/* Add More Products Button */}
          <TouchableOpacity
            onPress={goBackToProducts}
            className="bg-white border-2 border-dashed border-blue-300 rounded-2xl p-8 mb-6"
            activeOpacity={0.7}
            style={{ minHeight: 80 }}
          >
            <View className="flex-row items-center justify-center">
              <Feather name="plus" size={28} color="#3B82F6" />
              <Text className="text-blue-600 text-xl font-bold ml-3">Add More Products</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>

        {/* Total and Checkout */}
        <View className="bg-white px-4 py-6 border-t border-gray-200">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-2xl font-bold text-gray-900">Total</Text>
            <Text className="text-3xl font-bold text-gray-900">
              {formatCurrency(cartTotal)}
            </Text>
          </View>

          <TouchableOpacity
            onPress={processPayment}
            disabled={isProcessing}
            className={`py-4 rounded-xl ${
              isProcessing ? 'bg-gray-400' : 'bg-green-600'
            }`}
            style={{ minHeight: 56 }}
          >
            <Text className="text-white text-xl font-bold text-center">
              {isProcessing ? 'Processing...' : 'Complete Sale'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Product Selection View - Show products to add to cart
  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="bg-white px-4 py-4 border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={cart.length > 0 ? handleProductAdded : onClose}>
            <Text className="text-blue-600 text-base">
              {cart.length > 0 ? 'Back' : 'Cancel'}
            </Text>
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900">Add products</Text>
          <Text className={`text-base ${cart.length > 0 ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
            Add ({cart.length})
          </Text>
        </View>
      </View>

      {/* Search */}
      <View className="px-4 py-4 bg-white border-b border-gray-200">
        <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3">
          <Feather name="search" size={20} color="#6B7280" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search products..."
            className="flex-1 ml-3 text-base"
            placeholderTextColor="#9CA3AF"
          />
        </View>
      </View>

      {/* Products List */}
      <View className="flex-1 px-4 py-4">
        {isLoading ? (
          <Text className="text-center text-gray-500 py-8">Loading...</Text>
        ) : filteredProducts.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <View className="w-16 h-16 bg-gray-100 rounded-full items-center justify-center mb-4">
              <Feather name="package" size={32} color="#9CA3AF" />
            </View>
            <Text className="text-lg font-semibold text-gray-900 mb-2">No products found</Text>
            <Text className="text-gray-500 text-center">
              {searchQuery ? 'Try adjusting your search' : 'No products available'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredProducts}
            renderItem={renderProductItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </View>
    </View>
  );
}