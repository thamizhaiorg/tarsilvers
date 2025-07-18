import React from 'react';
import { View, Text } from 'react-native';
import { MainScreen } from '../nav';

interface PeopleContentProps {
  currentScreen: MainScreen;
}

export default function PeopleContent({ currentScreen }: PeopleContentProps) {

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white p-4">
        <Text className="text-xl font-bold text-gray-900 mb-1">Team</Text>
        <Text className="text-gray-600 capitalize">{currentScreen} Context</Text>
      </View>

      {/* Coming Soon Message */}
      <View className="flex-1 justify-center items-center p-8">
        <View className="items-center">
          <View className="w-16 h-16 bg-orange-100 items-center justify-center mb-4">
            <Text className="text-2xl">👥</Text>
          </View>
          <Text className="text-lg font-medium text-gray-900 mb-2">Team Management</Text>
          <Text className="text-gray-500 text-center">
            Team features will be integrated with your Instant DB data
          </Text>
        </View>
      </View>
    </View>
  );
}
