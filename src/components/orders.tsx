import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, FlatList, BackHandler } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { db, formatCurrency } from '../lib/instant';
import { useStore } from '../lib/store-context';
import Card from './ui/Card';
import TopBar from './ui/TopBar';

interface Order {
  id: string;
  orderNumber: string;
  customerId?: string;
  customerName?: string;
  status: string;
  fulfillmentStatus: string;
  paymentStatus: string;
  total: number;
  createdAt: Date; // Use consistent field naming
  orderitems?: Array<{
    id: string;
    title: string;
    quantity: number; // Use consistent field naming
    price: number;
  }>;
  customer?: Array<{
    id: string;
    name: string;
    email?: string;
  }>;
  location?: Array<{
    id: string;
    name: string;
  }>;
}

interface OrdersScreenProps {
  onCreateOrder: () => void;
  onOrderSelect: (order: Order) => void;
  onClose: () => void;
}

const ORDER_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'unfulfilled', label: 'Unfulfilled' },
  { id: 'unpaid', label: 'Unpaid' },
  { id: 'archived', label: 'Archived' }
];

export default function OrdersScreen({ onCreateOrder, onOrderSelect, onClose }: OrdersScreenProps) {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [showLocationFilter, setShowLocationFilter] = useState(false);

  // Handle back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });

    return () => backHandler.remove();
  }, [onClose]);

  // Query orders from InstantDB with optimized schema
  const { data, isLoading, error } = db.useQuery({
    orders: {
      orderitems: {},
      customer: {},
      location: {}, // Use new location relationship
      $: {
        where: {}, // No store filtering needed since schema doesn't include storeId
        order: {
          createdAt: 'desc' // Use consistent field naming
        }
      }
    }
  });

  const orders = data?.orders || [];

  // Filter orders based on search and status
  const filteredOrders = useMemo(() => {
    let filtered = orders;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((order: Order) =>
        (order.orderNumber || '').toLowerCase().includes(query) ||
        (order.customerName || '').toLowerCase().includes(query) ||
        ((order.customer && order.customer[0] && order.customer[0].name) ? order.customer[0].name.toLowerCase() : '').includes(query) ||
        ((order.customer && order.customer[0] && order.customer[0].email) ? order.customer[0].email.toLowerCase() : '').includes(query)
      );
    }

    // Apply status filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter((order: Order) => {
        switch (activeFilter) {
          case 'unfulfilled':
            return order.fulfillmentStatus === 'unfulfilled';
          case 'unpaid':
            return order.paymentStatus === 'unpaid' || order.paymentStatus === 'partial';
          case 'open':
            return order.status === 'open';
          case 'archived':
            return order.status === 'closed' || order.status === 'cancelled';
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [orders, searchQuery, activeFilter]);

  const getStatusColor = (status: string, type: 'fulfillment' | 'payment') => {
    if (type === 'fulfillment') {
      switch (status) {
        case 'fulfilled': return 'bg-green-100 text-green-800';
        case 'partial': return 'bg-yellow-100 text-yellow-800';
        case 'unfulfilled': return 'bg-gray-100 text-gray-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    } else {
      switch (status) {
        case 'paid': return 'bg-green-100 text-green-800';
        case 'partial': return 'bg-yellow-100 text-yellow-800';
        case 'unpaid': return 'bg-red-100 text-red-800';
        case 'refunded': return 'bg-gray-100 text-gray-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const orderDate = new Date(date);
    const diffTime = Math.abs(now.getTime() - orderDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    
    return orderDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: orderDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const renderOrderItem = ({ item: order }: { item: Order }) => {
    const itemCount = order.orderitems?.length || 0;
    const customerName = order.customerName || order.customer?.[0]?.name || 'Guest';

    return (
      <TouchableOpacity
        onPress={() => onOrderSelect(order)}
        className="px-4 py-4 bg-white"
      >
        <View className="flex-row items-center">
          {/* Order Icon */}
          <View className="w-12 h-12 bg-gray-200 mr-3 items-center justify-center rounded-lg">
            <Feather name="shopping-bag" size={20} color="#6B7280" />
          </View>

          {/* Order Details */}
          <View className="flex-1">
            <Text className="text-base font-medium text-gray-900 mb-1">
              {order.orderNumber}
            </Text>
            <Text className="text-sm text-gray-500 mb-2">
              {customerName} • {itemCount} item{itemCount !== 1 ? 's' : ''} • {formatDate(order.createdAt)}
            </Text>
            
            {/* Status Tags */}
            <View className="flex-row items-center">
              <View className={`px-2 py-1 rounded-md mr-2 ${getStatusColor(order.fulfillmentStatus, 'fulfillment')}`}>
                <Text className="text-xs font-medium capitalize">
                  {order.fulfillmentStatus}
                </Text>
              </View>
              <View className={`px-2 py-1 rounded-md mr-2 ${getStatusColor(order.paymentStatus, 'payment')}`}>
                <Text className="text-xs font-medium capitalize">
                  {order.paymentStatus}
                </Text>
              </View>
              {order.status === 'open' && (
                <View className="px-2 py-1 rounded-md bg-blue-100">
                  <Text className="text-xs font-medium text-blue-800">Open</Text>
                </View>
              )}
            </View>
          </View>

          {/* Price */}
          <View className="items-end">
            <Text className="text-base font-semibold text-gray-900">
              {formatCurrency(order.total)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-white">
      {/* Search Bar - Following products screen pattern */}
      <View className="bg-white px-4 py-3">
        <View className="flex-row items-center">
          {/* Back Icon */}
          <TouchableOpacity onPress={onClose}>
            <Feather name="arrow-left" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Search Input */}
          <TextInput
            placeholder="Search orders..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 text-base text-gray-900 ml-3 mr-3"
            placeholderTextColor="#9CA3AF"
          />

          {/* Add Order Icon */}
          <TouchableOpacity onPress={onCreateOrder}>
            <Feather name="plus" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Tabs - Following products screen pattern */}
      <View className="px-4 py-3 bg-white border-b border-gray-100">
        <View className="flex-row">
          {ORDER_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.id}
              onPress={() => setActiveFilter(filter.id)}
              className={`mr-6 pb-2 ${
                activeFilter === filter.id ? 'border-b-2 border-blue-600' : ''
              }`}
            >
              <Text className={`text-base font-medium ${
                activeFilter === filter.id ? 'text-blue-600' : 'text-gray-500'
              }`}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Orders List */}
      <View className="flex-1">
        {isLoading ? (
          <View className="flex-1 justify-center items-center">
            <Text className="text-gray-500 text-lg">Loading orders...</Text>
          </View>
        ) : filteredOrders.length === 0 ? (
          <View className="flex-1 justify-center items-center px-6">
            <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-6">
              <Feather name="shopping-bag" size={40} color="#9CA3AF" />
            </View>
            <Text className="text-2xl font-bold text-gray-900 mb-3">No orders found</Text>
            <Text className="text-gray-500 text-center mb-8 text-lg">
              {searchQuery ? 'Try adjusting your search or filters' : 'Create your first order to get started'}
            </Text>
            <TouchableOpacity
              onPress={onCreateOrder}
              className="bg-blue-600 px-8 py-4 rounded-2xl"
              style={{ minHeight: 56 }}
            >
              <Text className="text-white font-bold text-lg">Create Order</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredOrders}
            renderItem={renderOrderItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}
          />
        )}
      </View>
    </View>
  );
}
