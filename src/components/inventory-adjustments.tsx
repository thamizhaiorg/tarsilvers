import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, BackHandler, Alert, TextInput, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useStore } from '../lib/store-context';
import { db } from '../lib/instant';
import { updateItemTotals, createInventoryAdjustment } from '../lib/inventory-setup';

interface Item {
  id: string;
  sku: string;
  option1?: string;
  option2?: string;
  option3?: string;
  product?: {
    title: string;
  };
}

interface ItemLocation {
  id: string;
  itemId: string;
  locationId: string;
  onHand: number;
  committed: number;
  unavailable: number;
  item?: Item;
  location?: {
    id: string;
    name: string;
  };
}

interface InventoryAdjustmentsProps {
  onClose: () => void;
  onNavigate: (screen: string, data?: any) => void;
}

export default function InventoryAdjustments({ onClose, onNavigate }: InventoryAdjustmentsProps) {
  const insets = useSafeAreaInsets();
  const { currentStore } = useStore();
  const [itemLocations, setItemLocations] = useState<ItemLocation[]>([]);
  const [filteredItems, setFilteredItems] = useState<ItemLocation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ItemLocation | null>(null);
  const [adjustmentQuantity, setAdjustmentQuantity] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [adjustmentNotes, setAdjustmentNotes] = useState('');
  const [showAdjustmentForm, setShowAdjustmentForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const adjustmentReasons = [
    'Correction',
    'Damaged',
    'Expired',
    'Lost',
    'Found',
    'Received',
    'Returned',
    'Theft',
    'Other'
  ];

  useEffect(() => {
    const backAction = () => {
      if (showAdjustmentForm) {
        setShowAdjustmentForm(false);
        return true;
      }
      onClose();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [onClose, showAdjustmentForm]);

  useEffect(() => {
    loadItemLocations();
  }, [currentStore]);

  useEffect(() => {
    filterItems();
  }, [itemLocations, searchQuery]);

  const loadItemLocations = async () => {
    if (!currentStore) return;

    try {
      setLoading(true);
      const result = await db.queryOnce({
        ilocations: {
          $: {
            where: {
              storeId: currentStore.id
            }
          },
          item: {
            product: {}
          },
          location: {}
        }
      });

      setItemLocations(result.ilocations || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    if (!searchQuery.trim()) {
      setFilteredItems(itemLocations);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = itemLocations.filter(itemLocation => {
      const item = itemLocation.item;
      if (!item) return false;

      const searchableText = [
        item.sku,
        item.product?.title,
        item.option1,
        item.option2,
        item.option3,
        itemLocation.location?.name
      ].filter(Boolean).join(' ').toLowerCase();

      return searchableText.includes(query);
    });

    setFilteredItems(filtered);
  };

  const handleItemPress = (itemLocation: ItemLocation) => {
    setSelectedItem(itemLocation);
    setAdjustmentQuantity('');
    setAdjustmentReason('');
    setAdjustmentNotes('');
    setShowAdjustmentForm(true);
  };

  const handleSaveAdjustment = async () => {
    if (!selectedItem || !adjustmentQuantity.trim() || !adjustmentReason) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const newQuantity = parseInt(adjustmentQuantity);
    if (isNaN(newQuantity) || newQuantity < 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    try {
      setSaving(true);
      const oldQuantity = selectedItem.onHand;
      const timestamp = new Date().toISOString();

      // Update item location
      await db.transact([
        db.tx.ilocations[selectedItem.id].update({
          onHand: newQuantity,
          updatedAt: timestamp
        })
      ]);

      // Create adjustment record
      await createInventoryAdjustment(
        selectedItem.itemId,
        selectedItem.locationId,
        currentStore!.id,
        oldQuantity,
        newQuantity,
        'adjustment',
        adjustmentReason,
        undefined,
        adjustmentNotes || undefined
      );

      // Update item totals
      await updateItemTotals(selectedItem.itemId);

      setShowAdjustmentForm(false);
      loadItemLocations();
      Alert.alert('Success', 'Stock adjustment saved successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to save adjustment');
    } finally {
      setSaving(false);
    }
  };

  const getItemDisplay = (item: Item): string => {
    const variants = [item.option1, item.option2, item.option3]
      .filter(Boolean)
      .join(' / ');
    return variants ? `${item.product?.title || 'Unknown'} - ${variants}` : item.product?.title || 'Unknown';
  };

  const calculateAvailable = (itemLocation: ItemLocation): number => {
    return itemLocation.onHand - itemLocation.committed - itemLocation.unavailable;
  };

  const renderItemLocation = ({ item }: { item: ItemLocation }) => (
    <TouchableOpacity
      onPress={() => handleItemPress(item)}
      className="bg-white border border-gray-200 rounded-lg p-4 mb-3"
      activeOpacity={0.7}
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-1">
          <Text className="text-base font-medium text-gray-900 mb-1">
            {getItemDisplay(item.item!)}
          </Text>
          <Text className="text-sm text-gray-600 mb-2">
            SKU: {item.item?.sku} • {item.location?.name}
          </Text>
          <View className="flex-row">
            <Text className="text-sm text-gray-600 mr-4">
              On hand: {item.onHand}
            </Text>
            <Text className="text-sm text-gray-600">
              Available: {calculateAvailable(item)}
            </Text>
          </View>
        </View>
        <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
      </View>
    </TouchableOpacity>
  );

  if (showAdjustmentForm && selectedItem) {
    return (
      <View className="flex-1 bg-white">
        {/* Header */}
        <View style={{ paddingTop: insets.top }} className="bg-white">
          <View className="px-4 py-4">
            <View className="flex-row items-center justify-between">
              <TouchableOpacity onPress={() => setShowAdjustmentForm(false)}>
                <MaterialIcons name="arrow-back" size={24} color="#6B7280" />
              </TouchableOpacity>
              <Text className="text-xl font-semibold text-gray-900">Adjust Stock</Text>
              <TouchableOpacity onPress={handleSaveAdjustment} disabled={saving}>
                <Text className={`text-base ${saving ? 'text-gray-400' : 'text-blue-600'}`}>
                  {saving ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <ScrollView className="flex-1 px-4 pt-6">
          {/* Item Info */}
          <View className="bg-gray-50 rounded-lg p-4 mb-6">
            <Text className="text-base font-medium text-gray-900 mb-1">
              {getItemDisplay(selectedItem.item!)}
            </Text>
            <Text className="text-sm text-gray-600">
              {selectedItem.location?.name} • Current: {selectedItem.onHand} on hand
            </Text>
          </View>

          {/* New Quantity */}
          <View className="mb-6">
            <Text className="text-base font-medium text-gray-900 mb-2">New Quantity</Text>
            <TextInput
              value={adjustmentQuantity}
              onChangeText={setAdjustmentQuantity}
              placeholder="Enter new quantity"
              keyboardType="numeric"
              className="border border-gray-300 rounded-lg px-4 py-3 text-base"
              autoFocus
            />
          </View>

          {/* Reason */}
          <View className="mb-6">
            <Text className="text-base font-medium text-gray-900 mb-2">Reason *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
              <View className="flex-row">
                {adjustmentReasons.map((reason) => (
                  <TouchableOpacity
                    key={reason}
                    onPress={() => setAdjustmentReason(reason)}
                    className={`px-4 py-2 rounded-full mr-2 ${
                      adjustmentReason === reason ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <Text className={`text-sm ${
                      adjustmentReason === reason ? 'text-white' : 'text-gray-700'
                    }`}>
                      {reason}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Notes */}
          <View className="mb-6">
            <Text className="text-base font-medium text-gray-900 mb-2">Notes (Optional)</Text>
            <TextInput
              value={adjustmentNotes}
              onChangeText={setAdjustmentNotes}
              placeholder="Add notes about this adjustment"
              multiline
              numberOfLines={3}
              className="border border-gray-300 rounded-lg px-4 py-3 text-base"
              textAlignVertical="top"
            />
          </View>
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
            <Text className="text-xl font-semibold text-gray-900">Stock Adjustments</Text>
            <TouchableOpacity onPress={() => onNavigate('inventory-history')}>
              <MaterialIcons name="history" size={24} color="#3B82F6" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Search */}
      <View className="px-4 pb-4">
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search items, SKU, or location..."
          className="border border-gray-300 rounded-lg px-4 py-3 text-base"
        />
      </View>

      {/* Content */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500">Loading inventory...</Text>
        </View>
      ) : filteredItems.length === 0 ? (
        <View className="flex-1 items-center justify-center px-4">
          <MaterialIcons name="inventory" size={64} color="#D1D5DB" />
          <Text className="text-lg font-medium text-gray-900 mt-4 mb-2">
            {searchQuery ? 'No items found' : 'No inventory items'}
          </Text>
          <Text className="text-gray-600 text-center">
            {searchQuery ? 'Try adjusting your search terms' : 'Add products and set up locations to manage inventory'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderItemLocation}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
