import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, BackHandler, FlatList, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useStore } from '../lib/store-context';
import { db } from '../lib/instant';

interface ItemWithStock {
  id: string;
  sku: string;
  option1?: string;
  option2?: string;
  option3?: string;
  totalOnHand?: number;
  totalAvailable?: number;
  totalCommitted?: number;
  product?: {
    title: string;
  };
  itemLocations?: Array<{
    id: string;
    onHand: number;
    committed: number;
    unavailable: number;
    location?: {
      name: string;
    };
  }>;
}

interface OverviewProps {
  onClose: () => void;
  onNavigate: (screen: string, data?: any) => void;
}

export default function Overview({ onClose, onNavigate }: OverviewProps) {
  const insets = useSafeAreaInsets();
  const { currentStore } = useStore();
  const [items, setItems] = useState<ItemWithStock[]>([]);
  const [filteredItems, setFilteredItems] = useState<ItemWithStock[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  const filterOptions = [
    { id: 'all', label: 'All Items' },
    { id: 'low-stock', label: 'Low Stock' },
    { id: 'out-of-stock', label: 'Out of Stock' },
    { id: 'in-stock', label: 'In Stock' }
  ];

  useEffect(() => {
    const backAction = () => {
      onClose();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [onClose]);

  useEffect(() => {
    loadItems();
  }, []); // No dependency on currentStore since it no longer exists

  useEffect(() => {
    filterItems();
  }, [items, searchQuery, selectedFilter]);

  const loadItems = async () => {
    try {
      setLoading(true);
      const result = await db.queryOnce({
        items: {
          $: {
            where: {} // No store filtering needed
          },
          product: {},
          itemLocations: {
            location: {}
          }
        }
      });

      setItems(result.items || []);
    } catch (error) {
      // Failed to load items
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = [...items]; // Create a copy to avoid mutation

    // Filter by type (all filtering done on client side)
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(item => {
        const available = calculateTotalAvailable(item);
        switch (selectedFilter) {
          case 'low-stock':
            return available > 0 && available < 5;
          case 'out-of-stock':
            return available === 0;
          case 'in-stock':
            return available > 0;
          default:
            return true;
        }
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => {
        const searchableText = [
          item.sku || '',
          (item.product && item.product.title) ? item.product.title : '',
          item.option1 || '',
          item.option2 || '',
          item.option3 || ''
        ].join(' ').toLowerCase();

        return searchableText.includes(query);
      });
    }

    setFilteredItems(filtered);
  };

  const calculateTotalAvailable = (item: ItemWithStock): number => {
    if (item.itemLocations) {
      return item.itemLocations.reduce((total, location) => {
        return total + (location.onHand - location.committed - location.unavailable);
      }, 0);
    }
    return item.totalAvailable || 0;
  };

  const calculateTotalOnHand = (item: ItemWithStock): number => {
    if (item.itemLocations) {
      return item.itemLocations.reduce((total, location) => total + location.onHand, 0);
    }
    return item.totalOnHand || 0;
  };

  const getItemDisplay = (item: ItemWithStock): string => {
    const variants = [item.option1, item.option2, item.option3]
      .filter(Boolean)
      .join(' / ');
    return variants ? `${item.product?.title || 'Unknown'} - ${variants}` : item.product?.title || 'Unknown';
  };

  const getStockStatusColor = (available: number): string => {
    if (available === 0) return 'text-red-600';
    if (available < 5) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStockStatusIcon = (available: number): keyof typeof MaterialIcons.glyphMap => {
    if (available === 0) return 'error';
    if (available < 5) return 'warning';
    return 'check-circle';
  };

  const handleItemPress = (item: ItemWithStock) => {
    onNavigate('item-inventory-details', { item, itemLocations: item.itemLocations || [] });
  };

  const renderItem = ({ item }: { item: ItemWithStock }) => {
    const available = calculateTotalAvailable(item);
    const onHand = calculateTotalOnHand(item);

    return (
      <TouchableOpacity
        onPress={() => handleItemPress(item)}
        className="bg-white border border-gray-200 rounded-lg p-4 mb-3"
        activeOpacity={0.7}
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <Text className="text-base font-medium text-gray-900 mb-1">
              {getItemDisplay(item)}
            </Text>
            <Text className="text-sm text-gray-600 mb-2">
              SKU: {item.sku}
            </Text>
            <View className="flex-row items-center">
              <MaterialIcons 
                name={getStockStatusIcon(available)} 
                size={16} 
                className={getStockStatusColor(available)}
              />
              <Text className={`text-sm ml-1 ${getStockStatusColor(available)}`}>
                {available} available
              </Text>
              <Text className="text-sm text-gray-600 ml-4">
                {onHand} on hand
              </Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View style={{ paddingTop: insets.top }} className="bg-white">
        <View className="px-4 py-4">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="arrow-back" size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text className="text-xl font-semibold text-gray-900">Stock Overview</Text>
            <View style={{ width: 24 }} />
          </View>
        </View>
      </View>

      {/* Search */}
      <View className="px-4 pb-4">
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search items..."
          className="border border-gray-300 rounded-lg px-4 py-3 text-base"
        />
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 pb-4">
        <View className="flex-row">
          {filterOptions.map((filter) => (
            <TouchableOpacity
              key={filter.id}
              onPress={() => setSelectedFilter(filter.id)}
              className={`px-4 py-2 rounded-full mr-2 ${
                selectedFilter === filter.id ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <Text className={`text-sm ${
                selectedFilter === filter.id ? 'text-white' : 'text-gray-700'
              }`}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Content */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500">Loading inventory...</Text>
        </View>
      ) : filteredItems.length === 0 ? (
        <View className="flex-1 items-center justify-center px-4">
          <MaterialIcons name="inventory" size={64} color="#D1D5DB" />
          <Text className="text-lg font-medium text-gray-900 mt-4 mb-2">
            {searchQuery || selectedFilter !== 'all' ? 'No items found' : 'No inventory items'}
          </Text>
          <Text className="text-gray-600 text-center">
            {searchQuery || selectedFilter !== 'all' 
              ? 'Try adjusting your search or filter' 
              : 'Add products to start tracking inventory'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
