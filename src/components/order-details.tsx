import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, BackHandler } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import TopBar from './ui/TopBar';
import { formatCurrency } from '../lib/instant';

interface OrderItem {
  id: string;
  title: string;
  qty: number;
  price: number;
  saleprice?: number;
  sku?: string;
  option1?: string;
  option2?: string;
  option3?: string;
}

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  status: string;
  fulfillmentStatus: string;
  paymentStatus: string;
  subtotal: number;
  discountAmount?: number;
  discountCode?: string;
  shippingAmount?: number;
  taxAmount?: number;
  total: number;
  totalPaid?: number;
  totalRefunded?: number;
  notes?: string;
  tags?: string;
  createdat: Date;
  orderitems?: OrderItem[];
  customer?: Customer[];
}

interface OrderDetailsProps {
  order: Order;
  onClose: () => void;
}

export default function OrderDetails({ order, onClose }: OrderDetailsProps) {
  const insets = useSafeAreaInsets();

  // Handle back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });

    return () => backHandler.remove();
  }, [onClose]);

  const formatOrderDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch ((status || '').toLowerCase()) {
      case 'open':
        return 'text-blue-600 bg-blue-100';
      case 'fulfilled':
        return 'text-green-600 bg-green-100';
      case 'cancelled':
        return 'text-red-600 bg-red-100';
      case 'paid':
        return 'text-green-600 bg-green-100';
      case 'unpaid':
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getOptionDisplay = (item: OrderItem) => {
    const options = [];
    if (item.option1) options.push(item.option1);
    if (item.option2) options.push(item.option2);
    if (item.option3) options.push(item.option3);
    return options.length > 0 ? options.join(' / ') : '';
  };

  const customer = order.customer?.[0] || {
    name: order.customerName || 'Walk-in Customer',
    email: order.customerEmail,
    phone: order.customerPhone
  };

  return (
    <View className="flex-1 bg-gray-50">
      <TopBar
        title={`Order ${order.orderNumber}`}
        subtitle={formatOrderDate(order.createdat)}
        onBack={onClose}
      />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Order Status */}
        <View className="bg-white mx-6 mt-6 rounded-2xl p-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-semibold text-gray-900">Order Status</Text>
            <Text className="text-2xl font-bold text-gray-900">
              {formatCurrency(order.total)}
            </Text>
          </View>
          
          <View className="flex-row flex-wrap gap-2">
            <View className={`px-3 py-1 rounded-full ${getStatusColor(order.status)}`}>
              <Text className={`text-sm font-medium ${getStatusColor(order.status).split(' ')[0]}`}>
                {order.status}
              </Text>
            </View>
            <View className={`px-3 py-1 rounded-full ${getStatusColor(order.fulfillmentStatus)}`}>
              <Text className={`text-sm font-medium ${getStatusColor(order.fulfillmentStatus).split(' ')[0]}`}>
                {order.fulfillmentStatus}
              </Text>
            </View>
            <View className={`px-3 py-1 rounded-full ${getStatusColor(order.paymentStatus)}`}>
              <Text className={`text-sm font-medium ${getStatusColor(order.paymentStatus).split(' ')[0]}`}>
                {order.paymentStatus}
              </Text>
            </View>
          </View>
        </View>

        {/* Customer Information */}
        <View className="bg-white mx-6 mt-4 rounded-2xl p-6">
          <Text className="text-lg font-semibold text-gray-900 mb-4">Customer</Text>
          <View className="flex-row items-center">
            <View className="w-12 h-12 bg-blue-100 rounded-xl items-center justify-center mr-4">
              <Feather name="user" size={24} color="#3B82F6" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-medium text-gray-900">
                {customer.name}
              </Text>
              {customer.email && (
                <Text className="text-sm text-gray-500 mt-1">
                  {customer.email}
                </Text>
              )}
              {customer.phone && (
                <Text className="text-sm text-gray-500">
                  {customer.phone}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Order Items */}
        <View className="bg-white mx-6 mt-4 rounded-2xl p-6">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Items ({order.orderitems?.length || 0})
          </Text>
          
          {order.orderitems?.map((item, index) => (
            <View 
              key={item.id} 
              className={`flex-row items-center py-4 ${
                index < (order.orderitems?.length || 0) - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <View className="w-12 h-12 bg-gray-100 rounded-xl items-center justify-center mr-4">
                <Feather name="package" size={20} color="#6B7280" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-medium text-gray-900 mb-1">
                  {item.title}
                </Text>
                {item.sku && (
                  <Text className="text-sm text-gray-500">
                    SKU: {item.sku}
                  </Text>
                )}
                {getOptionDisplay(item) && (
                  <Text className="text-sm text-gray-500">
                    {getOptionDisplay(item)}
                  </Text>
                )}
              </View>
              <View className="items-end">
                <Text className="text-base font-medium text-gray-900">
                  {item.qty} × {formatCurrency(item.saleprice || item.price)}
                </Text>
                <Text className="text-sm font-semibold text-gray-900">
                  {formatCurrency((item.saleprice || item.price) * item.qty)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Order Summary */}
        <View className="bg-white mx-6 mt-4 rounded-2xl p-6">
          <Text className="text-lg font-semibold text-gray-900 mb-4">Summary</Text>
          
          <View className="space-y-3">
            <View className="flex-row justify-between">
              <Text className="text-base text-gray-600">Subtotal</Text>
              <Text className="text-base text-gray-900">{formatCurrency(order.subtotal)}</Text>
            </View>
            
            {order.discountAmount && order.discountAmount > 0 && (
              <View className="flex-row justify-between">
                <Text className="text-base text-gray-600">
                  Discount {order.discountCode ? `(${order.discountCode})` : ''}
                </Text>
                <Text className="text-base text-red-600">
                  -{formatCurrency(order.discountAmount)}
                </Text>
              </View>
            )}
            
            {order.shippingAmount && order.shippingAmount > 0 && (
              <View className="flex-row justify-between">
                <Text className="text-base text-gray-600">Shipping</Text>
                <Text className="text-base text-gray-900">{formatCurrency(order.shippingAmount)}</Text>
              </View>
            )}
            
            {order.taxAmount && order.taxAmount > 0 && (
              <View className="flex-row justify-between">
                <Text className="text-base text-gray-600">Tax</Text>
                <Text className="text-base text-gray-900">{formatCurrency(order.taxAmount)}</Text>
              </View>
            )}
            
            <View className="border-t border-gray-200 pt-3">
              <View className="flex-row justify-between">
                <Text className="text-lg font-semibold text-gray-900">Total</Text>
                <Text className="text-lg font-bold text-gray-900">{formatCurrency(order.total)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Notes */}
        {order.notes && (
          <View className="bg-white mx-6 mt-4 rounded-2xl p-6">
            <Text className="text-lg font-semibold text-gray-900 mb-4">Notes</Text>
            <Text className="text-base text-gray-600">{order.notes}</Text>
          </View>
        )}

        {/* Bottom Padding */}
        <View className="h-8" />
      </ScrollView>
    </View>
  );
}
