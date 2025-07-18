import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, BackHandler, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { hapticFeedback } from '../lib/haptics';

interface PricingFormProps {
  visible: boolean;
  onClose: () => void;
  onSave: (pricing: { cost: number; price: number; saleprice: number }) => void;
  initialValues?: {
    cost?: number;
    price?: number;
    saleprice?: number;
  };
  title?: string;
}

export default function PricingForm({ 
  visible, 
  onClose, 
  onSave, 
  initialValues = {}, 
  title = "Update Pricing" 
}: PricingFormProps) {
  const insets = useSafeAreaInsets();
  const [cost, setCost] = useState(String(initialValues.cost || 0));
  const [price, setPrice] = useState(String(initialValues.price || 0));
  const [saleprice, setSaleprice] = useState(String(initialValues.saleprice || 0));

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setCost(String(initialValues.cost || 0));
      setPrice(String(initialValues.price || 0));
      setSaleprice(String(initialValues.saleprice || 0));
    }
  }, [visible, initialValues]);

  // Handle back button
  useEffect(() => {
    if (!visible) return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });

    return () => backHandler.remove();
  }, [visible, onClose]);

  const handleSave = () => {
    const costNum = parseFloat(cost) || 0;
    const priceNum = parseFloat(price) || 0;
    const salepriceNum = parseFloat(saleprice) || 0;

    // Basic validation
    if (priceNum < 0 || costNum < 0 || salepriceNum < 0) {
      hapticFeedback.warning();
      Alert.alert('Invalid Input', 'Prices cannot be negative');
      return;
    }

    if (salepriceNum > 0 && salepriceNum > priceNum) {
      hapticFeedback.warning();
      Alert.alert('Invalid Input', 'Sale price cannot be higher than regular price');
      return;
    }

    hapticFeedback.success();
    onSave({
      cost: costNum,
      price: priceNum,
      saleprice: salepriceNum
    });
    onClose();
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value) || 0;
    return `$${num.toFixed(2)}`;
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
        {/* Header */}
        <View className="px-6 py-4 border-b border-gray-200">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={onClose}
              className="w-10 h-10 items-center justify-center"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="x" size={24} color="#374151" />
            </TouchableOpacity>
            
            <Text className="text-xl font-bold text-gray-900">
              {title}
            </Text>
            
            <TouchableOpacity
              onPress={handleSave}
              className="bg-blue-600 px-4 py-2 rounded-xl"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text className="text-white font-semibold">Save</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Form Content */}
        <View className="flex-1 px-6 py-6">
          {/* Cost Field */}
          <View className="mb-6">
            <Text className="text-base font-medium text-gray-900 mb-3">
              Cost per item
            </Text>
            <View className="bg-gray-50 rounded-xl p-4">
              <View className="flex-row items-center">
                <Text className="text-lg font-medium text-gray-500 mr-2">$</Text>
                <TextInput
                  value={cost}
                  onChangeText={setCost}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  className="flex-1 text-lg font-medium text-gray-900"
                  style={{ fontSize: 18 }}
                  selectTextOnFocus
                />
              </View>
            </View>
            <Text className="text-sm text-gray-500 mt-2">
              The cost you pay for this item
            </Text>
          </View>

          {/* Price Field */}
          <View className="mb-6">
            <Text className="text-base font-medium text-gray-900 mb-3">
              Price
            </Text>
            <View className="bg-gray-50 rounded-xl p-4">
              <View className="flex-row items-center">
                <Text className="text-lg font-medium text-gray-500 mr-2">$</Text>
                <TextInput
                  value={price}
                  onChangeText={setPrice}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  className="flex-1 text-lg font-medium text-gray-900"
                  style={{ fontSize: 18 }}
                  selectTextOnFocus
                />
              </View>
            </View>
            <Text className="text-sm text-gray-500 mt-2">
              Regular selling price for this item
            </Text>
          </View>

          {/* Sale Price Field */}
          <View className="mb-6">
            <Text className="text-base font-medium text-gray-900 mb-3">
              Sale price
            </Text>
            <View className="bg-gray-50 rounded-xl p-4">
              <View className="flex-row items-center">
                <Text className="text-lg font-medium text-gray-500 mr-2">$</Text>
                <TextInput
                  value={saleprice}
                  onChangeText={setSaleprice}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  className="flex-1 text-lg font-medium text-gray-900"
                  style={{ fontSize: 18 }}
                  selectTextOnFocus
                />
              </View>
            </View>
            <Text className="text-sm text-gray-500 mt-2">
              Discounted price (leave as 0 if no sale price)
            </Text>
          </View>

          {/* Pricing Summary */}
          <View className="bg-blue-50 rounded-xl p-4 mt-4">
            <Text className="text-base font-semibold text-blue-900 mb-3">
              Pricing Summary
            </Text>
            
            <View className="space-y-2">
              <View className="flex-row justify-between">
                <Text className="text-sm text-blue-700">Cost:</Text>
                <Text className="text-sm font-medium text-blue-900">
                  {formatCurrency(cost)}
                </Text>
              </View>
              
              <View className="flex-row justify-between">
                <Text className="text-sm text-blue-700">Regular Price:</Text>
                <Text className="text-sm font-medium text-blue-900">
                  {formatCurrency(price)}
                </Text>
              </View>
              
              {parseFloat(saleprice) > 0 && (
                <View className="flex-row justify-between">
                  <Text className="text-sm text-blue-700">Sale Price:</Text>
                  <Text className="text-sm font-medium text-blue-900">
                    {formatCurrency(saleprice)}
                  </Text>
                </View>
              )}
              
              {parseFloat(price) > 0 && parseFloat(cost) > 0 && (
                <View className="border-t border-blue-200 pt-2 mt-2">
                  <View className="flex-row justify-between">
                    <Text className="text-sm text-blue-700">Margin:</Text>
                    <Text className="text-sm font-medium text-blue-900">
                      {(((parseFloat(price) - parseFloat(cost)) / parseFloat(price)) * 100).toFixed(1)}%
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
