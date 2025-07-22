import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, BackHandler, FlatList, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useStore } from '../lib/store-context';
import { db } from '../lib/instant';

interface InventoryAdjustment {
  id: string;
  storeId: string;
  itemId: string;
  locationId: string;
  type: string;
  quantityBefore: number;
  quantityAfter: number;
  quantityChange: number;
  reason?: string;
  reference?: string;
  notes?: string;
  userId?: string;
  userName?: string;
  createdAt: string;
  item?: {
    id: string;
    sku: string;
    option1?: string;
    option2?: string;
    option3?: string;
    product?: {
      title: string;
    };
  };
  location?: {
    id: string;
    name: string;
  };
}

interface InventoryHistoryProps {
  onClose: () => void;
  itemFilter?: string; // Optional filter for specific item
}

export default function InventoryHistory({ onClose, itemFilter }: InventoryHistoryProps) {
  const insets = useSafeAreaInsets();
  const [adjustments, setAdjustments] = useState<InventoryAdjustment[]>([]);
  const [filteredAdjustments, setFilteredAdjustments] = useState<InventoryAdjustment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  const filterOptions = [
    { id: 'all', label: 'All' },
    { id: 'adjustment', label: 'Adjustments' },
    { id: 'transfer', label: 'Transfers' },
    { id: 'sale', label: 'Sales' },
    { id: 'purchase', label: 'Purchases' }
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
    loadAdjustments();
  }, [itemFilter]);

  useEffect(() => {
    filterAdjustments();
  }, [adjustments, searchQuery, selectedFilter]);

  const loadAdjustments = async () => {
    try {
      setLoading(true);

      const whereClause: any = {};

      if (itemFilter) {
        whereClause.itemId = itemFilter;
      }

      const result = await db.queryOnce({
        inventoryAdjustments: {
          $: {
            where: whereClause,
            order: {
              serverCreatedAt: 'desc'
            }
          },
          item: {
            product: {}
          },
          location: {}
        }
      });

      setAdjustments(result.inventoryAdjustments || []);
    } catch (error) {
      console.error('Failed to load adjustment history:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAdjustments = () => {
    let filtered = adjustments;

    // Filter by type
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(adj => adj.type === selectedFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(adj => {
        const searchableText = [
          adj.item?.sku,
          adj.item?.product?.title,
          adj.item?.option1,
          adj.item?.option2,
          adj.item?.option3,
          adj.location?.name,
          adj.reason,
          adj.notes
        ].filter(Boolean).join(' ').toLowerCase();

        return searchableText.includes(query);
      });
    }

    setFilteredAdjustments(filtered);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getItemDisplay = (item: InventoryAdjustment['item']): string => {
    if (!item) return 'Unknown Item';
    
    const variants = [item.option1, item.option2, item.option3]
      .filter(Boolean)
      .join(' / ');
    return variants ? `${item.product?.title || 'Unknown'} - ${variants}` : item.product?.title || 'Unknown';
  };

  const getChangeColor = (change: number): string => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getChangeIcon = (change: number): keyof typeof MaterialIcons.glyphMap => {
    if (change > 0) return 'trending-up';
    if (change < 0) return 'trending-down';
    return 'trending-flat';
  };

  const getTypeIcon = (type: string): keyof typeof MaterialIcons.glyphMap => {
    switch (type) {
      case 'adjustment':
        return 'edit';
      case 'transfer':
        return 'swap-horiz';
      case 'sale':
        return 'shopping-cart';
      case 'purchase':
        return 'add-shopping-cart';
      default:
        return 'history';
    }
  };

  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'adjustment':
        return 'text-blue-600';
      case 'transfer':
        return 'text-purple-600';
      case 'sale':
        return 'text-red-600';
      case 'purchase':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  const renderAdjustment = ({ item }: { item: InventoryAdjustment }) => (
    <View className="bg-white border border-gray-200 rounded-lg p-4 mb-3">
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1">
          <Text className="text-base font-medium text-gray-900 mb-1">
            {getItemDisplay(item.item)}
          </Text>
          <Text className="text-sm text-gray-600">
            SKU: {item.item?.sku} • {item.location?.name}
          </Text>
        </View>
        <View className="items-end">
          <View className="flex-row items-center">
            <MaterialIcons 
              name={getTypeIcon(item.type)} 
              size={16} 
              className={getTypeColor(item.type)}
            />
            <Text className={`text-sm font-medium ml-1 ${getTypeColor(item.type)}`}>
              {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
            </Text>
          </View>
        </View>
      </View>

      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          <MaterialIcons 
            name={getChangeIcon(item.quantityChange)} 
            size={20} 
            className={getChangeColor(item.quantityChange)}
          />
          <Text className={`text-base font-medium ml-1 ${getChangeColor(item.quantityChange)}`}>
            {item.quantityChange > 0 ? '+' : ''}{item.quantityChange}
          </Text>
        </View>
        <Text className="text-sm text-gray-600">
          {item.quantityBefore} → {item.quantityAfter}
        </Text>
      </View>

      {item.reason && (
        <Text className="text-sm text-gray-600 mb-1">
          Reason: {item.reason}
        </Text>
      )}

      {item.notes && (
        <Text className="text-sm text-gray-600 mb-1">
          Notes: {item.notes}
        </Text>
      )}

      <Text className="text-xs text-gray-500 mt-2">
        {formatDate(item.createdAt)}
        {item.userName && ` • by ${item.userName}`}
      </Text>
    </View>
  );

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View style={{ paddingTop: insets.top }} className="bg-white">
        <View className="px-4 py-4">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="arrow-back" size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text className="text-xl font-semibold text-gray-900">
              {itemFilter ? 'Item History' : 'Adjustment History'}
            </Text>
            <View style={{ width: 24 }} />
          </View>
        </View>
      </View>

      {/* Search */}
      <View className="px-4 pb-4">
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search adjustments..."
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
          <Text className="text-gray-500">Loading history...</Text>
        </View>
      ) : filteredAdjustments.length === 0 ? (
        <View className="flex-1 items-center justify-center px-4">
          <MaterialIcons name="history" size={64} color="#D1D5DB" />
          <Text className="text-lg font-medium text-gray-900 mt-4 mb-2">
            {searchQuery || selectedFilter !== 'all' ? 'No adjustments found' : 'No adjustment history'}
          </Text>
          <Text className="text-gray-600 text-center">
            {searchQuery || selectedFilter !== 'all' 
              ? 'Try adjusting your search or filter' 
              : 'Inventory adjustments will appear here'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredAdjustments}
          renderItem={renderAdjustment}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
