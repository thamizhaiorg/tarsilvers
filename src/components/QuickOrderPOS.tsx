import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, FlatList, Alert, Modal, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { db, formatCurrency } from '../lib/instant';
import { id } from '@instantdb/react-native';
import { useStore } from '../lib/store-context';
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

interface QuickOrderPOSProps {
  onClose?: () => void;
  onOrderComplete?: (orderId: string) => void;
}

export default function QuickOrderPOS({ onClose, onOrderComplete }: QuickOrderPOSProps) {
  const insets = useSafeAreaInsets();
  const { isLoading: storeLoading } = useStore();
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Query products with optimized schema
  const { data, isLoading } = db.useQuery({
    products: {
      item: {},
      brand: {}, // Use new relationship links
      category: {},
      type: {},
      vendor: {},
      $: {
        where: {
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

  // Filter products
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products.slice(0, 20);
    
    const query = searchQuery.toLowerCase();
    return products.filter((product: any) =>
      (product.title || '').toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  // Cart calculations
  const cartTotal = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * 0.08;
    return {
      subtotal,
      tax: Math.round(tax * 100) / 100,
      total: Math.round((subtotal + tax) * 100) / 100
    };
  }, [cart]);

  // Add to cart
  const addToCart = useCallback((product: Product) => {
    hapticFeedback.light();
    
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
          title: product.title || 'Product',
          variantTitle: variantTitle || undefined,
          price,
          qty: 1,
          total: price,
          image: product.image
        };
        setCart(prev => [...prev, newItem]);
      }
    } else {
      const price = product.saleprice || product.price || 0;
      const existingItem = cart.find(item => item.productId === product.id);
      
      if (existingItem) {
        updateQuantity(existingItem.id, existingItem.qty + 1);
      } else {
        const newItem: CartItem = {
          id: id(),
          productId: product.id,
          title: product.title || 'Product',
          price,
          qty: 1,
          total: price,
          image: product.image
        };
        setCart(prev => [...prev, newItem]);
      }
    }
  }, [cart]);

  // Update quantity
  const updateQuantity = useCallback((itemId: string, newQty: number) => {
    if (newQty <= 0) {
      setCart(prev => prev.filter(item => item.id !== itemId));
      return;
    }
    
    setCart(prev => prev.map(item =>
      item.id === itemId
        ? { ...item, qty: newQty, total: Math.round(item.price * newQty * 100) / 100 }
        : item
    ));
  }, []);

  // Process payment
  const processPayment = async () => {
    if (cart.length === 0) return;

    setIsProcessing(true);
    try {
      const orderId = id();
      const orderNumber = `#${1000 + Math.floor(Math.random() * 9000)}`;

      const orderData = {
        orderNumber,
        referid: orderId,
        createdat: Date.now(),
        status: 'completed',
        fulfillmentStatus: 'fulfilled',
        paymentStatus: 'paid',
        currency: 'USD',
        subtotal: cartTotal.subtotal,
        discountAmount: 0,
        shippingAmount: 0,
        taxAmount: cartTotal.tax,
        total: cartTotal.total,
        totalPaid: cartTotal.total,
        totalRefunded: 0,
        source: 'pos',
        market: 'pos',
      };

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
          taxRate: 0.08,
          taxAmount: Math.round(item.total * 0.08 * 100) / 100,
          discountAmount: 0,
          lineTotal: item.total,
          productImage: item.image,
          fulfillmentStatus: 'fulfilled'
        });
      });

      await db.transact([
        db.tx.orders[orderId].update(orderData),
        ...orderItemTransactions
      ]);

      hapticFeedback.success();
      setCart([]);
      setShowPayment(false);
      setShowCart(false);
      
      Alert.alert(
        'Order Complete!',
        `Order ${orderNumber} processed successfully`,
        [{ text: 'OK', onPress: () => onOrderComplete?.(orderId) }]
      );
      
    } catch (error) {
      console.error('Error processing payment:', error);
      hapticFeedback.error();
      Alert.alert('Error', 'Failed to process payment');
    } finally {
      setIsProcessing(false);
    }
  };

  // Render product item
  const renderProduct = ({ item: product }: { item: any }) => {
    const price = product.saleprice || product.price || 0;
    const firstVariant = product.item && product.item.length > 0 ? product.item[0] : null;
    
    return (
      <TouchableOpacity
        onPress={() => addToCart(product)}
        className="bg-white rounded-lg p-3 mb-3 shadow-sm border border-gray-100"
        activeOpacity={0.8}
      >
        <View className="flex-row items-center">
          {/* Product Avatar */}
          <View className="w-12 h-12 bg-orange-500 rounded-lg items-center justify-center mr-3">
            <Text className="text-white font-bold text-lg">
              {(product.title || 'P').charAt(0).toUpperCase()}
            </Text>
          </View>

          {/* Product Info */}
          <View className="flex-1 mr-3">
            <Text className="text-base font-semibold text-gray-900 mb-1" numberOfLines={1}>
              {product.title || 'Product'}
            </Text>
            {firstVariant && (
              <Text className="text-sm text-gray-500 mb-1">
                {firstVariant.sku}
              </Text>
            )}
          </View>

          {/* Price */}
          <Text className="text-lg font-bold text-gray-900">
            {formatCurrency(price)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Render cart item
  const renderCartItem = (item: CartItem) => (
    <View key={item.id} className="bg-white rounded-xl p-4 mb-3">
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1 mr-3">
          <Text className="text-lg font-semibold text-gray-900 mb-1">
            {item.title}
          </Text>
          {item.variantTitle && (
            <Text className="text-sm text-gray-500 mb-1">{item.variantTitle}</Text>
          )}
          <Text className="text-base text-gray-600">
            {formatCurrency(item.price)} each
          </Text>
        </View>
        <Text className="text-xl font-bold text-gray-900">
          {formatCurrency(item.total)}
        </Text>
      </View>

      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center bg-gray-100 rounded-xl p-1">
          <TouchableOpacity
            onPress={() => updateQuantity(item.id, item.qty - 1)}
            className="w-10 h-10 bg-white rounded-lg items-center justify-center"
          >
            <Feather name="minus" size={16} color="#6B7280" />
          </TouchableOpacity>
          <Text className="mx-4 text-lg font-bold text-gray-900">
            {item.qty}
          </Text>
          <TouchableOpacity
            onPress={() => updateQuantity(item.id, item.qty + 1)}
            className="w-10 h-10 bg-blue-600 rounded-lg items-center justify-center"
          >
            <Feather name="plus" size={16} color="white" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => updateQuantity(item.id, 0)}
          className="w-10 h-10 bg-red-100 rounded-lg items-center justify-center"
        >
          <Feather name="trash-2" size={16} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="bg-white px-4 py-4 border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={onClose}>
            <Feather name="arrow-left" size={24} color="#3B82F6" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900">Quick Order</Text>
          {cart.length > 0 && (
            <TouchableOpacity onPress={() => setShowCart(true)}>
              <View className="flex-row items-center">
                <View className="w-6 h-6 bg-blue-600 rounded-full items-center justify-center mr-2">
                  <Text className="text-white text-xs font-bold">{cart.length}</Text>
                </View>
                <Text className="text-blue-600 font-semibold">Cart</Text>
              </View>
            </TouchableOpacity>
          )}
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
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Feather name="x" size={16} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Products */}
      <View className="flex-1">
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text className="text-gray-500 mt-4">Loading products...</Text>
          </View>
        ) : filteredProducts.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <Feather name="package" size={48} color="#9CA3AF" />
            <Text className="text-lg font-semibold text-gray-900 mt-4">No products found</Text>
          </View>
        ) : (
          <FlatList
            data={filteredProducts}
            renderItem={renderProduct}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: cart.length > 0 ? 100 : 20 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Floating Cart Button */}
      {cart.length > 0 && (
        <View className="absolute bottom-6 left-4 right-4">
          <TouchableOpacity
            onPress={() => setShowCart(true)}
            className="bg-blue-600 rounded-xl px-6 py-4 shadow-lg"
            style={{ elevation: 8 }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="w-8 h-8 bg-white bg-opacity-20 rounded-full items-center justify-center mr-3">
                  <Text className="text-white font-bold">{cart.length}</Text>
                </View>
                <Text className="text-white font-semibold text-lg">View Cart</Text>
              </View>
              <Text className="text-white font-bold text-lg">
                {formatCurrency(cartTotal.total)}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Cart Modal */}
      <Modal visible={showCart} animationType="slide" presentationStyle="pageSheet">
        <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
          <View className="bg-white px-4 py-4 border-b border-gray-200">
            <View className="flex-row items-center justify-between">
              <TouchableOpacity onPress={() => setShowCart(false)}>
                <Feather name="x" size={24} color="#6B7280" />
              </TouchableOpacity>
              <Text className="text-lg font-bold text-gray-900">Your Order</Text>
              <View style={{ width: 24 }} />
            </View>
          </View>

          <ScrollView className="flex-1 px-4 py-4">
            {cart.map(renderCartItem)}
          </ScrollView>

          <View className="bg-white px-4 py-6 border-t border-gray-200">
            <View className="mb-4">
              <View className="flex-row justify-between mb-2">
                <Text className="text-base text-gray-600">Subtotal</Text>
                <Text className="text-base font-semibold">{formatCurrency(cartTotal.subtotal)}</Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-base text-gray-600">Tax</Text>
                <Text className="text-base font-semibold">{formatCurrency(cartTotal.tax)}</Text>
              </View>
              <View className="flex-row justify-between border-t border-gray-200 pt-2">
                <Text className="text-xl font-bold">Total</Text>
                <Text className="text-xl font-bold">{formatCurrency(cartTotal.total)}</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => {
                setShowCart(false);
                setShowPayment(true);
              }}
              className="bg-green-600 py-4 rounded-xl"
            >
              <Text className="text-white text-lg font-bold text-center">
                Checkout
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Payment Modal */}
      <Modal visible={showPayment} animationType="slide" presentationStyle="pageSheet">
        <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
          <View className="bg-white px-4 py-4 border-b border-gray-200">
            <View className="flex-row items-center justify-between">
              <TouchableOpacity onPress={() => setShowPayment(false)} disabled={isProcessing}>
                <Feather name="x" size={24} color={isProcessing ? "#9CA3AF" : "#6B7280"} />
              </TouchableOpacity>
              <Text className="text-lg font-bold text-gray-900">Payment</Text>
              <View style={{ width: 24 }} />
            </View>
          </View>

          <View className="flex-1 px-4 py-6">
            <View className="items-center mb-8">
              <Text className="text-3xl font-bold text-green-600 mb-2">
                {formatCurrency(cartTotal.total)}
              </Text>
              <Text className="text-gray-500">Total Amount</Text>
            </View>

            <TouchableOpacity
              onPress={processPayment}
              disabled={isProcessing}
              className={`py-6 rounded-xl mb-4 ${isProcessing ? 'bg-gray-400' : 'bg-green-600'}`}
            >
              <View className="flex-row items-center justify-center">
                {isProcessing && <ActivityIndicator size="small" color="white" style={{ marginRight: 12 }} />}
                <Feather name="dollar-sign" size={24} color="white" />
                <Text className="text-white text-xl font-bold ml-3">
                  {isProcessing ? 'Processing...' : 'Pay Cash'}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={processPayment}
              disabled={isProcessing}
              className={`py-6 rounded-xl ${isProcessing ? 'bg-gray-400' : 'bg-blue-600'}`}
            >
              <View className="flex-row items-center justify-center">
                <Feather name="credit-card" size={24} color="white" />
                <Text className="text-white text-xl font-bold ml-3">Pay Card</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}