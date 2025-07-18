import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Card from './ui/Card';
import Button from './ui/Button';
import QuantitySelector from './ui/qty';
import { db, getCurrentTimestamp } from '../lib/instant';

interface InventoryAdjustmentScreenProps {
  product: any;
  onClose: () => void;
  onSave?: () => void;
}

export default function InventoryAdjustmentScreen({
  product,
  onClose,
  onSave
}: InventoryAdjustmentScreenProps) {
  const insets = useSafeAreaInsets();
  
  const [adjustedQuantity, setAdjustedQuantity] = useState(product.stock);
  const [selectedReason, setSelectedReason] = useState('Correction (default)');
  const [loading, setLoading] = useState(false);

  const originalQuantity = product.stock;
  const difference = adjustedQuantity - originalQuantity;

  // Mock inventory breakdown (in real app, this would come from inventory tracking)
  const inventoryBreakdown = {
    available: adjustedQuantity,
    committed: 5,
    onHand: adjustedQuantity - 5
  };

  const reasons = [
    'Correction (default)',
    'Damaged',
    'Lost',
    'Sold',
    'Returned',
    'Promotion',
    'Other'
  ];

  const handleSave = async () => {
    if (adjustedQuantity === originalQuantity) {
      onClose();
      return;
    }

    setLoading(true);
    try {
      const timestamp = getCurrentTimestamp();
      await db.transact(
        db.tx.products[product.id].update({
          stock: adjustedQuantity,
          updatedAt: timestamp,
        })
      );

      onSave?.();
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to update inventory');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-200">
        <View className="px-4 py-4">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={onClose}>
              <Text className="text-2xl text-gray-600">×</Text>
            </TouchableOpacity>
            
            <View className="flex-1 items-center">
              <Text className="text-lg font-semibold text-gray-900">Quantities</Text>
              <Text className="text-sm text-gray-600">{product.title}</Text>
            </View>
            
            <TouchableOpacity onPress={handleSave}>
              <Text className="text-2xl text-blue-600">✓</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View className="flex-1 px-4 pt-8">
        {/* Available Section */}
        <View className="items-center mb-8">
          <Text className="text-2xl font-semibold text-gray-900 mb-6">Available</Text>
          
          <QuantitySelector
            value={adjustedQuantity}
            onValueChange={setAdjustedQuantity}
            min={0}
            size="large"
          />
          
          <Text className="text-sm text-gray-600 mt-4">
            Original: {originalQuantity}
          </Text>
        </View>

        {/* Edit on Hand Button */}
        <View className="mb-8">
          <Button
            title="Edit on hand"
            onPress={() => {}}
            variant="secondary"
            fullWidth
          />
        </View>

        {/* Reason Section */}
        <View className="mb-8">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-base text-gray-900">Reason</Text>
            <TouchableOpacity className="flex-row items-center">
              <Text className="text-base text-gray-600 mr-2">{selectedReason}</Text>
              <Text className="text-gray-400 text-xl">›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Inventory Breakdown */}
        <Card padding="medium" className="mb-8">
          <View className="space-y-4">
            <View className="flex-row justify-between items-center py-2">
              <Text className="text-base text-gray-900">Available</Text>
              <Text className="text-base font-semibold text-gray-900">
                {inventoryBreakdown.available}
              </Text>
            </View>
            
            <View className="h-px bg-gray-200" />
            
            <View className="flex-row justify-between items-center py-2">
              <Text className="text-base text-gray-900">Committed</Text>
              <Text className="text-base font-semibold text-gray-900">
                {inventoryBreakdown.committed}
              </Text>
            </View>
            
            <View className="h-px bg-gray-200" />
            
            <View className="flex-row justify-between items-center py-2">
              <Text className="text-base text-gray-900">On hand</Text>
              <Text className="text-base font-semibold text-gray-900">
                {inventoryBreakdown.onHand}
              </Text>
            </View>
          </View>
        </Card>

        {/* Change Summary */}
        {difference !== 0 && (
          <Card padding="medium" className="mb-8">
            <View className="items-center">
              <Text className="text-sm text-gray-600 mb-1">Change</Text>
              <Text className={`text-lg font-bold ${
                difference > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {difference > 0 ? '+' : ''}{difference}
              </Text>
            </View>
          </Card>
        )}
      </View>

      {/* Save Button */}
      <View className="px-4" style={{ paddingBottom: Math.max(32, insets.bottom + 24) }}>
        <Button
          title={difference === 0 ? "No Changes" : `Save Changes (${difference > 0 ? '+' : ''}${difference})`}
          onPress={handleSave}
          loading={loading}
          disabled={difference === 0}
          fullWidth
          variant={difference === 0 ? "secondary" : "primary"}
        />
      </View>
    </View>
  );
}
