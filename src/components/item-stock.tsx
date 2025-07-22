import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, TextInput, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { useStore } from '../lib/store-context';
import { db } from '../lib/instant';
import { getItemStock, updateItemTotals, createInventoryAdjustment } from '../lib/inventory-setup';
import { log } from '../lib/logger';
import { id } from '@instantdb/react-native';

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
  product?: {
    title: string;
  };
}

interface Location {
  id: string;
  name: string;
  type: string;
  isDefault: boolean;
  isActive: boolean;
}

interface ItemLocation {
  id: string;
  itemId: string;
  locationId: string;
  onHand: number;
  committed: number;
  unavailable: number;
  location?: Location;
}

interface ItemStockProps {
  item: Item;
  onClose: () => void;
  onSave?: () => void;
}

export default function ItemStock({ item, onClose, onSave }: ItemStockProps) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [itemLocations, setItemLocations] = useState<ItemLocation[]>([]);
  const [allLocations, setAllLocations] = useState<Location[]>([]);
  const [showLocationSelector, setShowLocationSelector] = useState(false);

  useEffect(() => {
    loadItemData();
  }, []);

  const loadItemData = async () => {
    try {
      setLoading(true);

      // Get item with product data and item locations with location details
      const { data } = await db.queryOnce({
        items: {
          $: { where: { id: item.id } },
          product: {},
          ilocations: {
            location: {}
          }
        },
        ilocations: {
          $: { where: { itemId: item.id } },
          location: {}
        },
        locations: {
          $: { where: { isActive: true } }
        }
      });

      // Update item data with product info
      if (data?.items?.[0]) {
        const itemWithProduct = data.items[0];
        // Update the item prop with product data for display
        Object.assign(item, itemWithProduct);
      }

      // Set item locations with proper location data - manually link locations and deduplicate
      const itemLocationsWithLocation = (data?.ilocations || []).map(ilocation => {
        const location = data?.locations?.find(loc => loc.id === ilocation.locationId);
        return {
          ...ilocation,
          location: location
        };
      });

      // Remove duplicates by keeping only the most recent entry for each location
      const uniqueItemLocations = itemLocationsWithLocation.reduce((acc, current) => {
        const existingIndex = acc.findIndex(item => item.locationId === current.locationId);
        if (existingIndex >= 0) {
          // Keep the most recent one (compare updatedAt)
          if (new Date(current.updatedAt) > new Date(acc[existingIndex].updatedAt)) {
            acc[existingIndex] = current;
          }
        } else {
          acc.push(current);
        }
        return acc;
      }, []);

      setItemLocations(uniqueItemLocations);

      // Set all available locations
      setAllLocations(data?.locations || []);



    } catch (error) {
      Alert.alert('Error', 'Failed to load item data');
    } finally {
      setLoading(false);
    }
  };

  const getVariantDisplay = (): string => {
    const variants = [item.option1, item.option2, item.option3]
      .filter(Boolean)
      .join(' / ');
    return variants || 'No variants';
  };

  const getProductTitle = (): string => {
    return item.product?.title || 'Unknown Product';
  };



  const handleAddLocation = async (locationId: string) => {
    try {
      // Check if location already exists for this item
      const existingLocation = itemLocations.find(loc => loc.locationId === locationId);
      if (existingLocation) {
        Alert.alert('Info', 'This location is already added to this item');
        setShowLocationSelector(false);
        return;
      }

      const timestamp = new Date().toISOString();
      const newItemLocationId = id();

      // Create new item location record with proper links
      await db.transact([
        db.tx.ilocations[newItemLocationId].update({
          itemId: item.id,
          locationId: locationId,
          storeId: currentStore!.id,
          onHand: 0,
          committed: 0,
          unavailable: 0,
          updatedAt: timestamp
        }),
        db.tx.ilocations[newItemLocationId].link({
          item: item.id
        }),
        db.tx.ilocations[newItemLocationId].link({
          location: locationId
        })
      ]);

      // Reload data to show the new location
      await loadItemData();
      setShowLocationSelector(false);


    } catch (error) {
      Alert.alert('Error', 'Failed to add location: ' + (error.message || error));
    }
  };

  const [selectedLocation, setSelectedLocation] = useState<ItemLocation | null>(null);
  const [showStockEditor, setShowStockEditor] = useState(false);
  const [editingStock, setEditingStock] = useState({
    available: 0,
    committed: 0,
    onHand: 0
  });

  const handleStockEdit = (location: ItemLocation) => {
    const available = Math.max(0, (location.onHand || 0) - (location.committed || 0) - (location.unavailable || 0));
    setEditingStock({
      available: available,
      committed: location.committed || 0,
      onHand: location.onHand || 0
    });
    setSelectedLocation(location);
    setShowStockEditor(true);
  };

  const handleStockSave = async () => {
    if (!selectedLocation) return;

    try {
      setSaving(true);
      const timestamp = new Date().toISOString();
      const oldQuantity = selectedLocation.onHand || 0;
      const newQuantity = editingStock.onHand;

      if (newQuantity !== oldQuantity) {
        // Update item location
        await db.transact([
          db.tx.ilocations[selectedLocation.id].update({
            onHand: newQuantity,
            committed: editingStock.committed,
            updatedAt: timestamp
          })
        ]);

        // Create adjustment record
        await createInventoryAdjustment(
          selectedLocation.itemId,
          selectedLocation.locationId,
          currentStore!.id,
          oldQuantity,
          newQuantity,
          'adjustment',
          'Stock level updated',
          undefined,
          'Updated via inventory management'
        );

        // Update item totals
        await updateItemTotals(item.id);

        // Reload data
        await loadItemData();
        onSave?.();
      }

      setShowStockEditor(false);
      setSelectedLocation(null);
    } catch (error) {
      log.error('Failed to update stock', 'ItemStock', { error: error instanceof Error ? error.message : 'Unknown error' });
      Alert.alert('Error', 'Failed to update stock level');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <Text className="text-gray-500">Loading inventory...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View style={{ paddingTop: insets.top }} className="bg-white border-b border-gray-200">
        <View className="px-4 py-4">
          <View className="items-start">
            <Text className="text-xl font-semibold text-gray-900">
              {getProductTitle()}
            </Text>
            <Text className="text-base text-gray-600 mt-1">{getVariantDisplay()}</Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1">
        {/* Stock by location section */}
        <View className="px-4 pt-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-base font-medium text-gray-900">Stock by location</Text>
            <TouchableOpacity
              onPress={() => {
                setShowLocationSelector(true);
              }}
              className="w-8 h-8 items-center justify-center"
            >
              <Feather name="plus" size={20} color="#3B82F6" />
            </TouchableOpacity>
          </View>

          {itemLocations.map((location) => (
            <TouchableOpacity
              key={location.id}
              onPress={() => handleStockEdit(location)}
              className="flex-row items-center justify-between py-4 border-b border-gray-100"
            >
              <View className="flex-1">
                <Text className="text-base text-gray-900 mb-1">
                  {location.location?.name || 'Unknown Location'}
                </Text>
                <Text className="text-sm text-gray-600">
                  {location.location?.type || 'Location'}
                </Text>
              </View>

              <View className="bg-gray-50 px-4 py-2 rounded-lg min-w-[60px] items-center">
                <Text className="text-base font-medium text-gray-900">
                  {location.onHand || 0}
                </Text>
              </View>
            </TouchableOpacity>
          ))}

          {itemLocations.length === 0 && (
            <View className="py-12 items-center">
              <MaterialIcons name="location-off" size={48} color="#9CA3AF" />
              <Text className="text-gray-500 mt-4 text-center">No locations configured</Text>
              <Text className="text-sm text-gray-400 mt-1 text-center">Add locations to manage inventory</Text>
            </View>
          )}
        </View>
      </ScrollView>
      {/* Location Selector Modal */}
      <Modal
        visible={showLocationSelector}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowLocationSelector(false)}
      >
        <View className="flex-1 bg-white">
          {/* Modal Header */}
          <View style={{ paddingTop: insets.top }} className="bg-white border-b border-gray-200">
            <View className="px-4 py-4">
              <View className="flex-row items-center justify-between">
                <TouchableOpacity onPress={() => setShowLocationSelector(false)}>
                  <MaterialIcons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
                <Text className="text-xl font-semibold text-gray-900">Add Location</Text>
                <View style={{ width: 24 }} />
              </View>
            </View>
          </View>

          {/* Available Locations */}
          <ScrollView className="flex-1 px-4 pt-4">
            {(() => {
              const availableLocations = allLocations.filter(loc => !itemLocations.some(itemLoc => itemLoc.locationId === loc.id));
              return availableLocations;
            })().map((location) => (
                <TouchableOpacity
                  key={location.id}
                  onPress={() => handleAddLocation(location.id)}
                  className="flex-row items-center justify-between py-4 border-b border-gray-100"
                >
                  <View className="flex-1">
                    <Text className="text-base text-gray-900 mb-1">
                      {location.name}
                    </Text>
                    <Text className="text-sm text-gray-600">
                      {location.type || 'Location'}
                      {location.isDefault && ' • Default'}
                    </Text>
                  </View>
                  <MaterialIcons name="add" size={20} color="#3B82F6" />
                </TouchableOpacity>
              ))}

            {allLocations.filter(loc => !itemLocations.some(itemLoc => itemLoc.locationId === loc.id)).length === 0 && (
              <View className="py-12 items-center">
                <MaterialIcons name="location-on" size={48} color="#9CA3AF" />
                <Text className="text-gray-500 mt-4 text-center">All locations added</Text>
                <Text className="text-sm text-gray-400 mt-1 text-center">This item is available in all configured locations</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Stock Editor Modal */}
      <Modal
        visible={showStockEditor}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowStockEditor(false)}
      >
        <View className="flex-1 bg-white">
          {/* Modal Header */}
          <View style={{ paddingTop: insets.top }} className="bg-white border-b border-gray-200">
            <View className="px-4 py-4">
              <View className="flex-row items-center justify-between">
                <TouchableOpacity onPress={() => setShowStockEditor(false)}>
                  <MaterialIcons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
                <View className="flex-1 items-center">
                  <Text className="text-xl font-semibold text-gray-900">{getProductTitle()}</Text>
                  <Text className="text-base text-gray-600">{getVariantDisplay()}</Text>
                </View>
                <TouchableOpacity onPress={handleStockSave} disabled={saving}>
                  <Text className={`text-base ${saving ? 'text-gray-400' : 'text-blue-600'}`}>
                    {saving ? 'Saving...' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <ScrollView className="flex-1 px-4 pt-6">
            {/* Location Info */}
            <View className="items-center mb-8">
              <Text className="text-lg font-medium text-gray-900 mb-2">
                {selectedLocation?.location?.name || 'Location'}
              </Text>
              <Text className="text-sm text-gray-600">
                {selectedLocation?.location?.type || 'Location'}
              </Text>
            </View>

            {/* Available Stock Editor */}
            <View className="items-center mb-8">
              <Text className="text-2xl font-semibold text-gray-900 mb-6">Available</Text>

              <View className="flex-row items-center justify-center mb-4">
                <TouchableOpacity
                  onPress={() => setEditingStock(prev => ({
                    ...prev,
                    available: Math.max(0, prev.available - 1),
                    onHand: Math.max(0, prev.available - 1 + prev.committed)
                  }))}
                  className="w-12 h-12 bg-gray-200 rounded-full items-center justify-center"
                >
                  <MaterialIcons name="remove" size={24} color="#6B7280" />
                </TouchableOpacity>

                <Text className="text-4xl font-bold text-gray-900 mx-8 min-w-[80px] text-center">
                  {editingStock.available}
                </Text>

                <TouchableOpacity
                  onPress={() => setEditingStock(prev => ({
                    ...prev,
                    available: prev.available + 1,
                    onHand: prev.available + 1 + prev.committed
                  }))}
                  className="w-12 h-12 bg-gray-200 rounded-full items-center justify-center"
                >
                  <MaterialIcons name="add" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Edit On Hand Button */}
            <View className="mb-8">
              <TouchableOpacity
                onPress={() => {
                  Alert.prompt(
                    'Edit On Hand',
                    'Enter on hand quantity:',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Update',
                        onPress: (value) => {
                          if (value && !isNaN(Number(value))) {
                            const onHand = parseInt(value) || 0;
                            const available = Math.max(0, onHand - editingStock.committed);
                            setEditingStock(prev => ({ ...prev, onHand, available }));
                          }
                        }
                      }
                    ],
                    'plain-text',
                    String(editingStock.onHand)
                  );
                }}
                className="bg-white border border-gray-300 py-3 rounded-lg items-center"
              >
                <Text className="text-blue-600 font-medium">Edit On hand</Text>
              </TouchableOpacity>
            </View>

            {/* Stock Breakdown */}
            <View className="bg-white border border-gray-200 rounded-lg p-4 mb-8">
              <View className="flex-row justify-between items-center py-3 border-b border-gray-100">
                <Text className="text-base text-gray-900">Available</Text>
                <Text className="text-base font-semibold text-gray-900">
                  {editingStock.available}
                </Text>
              </View>

              <View className="flex-row justify-between items-center py-3 border-b border-gray-100">
                <Text className="text-base text-gray-900">Committed</Text>
                <Text className="text-base font-semibold text-gray-900">
                  {editingStock.committed}
                </Text>
              </View>

              <View className="flex-row justify-between items-center py-3">
                <Text className="text-base text-gray-900">On hand</Text>
                <Text className="text-base font-semibold text-gray-900">
                  {editingStock.onHand}
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
