import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Switch, StatusBar, BackHandler, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MetafieldSet, MetafieldValue } from './metafields-types';

interface MetafieldValueFormProps {
  definition: MetafieldSet;
  value?: MetafieldValue | null;
  onSave: (value: string) => void;
  onDelete?: () => void;
  onClose: () => void;
}

export default function MetafieldValueForm({
  definition,
  value,
  onSave,
  onDelete,
  onClose
}: MetafieldValueFormProps) {
  const insets = useSafeAreaInsets();
  const isEditing = !!value;

  const [formValue, setFormValue] = useState(value?.value || '');

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
    // Validate required fields
    if (definition.required && !formValue.trim()) {
      Alert.alert('Required Field', 'This metafield is required and must have a value.');
      return;
    }

    // Validate based on type
    if (formValue.trim()) {
      if (definition.type === 'number' && isNaN(Number(formValue))) {
        Alert.alert('Invalid Value', 'Please enter a valid number.');
        return;
      }

      if (definition.type === 'email' && !isValidEmail(formValue)) {
        Alert.alert('Invalid Email', 'Please enter a valid email address.');
        return;
      }

      if (definition.type === 'url' && !isValidUrl(formValue)) {
        Alert.alert('Invalid URL', 'Please enter a valid URL.');
        return;
      }
    }

    onSave(formValue);
  };

  const handleDelete = () => {
    if (onDelete) {
      Alert.alert(
        'Delete Value',
        `Delete the value for "${definition.name}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: onDelete
          }
        ]
      );
    }
  };

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const renderInput = () => {
    switch (definition.type) {
      case 'boolean':
        return (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 12,
            paddingHorizontal: 16,
            backgroundColor: 'white',
            borderWidth: 1,
            borderColor: '#E5E7EB',
            borderRadius: 8,
            marginBottom: 20,
          }}>
            <Text style={{ fontSize: 16, color: '#1C1C1E' }}>
              Value
            </Text>
            <Switch
              value={formValue === 'true' || formValue === 'True' || formValue === '1'}
              onValueChange={(val) => setFormValue(val.toString())}
              trackColor={{ false: '#E5E7EB', true: '#007AFF' }}
              thumbColor={formValue === 'true' ? '#fff' : '#f4f3f4'}
            />
          </View>
        );

      case 'multi_line_text':
      case 'rich_text':
      case 'json':
        return (
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: '#E5E7EB',
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 12,
              fontSize: 16,
              marginBottom: 20,
              minHeight: 120,
              textAlignVertical: 'top',
            }}
            value={formValue}
            onChangeText={setFormValue}
            placeholder={definition.config?.placeholder || `Enter ${definition.type} value`}
            multiline
            numberOfLines={6}
          />
        );

      case 'number':
      case 'weight':
      case 'dimension':
      case 'volume':
      case 'rating':
        return (
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
            value={formValue}
            onChangeText={setFormValue}
            placeholder={definition.config?.placeholder || `Enter ${definition.type} value`}
            keyboardType="numeric"
          />
        );

      case 'email':
        return (
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
            value={formValue}
            onChangeText={setFormValue}
            placeholder="Enter email address"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        );

      case 'url':
        return (
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
            value={formValue}
            onChangeText={setFormValue}
            placeholder="Enter URL (https://...)"
            keyboardType="url"
            autoCapitalize="none"
          />
        );

      case 'date':
      case 'date_time':
        return (
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
            value={formValue}
            onChangeText={setFormValue}
            placeholder={definition.type === 'date' ? 'YYYY-MM-DD' : 'YYYY-MM-DD HH:MM:SS'}
          />
        );

      case 'color':
        return (
          <View>
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
              value={formValue}
              onChangeText={setFormValue}
              placeholder="#000000 or rgb(0,0,0)"
            />
            {formValue && (
              <View style={{
                width: 40,
                height: 40,
                backgroundColor: formValue,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#E5E7EB',
                marginBottom: 20,
              }} />
            )}
          </View>
        );

      default:
        return (
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
            value={formValue}
            onChangeText={setFormValue}
            placeholder={definition.config?.placeholder || `Enter ${definition.type} value`}
          />
        );
    }
  };

  const canSave = !definition.required || formValue.trim().length > 0;

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
          {definition.name}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {isEditing && onDelete && (
            <TouchableOpacity
              onPress={handleDelete}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: '#FF3B30',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 8,
              }}
            >
              <MaterialCommunityIcons
                name="delete"
                size={18}
                color="#fff"
              />
            </TouchableOpacity>
          )}

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
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
        {/* Definition Info */}
        <View style={{
          backgroundColor: '#F9FAFB',
          padding: 16,
          borderRadius: 8,
          marginBottom: 20,
        }}>
          <Text style={{
            fontSize: 14,
            color: '#6B7280',
            marginBottom: 4,
          }}>
            Type: {definition.type}
          </Text>
          <Text style={{
            fontSize: 14,
            color: '#6B7280',
            marginBottom: 4,
          }}>
            Namespace: {definition.namespace}
          </Text>
          <Text style={{
            fontSize: 14,
            color: '#6B7280',
            marginBottom: 4,
          }}>
            Group: {definition.group}
          </Text>
          {definition.required && (
            <Text style={{
              fontSize: 14,
              color: '#FF3B30',
              fontWeight: '500',
            }}>
              Required field
            </Text>
          )}
          {definition.description && (
            <Text style={{
              fontSize: 14,
              color: '#6B7280',
              marginTop: 8,
              fontStyle: 'italic',
            }}>
              {definition.description}
            </Text>
          )}
        </View>

        {/* Value Input */}
        <Text style={{ fontSize: 16, fontWeight: '500', marginBottom: 8, color: '#1C1C1E' }}>
          Value
        </Text>
        {renderInput()}

        {/* Validation Info */}
        {definition.config?.unit && (
          <Text style={{
            fontSize: 14,
            color: '#6B7280',
            marginTop: -12,
            marginBottom: 20,
          }}>
            Unit: {definition.config.unit}
          </Text>
        )}

        {definition.config?.min !== undefined && definition.config?.max !== undefined && (
          <Text style={{
            fontSize: 14,
            color: '#6B7280',
            marginTop: -12,
            marginBottom: 20,
          }}>
            Range: {definition.config.min} - {definition.config.max}
          </Text>
        )}
      </ScrollView>
    </View>
  );
}
