import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, BackHandler, Alert, TextInput, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useStore } from '../lib/store-context';
import { db } from '../lib/instant';
import { getItemStock, updateItemTotals, createInventoryAdjustment } from '../lib/inventory-setup';

interface Item {
  id: string;
  storeId: string;
  productId: string;
  sku: string;
  barcode?: string;
  option1?: string;
  option2?: string;
  option3?: string;
  trackQty?: boolean;
  allowPreorder?: boolean;
  totalOnHand?: number;
  totalAvailable?: number;
  totalCommitted?: number;
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

interface ItemInventoryDetailsProps {
  item: Item;
  onClose: () => void;
  onNavigate: (screen: string, data?: any) => void;
}

export default function ItemInventoryDetails({ item, onClose, onNavigate }: ItemInventoryDetailsProps) {
  const insets = useSafeAreaInsets();
  const { currentStore } = useStore();
  const [itemData, setItemData] = useState<Item>(item);
  const [itemLocations, setItemLocations] = useState<ItemLocation[]>([]);
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
    loadItemData();
  }, [item.id]);

  const loadItemData = async () => {
    try {
      setLoading(true);
      
      // Get item with current data
      const itemResult = await db.queryOnce({
        items: {
          $: { id: item.id }
        }
      });

      if (itemResult.items && itemResult.items.length > 0) {
        setItemData(itemResult.items[0]);
      }

      // Get item locations
      const locations = await getItemStock(item.id);
      setItemLocations(locations);
    } catch (error) {
      console.error('Failed to load item data:', error);
      Alert.alert('Error', 'Failed to load item data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      await db.transact([
        db.tx.items[item.id].update({
          sku: itemData.sku,
          barcode: itemData.barcode,
          trackQty: itemData.trackQty,
          allowPreorder: itemData.allowPreorder,
          updatedAt: new Date().toISOString()
        })
      ]);
      
      Alert.alert('Success', 'Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleEditLocations = () => {
    onNavigate('edit-item-locations', { item: itemData, itemLocations });
  };

  const handleViewAdjustmentHistory = () => {
    onNavigate('item-adjustment-history', { item: itemData });
  };

  const calculateAvailable = (location: ItemLocation): number => {
    return (location.onHand || 0) - (location.committed || 0) - (location.unavailable || 0);
  };

  const getVariantDisplay = (): string => {
    const variants = [itemData.option1, itemData.option2, itemData.option3]
      .filter(Boolean)
      .join(' / ');
    return variants || 'No variants';
  };

  const getTotalLocations = (): number => {
    return itemLocations.length;
  };

  const getTotalAvailable = (): number => {
    return itemLocations.reduce((total, location) => total + calculateAvailable(location), 0);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white">
        <View style={{ paddingTop: insets.top }} className="bg-white">
          <View className="px-4 py-4">
            <View className="flex-row items-center justify-between">
              <TouchableOpacity onPress={onClose}>
                <MaterialIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
              <Text className="text-xl font-semibold text-gray-900">Inventory details</Text>
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
              <MaterialIcons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text className="text-xl font-semibold text-gray-900">Inventory details</Text>
            <TouchableOpacity onPress={handleSaveSettings} disabled={saving}>
              <Text className={`text-base ${saving ? 'text-gray-400' : 'text-blue-600'}`}>
                {saving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text className="text-center text-gray-600 mt-1">{getVariantDisplay()}</Text>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 pb-8">
          {/* SKU Field */}
          <View className="mb-6">
            <Text className="text-base font-medium text-gray-900 mb-2">SKU (Stock keeping unit)</Text>
            <TextInput
              value={itemData.sku || ''}
              onChangeText={(text) => setItemData({ ...itemData, sku: text })}
              placeholder="Enter SKU"
              className="border border-gray-300 rounded-lg px-4 py-3 text-base"
            />
          </View>

          {/* Barcode Field */}
          <View className="mb-6">
            <Text className="text-base font-medium text-gray-900 mb-2">Barcode (ISBN, UPC, etc.)</Text>
            <View className="flex-row">
              <TextInput
                value={itemData.barcode || ''}
                onChangeText={(text) => setItemData({ ...itemData, barcode: text })}
                placeholder="Enter barcode"
                className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-base"
              />
              <TouchableOpacity className="ml-3 p-3 border border-gray-300 rounded-lg">
                <MaterialIcons name="camera-alt" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Track Quantity Toggle */}
          <View className="flex-row items-center justify-between py-4 border-b border-gray-200">
            <Text className="text-base text-gray-900">Track quantity</Text>
            <Switch
              value={itemData.trackQty !== false}
              onValueChange={(value) => setItemData({ ...itemData, trackQty: value })}
              trackColor={{ false: '#D1D5DB', true: '#3B82F6' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Allow Preorder Toggle */}
          <View className="flex-row items-center justify-between py-4 border-b border-gray-200">
            <Text className="text-base text-gray-900">Allow purchase when out of stock</Text>
            <Switch
              value={itemData.allowPreorder === true}
              onValueChange={(value) => setItemData({ ...itemData, allowPreorder: value })}
              trackColor={{ false: '#D1D5DB', true: '#3B82F6' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* View Adjustment History */}
          <TouchableOpacity
            onPress={handleViewAdjustmentHistory}
            className="py-4 border-b border-gray-200"
          >
            <Text className="text-base text-blue-600">View adjustment history</Text>
          </TouchableOpacity>

          {/* Quantity Section */}
          <View className="mt-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-base font-medium text-gray-900">Quantity</Text>
              <TouchableOpacity onPress={handleEditLocations}>
                <Text className="text-base text-blue-600">Edit locations</Text>
              </TouchableOpacity>
            </View>
            
            <Text className="text-sm text-gray-600 mb-4">
              {getTotalAvailable()} available • {getTotalLocations()} locations
            </Text>

            {/* Location List */}
            <View>
              <View className="flex-row justify-between items-center py-3 border-b border-gray-200">
                <Text className="text-sm font-medium text-gray-900">Location</Text>
                <Text className="text-sm font-medium text-gray-900">Available</Text>
              </View>
              
              {itemLocations.map((location) => (
                <View key={location.id} className="flex-row justify-between items-center py-4 border-b border-gray-100">
                  <Text className="text-base text-gray-900">
                    {location.location?.name || 'Unknown Location'}
                  </Text>
                  <Text className="text-base text-gray-900">
                    {calculateAvailable(location)}
                  </Text>
                </View>
              ))}
              
              {itemLocations.length === 0 && (
                <View className="py-8 items-center">
                  <Text className="text-gray-500">No locations configured</Text>
                  <TouchableOpacity
                    onPress={handleEditLocations}
                    className="mt-2 bg-blue-600 px-4 py-2 rounded-lg"
                  >
                    <Text className="text-white font-medium">Set up locations</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
