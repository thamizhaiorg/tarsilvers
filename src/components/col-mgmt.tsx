import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CollectionsManagementScreen() {
  const insets = useSafeAreaInsets();

  const managementOptions = [
    {
      id: 'create-collection',
      title: 'Create Collection',
      description: 'Set up new product collections',
      icon: '➕',
      color: 'bg-green-50',
      textColor: 'text-green-600'
    },
    {
      id: 'bulk-manage',
      title: 'Bulk Management',
      description: 'Manage multiple collections at once',
      icon: '📋',
      color: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    {
      id: 'collection-rules',
      title: 'Collection Rules',
      description: 'Set up automatic collection rules',
      icon: '⚙️',
      color: 'bg-purple-50',
      textColor: 'text-purple-600'
    },
    {
      id: 'featured-collections',
      title: 'Featured Collections',
      description: 'Manage featured and promoted collections',
      icon: '⭐',
      color: 'bg-yellow-50',
      textColor: 'text-yellow-600'
    },
    {
      id: 'collection-analytics',
      title: 'Collection Analytics',
      description: 'View collection performance data',
      icon: '📊',
      color: 'bg-indigo-50',
      textColor: 'text-indigo-600'
    },
    {
      id: 'seasonal-collections',
      title: 'Seasonal Collections',
      description: 'Manage seasonal and time-based collections',
      icon: '🗓️',
      color: 'bg-orange-50',
      textColor: 'text-orange-600'
    }
  ];

  const handleOptionPress = (optionId: string) => {
    console.log('Collection management option pressed:', optionId);
    // Handle navigation to specific management screens
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-4 py-3 border-b border-gray-200">
        <Text className="text-lg font-semibold text-gray-900">Collections Management</Text>
        <Text className="text-sm text-gray-500 mt-1">Organize and manage your product collections</Text>
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
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
            >
              <View className="flex-row items-center">
                <View className={`w-12 h-12 rounded-lg ${option.color} items-center justify-center mr-4`}>
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
          <Text className="text-lg font-semibold text-gray-900 mb-4">Collection Overview</Text>
          <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-sm text-gray-500">Total Collections</Text>
              <Text className="text-lg font-bold text-gray-900">42</Text>
            </View>
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-sm text-gray-500">Active Collections</Text>
              <Text className="text-lg font-bold text-green-600">38</Text>
            </View>
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-sm text-gray-500">Featured Collections</Text>
              <Text className="text-lg font-bold text-blue-600">8</Text>
            </View>
            <View className="flex-row justify-between items-center">
              <Text className="text-sm text-gray-500">Seasonal Collections</Text>
              <Text className="text-lg font-bold text-orange-600">6</Text>
            </View>
          </View>
        </View>

        {/* Top Performing Collections */}
        <View className="mt-6">
          <Text className="text-lg font-semibold text-gray-900 mb-4">Top Performing Collections</Text>
          <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <View className="space-y-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 bg-blue-100 rounded-lg items-center justify-center mr-3">
                    <Text className="text-lg">📱</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-gray-900">Electronics</Text>
                    <Text className="text-xs text-gray-500">156 products</Text>
                  </View>
                </View>
                <Text className="text-sm font-bold text-green-600">+24%</Text>
              </View>
              
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 bg-green-100 rounded-lg items-center justify-center mr-3">
                    <Text className="text-lg">👕</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-gray-900">Clothing</Text>
                    <Text className="text-xs text-gray-500">89 products</Text>
                  </View>
                </View>
                <Text className="text-sm font-bold text-green-600">+18%</Text>
              </View>
              
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 bg-purple-100 rounded-lg items-center justify-center mr-3">
                    <Text className="text-lg">🏠</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-gray-900">Home & Garden</Text>
                    <Text className="text-xs text-gray-500">67 products</Text>
                  </View>
                </View>
                <Text className="text-sm font-bold text-green-600">+12%</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Recent Activity */}
        <View className="mt-6">
          <Text className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</Text>
          <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <View className="space-y-3">
              <View className="flex-row items-center">
                <View className="w-2 h-2 bg-green-500 rounded-full mr-3"></View>
                <Text className="text-sm text-gray-600 flex-1">"Summer Sale" collection created</Text>
                <Text className="text-xs text-gray-400">1h ago</Text>
              </View>
              <View className="flex-row items-center">
                <View className="w-2 h-2 bg-blue-500 rounded-full mr-3"></View>
                <Text className="text-sm text-gray-600 flex-1">Electronics collection updated</Text>
                <Text className="text-xs text-gray-400">3h ago</Text>
              </View>
              <View className="flex-row items-center">
                <View className="w-2 h-2 bg-purple-500 rounded-full mr-3"></View>
                <Text className="text-sm text-gray-600 flex-1">Featured collections reordered</Text>
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
