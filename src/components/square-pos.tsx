import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, FlatList, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { db, formatCurrency } from '../lib/instant';
import { useStore } from '../lib/store-context';
import { id } from '@instantdb/react-native';
import { hapticFeedback } from '../lib/haptics';
import R2Image from './ui/r2-image';

interface Item {
  id: string;
  sku: string;
  price?: number;
  saleprice?: number;
  option1?: string;
  option2?: string;
  option3?: string;
  image?: string;
  productId: string;
  product?: {
    id: string;
    title: string;
    image?: string;
    category?: string;
  };
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

interface SquarePOSProps {
  onClose: () => void;
  onOrderCreated?: (orderId: string) => void;
}

type TabType = 'keypad' | 'library' | 'favourites';

export default function SquarePOS({ onClose, onOrderCreated }: SquarePOSProps) {
  const insets = useSafeAreaInsets();
  const { currentStore } = useStore();
  const [activeTab, setActiveTab] = useState<TabType>('library');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showReview, setShowReview] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Query products that are active and POS-enabled, then get their items
  const { data, isLoading } = db.useQuery(
    currentStore?.id ? {
      products: {
        item: {},
        $: {
          where: {
            storeId: currentStore.id,
            pos: true,
            status: 'active'
          },
          order: {
            createdAt: 'desc'
          }
        }
      }
    } : null
  );

  // Debug query to see all products in the store (without filters)
  const { data: debugData } = db.useQuery(
    currentStore?.id ? {
      products: {
        item: {},
        $: {
          where: {
            storeId: currentStore.id
          },
          order: {
            createdAt: 'desc'
          }
        }
      }
    } : null
  );

  // Flatten all items from active POS products
  const items = useMemo(() => {
    const products = data?.products || [];
    const allItems: Item[] = [];
    
    console.log('Square POS Debug - Products found:', products.length);
    console.log('Square POS Debug - Sample product:', products[0]);
    
    products.forEach((product: any) => {
      console.log('Square POS Debug - Product:', product.title, 'Items:', product.item?.length || 0);
      if (product.item && Array.isArray(product.item)) {
        product.item.forEach((item: any) => {
          allItems.push({
            ...item,
            product: {
              id: product.id,
              title: product.title,
              image: product.image,
              category: product.category
            }
          });
        });
      }
    });
    
    console.log('Square POS Debug - Total items found:', allItems.length);
    return allItems;
  }, [data?.products]);

  // Group items by category
  const categorizedItems = useMemo(() => {
    const categories: { [key: string]: Item[] } = {};
    
    items.forEach((item: Item) => {
      const category = item.product?.category || 'Other';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(item);
    });

    return categories;
  }, [items]);

  // Filter items based on search
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items.slice(0, 20);
    
    const query = searchQuery.toLowerCase();
    return items.filter((item: Item) => {
      const productTitle = item.product?.title || '';
      const variantTitle = [item.option1, item.option2, item.option3].filter(Boolean).join(' ');
      const sku = item.sku || '';
      
      return (
        productTitle.toLowerCase().includes(query) ||
        variantTitle.toLowerCase().includes(query) ||
        sku.toLowerCase().includes(query)
      );
    });
  }, [items, searchQuery]);

  // Calculate cart total
  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.total, 0);
  }, [cart]);

  const addToCart = (item: Item) => {
    hapticFeedback.light();
    
    const variantTitle = [item.option1, item.option2, item.option3]
      .filter(Boolean)
      .join(' ');
    
    const price = item.saleprice || item.price || 0;
    const productTitle = item.product?.title || 'Unknown Product';
    const displayTitle = variantTitle ? `${productTitle} ${variantTitle}` : productTitle;
    
    const existingCartItem = cart.find(cartItem => cartItem.itemId === item.id);
    
    if (existingCartItem) {
      updateQuantity(existingCartItem.id, existingCartItem.qty + 1);
    } else {
      const newCartItem: CartItem = {
        id: id(),
        productId: item.productId,
        itemId: item.id,
        title: displayTitle,
        variantTitle: variantTitle || undefined,
        price,
        qty: 1,
        total: price,
        image: item.image || item.product?.image
      };
      setCart(prev => [...prev, newCartItem]);
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

  const generateOrderNumber = () => {
    const timestamp = Date.now().toString().slice(-6);
    return `#${1000 + parseInt(timestamp.slice(-3))}`;
  };

  const processPayment = async (paymentMethod: 'cash' | 'card') => {

    setIsProcessing(true);
    try {
      const orderId = id();
      const orderNumber = generateOrderNumber();
      
      const orderData = {
        storeId: currentStore.id,
        orderNumber,
        referenceId: orderId,
        createdAt: new Date(),
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
        notes: `Payment method: ${paymentMethod}`,
      };

      // Create order items
      const orderItemTransactions = cart.map(item => {
        const itemId = id();
        return db.tx.orderitems[itemId].update({
          orderId: orderId,
          productId: item.productId,
          itemId: item.itemId,
          sku: item.title?.toUpperCase().replace(/\s+/g, '-') || 'ITEM',
          title: item.title,
          variantTitle: item.variantTitle,
          quantity: item.qty,
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
      
      // Reset and close
      setCart([]);
      setShowPayment(false);
      setShowReview(false);
      onOrderCreated?.(orderId);
      onClose();
      
    } catch (error) {
      console.error('Error processing payment:', error);
      hapticFeedback.error();
      Alert.alert('Error', 'Failed to process payment');
    } finally {
      setIsProcessing(false);
    }
  };

  // Payment Screen - Clean White Background with Flat List Design
  if (showPayment) {
    return (
      <View className="flex-1 bg-white" style={{ paddingTop: insets.top + 10 }}>
        {/* Simple Header */}
        <View className="px-6 py-6 bg-white border-b border-gray-200">
          <View className="flex-row items-center">
            <TouchableOpacity 
              onPress={() => setShowPayment(false)}
              className="mr-4"
            >
              <Feather name="arrow-left" size={24} color="#000000" />
            </TouchableOpacity>
            <Text className="text-xl font-medium text-black">Payment</Text>
          </View>
        </View>

        {/* Total Amount - Centered and Clean */}
        <View className="flex-1 justify-center items-center px-6">
          <View className="items-center mb-16">
            <Text className="text-gray-600 text-lg mb-4">Total</Text>
            <Text className="text-6xl font-light text-black mb-20">
              {formatCurrency(cartTotal)}
            </Text>
          </View>

          {/* Payment Methods - Flat List Items */}
          <View className="w-full">
            <TouchableOpacity
              onPress={() => processPayment('cash')}
              disabled={isProcessing}
              className="flex-row items-center py-6 px-6 border-b border-gray-200"
            >
              <Feather name="dollar-sign" size={24} color="#000000" />
              <Text className="text-black text-xl font-medium ml-4">Cash</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => processPayment('card')}
              disabled={isProcessing}
              className="flex-row items-center py-6 px-6"
            >
              <Feather name="credit-card" size={24} color="#000000" />
              <Text className="text-black text-xl font-medium ml-4">Card</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Safe Area */}
        <View style={{ paddingBottom: Math.max(insets.bottom, 16) }} />

        {/* Processing Indicator */}
        {isProcessing && (
          <View className="absolute inset-0 bg-black/20 items-center justify-center">
            <View className="bg-white px-8 py-6 rounded-2xl items-center">
              <Text className="text-black text-lg font-medium">Processing...</Text>
            </View>
          </View>
        )}
      </View>
    );
  }

  // Review Screen - Clean, Simple, Flat Design
  if (showReview) {
    return (
      <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top + 10 }}>
        {/* Simple Header */}
        <View className="px-6 py-6 bg-white">
          <View className="flex-row items-center">
            <TouchableOpacity 
              onPress={() => setShowReview(false)}
              className="mr-4"
            >
              <Feather name="arrow-left" size={24} color="#374151" />
            </TouchableOpacity>
            <Text className="text-xl font-medium text-gray-900">Review Sale</Text>
          </View>
        </View>

        {/* Cart Items - Clean List */}
        <ScrollView className="flex-1 px-6 py-4">
          {cart.map((item) => (
            <View key={item.id} className="bg-white p-4 mb-3 flex-row items-center justify-between" style={{ borderRadius: 8 }}>
              <View className="flex-1">
                <Text className="text-lg font-medium text-gray-900">{item.title}</Text>
                {item.variantTitle && (
                  <Text className="text-gray-500 text-sm mt-1">{item.variantTitle}</Text>
                )}
                <Text className="text-gray-600 text-sm mt-1">Qty: {item.qty}</Text>
              </View>
              <Text className="text-lg font-semibold text-gray-900">
                {formatCurrency(item.total)}
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* Total and Continue - Fixed Bottom */}
        <View className="bg-white px-6 py-6" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-2xl font-medium text-gray-900">Total</Text>
            <Text className="text-3xl font-light text-gray-900">
              {formatCurrency(cartTotal)}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setShowPayment(true)}
            className="bg-blue-500 py-4 items-center"
            style={{ borderRadius: 12 }}
          >
            <Text className="text-white text-xl font-medium">Continue to Payment</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Main POS Screen - Full Screen Layout
  return (
    <View className="flex-1 bg-white">
      {/* Tabs - No top padding, full screen */}
      <View className="bg-white px-4 py-3 border-b border-gray-200" style={{ paddingTop: insets.top + 20 }}>
        <View className="flex-row">
          {[
            { key: 'keypad', label: 'Keypad' },
            { key: 'library', label: 'Library' },
            { key: 'favourites', label: 'Favourites' }
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key as TabType)}
              className={`flex-1 py-3 mx-1 rounded-lg ${
                activeTab === tab.key ? 'bg-blue-100' : 'bg-gray-100'
              }`}
            >
              <Text className={`text-center font-medium ${
                activeTab === tab.key ? 'text-blue-600' : 'text-gray-600'
              }`}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Main Content - Single Column Layout */}
      <View className="flex-1">
        {/* Search */}
        <View className="px-4 py-3 bg-white border-b border-gray-200">
          <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2">
            <Feather name="search" size={20} color="#6B7280" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search all items"
              className="flex-1 ml-2 text-base"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>



        {/* Categories and Products */}
        <ScrollView 
          className="flex-1 bg-white"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: cart.length > 0 ? 200 : 20 }}
        >
          {/* Categories */}
          {Object.entries(categorizedItems).map(([category, categoryItems]) => (
            <View key={category} className="px-4 py-2">
              <TouchableOpacity className="flex-row items-center justify-between py-4 border-b border-gray-100">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 bg-gray-400 rounded items-center justify-center mr-4">
                    <Text className="text-white font-bold text-lg">
                      {category.substring(0, 2)}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-lg font-medium text-gray-900">{category}</Text>
                    <Text className="text-gray-500">{categoryItems.length} items</Text>
                  </View>
                </View>
                <Feather name="chevron-right" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          ))}

          {/* Individual Items */}
          {filteredItems.map((item: Item) => {
            const price = item.saleprice || item.price || 0;
            const productTitle = item.product?.title || 'Unknown Product';
            const variantOptions = [item.option1, item.option2, item.option3].filter(Boolean);
            const displayTitle = variantOptions.length > 0 ? `${productTitle} ${variantOptions.join(' ')}` : productTitle;
            
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => addToCart(item)}
                className="px-4 py-3 border-b border-gray-100"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <View className="w-10 h-10 bg-orange-500 rounded items-center justify-center mr-4">
                      <Text className="text-white font-bold text-lg">
                        {(productTitle || 'P').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-lg font-medium text-gray-900" numberOfLines={1}>
                        {displayTitle}
                      </Text>
                      {item.sku && (
                        <Text className="text-sm text-gray-500">
                          {item.sku}
                        </Text>
                      )}
                    </View>
                  </View>
                  <Text className="text-lg font-bold text-gray-900">
                    {formatCurrency(price)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Bottom Section - Cart Summary and Review Button */}
        {cart.length > 0 && (
          <View className="bg-white border-t border-gray-200">
            {/* Cart Items Summary */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              className="px-4 py-3 border-b border-gray-100"
              style={{ maxHeight: 80 }}
            >
              <View className="flex-row">
                {cart.map((item, index) => (
                  <View key={item.id} className="mr-4 bg-gray-50 rounded-lg px-3 py-2 min-w-[120px]">
                    <Text className="text-sm font-medium text-gray-900" numberOfLines={1}>
                      {item.title}
                    </Text>
                    <View className="flex-row items-center justify-between mt-1">
                      <Text className="text-xs text-gray-500">Qty: {item.qty}</Text>
                      <Text className="text-sm font-bold text-gray-900">
                        {formatCurrency(item.total)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>

            {/* Total and Review Button */}
            <View className="px-4 py-4" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
              <View className="flex-row items-center justify-between mb-4">
                <View>
                  <Text className="text-sm text-gray-500">Total</Text>
                  <Text className="text-2xl font-bold text-gray-900">
                    {formatCurrency(cartTotal)}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowReview(true)}
                  className="bg-blue-600 px-8 py-4 rounded-xl"
                >
                  <Text className="text-white text-lg font-bold">
                    Review sale ({cart.length} items)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}