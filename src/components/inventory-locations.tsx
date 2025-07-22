import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, BackHandler, Alert, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

import { db } from '../lib/instant';
import { id } from '@instantdb/react-native';

interface Location {
  id: string;
  storeId: string;
  name: string;
  type: string;
  isDefault: boolean;
  isActive: boolean;
  fulfillsOnlineOrders: boolean;
  createdAt: string;
  updatedAt: string;
}

interface InventoryLocationsProps {
  onClose: () => void;
}

export default function InventoryLocations({ onClose }: InventoryLocationsProps) {
  const insets = useSafeAreaInsets();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationType, setNewLocationType] = useState('warehouse');

  useEffect(() => {
    const backAction = () => {
      onClose();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [onClose]);

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      setLoading(true);
      const result = await db.queryOnce({
        locations: {}
      });

      setLocations(result.data?.locations || []);
    } catch (error) {
      console.error('Failed to load locations:', error);
      Alert.alert('Error', 'Failed to load locations');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLocation = async () => {
    if (!newLocationName.trim()) {
      Alert.alert('Error', 'Please enter a location name');
      return;
    }

    try {
      const locationId = id();
      const timestamp = new Date().toISOString();

      const locationData = {
        name: newLocationName.trim(),
        type: newLocationType,
        isDefault: locations.length === 0, // First location is default
        isActive: true,
        fulfillsOnlineOrders: true,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      await db.transact([
        db.tx.locations[locationId].update(locationData)
      ]);

      setNewLocationName('');
      setNewLocationType('warehouse');
      setShowAddForm(false);
      loadLocations();
    } catch (error) {
      console.error('Failed to add location:', error);
      Alert.alert('Error', 'Failed to add location');
    }
  };

  const handleDeleteLocation = async (location: Location) => {
    if (location.isDefault) {
      Alert.alert('Error', 'Cannot delete the default location');
      return;
    }

    Alert.alert(
      'Delete Location',
      `Are you sure you want to delete "${location.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await db.transact([
                db.tx.locations[location.id].delete()
              ]);
              loadLocations();
            } catch (error) {
              console.error('Failed to delete location:', error);
              Alert.alert('Error', 'Failed to delete location');
            }
          }
        }
      ]
    );
  };

  const handleToggleActive = async (location: Location) => {
    if (location.isDefault && location.isActive) {
      Alert.alert('Error', 'Cannot deactivate the default location');
      return;
    }

    try {
      await db.transact([
        db.tx.locations[location.id].update({
          isActive: !location.isActive,
          updatedAt: new Date().toISOString()
        })
      ]);
      loadLocations();
    } catch (error) {
      console.error('Failed to update location:', error);
      Alert.alert('Error', 'Failed to update location');
    }
  };

  const getLocationTypeIcon = (type: string) => {
    switch (type) {
      case 'warehouse':
        return 'warehouse';
      case 'retail':
        return 'store';
      case 'virtual':
        return 'cloud';
      default:
        return 'location-on';
    }
  };

  const getLocationTypeColor = (type: string) => {
    switch (type) {
      case 'warehouse':
        return 'text-blue-600';
      case 'retail':
        return 'text-green-600';
      case 'virtual':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  };

  if (showAddForm) {
    return (
      <View className="flex-1 bg-white">
        {/* Header */}
        <View style={{ paddingTop: insets.top }} className="bg-white">
          <View className="px-4 py-4">
            <View className="flex-row items-center justify-between">
              <TouchableOpacity onPress={() => setShowAddForm(false)}>
                <MaterialIcons name="arrow-back" size={24} color="#6B7280" />
              </TouchableOpacity>
              <Text className="text-xl font-semibold text-gray-900">Add Location</Text>
              <View style={{ width: 24 }} />
            </View>
          </View>
        </View>

        <ScrollView className="flex-1 px-4 pt-6">
          <View className="mb-6">
            <Text className="text-base font-medium text-gray-900 mb-2">Location Name</Text>
            <TextInput
              value={newLocationName}
              onChangeText={setNewLocationName}
              placeholder="Enter location name"
              className="border border-gray-300 rounded-lg px-4 py-3 text-base"
              autoFocus
            />
          </View>

          <View className="mb-6">
            <Text className="text-base font-medium text-gray-900 mb-2">Location Type</Text>
            <View className="space-y-2">
              {[
                { value: 'warehouse', label: 'Warehouse', icon: 'warehouse' },
                { value: 'retail', label: 'Retail Store', icon: 'store' },
                { value: 'virtual', label: 'Virtual Location', icon: 'cloud' }
              ].map((type) => (
                <TouchableOpacity
                  key={type.value}
                  onPress={() => setNewLocationType(type.value)}
                  className={`flex-row items-center p-4 border rounded-lg ${
                    newLocationType === type.value ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                  }`}
                >
                  <MaterialIcons 
                    name={type.icon as keyof typeof MaterialIcons.glyphMap} 
                    size={24} 
                    color={newLocationType === type.value ? '#3B82F6' : '#6B7280'} 
                  />
                  <Text className={`ml-3 text-base ${
                    newLocationType === type.value ? 'text-blue-600 font-medium' : 'text-gray-900'
                  }`}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            onPress={handleAddLocation}
            className="bg-blue-600 py-4 rounded-lg"
            disabled={!newLocationName.trim()}
          >
            <Text className="text-white text-center font-medium text-base">
              Add Location
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View style={{ paddingTop: insets.top }} className="bg-white">
        <View className="px-4 py-4">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="arrow-back" size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text className="text-xl font-semibold text-gray-900">Locations</Text>
            <TouchableOpacity onPress={() => setShowAddForm(true)}>
              <MaterialIcons name="add" size={24} color="#3B82F6" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 pb-8">
          {loading ? (
            <View className="flex-1 items-center justify-center py-12">
              <Text className="text-gray-500">Loading locations...</Text>
            </View>
          ) : locations.length === 0 ? (
            <View className="flex-1 items-center justify-center py-12">
              <MaterialIcons name="location-off" size={64} color="#D1D5DB" />
              <Text className="text-lg font-medium text-gray-900 mt-4 mb-2">No locations yet</Text>
              <Text className="text-gray-600 text-center mb-6">
                Add your first location to start tracking inventory
              </Text>
              <TouchableOpacity
                onPress={() => setShowAddForm(true)}
                className="bg-blue-600 px-6 py-3 rounded-lg"
              >
                <Text className="text-white font-medium">Add Location</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              {locations.map((location) => (
                <View key={location.id} className="bg-white border border-gray-200 rounded-lg p-4 mb-3">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <View className="flex-row items-center mb-2">
                        <MaterialIcons 
                          name={getLocationTypeIcon(location.type) as keyof typeof MaterialIcons.glyphMap} 
                          size={20} 
                          className={getLocationTypeColor(location.type)}
                        />
                        <Text className="text-base font-medium text-gray-900 ml-2">
                          {location.name}
                        </Text>
                        {location.isDefault && (
                          <View className="bg-blue-100 px-2 py-1 rounded ml-2">
                            <Text className="text-xs text-blue-600 font-medium">Default</Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-sm text-gray-600 capitalize">
                        {location.type} • {location.isActive ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <TouchableOpacity
                        onPress={() => handleToggleActive(location)}
                        className="p-2"
                      >
                        <MaterialIcons 
                          name={location.isActive ? 'toggle-on' : 'toggle-off'} 
                          size={24} 
                          color={location.isActive ? '#10B981' : '#6B7280'} 
                        />
                      </TouchableOpacity>
                      {!location.isDefault && (
                        <TouchableOpacity
                          onPress={() => handleDeleteLocation(location)}
                          className="p-2 ml-2"
                        >
                          <MaterialIcons name="delete" size={20} color="#EF4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
