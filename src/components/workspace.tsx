import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, BackHandler, Modal } from 'react-native';
import { useStore } from '../lib/store-context';
import { useAuth } from '../lib/auth-context';
import { db } from '../lib/instant';
import StoreForm from './store-form';
import ComList from './comlist';

type Screen = 'space' | 'sales' | 'reports' | 'products' | 'collections' | 'options' | 'metafields' | 'menu' | 'items' | 'locations' | 'store-management';

interface WorkspaceProps {
  onNavigate: (screen: Screen) => void;
  onClose: () => void;
}

export default function Workspace({ onNavigate, onClose }: WorkspaceProps) {
  const { currentStore } = useStore();
  const [showStoreForm, setShowStoreForm] = useState(false);
  const [showComList, setShowComList] = useState(false);
  const [salesMetrics, setSalesMetrics] = useState({ totalSales: 0, orderCount: 0 });

  // User status and notification data
  const userData = {
    spaceNotifications: [
      { type: 'taxi', message: 'Taxi arriving in 10 minutes', time: '10 mins' },
      { type: 'cab', message: 'Cab booked for 3:30 PM', time: '15 mins' }
    ]
  };



  // Fetch sales data with optimized schema
  const { data: ordersData } = db.useQuery({
    orders: {
      $: {
        where: {
          storeId: currentStore?.id || '',
        },
        order: {
          createdAt: 'desc' // Use consistent field naming and add ordering
        }
      },
    },
  });

  // Calculate sales metrics
  useEffect(() => {
    if (ordersData?.orders) {
      const totalSales = ordersData.orders.reduce((sum, order) => sum + (order.total || 0), 0);
      const orderCount = ordersData.orders.length;
      setSalesMetrics({ totalSales, orderCount });
    }
  }, [ordersData]);

  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      // If any sub-screen is open, close it
      if (showStoreForm) {
        setShowStoreForm(false);
        return true;
      }
      if (showComList) {
        setShowComList(false);
        return true;
      }

      // If main menu is open, close it
      onClose();
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => {
      backHandler.remove();
    };
  }, [showStoreForm, showComList, onClose]);



  const handleItemPress = (itemId: string) => {
    // Handle special cases
    if (itemId === 'space') {
      onNavigate('space' as Screen);
    } else if (itemId === 'commerce') {
      // Close menu and navigate to sales
      onClose();
      onNavigate('sales' as Screen);
    } else if (itemId === 'comlist') {
      setShowComList(true);
    } else if (itemId === 'store') {
      onNavigate('store-management' as Screen);
    } else {
      onNavigate(itemId as Screen);
    }
  };

  // Show store management screens
  if (showStoreForm) {
    return (
      <StoreForm
        onClose={() => setShowStoreForm(false)}
        onSave={() => setShowStoreForm(false)}
      />
    );
  }



  if (showComList) {
    return (
      <ComList
        onNavigate={onNavigate}
        onClose={() => setShowComList(false)}
      />
    );
  }



  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-6">
          {/* Space Card - White */}
          <TouchableOpacity
            onPress={() => handleItemPress('space')}
            className="bg-white p-4 mb-1"
            style={{ minHeight: 120 }}
          >
            <View className="flex-1">
              <Text className="text-black text-2xl font-bold mb-2">Space</Text>
              <Text className="text-gray-500 text-xl font-bold">
                {userData.spaceNotifications.length > 0
                  ? userData.spaceNotifications[0].message
                  : 'Taxi arriving in 10 minutes'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Commerce Card - Light White */}
          <View
            className="p-6"
            style={{ minHeight: 504, borderRadius: 10, backgroundColor: '#F5F5F5' }}
          >
            <View className="flex-1">
              {/* Header */}
              <View className="mb-4">
                <View className="flex-row items-center justify-start mb-3">
                  <TouchableOpacity 
                    onPress={() => handleItemPress('store')}
                    className="px-3 py-1 border border-gray-300"
                    style={{ borderRadius: 6 }}
                  >
                    <Text className="text-green-800 text-sm">
                      {currentStore?.name || 'Store A'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Sales Metrics */}
              <View className="mb-6">
                <View className="flex-row justify-between mb-4">
                  <View>
                    <Text className="text-gray-600 text-sm">Total Sales</Text>
                    <Text className="text-black text-2xl font-bold">
                      ${salesMetrics.totalSales.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-gray-600 text-sm">Orders</Text>
                    <Text className="text-black text-2xl font-bold">{salesMetrics.orderCount}</Text>
                  </View>
                </View>
                
                {/* New Sale Button */}
                <TouchableOpacity
                  onPress={() => handleItemPress('commerce')}
                  className="bg-black py-4 px-6 items-center"
                  style={{ borderRadius: 8 }}
                >
                  <Text className="text-white text-lg font-semibold">New Sale</Text>
                </TouchableOpacity>
              </View>

              {/* Bottom row with circles and arrow */}
              <View className="flex-row items-center justify-between mt-auto">
                <View className="flex-row">
                  <TouchableOpacity
                    onPress={() => handleItemPress('products')}
                    className="w-12 h-12 bg-yellow-400 items-center justify-center mr-3"
                    style={{ borderRadius: 24 }}
                  >
                    <Text className="text-black text-xl font-bold">P</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleItemPress('items')}
                    className="w-12 h-12 bg-purple-400 items-center justify-center mr-3"
                    style={{ borderRadius: 24 }}
                  >
                    <Text className="text-black text-xl font-bold">I</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleItemPress('reports')}
                    className="w-12 h-12 bg-blue-400 items-center justify-center"
                    style={{ borderRadius: 24 }}
                  >
                    <Text className="text-black text-xl font-bold">R</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  onPress={() => handleItemPress('comlist')}
                  className="w-12 h-12 bg-black items-center justify-center"
                  style={{ borderRadius: 24 }}
                >
                  <Text className="text-white text-xl font-bold">→</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>


        </View>
      </ScrollView>



    </View>
  );
}
