import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, StatusBar, BackHandler } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface IdentifierEditScreenProps {
  currentType: 'text' | 'color' | 'image';
  currentValue: string;
  onClose: () => void;
  onSave: (type: 'text' | 'color' | 'image', value: string) => void;
}

export default function IdentifierEditScreen({ 
  currentType, 
  currentValue, 
  onClose, 
  onSave 
}: IdentifierEditScreenProps) {
  const insets = useSafeAreaInsets();
  const [selectedType, setSelectedType] = useState<'text' | 'color' | 'image'>(currentType);
  const [value, setValue] = useState(currentValue);

  // ...existing code...

  const handleSave = () => {
    if (!value.trim()) return;
    onSave(selectedType, value.trim());
  };

  const renderTypeButton = (type: 'text' | 'color' | 'image', icon: string, label: string) => {
    const isSelected = selectedType === type;
    return (
      <TouchableOpacity
        onPress={() => setSelectedType(type)}
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 12,
          backgroundColor: isSelected ? '#F3F4F6' : '#fff',
          borderWidth: 1,
          borderColor: '#E5E7EB',
          borderRadius: 8,
        }}
      >
        <MaterialIcons
          name={icon as any}
          size={20}
          color={isSelected ? '#111827' : '#6B7280'}
        />
        <Text style={{
          fontSize: 12,
          fontWeight: '500',
          color: isSelected ? '#111827' : '#6B7280',
          marginTop: 4,
        }}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderPreview = () => {
    if (!value.trim()) return null;

    return (
      <View style={{
        alignItems: 'center',
        marginVertical: 24,
      }}>
        <Text style={{
          fontSize: 16,
          fontWeight: '500',
          color: '#111827',
          marginBottom: 12,
        }}>
          Preview
        </Text>

        <View style={{
          width: 60,
          height: 60,
          borderRadius: 8,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: selectedType === 'color' ? (value.trim() || '#F3F4F6') : '#F3F4F6',
          borderWidth: 1,
          borderColor: '#E5E7EB',
        }}>
          {selectedType === 'text' && (
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: '#111827'
            }}>
              {value.trim().substring(0, 2).toUpperCase()}
            </Text>
          )}
          {selectedType === 'image' && (
            <MaterialIcons name="image" size={28} color="#6B7280" />
          )}
          {selectedType === 'color' && !value.trim() && (
            <MaterialIcons name="palette" size={28} color="#6B7280" />
          )}
        </View>
      </View>
    );
  };

  const renderColorPresets = () => {
    if (selectedType !== 'color') return null;

    const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080'];

    return (
      <View style={{ marginTop: 16 }}>
        <Text style={{
          fontSize: 14,
          fontWeight: '500',
          color: '#8E8E93',
          marginBottom: 8,
        }}>
          Quick Colors
        </Text>
        <View style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
        }}>
          {colors.map((color) => (
            <TouchableOpacity
              key={color}
              onPress={() => setValue(color)}
              style={{
                width: 32,
                height: 32,
                backgroundColor: color,
                borderRadius: 6,
                borderWidth: value === color ? 2 : 1,
                borderColor: value === color ? '#007AFF' : '#E5E5EA',
              }}
            />
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={{
        paddingTop: insets.top,
        paddingHorizontal: 16,
        paddingBottom: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 16,
        }}>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ fontSize: 16, color: '#6B7280' }}>Cancel</Text>
          </TouchableOpacity>

          <Text style={{
            fontSize: 18,
            fontWeight: '600',
            color: '#111827',
          }}>
            Edit Identifier
          </Text>

          <TouchableOpacity
            onPress={handleSave}
            disabled={!value.trim()}
          >
            <Text style={{
              fontSize: 16,
              color: !value.trim() ? '#9CA3AF' : '#3B82F6',
              fontWeight: '600',
            }}>
              Save
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Type Selection */}
      <View style={{
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        paddingVertical: 16,
        paddingHorizontal: 16,
      }}>
        <Text style={{
          fontSize: 16,
          fontWeight: '500',
          color: '#111827',
          marginBottom: 12,
        }}>
          Identifier Type
        </Text>

        <View style={{
          flexDirection: 'row',
          gap: 8,
        }}>
          {renderTypeButton('text', 'text-fields', 'Text')}
          {renderTypeButton('color', 'palette', 'Color')}
          {renderTypeButton('image', 'image', 'Image')}
        </View>
      </View>

      {/* Value Input */}
      <View style={{
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        paddingVertical: 16,
        paddingHorizontal: 16,
      }}>
        <Text style={{
          fontSize: 16,
          fontWeight: '500',
          color: '#111827',
          marginBottom: 12,
        }}>
          {selectedType === 'text' ? 'Text Value' :
           selectedType === 'color' ? 'Color Value' : 'Image URL'}
        </Text>

        <TextInput
          style={{
            fontSize: 16,
            color: '#111827',
            paddingVertical: 8,
            paddingHorizontal: 0,
            borderWidth: 0,
            backgroundColor: 'transparent',
          }}
          placeholder={
            selectedType === 'text' ? 'Enter text (e.g., XL, Red)' :
            selectedType === 'color' ? 'Enter color (e.g., #FF0000, red)' :
            'Enter image URL'
          }
          placeholderTextColor="#9CA3AF"
          value={value}
          onChangeText={setValue}
          autoCapitalize={selectedType === 'text' ? 'characters' : 'none'}
          autoCorrect={false}
        />
      </View>

      {/* Color Presets */}
      {selectedType === 'color' && (
        <View style={{
          backgroundColor: '#fff',
          borderBottomWidth: 1,
          borderBottomColor: '#E5E7EB',
          paddingVertical: 16,
          paddingHorizontal: 16,
        }}>
          {renderColorPresets()}
        </View>
      )}

      {/* Preview */}
      <View style={{
        backgroundColor: '#fff',
        paddingVertical: 16,
        paddingHorizontal: 16,
        flex: 1,
      }}>
        {renderPreview()}
      </View>
    </View>
  );
}
