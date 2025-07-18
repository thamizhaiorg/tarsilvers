import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, StatusBar, BackHandler } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface GroupFormProps {
  groupName?: string;
  onSave: (groupName: string) => void;
  onClose: () => void;
}

export default function GroupForm({
  groupName,
  onSave,
  onClose
}: GroupFormProps) {
  const insets = useSafeAreaInsets();
  const isEditing = !!groupName;

  const [formGroupName, setFormGroupName] = useState(groupName || '');

  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      onClose();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [onClose]);

  const handleSave = () => {
    if (!formGroupName.trim()) {
      return;
    }

    onSave(formGroupName.trim());
  };

  const canSave = formGroupName.trim().length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: 'white', paddingTop: insets.top }}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 20,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
      }}>
        <Text style={{
          fontSize: 18,
          fontWeight: '600',
          color: '#1C1C1E',
          flex: 1,
        }}>
          {isEditing ? 'Edit Group' : 'Add Group'}
        </Text>

        <TouchableOpacity
          onPress={handleSave}
          disabled={!canSave}
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: canSave ? '#007AFF' : '#E5E5EA',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialCommunityIcons
            name="check"
            size={20}
            color={canSave ? '#fff' : '#C7C7CC'}
          />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={{ padding: 20 }}>
        <Text style={{ fontSize: 16, fontWeight: '500', marginBottom: 8, color: '#1C1C1E' }}>
          Group Name
        </Text>
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: '#E5E7EB',
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 12,
            fontSize: 16,
            marginBottom: 20,
          }}
          value={formGroupName}
          onChangeText={setFormGroupName}
          placeholder="Enter group name (e.g., Specifications, Dimensions)"
          autoFocus={!isEditing}
        />

        <Text style={{
          fontSize: 14,
          color: '#6B7280',
          lineHeight: 20,
        }}>
          Groups help organize your metafields. Common groups include Specifications, Dimensions, Materials, Care Instructions, and SEO.
        </Text>
      </View>
    </View>
  );
}
