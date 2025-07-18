import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Card from './ui/Card';

interface SpaceScreenProps {
  onOpenMenu?: () => void;
}

export default function SpaceScreen({ onOpenMenu }: SpaceScreenProps) {
  // Marketplace categories data
  const marketplaceCategories = [
    {
      id: 'products',
      title: 'Products',
      emoji: '🛍️',
      description: 'Browse and manage products',
      color: 'bg-white',
      textColor: 'text-gray-900'
    },
    {
      id: 'food',
      title: 'Food & Dining',
      emoji: '🍕',
      description: 'Restaurant and food services',
      color: 'bg-white',
      textColor: 'text-gray-900'
    },
    {
      id: 'cars',
      title: 'Car Rentals',
      emoji: '🚗',
      description: 'Vehicle booking and rentals',
      color: 'bg-white',
      textColor: 'text-gray-900'
    },
    {
      id: 'bookings',
      title: 'Bookings',
      emoji: '📅',
      description: 'Appointments and reservations',
      color: 'bg-white',
      textColor: 'text-gray-900'
    },
    {
      id: 'services',
      title: 'Services',
      emoji: '🔧',
      description: 'Professional services',
      color: 'bg-white',
      textColor: 'text-gray-900'
    },
    {
      id: 'events',
      title: 'Events',
      emoji: '🎉',
      description: 'Event planning and tickets',
      color: 'bg-white',
      textColor: 'text-gray-900'
    }
  ];

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Categories Grid */}
        <View className="px-4 pt-6">
          <View className="flex-row flex-wrap justify-between mb-6">
            {marketplaceCategories.map((category, index) => (
              <TouchableOpacity
                key={category.id}
                className={`w-[48%] mb-4 ${category.color} p-4`}
              >
                <Text className="text-3xl mb-3">{category.emoji}</Text>
                <Text className={`text-lg font-semibold ${category.textColor} mb-1`}>
                  {category.title}
                </Text>
                <Text className="text-gray-600 text-sm">
                  {category.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
