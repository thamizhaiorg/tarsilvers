import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, FlatList, BackHandler } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface CategorySelectProps {
  selectedCategory?: string;
  onSelect: (category: string) => void;
  onClose: () => void;
}

interface CategoryItem {
  id: string;
  name: string;
}

// Static jewelry categories
const JEWELRY_CATEGORIES: CategoryItem[] = [
  { id: 'chuttis', name: 'Chuttis' },
  { id: 'earrings', name: 'Earrings' },
  { id: 'nose-rings', name: 'Nose rings' },
  { id: 'necklaces', name: 'Necklaces' },
  { id: 'bracelets', name: 'Bracelets' },
  { id: 'hipchains', name: 'Hipchains' },
  { id: 'anklets', name: 'Anklets' },
];

export default function CategorySelect({ selectedCategory, onSelect, onClose }: CategorySelectProps) {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');

  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      onClose();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [onClose]);

  // Filter categories based on search query
  const filteredCategories = JEWELRY_CATEGORIES.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectCategory = (category: CategoryItem) => {
    onSelect(category.id);
    onClose();
  };

  const renderCategoryItem = ({ item }: { item: CategoryItem }) => (
    <TouchableOpacity
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
      }}
      onPress={() => handleSelectCategory(item)}
    >
      <View style={{
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: selectedCategory === item.id ? '#3B82F6' : '#D1D5DB',
        backgroundColor: selectedCategory === item.id ? '#3B82F6' : 'transparent',
        marginRight: 16,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {selectedCategory === item.id && (
          <View style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: '#fff',
          }} />
        )}
      </View>
      <Text style={{
        fontSize: 17,
        color: '#111827',
        flex: 1,
        fontWeight: '400',
      }}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={{
      flex: 1,
      backgroundColor: '#fff',
      paddingTop: insets.top / 5,
    }}>
      {/* Header */}
      <View style={{
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
      }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827' }}>
          Category
        </Text>
      </View>

      {/* Search Bar */}
      <View style={{
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
        }}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={{
              flex: 1,
              fontSize: 16,
              color: '#111827',
              marginLeft: 12,
              marginRight: 12,
            }}
            placeholder="Search categories"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="done"
          />
        </View>
      </View>

      {/* Categories List */}
      <FlatList
        data={filteredCategories}
        keyExtractor={(item) => item.id}
        renderItem={renderCategoryItem}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
