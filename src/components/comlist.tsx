import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

type Screen = 'space' | 'sales' | 'reports' | 'products' | 'collections' | 'options' | 'metafields' | 'menu' | 'items' | 'locations';

interface ComListProps {
  onNavigate: (screen: Screen) => void;
  onClose: () => void;
}

export default function ComList({ onNavigate, onClose }: ComListProps) {
  const insets = useSafeAreaInsets();

  const commerceItems = [
    {
      id: 'collections',
      title: 'Collections'
    },
    {
      id: 'files',
      title: 'Files'
    },
    {
      id: 'options',
      title: 'Options'
    },
    {
      id: 'metafields',
      title: 'Metafields'
    },
    {
      id: 'locations',
      title: 'Locations'
    }
  ];

  const handleItemPress = (itemId: string) => {
    onNavigate(itemId as Screen);
  };

  return (
    <View className="absolute inset-0 bg-white z-50">
      {/* Header */}
      <View style={{ paddingTop: insets.top }} className="bg-white">
        <View className="px-4 py-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-xl font-semibold text-gray-900">Commerce</Text>
            <TouchableOpacity onPress={onClose}>
              <Text className="text-gray-600 text-base">Close</Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* Bottom divider */}
        <View className="h-px bg-gray-200" />
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4">
          {/* Commerce Items List */}
          <View>
            {commerceItems.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => handleItemPress(item.id)}
                className={`py-5`}
              >
                <Text className="text-xl font-medium text-gray-900">
                  {item.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
