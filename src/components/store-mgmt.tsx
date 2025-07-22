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
  // Store management is no longer available since stores are not in the schema
  const [showForm, setShowForm] = useState(false);

  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      // If store form is open, close it
      if (showForm) {
        setShowForm(false);
        return true;
      }
      // Otherwise close store management
      onClose();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [showForm, onClose]);

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

      {/* Store management no longer available */}
      <View className="flex-1 justify-center items-center p-8">
        <Feather name="store" size={48} color="#9CA3AF" />
        <Text className="text-lg font-medium text-gray-900 mt-4 mb-2">Store Management Unavailable</Text>
        <Text className="text-gray-500 text-center">
          Store management has been simplified. The app now operates as a single-store system.
        </Text>
      </View>
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
