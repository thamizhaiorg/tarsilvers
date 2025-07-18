import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, FlatList, Modal, BackHandler } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { id } from '@instantdb/react-native';
import { db } from '../lib/instant';
import { useStore } from '../lib/store-context';

interface VendorSelectProps {
  selectedVendor?: string;
  onSelect: (vendor: string) => void;
  onClose: () => void;
}

interface VendorItem {
  id: string;
  name: string;
  storeId: string;
}

export default function VendorSelect({ selectedVendor, onSelect, onClose }: VendorSelectProps) {
  const insets = useSafeAreaInsets();
  const { currentStore } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showBottomDrawer, setShowBottomDrawer] = useState(false);
  const [selectedVendorForAction, setSelectedVendorForAction] = useState<VendorItem | null>(null);
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

  // Query vendors from database with optimized schema
  const { isLoading, error, data } = db.useQuery(
    currentStore?.id ? {
      vendors: {
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

  const vendors = data?.vendors || [];

  if (isLoading) {
    return (
      <View style={{
        flex: 1,
        backgroundColor: '#fff',
        paddingTop: insets.top,
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <Text style={{ color: '#6B7280' }}>Loading vendors...</Text>
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
        <Text style={{ color: '#EF4444' }}>Error loading vendors: {error.message}</Text>
      </View>
    );
  }

  const filteredVendors = vendors.filter(vendor =>
    (vendor.name || '').toLowerCase().includes((searchQuery || '').toLowerCase())
  );

  const handleAddVendor = async () => {
    if (!searchQuery.trim()) return;

    const existingVendor = vendors.find(v =>
      v.name?.toLowerCase() === searchQuery.trim().toLowerCase()
    );

    if (existingVendor) {
      onSelect(existingVendor.id);
      onClose();
      return;
    }

    try {
      const newVendor = {
        name: searchQuery.trim(),
        storeId: currentStore.id,
      };

      const vendorId = id();
      await db.transact(db.tx.vendors[vendorId].update(newVendor));
      onSelect(vendorId);
      onClose();
    } catch (error) {
      console.error('Error adding vendor:', error);
      Alert.alert('Error', 'Failed to add vendor');
    }
  };

  const handleSelectVendor = (vendor: VendorItem) => {
    onSelect(vendor.id);
    onClose();
  };

  const handleLongPress = (vendor: VendorItem) => {
    setSelectedVendorForAction(vendor);
    setEditingName(vendor.name);
    setDeleteConfirmText('');
    setShowDeleteConfirm(false);
    setShowBottomDrawer(true);
  };

  const handleEditVendor = async () => {
    if (!selectedVendorForAction || !editingName.trim()) {
      setShowBottomDrawer(false);
      setSelectedVendorForAction(null);
      return;
    }

    try {
      await db.transact(
        db.tx.vendors[selectedVendorForAction.id].update({
          name: editingName.trim()
        })
      );
      setShowBottomDrawer(false);
      setSelectedVendorForAction(null);
      setDeleteConfirmText('');
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Error editing vendor:', error);
      Alert.alert('Error', 'Failed to edit vendor');
    }
  };

  const handleDeleteVendor = async () => {
    if (!selectedVendorForAction || deleteConfirmText !== selectedVendorForAction.name) {
      Alert.alert('Error', `Please type "${selectedVendorForAction?.name}" to confirm deletion`);
      return;
    }

    try {
      await db.transact(db.tx.vendors[selectedVendorForAction.id].delete());
      setShowBottomDrawer(false);
      setSelectedVendorForAction(null);
      setDeleteConfirmText('');
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Error deleting vendor:', error);
      Alert.alert('Error', 'Failed to delete vendor');
    }
  };

  const handleShowDeleteConfirm = () => {
    setShowDeleteConfirm(true);
    setDeleteConfirmText('');
  };

  const renderVendorItem = ({ item }: { item: VendorItem }) => (
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
      onPress={() => handleSelectVendor(item)}
      onLongPress={() => handleLongPress(item)}
    >
      <View style={{
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: selectedVendor === item.id ? '#3B82F6' : '#D1D5DB',
        backgroundColor: selectedVendor === item.id ? '#3B82F6' : 'transparent',
        marginRight: 16,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {selectedVendor === item.id && (
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
          Vendor
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
            placeholder="Search or add vendor"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleAddVendor}
            returnKeyType="done"
          />
        </View>
      </View>

      {/* Vendors List */}
      <FlatList
        data={filteredVendors}
        keyExtractor={(item) => item.id}
        renderItem={renderVendorItem}
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
                placeholder="Vendor Value"
                autoFocus={!showDeleteConfirm}
                onSubmitEditing={handleEditVendor}
                returnKeyType="done"
              />

              <TouchableOpacity onPress={handleEditVendor}>
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
                  Type "{selectedVendorForAction?.name}" to confirm deletion
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
                  placeholder={selectedVendorForAction?.name}
                  autoFocus={true}
                  onSubmitEditing={handleDeleteVendor}
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
                      backgroundColor: deleteConfirmText === selectedVendorForAction?.name ? '#EF4444' : '#F3F4F6',
                      paddingVertical: 8,
                      alignItems: 'center',
                    }}
                    onPress={handleDeleteVendor}
                    disabled={deleteConfirmText !== selectedVendorForAction?.name}
                  >
                    <Text style={{
                      color: deleteConfirmText === selectedVendorForAction?.name ? '#fff' : '#9CA3AF',
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
