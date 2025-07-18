import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, FlatList, Modal, BackHandler } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { id } from '@instantdb/react-native';
import { db } from '../lib/instant';
import { useStore } from '../lib/store-context';

interface BrandSelectProps {
  selectedBrand?: string;
  onSelect: (brand: string) => void;
  onClose: () => void;
}

interface BrandItem {
  id: string;
  name: string;
  storeId: string;
}

export default function BrandSelect({ selectedBrand, onSelect, onClose }: BrandSelectProps) {
  const insets = useSafeAreaInsets();
  const { currentStore } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showBottomDrawer, setShowBottomDrawer] = useState(false);
  const [selectedBrandForAction, setSelectedBrandForAction] = useState<BrandItem | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      onClose();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [onClose]);

  // Query brands from database with optimized schema
  const { isLoading, error, data } = db.useQuery(
    currentStore?.id ? {
      brands: {
        $: {
          where: {
            storeId: currentStore.id
          },
          order: {
            name: 'asc' // Use indexed field for ordering
          }
        }
      }
    } : null
  );

  const brands = data?.brands || [];

  if (isLoading) {
    return (
      <View style={{
        flex: 1,
        backgroundColor: '#fff',
        paddingTop: insets.top,
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <Text style={{ color: '#6B7280' }}>Loading brands...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{
        flex: 1,
        backgroundColor: '#fff',
        paddingTop: insets.top,
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <Text style={{ color: '#EF4444' }}>Error loading brands: {error.message}</Text>
      </View>
    );
  }

  const filteredBrands = brands.filter(brand =>
    brand.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddBrand = async () => {
    if (!searchQuery.trim()) return;

    const existingBrand = brands.find(b =>
      b.name?.toLowerCase() === searchQuery.trim().toLowerCase()
    );

    if (existingBrand) {
      onSelect(existingBrand.id);
      onClose();
      return;
    }

    try {
      const newBrand = {
        name: searchQuery.trim(),
        storeId: currentStore.id,
      };

      const brandId = id();
      await db.transact(db.tx.brands[brandId].update(newBrand));
      onSelect(brandId);
      onClose();
    } catch (error) {
      console.error('Error adding brand:', error);
      Alert.alert('Error', 'Failed to add brand');
    }
  };

  const handleSelectBrand = (brand: BrandItem) => {
    onSelect(brand.id);
    onClose();
  };

  const handleLongPress = (brand: BrandItem) => {
    setSelectedBrandForAction(brand);
    setEditingName(brand.name);
    setDeleteConfirmText('');
    setShowDeleteConfirm(false);
    setShowBottomDrawer(true);
  };

  const handleEditBrand = async () => {
    if (!selectedBrandForAction || !editingName.trim()) {
      setShowBottomDrawer(false);
      setSelectedBrandForAction(null);
      return;
    }

    try {
      await db.transact(
        db.tx.brands[selectedBrandForAction.id].update({
          name: editingName.trim()
        })
      );
      setShowBottomDrawer(false);
      setSelectedBrandForAction(null);
      setDeleteConfirmText('');
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Error editing brand:', error);
      Alert.alert('Error', 'Failed to edit brand');
    }
  };

  const handleDeleteBrand = async () => {
    if (!selectedBrandForAction || deleteConfirmText !== selectedBrandForAction.name) {
      Alert.alert('Error', `Please type "${selectedBrandForAction?.name}" to confirm deletion`);
      return;
    }

    try {
      await db.transact(db.tx.brands[selectedBrandForAction.id].delete());
      setShowBottomDrawer(false);
      setSelectedBrandForAction(null);
      setDeleteConfirmText('');
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Error deleting brand:', error);
      Alert.alert('Error', 'Failed to delete brand');
    }
  };

  const handleShowDeleteConfirm = () => {
    setShowDeleteConfirm(true);
    setDeleteConfirmText('');
  };

  const renderBrandItem = ({ item }: { item: BrandItem }) => (
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
      onPress={() => handleSelectBrand(item)}
      onLongPress={() => handleLongPress(item)}
    >
      <View style={{
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: selectedBrand === item.id ? '#3B82F6' : '#D1D5DB',
        backgroundColor: selectedBrand === item.id ? '#3B82F6' : 'transparent',
        marginRight: 16,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {selectedBrand === item.id && (
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
          Brand
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
            placeholder="Search or add brand"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleAddBrand}
            returnKeyType="done"
          />
        </View>
      </View>

      {/* Brands List */}
      <FlatList
        data={filteredBrands}
        keyExtractor={(item) => item.id}
        renderItem={renderBrandItem}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Bottom Drawer Modal */}
      <Modal
        visible={showBottomDrawer}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowBottomDrawer(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: 'transparent',
            justifyContent: 'flex-end',
          }}
          activeOpacity={1}
          onPress={() => setShowBottomDrawer(false)}
        >
          <TouchableOpacity
            style={{
              backgroundColor: '#fff',
              width: '100%',
              paddingBottom: insets.bottom,
              borderTopWidth: 1,
              borderTopColor: '#E5E7EB',
            }}
            activeOpacity={1}
            onPress={() => {}}
          >
            {/* Header */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 16,
            }}>
              <TouchableOpacity
                style={{
                  backgroundColor: '#fff',
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  marginRight: 12,
                }}
                onPress={handleShowDeleteConfirm}
              >
                <Text style={{
                  fontSize: 14,
                  color: '#EF4444',
                  fontWeight: '500',
                }}>
                  D
                </Text>
              </TouchableOpacity>

              <TextInput
                style={{
                  fontSize: 16,
                  fontWeight: '500',
                  color: '#111827',
                  flex: 1,
                  paddingVertical: 8,
                }}
                value={editingName}
                onChangeText={setEditingName}
                placeholder="Brand Value"
                autoFocus={!showDeleteConfirm}
                onSubmitEditing={handleEditBrand}
                returnKeyType="done"
              />

              <TouchableOpacity onPress={handleEditBrand}>
                <Ionicons name="checkmark" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Delete Confirmation Section */}
            {showDeleteConfirm && (
              <View style={{
                paddingHorizontal: 16,
                paddingBottom: 16,
                borderTopWidth: 1,
                borderTopColor: '#E5E7EB',
                paddingTop: 16,
              }}>
                <Text style={{ fontSize: 14, color: '#EF4444', marginBottom: 8, fontWeight: '500' }}>
                  Type "{selectedBrandForAction?.name}" to confirm deletion
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: '#EF4444',
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    fontSize: 16,
                    color: '#111827',
                    backgroundColor: '#fff',
                  }}
                  value={deleteConfirmText}
                  onChangeText={setDeleteConfirmText}
                  placeholder={selectedBrandForAction?.name}
                  autoFocus={true}
                  onSubmitEditing={handleDeleteBrand}
                  returnKeyType="done"
                />

                {/* Delete Action Buttons */}
                <View style={{
                  flexDirection: 'row',
                  marginTop: 12,
                  gap: 8,
                }}>
                  <TouchableOpacity
                    style={{
                      paddingHorizontal: 16,
                      backgroundColor: '#fff',
                      paddingVertical: 8,
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: '#E5E7EB',
                    }}
                    onPress={() => setShowDeleteConfirm(false)}
                  >
                    <Text style={{ color: '#6B7280', fontSize: 14, fontWeight: '500' }}>
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: deleteConfirmText === selectedBrandForAction?.name ? '#EF4444' : '#F3F4F6',
                      paddingVertical: 8,
                      alignItems: 'center',
                    }}
                    onPress={handleDeleteBrand}
                    disabled={deleteConfirmText !== selectedBrandForAction?.name}
                  >
                    <Text style={{
                      color: deleteConfirmText === selectedBrandForAction?.name ? '#fff' : '#9CA3AF',
                      fontSize: 14,
                      fontWeight: '500'
                    }}>
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
