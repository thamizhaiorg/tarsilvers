import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, Modal, Animated, BackHandler, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { db, formatCurrency } from '../lib/instant';
import { useStore } from '../lib/store-context';
import { log, trackError, PerformanceMonitor } from '../lib/logger';
import PricingForm from './pricing-form';
import { LoadingError, EmptyState } from './ui/error-boundary';

import R2Image from './ui/r2-image';

interface ItemsScreenProps {
  isGridView?: boolean;
  onItemFormOpen?: (item?: any) => void;
  onItemFormClose?: () => void;
  onClose?: () => void;
  productId?: string; // Add productId prop to filter items by product
}

type FilterStatus = 'All' | 'Active' | 'Draft';

// Memoized item component for better performance
const ItemComponent = React.memo(({
  item,
  isSelected,
  isMultiSelectMode,
  onPress,
  onLongPress
}: {
  item: any;
  isSelected: boolean;
  isMultiSelectMode: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) => {
  const getItemStatus = (item: any) => {
    // Simple logic: false = Draft, everything else = Active
    return item.trackQty === false ? 'Draft' : 'Active';
  };

  const getOptionDisplay = (item: any) => {
    const options = [];
    if (item.option1) options.push(item.option1);
    if (item.option2) options.push(item.option2);
    if (item.option3) options.push(item.option3);
    return options.length > 0 ? options.join(' / ') : 'No options';
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      className={`px-4 py-4 ${
        isSelected ? 'bg-blue-50' : 'bg-white'
      }`}
      style={{
        opacity: isMultiSelectMode && !isSelected ? 0.6 : 1
      }}
    >
      <View className="flex-row items-center">
        {/* Multi-select checkbox */}
        {isMultiSelectMode && (
          <View className="mr-3">
            <View className={`w-6 h-6 items-center justify-center ${
              isSelected ? 'bg-blue-600' : 'bg-gray-300'
            }`}>
              {isSelected && (
                <Feather name="check" size={14} color="white" />
              )}
            </View>
          </View>
        )}

        {/* Item Image */}
        <View className="w-12 h-12 bg-gray-200 mr-3 overflow-hidden">
          {item.image ? (
            <R2Image
              url={item.image}
              style={{ width: 48, height: 48 }}
              fallback={
                <View className="w-12 h-12 bg-gray-200 items-center justify-center">
                  <Text className="text-lg">📦</Text>
                </View>
              }
            />
          ) : (
            <View className="w-12 h-12 bg-gray-200 items-center justify-center">
              <Text className="text-lg">📦</Text>
            </View>
          )}
        </View>

        {/* Item Details */}
        <View className="flex-1">
          <Text className="text-base font-medium text-gray-900 mb-1">
            {item.sku || 'Untitled Item'}
          </Text>
          <Text className="text-sm text-gray-500">
            {getOptionDisplay(item)} • {getItemStatus(item)}
          </Text>
        </View>

        {/* Price */}
        <View className="items-end">
          <Text className="text-base font-medium text-gray-900">
            {formatCurrency(item.price || 0)}
          </Text>
          {item.totalOnHand !== undefined && (
            <Text className="text-sm text-gray-500">
              Stock: {item.totalOnHand || 0}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

export default function ItemsScreen({ isGridView = false, onItemFormOpen, onItemFormClose, onClose, productId }: ItemsScreenProps) {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('All');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [showBottomDrawer, setShowBottomDrawer] = useState(false);

  // New state for enhanced search, filter, and view functionality
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedView, setSelectedView] = useState<'stock' | 'pricing' | 'image'>('stock');
  const [showPricingForm, setShowPricingForm] = useState(false);
  const [selectedItemForPricing, setSelectedItemForPricing] = useState<any>(null);


  // Query items from database with optimized schema - filter by productId if provided
  const { data, isLoading, error } = db.useQuery({
    items: {
      $: {
        where: productId
          ? { productId: productId }
          : {}, // No store filtering needed since schema doesn't include storeId
        order: {
          sku: 'asc' // Use indexed field for ordering
        }
      },
      product: {
        brand: {}, // Include relationship data
        category: {},
        type: {},
        vendor: {}
      },
      ilocations: { // Use enhanced inventory location tracking
        location: {}
      }
    }
  });

  const items = data?.items || [];

  // Back button handling is now managed by the main app

  // Filter and search logic - optimized with performance monitoring
  const filteredItems = useMemo(() => {
    return PerformanceMonitor.measure('filter-items', () => {
      let filtered = items;

      // Apply search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(item =>
          (item.sku || '').toLowerCase().includes(query) ||
          (item.option1 || '').toLowerCase().includes(query) ||
          (item.option2 || '').toLowerCase().includes(query) ||
          (item.option3 || '').toLowerCase().includes(query) ||
          ((item.product && item.product[0] && item.product[0].title) ? item.product[0].title.toLowerCase() : '').includes(query)
        );
      }

      // Apply status filter
      if (activeFilter !== 'All') {
        filtered = filtered.filter(item => {
          const status = item.trackQty === false ? 'Draft' : 'Active';
          return status === activeFilter;
        });
      }

      // Apply option value filter
      if (selectedFilters.length > 0) {
        filtered = filtered.filter(item =>
          selectedFilters.some(filter =>
            item.option1 === filter ||
            item.option2 === filter ||
            item.option3 === filter
          )
        );
      }

      return filtered;
    });
  }, [items, searchQuery, activeFilter, selectedFilters]);

  const handleItemSelect = useCallback((item: any) => {
    if (isMultiSelectMode) {
      setSelectedItems(prev => {
        const newSet = new Set(prev);
        if (newSet.has(item.id)) {
          newSet.delete(item.id);
        } else {
          newSet.add(item.id);
        }
        return newSet;
      });
    } else {
      // Handle single item tap - could open item form
      if (onItemFormOpen) {
        onItemFormOpen(item);
      }
    }
  }, [isMultiSelectMode, onItemFormOpen]);

  const handleLongPress = useCallback((item: any) => {
    if (!isMultiSelectMode) {
      setIsMultiSelectMode(true);
      setSelectedItems(new Set([item.id]));
      setShowBottomDrawer(true);
    }
  }, [isMultiSelectMode]);

  const handleCancelMultiSelect = useCallback(() => {
    setIsMultiSelectMode(false);
    setSelectedItems(new Set());
    setShowBottomDrawer(false);
  }, []);

  const handleAddNew = useCallback(() => {
    if (onItemFormOpen) {
      onItemFormOpen();
    }
  }, [onItemFormOpen]);



  if (isLoading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <Text className="text-gray-500">Loading items...</Text>
      </View>
    );
  }

  if (error) {
    return <LoadingError error={typeof error === 'string' ? error : error.message || 'An error occurred'} onRetry={() => window.location.reload()} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: insets.top }}>
      {/* Header */}
      <View style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
        <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: '600', color: '#111827' }}>
              {productId ? (() => {
                const product = items.find(item => item.productId === productId)?.product?.[0];
                return product ? product.title : 'Items';
              })() : 'Items'}
            </Text>
          </View>
        </View>
      </View>

      {items.length === 0 ? (
        <View style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 60,
          paddingHorizontal: 20
        }}>
          <MaterialIcons name="inventory-2" size={48} color="#9CA3AF" />
          <Text style={{
            fontSize: 18,
            fontWeight: '600',
            color: '#6B7280',
            marginTop: 16,
            textAlign: 'center'
          }}>
            No Items Yet
          </Text>
          <Text style={{
            fontSize: 14,
            color: '#9CA3AF',
            marginTop: 8,
            textAlign: 'center',
            lineHeight: 20
          }}>
            {productId
              ? 'This product has no items yet.\nAdd option sets to generate variants.'
              : 'Start by adding your first item to the inventory'
            }
          </Text>
          <TouchableOpacity
            onPress={handleAddNew}
            style={{
              backgroundColor: '#3B82F6',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 6,
              marginTop: 16,
            }}
          >
            <Text style={{
              color: '#fff',
              fontSize: 14,
              fontWeight: '500',
            }}>
              Add Item
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Fixed Search Bar */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: '#fff',
            borderBottomWidth: 1,
            borderBottomColor: '#E5E7EB',
          }}>
            <TouchableOpacity onPress={handleAddNew} style={{ marginRight: 12 }}>
              <Feather name="plus" size={20} color="#9CA3AF" />
            </TouchableOpacity>
            <TextInput
              style={{
                flex: 1,
                fontSize: 16,
                color: '#111827',
                paddingVertical: 8,
                paddingHorizontal: 0,
                borderWidth: 0,
                backgroundColor: 'transparent',
              }}
              placeholder="Search items..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <TouchableOpacity
              onPress={() => setShowFilters(!showFilters)}
              style={{
                padding: 8,
                marginLeft: 8,
              }}
            >
              <MaterialIcons
                name="tune"
                size={20}
                color={showFilters || selectedFilters.length > 0 ? '#3B82F6' : '#9CA3AF'}
              />
            </TouchableOpacity>
          </View>

          {/* Fixed View Selection Bar */}
          <View style={{
            backgroundColor: '#fff',
            borderBottomWidth: 1,
            borderBottomColor: '#E5E7EB',
          }}>
            <View style={{
              flexDirection: 'row',
              backgroundColor: '#fff',
            }}>
              {[
                { id: 'stock', label: 'Stock' },
                { id: 'pricing', label: 'Pricing' },
                { id: 'image', label: 'Image' }
              ].map((view, index) => {
                const isSelected = selectedView === view.id;
                return (
                  <TouchableOpacity
                    key={view.id}
                    onPress={() => setSelectedView(view.id as 'stock' | 'pricing' | 'image')}
                    style={{
                      flex: 1,
                      paddingVertical: 16,
                      backgroundColor: '#fff',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRightWidth: index < 2 ? 1 : 0,
                      borderRightColor: '#E5E7EB',
                    }}
                  >
                    <Text style={{
                      fontSize: 14,
                      color: isSelected ? '#3B82F6' : '#6B7280',
                      fontWeight: isSelected ? '600' : '500',
                    }}>
                      {view.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Fixed Filter Options */}
          {showFilters && (() => {
            const allOptionValues = new Set<string>();
            items.forEach((item: any) => {
              if (item.option1) allOptionValues.add(item.option1);
              if (item.option2) allOptionValues.add(item.option2);
              if (item.option3) allOptionValues.add(item.option3);
            });
            const optionValuesList = Array.from(allOptionValues).sort();

            if (optionValuesList.length > 0) {
              return (
                <View style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  backgroundColor: '#F3F4F6',
                  borderBottomWidth: 1,
                  borderBottomColor: '#E5E7EB',
                }}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8 }}
                  >
                    {optionValuesList.map((optionValue) => {
                      const isSelected = selectedFilters.includes(optionValue);
                      return (
                        <TouchableOpacity
                          key={optionValue}
                          onPress={() => {
                            if (isSelected) {
                              setSelectedFilters(prev => prev.filter(f => f !== optionValue));
                            } else {
                              setSelectedFilters(prev => [...prev, optionValue]);
                            }
                          }}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            backgroundColor: isSelected ? '#3B82F6' : '#fff',
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor: isSelected ? '#3B82F6' : '#E5E7EB',
                          }}
                        >
                          <Text style={{
                            fontSize: 14,
                            color: isSelected ? '#fff' : '#6B7280',
                            fontWeight: '500',
                          }}>
                            {optionValue}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              );
            }
            return null;
          })()}

          {/* Scrollable Items List */}
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {filteredItems.map((item: any) => (
              <View
                key={item.id}
                style={{
                  backgroundColor: '#fff',
                  borderBottomWidth: 1,
                  borderBottomColor: '#F3F4F6',
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '500', color: '#111827' }}>
                      {item.sku || 'No SKU'}
                    </Text>
                    {item.option1 && (
                      <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
                        {item.option1}
                        {item.option2 && ` • ${item.option2}`}
                        {item.option3 && ` • ${item.option3}`}
                      </Text>
                    )}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    {selectedView === 'stock' && (
                      <TouchableOpacity
                        onPress={() => {
                          if (onItemFormOpen) {
                            onItemFormOpen({ ...item, openInventory: true });
                          }
                        }}
                        style={{
                          backgroundColor: '#F9FAFB',
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 6,
                          minWidth: 50,
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }}>
                          {(() => {
                            // Use enhanced inventory location tracking
                            const totalStock = item.ilocations?.reduce((sum: number, location: any) => 
                              sum + (location.onHand || 0), 0) || item.totalOnHand || item.onhand || 0;
                            return totalStock;
                          })()}
                        </Text>
                      </TouchableOpacity>
                    )}
                    {selectedView === 'pricing' && (
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedItemForPricing(item);
                          setShowPricingForm(true);
                        }}
                        style={{
                          backgroundColor: '#F9FAFB',
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 6,
                          minWidth: 60,
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }}>
                          ${(item.saleprice || item.price || 0).toFixed(2)}
                        </Text>
                      </TouchableOpacity>
                    )}
                    {selectedView === 'image' && (
                      <TouchableOpacity
                        onPress={() => {
                          Alert.alert('Image', 'Item image functionality coming soon');
                        }}
                        style={{
                          width: 40,
                          height: 40,
                          backgroundColor: '#F9FAFB',
                          borderRadius: 6,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {item.image ? (
                          <R2Image
                            url={item.image}
                            style={{ width: '100%', height: '100%', borderRadius: 6 }}
                            fallback={
                              <MaterialIcons name="image" size={20} color="#9CA3AF" />
                            }
                          />
                        ) : (
                          <MaterialIcons name="image" size={20} color="#9CA3AF" />
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            ))}

            {filteredItems.length === 0 && items.length > 0 && (
              <View style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 40,
                paddingHorizontal: 20
              }}>
                <MaterialIcons name="search-off" size={48} color="#9CA3AF" />
                <Text style={{
                  fontSize: 16,
                  fontWeight: '500',
                  color: '#6B7280',
                  marginTop: 16,
                  textAlign: 'center'
                }}>
                  No items match your search
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {/* Bottom Drawer for Multi-select Actions */}
      {showBottomDrawer && (
        <View className="absolute bottom-0 left-0 right-0 bg-white px-4 py-4">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-base font-medium text-gray-900">
              {selectedItems.size} selected
            </Text>
            <TouchableOpacity onPress={handleCancelMultiSelect}>
              <Text className="text-blue-600 font-medium">Cancel</Text>
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View className="flex-row gap-3">
            <TouchableOpacity className="flex-1 bg-red-600 py-3 rounded-lg items-center">
              <Text className="text-white font-medium">Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 bg-blue-600 py-3 rounded-lg items-center">
              <Text className="text-white font-medium">Edit</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Pricing Form Modal */}
      <PricingForm
        visible={showPricingForm}
        onClose={() => {
          setShowPricingForm(false);
          setSelectedItemForPricing(null);
        }}
        onSave={(pricing) => {
          if (selectedItemForPricing) {
            db.transact(db.tx.items[selectedItemForPricing.id].update({
              cost: pricing.cost,
              price: pricing.price,
              saleprice: pricing.saleprice
            }));
          }
        }}
        initialValues={selectedItemForPricing ? {
          cost: selectedItemForPricing.cost || 0,
          price: selectedItemForPricing.price || 0,
          saleprice: selectedItemForPricing.saleprice || 0
        } : undefined}
        title="Update Item Pricing"
      />
    </View>
  );
}
