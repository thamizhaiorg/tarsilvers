import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, FlatList, Modal, BackHandler } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { id } from '@instantdb/react-native';
import { db, getCurrentTimestamp } from '../lib/instant';
import { useStore } from '../lib/store-context';

interface CollectionSelectProps {
  selectedCollection?: string;
  onSelect: (collectionId: string, collectionName: string) => void;
  onClose: () => void;
}

interface CollectionItem {
  id: string;
  name: string;
  description?: string;
  parent?: string;
  isActive: boolean;
  sortOrder?: number;
  createdAt: Date;
  updatedAt: Date;
}

export default function CollectionSelect({ selectedCollection, onSelect, onClose }: CollectionSelectProps) {
  const insets = useSafeAreaInsets();
  const { isLoading: storeLoading } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showBottomDrawer, setShowBottomDrawer] = useState(false);
  const [selectedCollectionForAction, setSelectedCollectionForAction] = useState<CollectionItem | null>(null);
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

  // Query collections from database with optimized schema
  const { isLoading, error, data } = db.useQuery({
    collections: {
      $: {
        order: {
          name: 'asc' // Use indexed field for ordering
        }
      }
    }
  });

  const collections = data?.collections || [];

  if (isLoading) {
    return (
      <View style={{
        flex: 1,
        backgroundColor: '#fff',
        paddingTop: insets.top,
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <Text style={{ color: '#6B7280' }}>Loading collections...</Text>
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
        <Text style={{ color: '#EF4444' }}>Error loading collections: {error.message}</Text>
      </View>
    );
  }

  const filteredCollections = collections.filter(collection =>
    collection.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddCollection = async () => {
    if (!searchQuery.trim()) return;

    const existingCollection = collections.find(c =>
      c.name?.toLowerCase() === searchQuery.trim().toLowerCase()
    );

    if (existingCollection) {
      onSelect(existingCollection.id, existingCollection.name);
      onClose();
      return;
    }

    try {
      const timestamp = getCurrentTimestamp();
      const newCollectionId = id();
      const newCollection = {
        name: searchQuery.trim(),
        isActive: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      await db.transact(db.tx.collections[newCollectionId].update(newCollection));
      onSelect(newCollectionId, searchQuery.trim());
      onClose();
    } catch (error) {
      console.error('Error adding collection:', error);
      Alert.alert('Error', 'Failed to add collection');
    }
  };

  const handleSelectCollection = (collection: CollectionItem) => {
    // If the same collection is selected, deselect it
    if (selectedCollection === collection.id) {
      onSelect('', ''); // Pass empty strings to indicate no selection
      onClose();
    } else {
      onSelect(collection.id, collection.name);
      onClose();
    }
  };

  const handleLongPress = (collection: CollectionItem) => {
    setSelectedCollectionForAction(collection);
    setEditingName(collection.name);
    setDeleteConfirmText('');
    setShowDeleteConfirm(false);
    setShowBottomDrawer(true);
  };

  const handleEditCollection = async () => {
    if (!selectedCollectionForAction || !editingName.trim()) {
      setShowBottomDrawer(false);
      setSelectedCollectionForAction(null);
      return;
    }

    try {
      await db.transact(
        db.tx.collections[selectedCollectionForAction.id].update({
          name: editingName.trim(),
          updatedAt: getCurrentTimestamp()
        })
      );
      setShowBottomDrawer(false);
      setSelectedCollectionForAction(null);
      setDeleteConfirmText('');
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Error editing collection:', error);
      Alert.alert('Error', 'Failed to edit collection');
    }
  };

  const handleDeleteCollection = async () => {
    if (!selectedCollectionForAction || deleteConfirmText !== selectedCollectionForAction.name) {
      Alert.alert('Error', `Please type "${selectedCollectionForAction?.name}" to confirm deletion`);
      return;
    }

    try {
      await db.transact(db.tx.collections[selectedCollectionForAction.id].delete());
      setShowBottomDrawer(false);
      setSelectedCollectionForAction(null);
      setDeleteConfirmText('');
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Error deleting collection:', error);
      Alert.alert('Error', 'Failed to delete collection');
    }
  };

  const handleShowDeleteConfirm = () => {
    setShowDeleteConfirm(true);
    setDeleteConfirmText('');
  };

  const renderCollectionItem = ({ item }: { item: CollectionItem }) => (
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
      onPress={() => handleSelectCollection(item)}
      onLongPress={() => handleLongPress(item)}
    >
      <View style={{
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: selectedCollection === item.id ? '#3B82F6' : '#D1D5DB',
        backgroundColor: selectedCollection === item.id ? '#3B82F6' : 'transparent',
        marginRight: 16,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {selectedCollection === item.id && (
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
          Collection
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
            placeholder="Search or add collection"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleAddCollection}
            returnKeyType="done"
          />
        </View>
      </View>

      {/* Collections List */}
      <FlatList
        data={filteredCollections}
        keyExtractor={(item) => item.id}
        renderItem={renderCollectionItem as any}
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
                placeholder="Collection Value"
                autoFocus={!showDeleteConfirm}
                onSubmitEditing={handleEditCollection}
                returnKeyType="done"
              />

              <TouchableOpacity onPress={handleEditCollection}>
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
                  Type "{selectedCollectionForAction?.name}" to confirm deletion
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
                  placeholder={selectedCollectionForAction?.name}
                  autoFocus={true}
                  onSubmitEditing={handleDeleteCollection}
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
                      backgroundColor: deleteConfirmText === selectedCollectionForAction?.name ? '#EF4444' : '#F3F4F6',
                      paddingVertical: 8,
                      alignItems: 'center',
                    }}
                    onPress={handleDeleteCollection}
                    disabled={deleteConfirmText !== selectedCollectionForAction?.name}
                  >
                    <Text style={{
                      color: deleteConfirmText === selectedCollectionForAction?.name ? '#fff' : '#9CA3AF',
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
