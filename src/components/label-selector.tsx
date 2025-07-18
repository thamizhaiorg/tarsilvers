import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface LabelSelectorProps {
  visible: boolean;
  currentType: 'text' | 'color' | 'image';
  currentValue: string;
  onClose: () => void;
  onSave: (type: 'text' | 'color' | 'image', value: string) => void;
}

export default function LabelSelector({
  visible,
  currentType,
  currentValue,
  onClose,
  onSave
}: LabelSelectorProps) {
  const [selectedType, setSelectedType] = useState<'text' | 'color' | 'image'>(currentType);
  const [value, setValue] = useState(currentValue);

  const handleSave = () => {
    if (!value.trim()) {
      Alert.alert('Error', 'Please enter a value');
      return;
    }
    onSave(selectedType, value.trim());
    onClose();
  };

  const colors = [
    '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
    '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
    '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
    '#EC4899', '#F43F5E', '#6B7280', '#374151', '#111827'
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end'
      }}>
        <View style={{
          backgroundColor: 'white',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          paddingTop: 20,
          paddingBottom: 40,
          paddingHorizontal: 20,
          maxHeight: '80%'
        }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 24
          }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827' }}>
              Label Type
            </Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Type Selector */}
          <View style={{
            flexDirection: 'row',
            marginBottom: 24,
            backgroundColor: '#F3F4F6',
            borderRadius: 8,
            padding: 4
          }}>
            {(['text', 'color', 'image'] as const).map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => {
                  setSelectedType(type);
                  if (type === 'text') setValue(currentValue);
                  if (type === 'color') setValue('#3B82F6');
                  if (type === 'image') setValue('');
                }}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  backgroundColor: selectedType === type ? 'white' : 'transparent',
                  borderRadius: 6,
                  alignItems: 'center'
                }}
              >
                <Text style={{
                  fontSize: 14,
                  fontWeight: selectedType === type ? '600' : '400',
                  color: selectedType === type ? '#111827' : '#6B7280',
                  textTransform: 'capitalize'
                }}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Value Input */}
          {selectedType === 'text' && (
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
                Label Text
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#D1D5DB',
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 16,
                  color: '#111827'
                }}
                placeholder="Enter text"
                value={value}
                onChangeText={setValue}
                autoFocus
              />
            </View>
          )}

          {selectedType === 'color' && (
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
                Select Color
              </Text>
              <View style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8
              }}>
                {colors.map((color) => (
                  <TouchableOpacity
                    key={color}
                    onPress={() => setValue(color)}
                    style={{
                      width: 40,
                      height: 40,
                      backgroundColor: color,
                      borderRadius: 8,
                      borderWidth: value === color ? 3 : 1,
                      borderColor: value === color ? '#111827' : '#E5E7EB'
                    }}
                  />
                ))}
              </View>
            </View>
          )}

          {selectedType === 'image' && (
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
                Image Upload
              </Text>
              <TouchableOpacity
                style={{
                  borderWidth: 2,
                  borderColor: '#D1D5DB',
                  borderStyle: 'dashed',
                  borderRadius: 8,
                  paddingVertical: 32,
                  alignItems: 'center'
                }}
                onPress={() => {
                  // TODO: Implement image picker
                  setValue('image_placeholder.jpg');
                }}
              >
                <MaterialIcons name="cloud-upload" size={32} color="#9CA3AF" />
                <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 8 }}>
                  Tap to upload image
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Save Button */}
          <TouchableOpacity
            onPress={handleSave}
            style={{
              backgroundColor: '#3B82F6',
              paddingVertical: 12,
              borderRadius: 8,
              alignItems: 'center'
            }}
          >
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
              Save
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
