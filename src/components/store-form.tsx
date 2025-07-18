import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView, BackHandler } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Input from './ui/Input';
import Button from './ui/Button';
import { useStore } from '../lib/store-context';

interface StoreFormProps {
  store?: any;
  onClose: () => void;
  onSave?: () => void;
}

export default function StoreForm({ store, onClose, onSave }: StoreFormProps) {
  const insets = useSafeAreaInsets();
  const { createStore, updateStore } = useStore();
  const isEditing = !!store;

  const [formData, setFormData] = useState({
    name: store?.name || '',
    description: store?.description || '',
    email: store?.email || '',
    phone: store?.phone || '',
    address: store?.address || '',
    website: store?.website || '',
  });

  const [loading, setLoading] = useState(false);

  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      onClose();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [onClose]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Store name is required');
      return;
    }

    setLoading(true);
    try {
      if (isEditing) {
        await updateStore(store.id, formData);
        Alert.alert('Success', 'Store updated successfully');
      } else {
        await createStore(formData);
        Alert.alert('Success', 'Store created successfully');
      }
      onSave?.();
      onClose();
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to save store');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
        <TouchableOpacity onPress={onClose}>
          <Feather name="x" size={24} color="#6B7280" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900">
          {isEditing ? 'Edit Store' : 'Create Store'}
        </Text>
        <View className="w-6" />
      </View>

      <ScrollView className="flex-1 p-4">
        <View className="space-y-4">
          {/* Store Name */}
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Store Name *
            </Text>
            <Input
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Enter store name"
              autoCapitalize="words"
            />
          </View>

          {/* Description */}
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Description
            </Text>
            <Input
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              placeholder="Brief description of your store"
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Email */}
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Email
            </Text>
            <Input
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              placeholder="store@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Phone */}
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Phone
            </Text>
            <Input
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              placeholder="+1 (555) 123-4567"
              keyboardType="phone-pad"
            />
          </View>

          {/* Address */}
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Address
            </Text>
            <Input
              value={formData.address}
              onChangeText={(text) => setFormData({ ...formData, address: text })}
              placeholder="Store address"
              multiline
              numberOfLines={2}
            />
          </View>

          {/* Website */}
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Website
            </Text>
            <Input
              value={formData.website}
              onChangeText={(text) => setFormData({ ...formData, website: text })}
              placeholder="https://yourstore.com"
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View className="p-4 border-t border-gray-200" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
        <Button
          title={isEditing ? 'Update Store' : 'Create Store'}
          onPress={handleSave}
          loading={loading}
          disabled={!formData.name.trim()}
        />
      </View>
    </View>
  );
}
