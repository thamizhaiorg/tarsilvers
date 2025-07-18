import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Switch, StatusBar, BackHandler } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MetafieldSet, MetafieldEntityType } from './metafields-types';

// Metafield types (matching Shopify)
const METAFIELD_TYPES = [
  { value: 'single_line_text', label: 'Single line text', description: 'Short text up to 255 characters' },
  { value: 'multi_line_text', label: 'Multi-line text', description: 'Long text up to 65,535 characters' },
  { value: 'rich_text', label: 'Rich text', description: 'Formatted text with HTML' },
  { value: 'number', label: 'Number', description: 'Integer or decimal number' },
  { value: 'boolean', label: 'Boolean', description: 'True or false value' },
  { value: 'date', label: 'Date', description: 'Date value' },
  { value: 'date_time', label: 'Date and time', description: 'Date and time value' },
  { value: 'url', label: 'URL', description: 'Web address' },
  { value: 'email', label: 'Email', description: 'Email address' },
  { value: 'color', label: 'Color', description: 'Color value' },
  { value: 'weight', label: 'Weight', description: 'Weight measurement' },
  { value: 'dimension', label: 'Dimension', description: 'Length, width, or height' },
  { value: 'volume', label: 'Volume', description: 'Volume measurement' },
  { value: 'rating', label: 'Rating', description: 'Rating scale (1-5)' },
  { value: 'json', label: 'JSON', description: 'Structured data in JSON format' },
  { value: 'file_reference', label: 'File', description: 'File upload' },
  { value: 'product_reference', label: 'Product reference', description: 'Reference to a product' },
  { value: 'variant_reference', label: 'Variant reference', description: 'Reference to a product variant' },
  { value: 'page_reference', label: 'Page reference', description: 'Reference to a page' },
  { value: 'list.single_line_text', label: 'List of single line text', description: 'List of text values' },
  { value: 'list.color', label: 'List of colors', description: 'List of color values' },
] as const;



interface MetafieldDefinitionFormProps {
  entityType: MetafieldEntityType;
  groupName?: string;
  definition?: MetafieldSet | null;
  onSave: (definition: Partial<MetafieldSet>) => void;
  onClose: () => void;
}

export default function MetafieldDefinitionForm({
  entityType,
  groupName,
  definition,
  onSave,
  onClose
}: MetafieldDefinitionFormProps) {
  const insets = useSafeAreaInsets();
  const isEditing = !!definition;

  const [formData, setFormData] = useState({
    name: definition?.name || '',
    type: definition?.type || 'single_line_text',
    required: definition?.required || false,
    inputConfig: definition?.inputConfig || {},
  });

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
    if (!formData.name.trim()) {
      return;
    }

    onSave({
      name: formData.name.trim(),
      type: formData.type as any,
      required: formData.required,
      inputConfig: formData.inputConfig,
    });
  };

  // Generate default input config based on type
  const getDefaultInputConfig = (type: string) => {
    switch (type) {
      case 'single_line_text':
        return { placeholder: 'Enter text', maxLength: 255 };
      case 'multi_line_text':
        return { placeholder: 'Enter text', maxLength: 65535, rows: 4 };
      case 'rich_text':
        return { placeholder: 'Enter formatted text' };
      case 'number':
        return { placeholder: 'Enter number', min: 0 };
      case 'boolean':
        return {};
      case 'date':
        return { placeholder: 'YYYY-MM-DD' };
      case 'date_time':
        return { placeholder: 'YYYY-MM-DD HH:MM:SS' };
      case 'url':
        return { placeholder: 'https://example.com' };
      case 'email':
        return { placeholder: 'user@example.com' };
      case 'color':
        return { placeholder: '#000000' };
      case 'weight':
        return { placeholder: 'Enter weight', min: 0, unit: 'kg' };
      case 'dimension':
        return { placeholder: 'Enter dimension', min: 0, unit: 'cm' };
      case 'volume':
        return { placeholder: 'Enter volume', min: 0, unit: 'L' };
      case 'rating':
        return { min: 1, max: 5, step: 1 };
      case 'money':
        return { placeholder: 'Enter amount', min: 0, currency: 'USD' };
      case 'single_line_text_list':
        return { placeholder: 'Enter items separated by commas' };
      case 'file_reference':
        return { allowedTypes: ['image/*', 'application/pdf'] };
      case 'product_reference':
      case 'variant_reference':
      case 'page_reference':
        return {};
      default:
        return {};
    }
  };

  const updateFormData = (key: string, value: any) => {
    if (key === 'type') {
      // When type changes, update inputConfig with defaults
      const defaultConfig = getDefaultInputConfig(value);
      setFormData(prev => ({
        ...prev,
        [key]: value,
        inputConfig: defaultConfig
      }));
    } else {
      setFormData(prev => ({ ...prev, [key]: value }));
    }
  };

  // Render input configuration fields based on selected type
  const renderInputConfig = () => {
    const config = formData.inputConfig || {};

    const updateInputConfig = (key: string, value: any) => {
      setFormData(prev => ({
        ...prev,
        inputConfig: { ...prev.inputConfig, [key]: value }
      }));
    };

    switch (formData.type) {
      case 'single_line_text':
      case 'multi_line_text':
        return (
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: '500', marginBottom: 8, color: '#1C1C1E' }}>
              Configuration
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#E5E7EB',
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 12,
                fontSize: 16,
                marginBottom: 12,
              }}
              value={config.placeholder || ''}
              onChangeText={(value) => updateInputConfig('placeholder', value)}
              placeholder="Placeholder text"
            />
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#E5E7EB',
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 12,
                fontSize: 16,
              }}
              value={config.maxLength?.toString() || ''}
              onChangeText={(value) => updateInputConfig('maxLength', parseInt(value) || undefined)}
              placeholder="Maximum length"
              keyboardType="numeric"
            />
          </View>
        );

      case 'number':
      case 'weight':
      case 'dimension':
      case 'volume':
      case 'money':
        return (
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: '500', marginBottom: 8, color: '#1C1C1E' }}>
              Configuration
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#E5E7EB',
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 12,
                fontSize: 16,
                marginBottom: 12,
              }}
              value={config.placeholder || ''}
              onChangeText={(value) => updateInputConfig('placeholder', value)}
              placeholder="Placeholder text"
            />
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
              <TextInput
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  fontSize: 16,
                }}
                value={config.min?.toString() || ''}
                onChangeText={(value) => updateInputConfig('min', parseFloat(value) || undefined)}
                placeholder="Minimum value"
                keyboardType="numeric"
              />
              <TextInput
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  fontSize: 16,
                }}
                value={config.max?.toString() || ''}
                onChangeText={(value) => updateInputConfig('max', parseFloat(value) || undefined)}
                placeholder="Maximum value"
                keyboardType="numeric"
              />
            </View>
            {(formData.type === 'weight' || formData.type === 'dimension' || formData.type === 'volume') && (
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  fontSize: 16,
                }}
                value={config.unit || ''}
                onChangeText={(value) => updateInputConfig('unit', value)}
                placeholder="Unit (e.g., kg, cm, L)"
              />
            )}
          </View>
        );

      case 'rating':
        return (
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: '500', marginBottom: 8, color: '#1C1C1E' }}>
              Rating Configuration
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TextInput
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  fontSize: 16,
                }}
                value={config.min?.toString() || '1'}
                onChangeText={(value) => updateInputConfig('min', parseInt(value) || 1)}
                placeholder="Min rating"
                keyboardType="numeric"
              />
              <TextInput
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  fontSize: 16,
                }}
                value={config.max?.toString() || '5'}
                onChangeText={(value) => updateInputConfig('max', parseInt(value) || 5)}
                placeholder="Max rating"
                keyboardType="numeric"
              />
            </View>
          </View>
        );

      case 'url':
      case 'email':
      case 'color':
      case 'date':
      case 'date_time':
        return (
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: '500', marginBottom: 8, color: '#1C1C1E' }}>
              Configuration
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#E5E7EB',
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 12,
                fontSize: 16,
              }}
              value={config.placeholder || ''}
              onChangeText={(value) => updateInputConfig('placeholder', value)}
              placeholder="Placeholder text"
            />
          </View>
        );

      default:
        return null;
    }
  };

  const canSave = formData.name.trim().length > 0;

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
          {isEditing ? 'Edit Definition' : 'Add Definition'}
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

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
        {/* Title */}
        <Text style={{ fontSize: 16, fontWeight: '500', marginBottom: 8, color: '#1C1C1E' }}>
          Name
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
          value={formData.name}
          onChangeText={(value) => updateFormData('name', value)}
          placeholder="Enter metafield name"
          autoFocus={!isEditing}
        />

        {/* Type Selector */}
        <Text style={{ fontSize: 16, fontWeight: '500', marginBottom: 8, color: '#1C1C1E' }}>
          Content type
        </Text>
        <View style={{ marginBottom: 20 }}>
          {METAFIELD_TYPES.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 12,
                paddingHorizontal: 16,
                backgroundColor: 'white',
                borderBottomWidth: 1,
                borderBottomColor: '#F2F2F7',
              }}
              onPress={() => updateFormData('type', type.value)}
            >
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 16,
                  color: '#1C1C1E',
                  marginBottom: 2,
                }}>
                  {type.label}
                </Text>
                <Text style={{
                  fontSize: 13,
                  color: '#8E8E93',
                }}>
                  {type.description}
                </Text>
              </View>
              {formData.type === type.value && (
                <Ionicons name="checkmark" size={20} color="#007AFF" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Input Configuration */}
        {renderInputConfig()}

        {/* Options */}
        <View style={{ marginBottom: 20 }}>
          {/* Required Toggle */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 12,
            paddingHorizontal: 16,
            backgroundColor: 'white',
            borderBottomWidth: 1,
            borderBottomColor: '#F2F2F7',
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '500', color: '#1C1C1E', marginBottom: 2 }}>
                Required
              </Text>
              <Text style={{ fontSize: 13, color: '#8E8E93' }}>
                This metafield must have a value
              </Text>
            </View>
            <Switch
              value={formData.required}
              onValueChange={(value) => updateFormData('required', value)}
              trackColor={{ false: '#E5E7EB', true: '#007AFF' }}
              thumbColor={formData.required ? '#fff' : '#f4f3f4'}
            />
          </View>


        </View>


      </ScrollView>
    </View>
  );
}
