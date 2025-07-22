import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, BackHandler, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { db, formatCurrency } from '../lib/instant';
import { useStore } from '../lib/store-context';
import { id } from '@instantdb/react-native';
import { hapticFeedback, withHapticFeedback } from '../lib/haptics';
import CustomerSelect from './customer-select';
import OrderProductSelect from './order-product-select';
import Card from './ui/Card';
import Button from './ui/Button';
import LoadingButton from './ui/LoadingButton';
import TopBar from './ui/TopBar';

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface OrderItem {
  id: string;
  productId: string;
  itemId?: string;
  sku: string;
  title: string;
  variantTitle?: string;
  qty: number;
  price: number;
  compareAtPrice?: number;
  cost?: number;
  lineTotal: number;
  productImage?: string;
}

interface OrderCreateProps {
  onClose: () => void;
  onOrderCreated: (orderId: string) => void;
}

export default function OrderCreate({ onClose, onOrderCreated }: OrderCreateProps) {
  const insets = useSafeAreaInsets();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountCode, setDiscountCode] = useState('');
  const [shippingAmount, setShippingAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [market, setMarket] = useState('pos');
  
  // Modal states
  const [showCustomerSelect, setShowCustomerSelect] = useState(false);
  const [showProductSelect, setShowProductSelect] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [showMarketsModal, setShowMarketsModal] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  // Handle back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });

    return () => backHandler.remove();
  }, [onClose]);

  // Calculate order totals
  const orderTotals = useMemo(() => {
    const subtotal = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const taxRate = 0.08; // 8% tax rate - this should be configurable
    const taxAmount = (subtotal - discountAmount + shippingAmount) * taxRate;
    const total = subtotal - discountAmount + shippingAmount + taxAmount;

    return {
      subtotal,
      discountAmount,
      shippingAmount,
      taxAmount,
      total
    };
  }, [orderItems, discountAmount, shippingAmount]);

  const handleAddProducts = (products: any[]) => {
    const newItems: OrderItem[] = products.map(product => ({
      id: id(),
      productId: product.id,
      itemId: product.itemId,
      sku: product.sku || `${product.title?.toUpperCase().replace(/\s+/g, '-')}`,
      title: product.title,
      variantTitle: product.variantTitle,
      qty: 1,
      price: product.price || 0,
      compareAtPrice: product.compareAtPrice,
      cost: product.cost,
      lineTotal: product.price || 0,
      productImage: product.image
    }));

    setOrderItems(prev => [...prev, ...newItems]);
  };

  const handleUpdateItemQty = (itemId: string, qty: number) => {
    hapticFeedback.light();

    if (qty <= 0) {
      setOrderItems(prev => prev.filter(item => item.id !== itemId));
      return;
    }

    setOrderItems(prev => prev.map(item =>
      item.id === itemId
        ? { ...item, qty, lineTotal: item.price * qty }
        : item
    ));
  };

  const handleRemoveItem = (itemId: string) => {
    hapticFeedback.warning();
    setOrderItems(prev => prev.filter(item => item.id !== itemId));
  };

  const generateOrderNumber = () => {
    // Generate a simple order number - in production, this should be more sophisticated
    const timestamp = Date.now().toString().slice(-6);
    return `#${1000 + parseInt(timestamp.slice(-3))}`;
  };

  const handleCreateOrder = async () => {
    if (orderItems.length === 0) {
      hapticFeedback.warning();
      Alert.alert('Error', 'Please add at least one product to the order');
      return;
    }



    setIsCreatingOrder(true);
    try {
      const orderId = id();
      const orderNumber = generateOrderNumber();
      
      const orderData = {
        orderNumber,
        referid: orderId,
        createdat: new Date(),
        customerId: selectedCustomer?.id,
        customerName: selectedCustomer?.name,
        customerEmail: selectedCustomer?.email,
        customerPhone: selectedCustomer?.phone,
        status: 'open',
        fulfillmentStatus: 'unfulfilled',
        paymentStatus: 'unpaid',
        currency: 'USD',
        subtotal: orderTotals.subtotal,
        discountAmount: orderTotals.discountAmount,
        discountCode: discountCode || undefined,
        shippingAmount: orderTotals.shippingAmount,
        taxAmount: orderTotals.taxAmount,
        total: orderTotals.total,
        totalPaid: 0,
        totalRefunded: 0,
        notes: notes || undefined,
        tags: tags.length > 0 ? JSON.stringify(tags) : undefined,
        source: 'pos',
        market: market,
      };

      // Create order items
      const orderItemTransactions = orderItems.map(item => {
        const itemId = id();
        return db.tx.orderitems[itemId].update({
          orderid: orderId,
          productId: item.productId,
          itemId: item.itemId,
          sku: item.sku,
          title: item.title,
          variantTitle: item.variantTitle,
          qty: item.qty,
          price: item.price,
          compareAtPrice: item.compareAtPrice,
          cost: item.cost,
          taxRate: 0.08,
          taxAmount: (item.lineTotal * 0.08),
          discountAmount: 0,
          lineTotal: item.lineTotal,
          productImage: item.productImage,
          fulfillmentStatus: 'unfulfilled'
        });
      });

      // Execute transaction
      await db.transact([
        db.tx.orders[orderId].update(orderData),
        ...orderItemTransactions
      ]);

      // Update customer stats if customer is selected
      if (selectedCustomer) {
        await db.transact([
          db.tx.customers[selectedCustomer.id].update({
            totalOrders: (selectedCustomer as any).totalOrders ? (selectedCustomer as any).totalOrders + 1 : 1,
            totalSpent: (selectedCustomer as any).totalSpent ? (selectedCustomer as any).totalSpent + orderTotals.total : orderTotals.total,
            lastOrderDate: new Date(),
            updatedAt: new Date()
          })
        ]);
      }

      hapticFeedback.success();
      onOrderCreated(orderId);
    } catch (error) {
      hapticFeedback.error();
      Alert.alert('Error', 'Failed to create order');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Modern Top Bar */}
      <TopBar
        title="New Sale"
        subtitle={orderItems.length > 0 ? `${orderItems.length} item${orderItems.length !== 1 ? 's' : ''}` : undefined}
        onBack={onClose}
        rightAction={orderItems.length > 0 ? {
          text: `${formatCurrency(orderTotals.total)}`,
          onPress: handleCreateOrder
        } : undefined}
      />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Customer Section */}
        <View className="px-6 pt-6">
          <TouchableOpacity
            onPress={() => setShowCustomerSelect(true)}
            className="bg-white rounded-2xl p-4 mb-6"
            style={{ minHeight: 72 }}
          >
            <View className="flex-row items-center">
              <View className="w-12 h-12 bg-blue-100 rounded-xl items-center justify-center mr-4">
                <Feather name="user" size={24} color="#3B82F6" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900">
                  {selectedCustomer ? selectedCustomer.name : 'Add Customer'}
                </Text>
                <Text className="text-sm text-gray-500">
                  {selectedCustomer ? selectedCustomer.email || selectedCustomer.phone || 'Customer added' : 'Tap to select customer'}
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color="#9CA3AF" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Products Section */}
        <View className="px-6">
          {orderItems.length === 0 ? (
            <View className="space-y-4">
              {/* Add Products - Large Touch Target */}
              <TouchableOpacity
                onPress={() => setShowProductSelect(true)}
                className="bg-blue-600 rounded-2xl p-6"
                style={{ minHeight: 80 }}
              >
                <View className="flex-row items-center justify-center">
                  <Feather name="plus" size={28} color="white" />
                  <Text className="text-white text-xl font-bold ml-3">Add Products</Text>
                </View>
              </TouchableOpacity>

              {/* Add Custom Item */}
              <TouchableOpacity
                className="bg-white border-2 border-dashed border-gray-300 rounded-2xl p-6"
                style={{ minHeight: 80 }}
              >
                <View className="flex-row items-center justify-center">
                  <Feather name="edit-3" size={28} color="#6B7280" />
                  <Text className="text-gray-600 text-xl font-semibold ml-3">Custom Item</Text>
                </View>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="space-y-4">
              {/* Order Items */}
              <View className="bg-white rounded-2xl overflow-hidden">
                {orderItems.map((item, index) => (
                  <View
                    key={item.id}
                    className={`p-4 ${index < orderItems.length - 1 ? 'border-b border-gray-100' : ''}`}
                  >
                    <View className="flex-row items-center justify-between mb-3">
                      <View className="flex-1 mr-4">
                        <Text className="text-base font-semibold text-gray-900">{item.title}</Text>
                        {item.variantTitle && (
                          <Text className="text-sm text-gray-500 mt-1">{item.variantTitle}</Text>
                        )}
                        <Text className="text-sm text-gray-400 mt-1">{item.sku}</Text>
                      </View>
                      <Text className="text-lg font-bold text-gray-900">
                        {formatCurrency(item.lineTotal)}
                      </Text>
                    </View>

                    {/* Quantity Controls - Large Touch Targets */}
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center">
                        <TouchableOpacity
                          onPress={() => handleUpdateItemQty(item.id, item.qty - 1)}
                          className="w-12 h-12 bg-gray-100 rounded-xl items-center justify-center"
                        >
                          <Feather name="minus" size={20} color="#6B7280" />
                        </TouchableOpacity>
                        <Text className="mx-4 text-xl font-bold text-gray-900 min-w-[40px] text-center">
                          {item.qty}
                        </Text>
                        <TouchableOpacity
                          onPress={() => handleUpdateItemQty(item.id, item.qty + 1)}
                          className="w-12 h-12 bg-blue-100 rounded-xl items-center justify-center"
                        >
                          <Feather name="plus" size={20} color="#3B82F6" />
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity
                        onPress={() => handleRemoveItem(item.id)}
                        className="w-12 h-12 bg-red-100 rounded-xl items-center justify-center"
                      >
                        <Feather name="trash-2" size={20} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>

              {/* Add More Products */}
              <TouchableOpacity
                onPress={() => setShowProductSelect(true)}
                className="bg-white border-2 border-dashed border-blue-300 rounded-2xl p-4"
                style={{ minHeight: 64 }}
              >
                <View className="flex-row items-center justify-center">
                  <Feather name="plus" size={24} color="#3B82F6" />
                  <Text className="text-blue-600 text-lg font-semibold ml-2">Add More Products</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Order Summary */}
        {orderItems.length > 0 && (
          <View className="px-6 mt-6">
            <View className="bg-white rounded-2xl p-6">
              <Text className="text-lg font-bold text-gray-900 mb-4">Order Summary</Text>

              <View className="space-y-3">
                <View className="flex-row justify-between">
                  <Text className="text-base text-gray-600">Subtotal</Text>
                  <Text className="text-base font-semibold text-gray-900">
                    {formatCurrency(orderTotals.subtotal)}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => setShowDiscountModal(true)}
                  className="flex-row justify-between items-center py-2"
                >
                  <Text className="text-base text-gray-600">Discount</Text>
                  <View className="flex-row items-center">
                    <Text className="text-base font-semibold text-gray-900 mr-2">
                      {discountAmount > 0 ? `-${formatCurrency(discountAmount)}` : formatCurrency(0)}
                    </Text>
                    <Feather name="chevron-right" size={16} color="#9CA3AF" />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowShippingModal(true)}
                  className="flex-row justify-between items-center py-2"
                >
                  <Text className="text-base text-gray-600">Shipping</Text>
                  <View className="flex-row items-center">
                    <Text className="text-base font-semibold text-gray-900 mr-2">
                      {formatCurrency(orderTotals.shippingAmount)}
                    </Text>
                    <Feather name="chevron-right" size={16} color="#9CA3AF" />
                  </View>
                </TouchableOpacity>

                <View className="flex-row justify-between">
                  <Text className="text-base text-gray-600">Tax (estimated)</Text>
                  <Text className="text-base font-semibold text-gray-900">
                    {formatCurrency(orderTotals.taxAmount)}
                  </Text>
                </View>

                <View className="border-t border-gray-200 pt-3 mt-3">
                  <View className="flex-row justify-between">
                    <Text className="text-xl font-bold text-gray-900">Total</Text>
                    <Text className="text-xl font-bold text-gray-900">
                      {formatCurrency(orderTotals.total)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Additional Sections */}
        <View className="px-4 py-6 border-t border-gray-200 space-y-4">
          <TouchableOpacity
            onPress={() => setShowNotesModal(true)}
            className="flex-row items-center justify-between py-2"
          >
            <View className="flex-row items-center">
              <Feather name="file-text" size={20} color="#6B7280" />
              <Text className="ml-3 text-gray-700">Notes</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#6B7280" />
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => setShowTagsModal(true)}
            className="flex-row items-center justify-between py-2"
          >
            <View className="flex-row items-center">
              <Feather name="hash" size={20} color="#6B7280" />
              <Text className="ml-3 text-gray-700">Tags</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#6B7280" />
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => setShowMarketsModal(true)}
            className="flex-row items-center justify-between py-2"
          >
            <View className="flex-row items-center">
              <Feather name="globe" size={20} color="#6B7280" />
              <Text className="ml-3 text-gray-700">Markets</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Padding */}
      <View className="h-24" />

      {/* Floating Create Order Button */}
      {orderItems.length > 0 && (
        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4">
          <LoadingButton
            title={`Complete Sale • ${formatCurrency(orderTotals.total)}`}
            onPress={handleCreateOrder}
            loading={isCreatingOrder}
            variant="success"
            size="large"
            icon={isCreatingOrder ? undefined : "check"}
            fullWidth
          />
        </View>
      )}

      {/* Modals */}
      {showCustomerSelect && (
        <CustomerSelect
          selectedCustomer={selectedCustomer}
          onCustomerSelect={setSelectedCustomer}
          onClose={() => setShowCustomerSelect(false)}
        />
      )}

      {showProductSelect && (
        <OrderProductSelect
          onProductsSelect={handleAddProducts}
          onClose={() => setShowProductSelect(false)}
        />
      )}
    </View>
  );
}
