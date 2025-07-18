import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, BackHandler, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { db, formatCurrency } from '../lib/instant';
import { useStore } from '../lib/store-context';
import { withHapticFeedback } from '../lib/haptics';
import OrdersScreen from './orders';
import QuickOrderPOS from './QuickOrderPOS';
import OrderDetails from './order-details';

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
  customer?: Array<{
    id: string;
    name: string;
  }>;
  location?: Array<{
    id: string;
    name: string;
  }>;
}

interface SalesScreenProps {
  onOpenMenu?: () => void;
}

export default function SalesScreen({}: SalesScreenProps) {
  const { currentStore } = useStore();
  const insets = useSafeAreaInsets();
  const [currentView, setCurrentView] = useState<'dashboard' | 'orders' | 'create-order' | 'order-details'>('dashboard');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Handle back button for sub-screens
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (currentView !== 'dashboard') {
        setCurrentView('dashboard');
        setSelectedOrder(null);
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [currentView]);

  // Query orders from InstantDB with optimized schema
  const { data, isLoading } = db.useQuery({
    orders: {
      customer: {},
      orderitems: {},
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

  // Helper function to format order dates
  const formatOrderDate = (date: Date) => {
    const now = new Date();
    const orderDate = new Date(date);
    const diffTime = Math.abs(now.getTime() - orderDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;

    return orderDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate sales metrics
  const salesMetrics = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrders = orders.filter((order: Order) => {
      const orderDate = new Date(order.createdAt);
      orderDate.setHours(0, 0, 0, 0);
      return orderDate.getTime() === today.getTime();
    });

    const totalSales = orders.reduce((sum: number, order: Order) => sum + order.total, 0);
    const todaySales = todayOrders.reduce((sum: number, order: Order) => sum + order.total, 0);
    const totalOrders = orders.length;
    const todayOrders_count = todayOrders.length;

    return {
      totalSales,
      todaySales,
      totalOrders,
      todayOrders: todayOrders_count
    };
  }, [orders]);

  // Get recent orders for display
  const recentOrders = useMemo(() => {
    return orders.slice(0, 5).map((order: Order) => ({
      id: order.id,
      title: order.customerName || order.customer?.[0]?.name || `Order ${order.orderNumber}`,
      amount: order.total,
      type: 'credit' as const,
      date: formatOrderDate(order.createdAt),
      orderNumber: order.orderNumber,
      status: order.status
    }));
  }, [orders]);



  const handleCreateOrder = () => {
    setCurrentView('create-order');
  };

  const handleViewOrders = () => {
    setCurrentView('orders');
  };

  const handleOrderCreated = (orderId: string) => {
    setCurrentView('dashboard');
    // Optionally show success message or navigate to order details
  };

  const handleOrderSelect = (order: Order) => {
    setSelectedOrder(order);
    setCurrentView('order-details');
  };

  // Render different views based on current state
  if (currentView === 'orders') {
    return (
      <OrdersScreen
        onCreateOrder={handleCreateOrder}
        onOrderSelect={handleOrderSelect}
        onClose={() => setCurrentView('dashboard')}
      />
    );
  }

  if (currentView === 'create-order') {
    return (
      <QuickOrderPOS
        onClose={() => setCurrentView('dashboard')}
        onOrderComplete={handleOrderCreated}
      />
    );
  }

  if (currentView === 'order-details' && selectedOrder) {
    return (
      <OrderDetails
        order={selectedOrder}
        onClose={() => {
          setCurrentView('dashboard');
          setSelectedOrder(null);
        }}
      />
    );
  }

  // Main sales dashboard
  return (
    <View className="flex-1 bg-gradient-to-b from-gray-800 to-gray-900">
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {/* Hero Section - Full width with gradient */}
          <View className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 pb-12" style={{ paddingTop: insets.top + 16 }}>
            <View className="items-center">
              <Text className="text-white/80 text-lg font-medium mb-3">Today's Revenue</Text>
              <Text className="text-white text-6xl font-bold mb-8">
                {formatCurrency(salesMetrics.todaySales)}
              </Text>
              
              {/* Primary CTA - Prominent and centered */}
              <TouchableOpacity
                onPress={withHapticFeedback(handleCreateOrder, 'medium')}
                className="bg-white w-full py-6 rounded-3xl shadow-lg"
                style={{ minHeight: 72 }}
              >
                <View className="flex-row items-center justify-center">
                  <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-4">
                    <Feather name="plus" size={24} color="#3B82F6" />
                  </View>
                  <Text className="text-gray-900 text-2xl font-bold">Start New Sale</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Stats Grid - Edge to edge */}
          <View className="px-6 py-8 bg-white">
            <View className="flex-row -mx-2">
              <View className="flex-1 mx-2">
                <View className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-3xl border border-green-200">
                  <View className="w-12 h-12 bg-green-500 rounded-2xl items-center justify-center mb-4">
                    <Feather name="trending-up" size={24} color="white" />
                  </View>
                  <Text className="text-3xl font-bold text-gray-900 mb-2">
                    {formatCurrency(salesMetrics.totalSales)}
                  </Text>
                  <Text className="text-green-700 font-semibold">Total Sales</Text>
                </View>
              </View>
              
              <View className="flex-1 mx-2">
                <View className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-3xl border border-blue-200">
                  <View className="w-12 h-12 bg-blue-500 rounded-2xl items-center justify-center mb-4">
                    <Feather name="shopping-cart" size={24} color="white" />
                  </View>
                  <Text className="text-3xl font-bold text-gray-900 mb-2">
                    {salesMetrics.todayOrders}
                  </Text>
                  <Text className="text-blue-700 font-semibold">Today's Orders</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Quick Actions - Full width cards */}
          <View className="px-6 pb-8 bg-white">
            <Text className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</Text>
            
            <View className="space-y-4">
              <TouchableOpacity
                onPress={withHapticFeedback(handleViewOrders, 'light')}
                className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 rounded-3xl border border-gray-200"
              >
                <View className="flex-row items-center">
                  <View className="w-16 h-16 bg-blue-500 rounded-2xl items-center justify-center mr-6">
                    <Feather name="list" size={28} color="white" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xl font-bold text-gray-900 mb-1">View All Orders</Text>
                    <Text className="text-gray-600 text-base">Manage and track your sales</Text>
                  </View>
                  <Feather name="chevron-right" size={24} color="#9CA3AF" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 rounded-3xl border border-gray-200">
                <View className="flex-row items-center">
                  <View className="w-16 h-16 bg-purple-500 rounded-2xl items-center justify-center mr-6">
                    <Feather name="bar-chart-2" size={28} color="white" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xl font-bold text-gray-900 mb-1">Sales Analytics</Text>
                    <Text className="text-gray-600 text-base">View detailed reports</Text>
                  </View>
                  <Feather name="chevron-right" size={24} color="#9CA3AF" />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Recent Activity - Modern card design */}
          <View className="px-6 pb-8 bg-gray-50">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-2xl font-bold text-gray-900">Recent Activity</Text>
              <TouchableOpacity onPress={handleViewOrders}>
                <Text className="text-blue-600 font-bold text-lg">View All</Text>
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <View className="bg-white rounded-3xl p-12 items-center">
                <View className="w-12 h-12 bg-gray-200 rounded-full animate-pulse mb-4" />
                <Text className="text-gray-500 text-lg">Loading sales data...</Text>
              </View>
            ) : recentOrders.length === 0 ? (
              <View className="bg-white rounded-3xl p-12 items-center">
                <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-6">
                  <Feather name="shopping-bag" size={36} color="#9CA3AF" />
                </View>
                <Text className="text-2xl font-bold text-gray-900 mb-4">Ready to Start Selling?</Text>
                <Text className="text-gray-500 text-center text-lg mb-8 leading-relaxed">
                  Your sales activity will appear here once you start making sales
                </Text>
                <TouchableOpacity
                  onPress={handleCreateOrder}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 px-10 py-5 rounded-2xl"
                >
                  <Text className="text-white font-bold text-xl">Create First Sale</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="bg-white rounded-3xl overflow-hidden">
                {recentOrders.map((item, index) => (
                  <TouchableOpacity
                    key={item.id}
                    className={`p-6 ${index < recentOrders.length - 1 ? 'border-b border-gray-100' : ''}`}
                    onPress={() => handleOrderSelect(item as any)}
                  >
                    <View className="flex-row items-center">
                      <View className="w-14 h-14 bg-green-100 rounded-2xl items-center justify-center mr-5">
                        <Feather name="check-circle" size={26} color="#10B981" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-xl font-bold text-gray-900 mb-2">
                          {item.title}
                        </Text>
                        <Text className="text-gray-500 text-base">
                          {item.date} • Order #{item.orderNumber}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-2xl font-bold text-green-600 mb-1">
                          {formatCurrency(item.amount)}
                        </Text>
                        <View className="bg-green-100 px-3 py-1 rounded-full">
                          <Text className="text-green-700 font-semibold text-sm">Completed</Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
  );
}
