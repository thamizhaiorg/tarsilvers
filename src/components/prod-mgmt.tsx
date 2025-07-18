import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProductsManagementScreen() {
  const insets = useSafeAreaInsets();

  const managementOptions = [
    {
      id: 'bulk-edit',
      title: 'Bulk Edit Products',
      description: 'Edit multiple products at once',
      icon: '📝',
      color: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    {
      id: 'import-export',
      title: 'Import/Export',
      description: 'Import or export product data',
      icon: '📊',
      color: 'bg-green-50',
      textColor: 'text-green-600'
    },
    {
      id: 'categories',
      title: 'Manage Categories',
      description: 'Organize product categories',
      icon: '🏷️',
      color: 'bg-purple-50',
      textColor: 'text-purple-600'
    },
    {
      id: 'inventory',
      title: 'Inventory Management',
      description: 'Track and manage stock levels',
      icon: '📦',
      color: 'bg-orange-50',
      textColor: 'text-orange-600'
    },
    {
      id: 'pricing',
      title: 'Pricing Rules',
      description: 'Set up pricing and discounts',
      icon: '💰',
      color: 'bg-yellow-50',
      textColor: 'text-yellow-600'
    },
    {
      id: 'analytics',
      title: 'Product Analytics',
      description: 'View product performance data',
      icon: '📈',
      color: 'bg-indigo-50',
      textColor: 'text-indigo-600'
    }
  ];

  const handleOptionPress = (optionId: string) => {
    console.log('Management option pressed:', optionId);
    // Handle navigation to specific management screens
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-4 py-3">
        <Text className="text-lg font-semibold text-gray-900">Products Management</Text>
        <Text className="text-sm text-gray-500 mt-1">Manage your products and inventory</Text>
      </View>

      {/* Management Options */}
      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-4">
          {managementOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              onPress={() => handleOptionPress(option.id)}
              className="bg-white p-4"
            >
              <View className="flex-row items-center">
                <View className={`w-12 h-12 ${option.color} items-center justify-center mr-4`}>
                  <Text className="text-xl">{option.icon}</Text>
                </View>
                
                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-900 mb-1">
                    {option.title}
                  </Text>
                  <Text className="text-sm text-gray-500">
                    {option.description}
                  </Text>
                </View>
                
                <View className="ml-2">
                  <Text className="text-gray-400 text-lg">›</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Stats */}
        <View className="mt-6">
          <Text className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</Text>
          <View className="bg-white p-4">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-sm text-gray-500">Total Products</Text>
              <Text className="text-lg font-bold text-gray-900">1,247</Text>
            </View>
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-sm text-gray-500">Low Stock Items</Text>
              <Text className="text-lg font-bold text-red-600">23</Text>
            </View>
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-sm text-gray-500">Out of Stock</Text>
              <Text className="text-lg font-bold text-red-600">5</Text>
            </View>
            <View className="flex-row justify-between items-center">
              <Text className="text-sm text-gray-500">Categories</Text>
              <Text className="text-lg font-bold text-gray-900">18</Text>
            </View>
          </View>
        </View>

        {/* Recent Activity */}
        <View className="mt-6">
          <Text className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</Text>
          <View className="bg-white p-4">
            <View className="space-y-3">
              <View className="flex-row items-center">
                <View className="w-2 h-2 bg-green-500 mr-3"></View>
                <Text className="text-sm text-gray-600 flex-1">5 products added today</Text>
                <Text className="text-xs text-gray-400">2h ago</Text>
              </View>
              <View className="flex-row items-center">
                <View className="w-2 h-2 bg-blue-500 mr-3"></View>
                <Text className="text-sm text-gray-600 flex-1">Inventory updated for Electronics</Text>
                <Text className="text-xs text-gray-400">4h ago</Text>
              </View>
              <View className="flex-row items-center">
                <View className="w-2 h-2 bg-orange-500 mr-3"></View>
                <Text className="text-sm text-gray-600 flex-1">Price changes applied to 12 items</Text>
                <Text className="text-xs text-gray-400">1d ago</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Bottom spacing for safe area */}
        <View style={{ height: Math.max(24, insets.bottom) }} />
      </ScrollView>
    </View>
  );
}
