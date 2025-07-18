import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, BackHandler } from 'react-native';
import { useStore } from '../lib/store-context';
import { useAuth } from '../lib/auth-context';
import { db } from '../lib/instant';

type StorefrontScreen = 'site-settings' | 'theme-design' | 'online-orders' | 'seo-marketing' | 'analytics' | 'domain-settings';

interface StorefrontProps {
  onNavigate: (screen: StorefrontScreen) => void;
  onClose: () => void;
}

export default function Storefront({ onNavigate, onClose }: StorefrontProps) {
  const { currentStore } = useStore();
  const [storefrontMetrics, setStorefrontMetrics] = useState({ 
    onlineOrders: 0, 
    siteVisitors: 0, 
    conversionRate: 0 
  });

  // Storefront status and notification data
  const storefrontData = {
    siteNotifications: [
      { type: 'visitor', message: 'New visitor from Google', time: '5 mins' },
      { type: 'order', message: 'Online order received', time: '12 mins' }
    ]
  };

  // Fetch storefront data with optimized schema
  const { data: storefrontOrdersData } = db.useQuery({
    orders: {
      $: {
        where: {
          storeId: currentStore?.id || '',
          source: 'online', // Filter for online orders only
        },
        order: {
          createdAt: 'desc'
        }
      },
    },
  });

  // Calculate storefront metrics
  useEffect(() => {
    if (storefrontOrdersData?.orders) {
      const onlineOrders = storefrontOrdersData.orders.length;
      const siteVisitors = Math.floor(onlineOrders * 4.2); // Estimated visitors based on conversion
      const conversionRate = onlineOrders > 0 ? ((onlineOrders / siteVisitors) * 100) : 0;
      setStorefrontMetrics({ onlineOrders, siteVisitors, conversionRate });
    }
  }, [storefrontOrdersData]);

  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      onClose();
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => {
      backHandler.remove();
    };
  }, [onClose]);

  const handleItemPress = (itemId: string) => {
    // Handle special cases
    if (itemId === 'analytics') {
      onNavigate('analytics' as StorefrontScreen);
    } else if (itemId === 'storefront-settings') {
      // Close menu and navigate to site settings
      onClose();
      onNavigate('site-settings' as StorefrontScreen);
    } else {
      onNavigate(itemId as StorefrontScreen);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-6">
          {/* Analytics Card - White */}
          <TouchableOpacity
            onPress={() => handleItemPress('analytics')}
            className="bg-white p-4 mb-1"
            style={{ minHeight: 120 }}
          >
            <View className="flex-1">
              <Text className="text-black text-2xl font-bold mb-2">Analytics</Text>
              <Text className="text-gray-500 text-xl font-bold">
                {storefrontData.siteNotifications.length > 0
                  ? storefrontData.siteNotifications[0].message
                  : 'New visitor from Google'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Storefront Card - Light White */}
          <View
            className="p-6"
            style={{ minHeight: 504, borderRadius: 10, backgroundColor: '#F5F5F5' }}
          >
            <View className="flex-1">
              {/* Header */}
              <View className="mb-4">
                <View className="flex-row items-center justify-start mb-3">
                  <TouchableOpacity 
                    onPress={() => handleItemPress('domain-settings')}
                    className="px-3 py-1 border border-gray-300"
                    style={{ borderRadius: 6 }}
                  >
                    <Text className="text-green-800 text-sm">
                      {currentStore?.name?.toLowerCase().replace(/\s+/g, '') || 'storea'}.mystore.com
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Storefront Metrics */}
              <View className="mb-6">
                <View className="flex-row justify-between mb-4">
                  <View>
                    <Text className="text-gray-600 text-sm">Online Orders</Text>
                    <Text className="text-black text-2xl font-bold">
                      {storefrontMetrics.onlineOrders}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-gray-600 text-sm">Site Visitors</Text>
                    <Text className="text-black text-2xl font-bold">{storefrontMetrics.siteVisitors}</Text>
                  </View>
                </View>
                
                {/* Launch Site Button */}
                <TouchableOpacity
                  onPress={() => handleItemPress('storefront-settings')}
                  className="bg-black py-4 px-6 items-center"
                  style={{ borderRadius: 8 }}
                >
                  <Text className="text-white text-lg font-semibold">Launch Site</Text>
                </TouchableOpacity>
              </View>

              {/* Bottom row with circles and arrow */}
              <View className="flex-row items-center justify-between mt-auto">
                <View className="flex-row">
                  <TouchableOpacity
                    onPress={() => handleItemPress('site-settings')}
                    className="w-12 h-12 bg-blue-400 items-center justify-center mr-3"
                    style={{ borderRadius: 24 }}
                  >
                    <Text className="text-black text-xl font-bold">S</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleItemPress('theme-design')}
                    className="w-12 h-12 bg-purple-400 items-center justify-center mr-3"
                    style={{ borderRadius: 24 }}
                  >
                    <Text className="text-black text-xl font-bold">T</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleItemPress('online-orders')}
                    className="w-12 h-12 bg-green-400 items-center justify-center"
                    style={{ borderRadius: 24 }}
                  >
                    <Text className="text-black text-xl font-bold">O</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  onPress={() => handleItemPress('seo-marketing')}
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