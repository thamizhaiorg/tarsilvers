import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, BackHandler, Alert, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

import { db } from '../lib/instant';
import { id } from '@instantdb/react-native';
import { updateItemTotals, createInventoryAdjustment, getActiveLocations } from '../lib/inventory-setup';

interface Item {
  id: string;
  storeId: string;
  productId: string;
  sku: string;
  option1?: string;
  option2?: string;
  option3?: string;
}

interface ItemLocation {
  id: string;
  itemId: string;
  locationId: string;
  storeId: string;
  onHand: number;
  committed: number;
  unavailable: number;
  location?: {
    id: string;
    name: string;
    type: string;
  };
}

interface Location {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
}

interface EditItemLocationsProps {
  item: Item;
  itemLocations: ItemLocation[];
  onClose: () => void;
}

export default function EditItemLocations({ item, itemLocations, onClose }: EditItemLocationsProps) {
  const insets = useSafeAreaInsets();
  const [locations, setLocations] = useState<Location[]>([]);
  const [stockLevels, setStockLevels] = useState<{ [locationId: string]: { onHand: number; committed: number; unavailable: number } }>({});
  const [originalStockLevels, setOriginalStockLevels] = useState<{ [locationId: string]: { onHand: number; committed: number; unavailable: number } }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const backAction = () => {
      onClose();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [onClose]);

  useEffect(() => {
    loadData();
  }, []); // No dependency on currentStore since it no longer exists

  const loadData = async () => {

    try {
      setLoading(true);
      
      // Get all active locations
      const storeLocations = await getActiveLocations();
      setLocations(storeLocations);

      // Initialize stock levels
      const initialStockLevels: { [locationId: string]: { onHand: number; committed: number; unavailable: number } } = {};
      
      storeLocations.forEach(location => {
        const existingLocation = itemLocations.find(il => il.locationId === location.id);
        initialStockLevels[location.id] = {
          onHand: existingLocation?.onHand || 0,
          committed: existingLocation?.committed || 0,
          unavailable: existingLocation?.unavailable || 0
        };
      });

      setStockLevels(initialStockLevels);
      setOriginalStockLevels({ ...initialStockLevels });
    } catch (error) {
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const updateStockLevel = (locationId: string, field: 'onHand' | 'committed' | 'unavailable', value: string) => {
    const numValue = parseInt(value) || 0;
    setStockLevels(prev => ({
      ...prev,
      [locationId]: {
        ...prev[locationId],
        [field]: numValue
      }
    }));
  };

  const calculateAvailable = (locationId: string): number => {
    const stock = stockLevels[locationId];
    if (!stock) return 0;
    return stock.onHand - stock.committed - stock.unavailable;
  };

  const hasChanges = (): boolean => {
    return Object.keys(stockLevels).some(locationId => {
      const current = stockLevels[locationId];
      const original = originalStockLevels[locationId];
      return current.onHand !== original.onHand ||
             current.committed !== original.committed ||
             current.unavailable !== original.unavailable;
    });
  };

  const handleSave = async () => {
    if (!hasChanges()) {
      onClose();
      return;
    }

    try {
      setSaving(true);
      const transactions = [];
      const timestamp = new Date().toISOString();

      for (const locationId of Object.keys(stockLevels)) {
        const current = stockLevels[locationId];
        const original = originalStockLevels[locationId];
        
        // Check if this location has changes
        if (current.onHand !== original.onHand ||
            current.committed !== original.committed ||
            current.unavailable !== original.unavailable) {
          
          // Find existing item location record
          const existingItemLocation = itemLocations.find(il => il.locationId === locationId);
          
          if (existingItemLocation) {
            // Update existing record
            transactions.push(
              db.tx.itemLocations[existingItemLocation.id].update({
                onHand: current.onHand,
                committed: current.committed,
                unavailable: current.unavailable,
                updatedAt: timestamp
              })
            );
          } else {
            // Create new record
            const itemLocationId = id();
            transactions.push(
              db.tx.itemLocations[itemLocationId].update({
                itemId: item.id,
                locationId: locationId,
                onHand: current.onHand,
                committed: current.committed,
                unavailable: current.unavailable,
                updatedAt: timestamp
              })
            );
          }

          // Create adjustment record for onHand changes
          if (current.onHand !== original.onHand) {
            await createInventoryAdjustment(
              item.id,
              locationId,
              original.onHand,
              current.onHand,
              'adjustment',
              'Manual adjustment',
              undefined,
              'Stock level updated via edit locations'
            );
          }
        }
      }

      if (transactions.length > 0) {
        await db.transact(transactions);
        
        // Update item totals
        await updateItemTotals(item.id);
      }

      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to save stock levels');
    } finally {
      setSaving(false);
    }
  };

  const getVariantDisplay = (): string => {
    const variants = [item.option1, item.option2, item.option3]
      .filter(Boolean)
      .join(' / ');
    return variants || 'No variants';
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white">
        <View style={{ paddingTop: insets.top }} className="bg-white">
          <View className="px-4 py-4">
            <View className="flex-row items-center justify-between">
              <TouchableOpacity onPress={onClose}>
                <MaterialIcons name="arrow-back" size={24} color="#6B7280" />
              </TouchableOpacity>
              <Text className="text-xl font-semibold text-gray-900">Edit locations</Text>
              <View style={{ width: 24 }} />
            </View>
          </View>
        </View>
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500">Loading...</Text>
        </View>
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
            <Text className="text-xl font-semibold text-gray-900">Edit locations</Text>
            <View style={{ width: 24 }} />
          </View>
          <Text className="text-center text-gray-600 mt-1">{getVariantDisplay()}</Text>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 pb-8">
          {/* Header Row */}
          <View className="flex-row justify-between items-center py-3 border-b border-gray-200 mb-4">
            <Text className="text-sm font-medium text-gray-900">Location</Text>
            <Text className="text-sm font-medium text-gray-900">Available</Text>
          </View>

          {/* Location List */}
          {locations.map((location) => (
            <View key={location.id} className="mb-6">
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-base font-medium text-gray-900">{location.name}</Text>
                <Text className="text-base text-gray-900">
                  {calculateAvailable(location.id)}
                </Text>
              </View>
              
              <View className="bg-gray-50 rounded-lg p-4">
                <View className="flex-row justify-between mb-3">
                  <View className="flex-1 mr-2">
                    <Text className="text-sm text-gray-600 mb-1">On hand</Text>
                    <TextInput
                      value={stockLevels[location.id]?.onHand?.toString() || '0'}
                      onChangeText={(value) => updateStockLevel(location.id, 'onHand', value)}
                      keyboardType="numeric"
                      className="border border-gray-300 rounded px-3 py-2 text-center"
                    />
                  </View>
                  <View className="flex-1 mx-1">
                    <Text className="text-sm text-gray-600 mb-1">Committed</Text>
                    <TextInput
                      value={stockLevels[location.id]?.committed?.toString() || '0'}
                      onChangeText={(value) => updateStockLevel(location.id, 'committed', value)}
                      keyboardType="numeric"
                      className="border border-gray-300 rounded px-3 py-2 text-center"
                    />
                  </View>
                  <View className="flex-1 ml-2">
                    <Text className="text-sm text-gray-600 mb-1">Unavailable</Text>
                    <TextInput
                      value={stockLevels[location.id]?.unavailable?.toString() || '0'}
                      onChangeText={(value) => updateStockLevel(location.id, 'unavailable', value)}
                      keyboardType="numeric"
                      className="border border-gray-300 rounded px-3 py-2 text-center"
                    />
                  </View>
                </View>
              </View>
            </View>
          ))}

          {locations.length === 0 && (
            <View className="py-8 items-center">
              <MaterialIcons name="location-off" size={64} color="#D1D5DB" />
              <Text className="text-lg font-medium text-gray-900 mt-4 mb-2">No locations</Text>
              <Text className="text-gray-600 text-center">
                Create locations first to manage inventory
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Save Button */}
      {locations.length > 0 && (
        <View className="px-4 pb-4" style={{ paddingBottom: insets.bottom + 16 }}>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving || !hasChanges()}
            className={`py-4 rounded-lg ${
              saving || !hasChanges() ? 'bg-gray-300' : 'bg-blue-600'
            }`}
          >
            <Text className={`text-center font-medium text-base ${
              saving || !hasChanges() ? 'text-gray-500' : 'text-white'
            }`}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
