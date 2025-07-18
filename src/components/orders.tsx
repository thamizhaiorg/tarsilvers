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
  { id: 'unfulfilled', label: 'Unfulfilled' },
  { id: 'unpaid', label: 'Unpaid' },
  { id: 'open', label: 'Open' },
  { id: 'archived', label: 'Archived' }
];

export default function OrdersScreen({ onCreateOrder, onOrderSelect, onClose }: OrdersScreenProps) {
  const insets = useSafeAreaInsets();
  const { currentStore } = useStore();
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
        where: {
          storeId: currentStore?.id || '',
        },
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
        className="mx-6 mb-4"
      >
        <View className="bg-white rounded-2xl p-6">
          <View className="flex-row justify-between items-start mb-3">
            <View className="flex-1">
              <Text className="text-xl font-bold text-gray-900 mb-1">
                {order.orderNumber}
              </Text>
              <Text className="text-base text-gray-600">
                {customerName}
              </Text>
            </View>
            <Text className="text-xl font-bold text-gray-900">
              {formatCurrency(order.total)}
            </Text>
          </View>

          <Text className="text-sm text-gray-500 mb-4">
            {itemCount} item{itemCount !== 1 ? 's' : ''} • {formatDate(order.createdAt)}
          </Text>

          <View className="flex-row items-center space-x-3">
            <View className={`px-3 py-2 rounded-xl ${getStatusColor(order.fulfillmentStatus, 'fulfillment')}`}>
              <Text className="text-sm font-semibold capitalize">
                {order.fulfillmentStatus}
              </Text>
            </View>
            <View className={`px-3 py-2 rounded-xl ${getStatusColor(order.paymentStatus, 'payment')}`}>
              <Text className="text-sm font-semibold capitalize">
                {order.paymentStatus}
              </Text>
            </View>
            {order.status === 'open' && (
              <View className="px-3 py-2 rounded-xl bg-blue-100">
                <Text className="text-sm font-semibold text-blue-800">Open</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Modern Top Bar */}
      <TopBar
        title="Orders"
        subtitle={`${filteredOrders.length} order${filteredOrders.length !== 1 ? 's' : ''}`}
        onBack={onClose}
        rightAction={{
          icon: "plus",
          onPress: onCreateOrder
        }}
      />

      {/* Search and Filters */}
      <View className="px-6 py-4 bg-white border-b border-gray-200">
        {/* Search Bar */}
        <View className="flex-row items-center bg-gray-100 rounded-2xl px-4 py-3 mb-4">
          <Feather name="search" size={20} color="#6B7280" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search orders..."
            className="flex-1 ml-3 text-base"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Filter Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row space-x-3">
            {ORDER_FILTERS.map((filter) => (
              <TouchableOpacity
                key={filter.id}
                onPress={() => setActiveFilter(filter.id)}
                className={`px-6 py-3 rounded-2xl ${
                  activeFilter === filter.id
                    ? 'bg-blue-600'
                    : 'bg-gray-100'
                }`}
                style={{ minHeight: 48 }}
              >
                <Text className={`text-base font-semibold ${
                  activeFilter === filter.id
                    ? 'text-white'
                    : 'text-gray-700'
                }`}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
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
