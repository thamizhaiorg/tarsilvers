import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useStore } from '../lib/store-context';

interface StoreSelectorProps {
  onCreateStore?: () => void;
  onEditStores?: () => void;
}

export default function StoreSelector({ onCreateStore, onEditStores }: StoreSelectorProps) {
  // Since stores are no longer supported in the schema, this component shows a simplified view
  const { isLoading } = useStore();

  if (isLoading) {
    return (
      <View className="bg-white rounded-xl p-4 mx-4 mb-4 border border-gray-200">
        <Text className="text-gray-500">Loading...</Text>
      </View>
    );
  }

  // Since stores are no longer supported, show a simplified single-store view
  return (
    <View className="mx-4 mb-4 border-b border-gray-200">
      <View className="py-4">
        <View className="flex-row items-center">
          {/* Store Avatar */}
          <View className="w-8 h-8 bg-blue-500 rounded items-center justify-center mr-3">
            <Text className="text-white font-semibold text-xs">
              SS
            </Text>
          </View>

          {/* Store Info */}
          <Text className="flex-1 text-lg font-medium text-gray-900">
            Single Store
          </Text>
        </View>
      </View>
    </View>
  );
}
