import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, BackHandler } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useStore } from '../lib/store-context';
import StoreForm from './store-form';

interface StoreManagementProps {
  onClose: () => void;
}

export default function StoreManagement({ onClose }: StoreManagementProps) {
  const insets = useSafeAreaInsets();
  const { stores, currentStore, setCurrentStore } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [editingStore, setEditingStore] = useState<any>(null);

  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      // If store form is open, close it
      if (showForm) {
        setShowForm(false);
        setEditingStore(null);
        return true;
      }
      // Otherwise close store management
      onClose();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [showForm, onClose]);

  const getStoreInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleEditStore = (store: any) => {
    setEditingStore(store);
    setShowForm(true);
  };

  const handleStoreSelect = async (store: any) => {
    try {
      await setCurrentStore(store);
      onClose(); // Close the manage stores screen after selection
    } catch (error) {
      console.error('Failed to switch store:', error);
    }
  };

  if (showForm) {
    return (
      <StoreForm
        store={editingStore}
        onClose={() => {
          setShowForm(false);
          setEditingStore(null);
        }}
        onSave={() => {
          setShowForm(false);
          setEditingStore(null);
        }}
      />
    );
  }

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
        <Text className="text-lg font-medium text-gray-900">Commerce</Text>
        <TouchableOpacity onPress={() => setShowForm(true)}>
          <Feather name="plus" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      {/* Store List */}
      <FlatList
        data={stores}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handleStoreSelect(item)}
            onLongPress={() => handleEditStore(item)}
            className={`px-4 py-4 border-b border-gray-100 ${
              item.id === currentStore?.id ? 'bg-gray-50' : 'bg-white'
            }`}
          >
            <View className="flex-row items-center">
              {/* Store Info */}
              <View className="flex-1">
                <Text className={`text-base ${
                  item.id === currentStore?.id ? 'font-medium text-blue-600' : 'font-normal text-gray-900'
                }`}>
                  {item.name}
                </Text>
              </View>

              {/* Active Indicator */}
              {item.id === currentStore?.id && (
                <View className="w-2 h-2 bg-blue-500 rounded-full" />
              )}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View className="p-8 items-center">
            <Text className="text-gray-500 text-center">
              No stores found
            </Text>
          </View>
        }
      />
    </View>
  );
}
