import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, BackHandler, Alert, TextInput, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useStore } from '../lib/store-context';
import { db } from '../lib/instant';
import { id } from '@instantdb/react-native';

interface LocationFormProps {
  location?: any;
  onClose: () => void;
  onSave: () => void;
}

export default function LocationForm({ location, onClose, onSave }: LocationFormProps) {
  const insets = useSafeAreaInsets();
  const { currentStore } = useStore();
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'warehouse',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    },
    isDefault: false,
    isActive: true,
    fulfillsOnlineOrders: true,
    contactInfo: {
      phone: '',
      email: '',
      contactPerson: ''
    }
  });

  useEffect(() => {
    const backAction = () => {
      onClose();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [onClose]);

  useEffect(() => {
    if (location) {
      setFormData({
        name: location.name || '',
        type: location.type || 'warehouse',
        address: location.address || {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: ''
        },
        isDefault: location.isDefault || false,
        isActive: location.isActive !== undefined ? location.isActive : true,
        fulfillsOnlineOrders: location.fulfillsOnlineOrders !== undefined ? location.fulfillsOnlineOrders : true,
        contactInfo: location.contactInfo || {
          phone: '',
          email: '',
          contactPerson: ''
        }
      });
    }
  }, [location]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter a location name');
      return;
    }



    try {
      setLoading(true);
      const timestamp = new Date().toISOString();
      const locationId = location?.id || id();

      const locationData = {
        storeId: currentStore.id,
        name: formData.name.trim(),
        type: formData.type,
        address: formData.address,
        isDefault: formData.isDefault,
        isActive: formData.isActive,
        fulfillsOnlineOrders: formData.fulfillsOnlineOrders,
        contactInfo: formData.contactInfo,
        updatedAt: timestamp,
        ...(location ? {} : { createdAt: timestamp })
      };

      await db.transact([
        db.tx.locations[locationId].update(locationData)
      ]);

      onSave();
    } catch (error) {
      console.error('Failed to save location:', error);
      Alert.alert('Error', 'Failed to save location');
    } finally {
      setLoading(false);
    }
  };

  const locationTypes = [
    { value: 'warehouse', label: 'Warehouse' },
    { value: 'store', label: 'Store' },
    { value: 'office', label: 'Office' },
    { value: 'distribution', label: 'Distribution Center' },
    { value: 'other', label: 'Other' }
  ];

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View style={{ paddingTop: insets.top }} className="bg-white border-b border-gray-200">
        <View className="px-4 py-4">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <Text className="text-xl font-semibold text-gray-900">
              {location ? 'Edit Location' : 'Add Location'}
            </Text>
            <TouchableOpacity 
              onPress={handleSave}
              disabled={loading}
              className={`px-4 py-2 rounded-lg ${loading ? 'bg-gray-300' : 'bg-blue-600'}`}
            >
              <Text className="text-white font-medium">
                {loading ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 py-6">
          {/* Basic Information */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-4">Basic Information</Text>
            
            {/* Name */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">Location Name *</Text>
              <TextInput
                value={formData.name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                placeholder="Enter location name"
                className="border border-gray-300 rounded-lg px-3 py-3 text-base"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Type */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">Type</Text>
              <View className="flex-row flex-wrap gap-2">
                {locationTypes.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    onPress={() => setFormData(prev => ({ ...prev, type: type.value }))}
                    className={`px-3 py-2 rounded-lg border ${
                      formData.type === type.value
                        ? 'bg-blue-50 border-blue-500'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    <Text className={`text-sm ${
                      formData.type === type.value ? 'text-blue-700' : 'text-gray-700'
                    }`}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Address */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-4">Address</Text>
            
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">Street Address</Text>
              <TextInput
                value={formData.address.street}
                onChangeText={(text) => setFormData(prev => ({ 
                  ...prev, 
                  address: { ...prev.address, street: text }
                }))}
                placeholder="Enter street address"
                className="border border-gray-300 rounded-lg px-3 py-3 text-base"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-700 mb-2">City</Text>
                <TextInput
                  value={formData.address.city}
                  onChangeText={(text) => setFormData(prev => ({ 
                    ...prev, 
                    address: { ...prev.address, city: text }
                  }))}
                  placeholder="City"
                  className="border border-gray-300 rounded-lg px-3 py-3 text-base"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-700 mb-2">State</Text>
                <TextInput
                  value={formData.address.state}
                  onChangeText={(text) => setFormData(prev => ({ 
                    ...prev, 
                    address: { ...prev.address, state: text }
                  }))}
                  placeholder="State"
                  className="border border-gray-300 rounded-lg px-3 py-3 text-base"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-700 mb-2">ZIP Code</Text>
                <TextInput
                  value={formData.address.zipCode}
                  onChangeText={(text) => setFormData(prev => ({ 
                    ...prev, 
                    address: { ...prev.address, zipCode: text }
                  }))}
                  placeholder="ZIP"
                  className="border border-gray-300 rounded-lg px-3 py-3 text-base"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-700 mb-2">Country</Text>
                <TextInput
                  value={formData.address.country}
                  onChangeText={(text) => setFormData(prev => ({ 
                    ...prev, 
                    address: { ...prev.address, country: text }
                  }))}
                  placeholder="Country"
                  className="border border-gray-300 rounded-lg px-3 py-3 text-base"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>
          </View>

          {/* Contact Information */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-4">Contact Information</Text>
            
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">Contact Person</Text>
              <TextInput
                value={formData.contactInfo.contactPerson}
                onChangeText={(text) => setFormData(prev => ({ 
                  ...prev, 
                  contactInfo: { ...prev.contactInfo, contactPerson: text }
                }))}
                placeholder="Contact person name"
                className="border border-gray-300 rounded-lg px-3 py-3 text-base"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">Phone</Text>
              <TextInput
                value={formData.contactInfo.phone}
                onChangeText={(text) => setFormData(prev => ({ 
                  ...prev, 
                  contactInfo: { ...prev.contactInfo, phone: text }
                }))}
                placeholder="Phone number"
                className="border border-gray-300 rounded-lg px-3 py-3 text-base"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
              />
            </View>

            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">Email</Text>
              <TextInput
                value={formData.contactInfo.email}
                onChangeText={(text) => setFormData(prev => ({ 
                  ...prev, 
                  contactInfo: { ...prev.contactInfo, email: text }
                }))}
                placeholder="Email address"
                className="border border-gray-300 rounded-lg px-3 py-3 text-base"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Settings */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-4">Settings</Text>
            
            <View className="flex-row items-center justify-between py-3 border-b border-gray-200">
              <View className="flex-1">
                <Text className="text-base font-medium text-gray-900">Default Location</Text>
                <Text className="text-sm text-gray-500">Use as default for new items</Text>
              </View>
              <Switch
                value={formData.isDefault}
                onValueChange={(value) => setFormData(prev => ({ ...prev, isDefault: value }))}
                trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
                thumbColor={formData.isDefault ? '#FFFFFF' : '#FFFFFF'}
              />
            </View>

            <View className="flex-row items-center justify-between py-3 border-b border-gray-200">
              <View className="flex-1">
                <Text className="text-base font-medium text-gray-900">Active</Text>
                <Text className="text-sm text-gray-500">Location is active for inventory</Text>
              </View>
              <Switch
                value={formData.isActive}
                onValueChange={(value) => setFormData(prev => ({ ...prev, isActive: value }))}
                trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
                thumbColor={formData.isActive ? '#FFFFFF' : '#FFFFFF'}
              />
            </View>

            <View className="flex-row items-center justify-between py-3">
              <View className="flex-1">
                <Text className="text-base font-medium text-gray-900">Fulfills Online Orders</Text>
                <Text className="text-sm text-gray-500">Can fulfill online orders</Text>
              </View>
              <Switch
                value={formData.fulfillsOnlineOrders}
                onValueChange={(value) => setFormData(prev => ({ ...prev, fulfillsOnlineOrders: value }))}
                trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
                thumbColor={formData.fulfillsOnlineOrders ? '#FFFFFF' : '#FFFFFF'}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
