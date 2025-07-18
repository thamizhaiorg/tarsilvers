import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../lib/instant';

interface GroupManagerProps {
  currentGroup: string;
  onGroupSelect: (group: string) => void;
  storeId: string;
  onGroupRenamed?: (oldName: string, newName: string) => void;
  initialGroups?: string[]; // Allow passing initial group names
}

const DEFAULT_GROUPS = ['Group 1', 'Group 2', 'Group 3'];
const GROUPS_VERSION = '2.0'; // Increment this to force reset of old custom names

export default function GroupManager({ currentGroup, onGroupSelect, storeId, onGroupRenamed, initialGroups }: GroupManagerProps) {
  const [groups, setGroups] = useState<string[]>(DEFAULT_GROUPS);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number>(-1);
  const [editingName, setEditingName] = useState('');

  // Reset groups to defaults (for clearing old custom names)
  const resetToDefaults = async () => {
    try {
      const key = `option_groups_${storeId}`;
      await AsyncStorage.removeItem(key);
      setGroups(DEFAULT_GROUPS);
      // If current group is not in defaults, reset to first default
      if (!DEFAULT_GROUPS.includes(currentGroup)) {
        onGroupSelect(DEFAULT_GROUPS[0]);
      }
    } catch (error) {
      console.error('Error resetting groups:', error);
    }
  };

  // Load custom groups from storage
  useEffect(() => {
    loadGroups();
  }, [storeId, initialGroups]);

  // Ensure first group is selected by default if no current group is set
  useEffect(() => {
    if (!currentGroup && groups.length > 0) {
      onGroupSelect(groups[0]);
    }
  }, [groups, currentGroup, onGroupSelect]);

  const loadGroups = async () => {
    try {
      // If initialGroups are provided, use them and save to storage
      if (initialGroups && initialGroups.length === 3) {
        setGroups(initialGroups);
        const key = `option_groups_${storeId}`;
        await AsyncStorage.setItem(key, JSON.stringify(initialGroups));
        return;
      }

      const key = `option_groups_${storeId}`;
      const stored = await AsyncStorage.getItem(key);

      if (stored) {
        const parsedGroups = JSON.parse(stored);
        if (Array.isArray(parsedGroups) && parsedGroups.length === 3) {
          setGroups(parsedGroups);
        } else {
          // Reset to defaults if stored data is invalid
          setGroups(DEFAULT_GROUPS);
        }
      } else {
        // No stored groups, use defaults
        setGroups(DEFAULT_GROUPS);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
      // Fallback to defaults on error
      setGroups(DEFAULT_GROUPS);
    }
  };

  const saveGroups = async (newGroups: string[]) => {
    try {
      const key = `option_groups_${storeId}`;
      await AsyncStorage.setItem(key, JSON.stringify(newGroups));
      setGroups(newGroups);
    } catch (error) {
      console.error('Error saving groups:', error);
    }
  };

  const handleEditGroup = (index: number) => {
    setEditingIndex(index);
    setEditingName(groups[index]);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    const trimmedName = editingName.trim();
    if (!trimmedName) {
      Alert.alert('Error', 'Group name cannot be empty');
      return;
    }

    if (trimmedName.length > 20) {
      Alert.alert('Error', 'Group name must be 20 characters or less');
      return;
    }

    const oldGroupName = groups[editingIndex];
    const newGroupName = trimmedName;

    // If the name hasn't changed, just close the modal
    if (oldGroupName === newGroupName) {
      setShowEditModal(false);
      return;
    }

    try {
      // Update the group names in local state only
      const newGroups = [...groups];
      newGroups[editingIndex] = trimmedName;
      setGroups(newGroups);
      await saveGroups(newGroups);

      // Notify parent component about the group rename (for local state update)
      if (onGroupRenamed) {
        onGroupRenamed(oldGroupName, newGroupName);
      }

      setShowEditModal(false);

    } catch (error) {
      console.error('Error updating group name:', error);
      Alert.alert('Error', 'Failed to update group name. Please try again.');
    }
  };

  const renderGroupTab = (group: string, index: number) => {
    const isSelected = currentGroup === group;

    return (
      <View key={index} style={{ flex: 1 }}>
        <TouchableOpacity
          onPress={() => onGroupSelect(group)}
          onLongPress={() => handleEditGroup(index)}
          style={{
            paddingVertical: 8,
            paddingHorizontal: 12,
            backgroundColor: '#fff',
            borderBottomWidth: isSelected ? 2 : 1,
            borderBottomColor: isSelected ? '#007AFF' : '#E5E7EB',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: isSelected ? '600' : '400',
              color: isSelected ? '#007AFF' : '#8E8E93',
              textAlign: 'center',
            }}
            numberOfLines={1}
          >
            {group}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View>
      <View style={{
        flexDirection: 'row',
      }}>
        {groups.map((group, index) => renderGroupTab(group, index))}
      </View>

      {/* Edit Group Modal */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 40,
        }}>
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 24,
            width: '100%',
            maxWidth: 300,
          }}>
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: '#111827',
              marginBottom: 16,
              textAlign: 'center',
            }}>
              Edit Group Name
            </Text>
            
            <TextInput
              style={{
                backgroundColor: '#F9FAFB',
                borderWidth: 1,
                borderColor: '#E5E7EB',
                borderRadius: 8,
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontSize: 16,
                color: '#111827',
                marginBottom: 20,
              }}
              placeholder="Enter group name"
              placeholderTextColor="#9CA3AF"
              value={editingName}
              onChangeText={setEditingName}
              maxLength={20}
              autoFocus={true}
            />

            <View style={{
              flexDirection: 'row',
              gap: 12,
            }}>
              <TouchableOpacity
                onPress={() => setShowEditModal(false)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  backgroundColor: '#F3F4F6',
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{
                  fontSize: 16,
                  fontWeight: '500',
                  color: '#6B7280',
                }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveEdit}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  backgroundColor: '#3B82F6',
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: 'white',
                }}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
