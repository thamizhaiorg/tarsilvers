import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, FlatList, Modal, BackHandler } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { id } from '@instantdb/react-native';
import { db, getCurrentTimestamp } from '../lib/instant';

interface TagSelectProps {
  selectedTags?: string[];
  onSelect: (tags: string[]) => void;
  onClose: () => void;
}

interface TagItem {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export default function TagSelect({ selectedTags = [], onSelect, onClose }: TagSelectProps) {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [showBottomDrawer, setShowBottomDrawer] = useState(false);
  const [selectedTagForAction, setSelectedTagForAction] = useState<TagItem | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [localSelectedTags, setLocalSelectedTags] = useState<string[]>(selectedTags);

  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      onClose();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [onClose]);

  // Query tags from database with optimized schema
  const { isLoading, error, data } = db.useQuery({
    tags: {
      $: {
        order: {
          name: 'asc' // Use indexed field for ordering
        }
      }
    }
  });

  const tags: TagItem[] = (data?.tags || []).map(tag => ({
    ...tag,
    createdAt: new Date(tag.createdAt),
    updatedAt: tag.updatedAt ? new Date(tag.updatedAt) : undefined
  }));

  // Filter tags based on search query
  const filteredTags = tags.filter(tag =>
    (tag.name || '').toLowerCase().includes((searchQuery || '').toLowerCase())
  );

  const handleSelectTag = (tag: TagItem) => {
    const isSelected = localSelectedTags.includes(tag.name);
    let newSelectedTags: string[];
    
    if (isSelected) {
      newSelectedTags = localSelectedTags.filter(t => t !== tag.name);
    } else {
      newSelectedTags = [...localSelectedTags, tag.name];
    }
    
    setLocalSelectedTags(newSelectedTags);
    onSelect(newSelectedTags);
  };

  const handleLongPress = (tag: TagItem) => {
    setSelectedTagForAction(tag);
    setEditingName(tag.name);
    setShowBottomDrawer(true);
  };

  const handleCreateTag = async () => {
    if (!searchQuery.trim()) return;

    try {
      const tagId = id();
      const timestamp = getCurrentTimestamp();
      await db.transact(db.tx.tags[tagId].update({
        name: searchQuery.trim(),
        createdAt: timestamp,
        updatedAt: timestamp,
      }));
      setSearchQuery('');
    } catch (error) {
      console.error('Failed to create tag:', error);
      Alert.alert('Error', 'Failed to create tag. Please try again.');
    }
  };

  const handleEditTag = async () => {
    if (!editingName.trim() || !selectedTagForAction) return;

    try {
      await db.transact(db.tx.tags[selectedTagForAction.id].update({
        name: editingName.trim(),
        updatedAt: getCurrentTimestamp(),
      }));
      setShowBottomDrawer(false);
      setSelectedTagForAction(null);
    } catch (error) {
      console.error('Failed to edit tag:', error);
      Alert.alert('Error', 'Failed to edit tag. Please try again.');
    }
  };

  const handleDeleteTag = async () => {
    if (!selectedTagForAction || deleteConfirmText !== selectedTagForAction.name) return;

    try {
      await db.transact(db.tx.tags[selectedTagForAction.id].delete());
      setShowBottomDrawer(false);
      setSelectedTagForAction(null);
      setShowDeleteConfirm(false);
      setDeleteConfirmText('');
    } catch (error) {
      console.error('Failed to delete tag:', error);
      Alert.alert('Error', 'Failed to delete tag. Please try again.');
    }
  };

  const handleShowDeleteConfirm = () => {
    setShowDeleteConfirm(true);
    setDeleteConfirmText('');
  };

  const renderTagItem = ({ item }: { item: TagItem }) => {
    const isSelected = localSelectedTags.includes(item.name);
    
    return (
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
        onPress={() => handleSelectTag(item)}
        onLongPress={() => handleLongPress(item)}
      >
        <View style={{
          width: 20,
          height: 20,
          borderRadius: 4,
          borderWidth: 2,
          borderColor: isSelected ? '#3B82F6' : '#D1D5DB',
          backgroundColor: isSelected ? '#3B82F6' : 'transparent',
          marginRight: 16,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {isSelected && (
            <Ionicons name="checkmark" size={12} color="#fff" />
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
  };

  const showCreateOption = searchQuery.trim() && !filteredTags.some(tag => 
    (tag.name || '').toLowerCase() === searchQuery.toLowerCase()
  );

  return (
    <View style={{
      flex: 1,
      backgroundColor: '#fff',
      paddingTop: insets.top / 3,
    }}>
      {/* Header - Reduced spacing, title aligned left */}
      <View style={{
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
      }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827' }}>
          Tags
        </Text>
      </View>

      {/* Search Bar - Matching products list design */}
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
            placeholder="Search tags..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>



      {/* Create New Tag Option */}
      {showCreateOption && (
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#F9FAFB',
            paddingVertical: 16,
            paddingHorizontal: 20,
            borderBottomWidth: 1,
            borderBottomColor: '#E5E7EB',
          }}
          onPress={handleCreateTag}
        >
          <View style={{
            width: 20,
            height: 20,
            borderRadius: 4,
            borderWidth: 2,
            borderColor: '#3B82F6',
            backgroundColor: 'transparent',
            marginRight: 16,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Ionicons name="add" size={12} color="#3B82F6" />
          </View>
          <Text style={{
            fontSize: 17,
            color: '#3B82F6',
            flex: 1,
            fontWeight: '500',
          }}>
            Create "{searchQuery.trim()}"
          </Text>
        </TouchableOpacity>
      )}

      {/* Tags List */}
      <FlatList
        data={filteredTags}
        keyExtractor={(item) => item.id}
        renderItem={renderTagItem}
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
          >
            {!showDeleteConfirm ? (
              <View>
                <View style={{ paddingHorizontal: 20, paddingVertical: 16 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 12 }}>
                    Edit Tag
                  </Text>
                  <TextInput
                    style={{
                      borderWidth: 1,
                      borderColor: '#E5E7EB',
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      fontSize: 16,
                      color: '#111827',
                    }}
                    value={editingName}
                    onChangeText={setEditingName}
                    placeholder="Tag name"
                  />
                </View>
                <View style={{ flexDirection: 'row' }}>
                  <TouchableOpacity
                    onPress={handleShowDeleteConfirm}
                    style={{
                      flex: 1,
                      paddingVertical: 16,
                      alignItems: 'center',
                      backgroundColor: '#FEF2F2',
                    }}
                  >
                    <Text style={{ fontSize: 16, fontWeight: '500', color: '#EF4444' }}>
                      Delete
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleEditTag}
                    style={{
                      flex: 1,
                      paddingVertical: 16,
                      alignItems: 'center',
                      backgroundColor: '#3B82F6',
                    }}
                  >
                    <Text style={{ fontSize: 16, fontWeight: '500', color: '#fff' }}>
                      Save
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View>
                <View style={{ paddingHorizontal: 20, paddingVertical: 16 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
                    Delete Tag
                  </Text>
                  <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 12 }}>
                    Type "{selectedTagForAction?.name}" to confirm deletion:
                  </Text>
                  <TextInput
                    style={{
                      borderWidth: 1,
                      borderColor: '#E5E7EB',
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      fontSize: 16,
                      color: '#111827',
                    }}
                    value={deleteConfirmText}
                    onChangeText={setDeleteConfirmText}
                    placeholder={selectedTagForAction?.name}
                  />
                </View>
                <View style={{ flexDirection: 'row' }}>
                  <TouchableOpacity
                    onPress={() => setShowDeleteConfirm(false)}
                    style={{
                      flex: 1,
                      paddingVertical: 16,
                      alignItems: 'center',
                      backgroundColor: '#F3F4F6',
                    }}
                  >
                    <Text style={{ fontSize: 16, fontWeight: '500', color: '#374151' }}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleDeleteTag}
                    disabled={deleteConfirmText !== selectedTagForAction?.name}
                    style={{
                      flex: 1,
                      paddingVertical: 16,
                      alignItems: 'center',
                      backgroundColor: deleteConfirmText === selectedTagForAction?.name ? '#EF4444' : '#F3F4F6',
                    }}
                  >
                    <Text style={{
                      fontSize: 16,
                      fontWeight: '500',
                      color: deleteConfirmText === selectedTagForAction?.name ? '#fff' : '#9CA3AF',
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
