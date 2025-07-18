import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useStore } from '../lib/store-context';

interface StoreSelectorProps {
  onCreateStore?: () => void;
  onEditStores?: () => void;
}

export default function StoreSelector({ onCreateStore, onEditStores }: StoreSelectorProps) {
  const { currentStore, stores, setCurrentStore, isLoading } = useStore();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleStoreSelect = async (store: any) => {
    try {
      await setCurrentStore(store);
      setShowDropdown(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to switch store');
    }
  };

  const getStoreInitials = (name: string | undefined) => {
    if (!name) return 'ST';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <View className="bg-white rounded-xl p-4 mx-4 mb-4 border border-gray-200">
        <Text className="text-gray-500">Loading stores...</Text>
      </View>
    );
  }

  if (!currentStore) {
    return (
      <View className="bg-white rounded-xl p-4 mx-4 mb-4 border border-gray-200">
        <TouchableOpacity onPress={onCreateStore} className="flex-row items-center">
          <View className="w-10 h-10 bg-gray-100 rounded-lg items-center justify-center mr-3">
            <Feather name="plus" size={20} color="#6B7280" />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-semibold text-gray-900">Create your first store</Text>
            <Text className="text-gray-600">Get started by creating a store</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <View className="mx-4 mb-4 border-b border-gray-200">
        <TouchableOpacity
          onPress={() => setShowDropdown(true)}
          className="py-4"
        >
          <View className="flex-row items-center">
            {/* Store Avatar */}
            <View className="w-8 h-8 bg-blue-500 rounded items-center justify-center mr-3">
              <Text className="text-white font-semibold text-xs">
                {getStoreInitials(currentStore.name)}
              </Text>
            </View>

            {/* Store Info */}
            <Text className="flex-1 text-lg font-medium text-gray-900">
              {currentStore.name || 'Unnamed Store'}
            </Text>

            {/* Dropdown Arrow */}
            <Feather name="chevron-down" size={20} color="#6B7280" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Store Selection Modal */}
      <Modal
        visible={showDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDropdown(false)}
      >
        <TouchableOpacity 
          className="flex-1 bg-black/50"
          activeOpacity={1}
          onPress={() => setShowDropdown(false)}
        >
          <View className="bg-white rounded-t-3xl mt-auto mx-4 mb-4 max-h-96">
            {/* Header */}
            <View className="p-4 border-b border-gray-200">
              <View className="flex-row items-center justify-between">
                <Text className="text-lg font-semibold text-gray-900">Select Store</Text>
                <TouchableOpacity onPress={() => setShowDropdown(false)}>
                  <Feather name="x" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Store List */}
            <FlatList
              data={stores}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleStoreSelect(item)}
                  className={`py-4 px-4 border-b border-gray-100 ${
                    item.id === currentStore?.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <View className="flex-row items-center">
                    {/* Store Avatar */}
                    <View className="w-8 h-8 bg-blue-500 rounded items-center justify-center mr-3">
                      <Text className="text-white font-semibold text-xs">
                        {getStoreInitials(item.name)}
                      </Text>
                    </View>

                    {/* Store Info */}
                    <Text className="flex-1 text-base font-medium text-gray-900">
                      {item.name}
                    </Text>

                    {/* Selected Indicator */}
                    {item.id === currentStore?.id && (
                      <Feather name="check" size={20} color="#3B82F6" />
                    )}
                  </View>
                </TouchableOpacity>
              )}
            />

            {/* Action Buttons */}
            <View className="p-4 border-t border-gray-200">
              <TouchableOpacity
                onPress={() => {
                  setShowDropdown(false);
                  onCreateStore?.();
                }}
                className="flex-row items-center p-3 mb-2"
              >
                <View className="w-10 h-10 bg-gray-100 rounded-lg items-center justify-center mr-3">
                  <Feather name="plus" size={20} color="#6B7280" />
                </View>
                <Text className="text-base font-medium text-gray-900">Add store</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setShowDropdown(false);
                  onEditStores?.();
                }}
                className="flex-row items-center p-3"
              >
                <View className="w-10 h-10 bg-gray-100 rounded-lg items-center justify-center mr-3">
                  <Feather name="edit-2" size={20} color="#6B7280" />
                </View>
                <Text className="text-base font-medium text-gray-900">Edit stores</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
