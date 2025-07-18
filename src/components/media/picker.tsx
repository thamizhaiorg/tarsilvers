import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { r2Service, UploadResult, MediaFile } from '../../lib/r2-service';

interface MediaPickerProps {
  onUploadComplete?: (result: UploadResult) => void;
  onUploadStart?: () => void;
  allowMultiple?: boolean;
  mediaTypes?: 'Images' | 'Videos' | 'All';
  quality?: number;
  prefix?: string;
  disabled?: boolean;
}

export default function MediaPicker({
  onUploadComplete,
  onUploadStart,
  allowMultiple = false,
  mediaTypes = 'Images',
  quality = 0.8,
  prefix = 'products',
  disabled = false,
}: MediaPickerProps) {
  const [uploading, setUploading] = useState(false);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant camera roll permissions to upload images.'
      );
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    if (disabled || uploading) return;

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: mediaTypes === 'Images' ? ['images'] :
                   mediaTypes === 'Videos' ? ['videos'] : ['images', 'videos'],
        allowsMultipleSelection: allowMultiple,
        quality,
        exif: false,
      });

      if (!result.canceled && result.assets.length > 0) {
        await handleUpload(result.assets);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    if (disabled || uploading) return;

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant camera permissions to take photos.'
      );
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: mediaTypes === 'Images' ? ['images'] :
                   mediaTypes === 'Videos' ? ['videos'] : ['images', 'videos'],
        quality,
        exif: false,
      });

      if (!result.canceled && result.assets.length > 0) {
        await handleUpload(result.assets);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleUpload = async (assets: ImagePicker.ImagePickerAsset[]) => {
    setUploading(true);
    onUploadStart?.();

    try {
      for (const asset of assets) {
        const mediaFile: MediaFile = {
          uri: asset.uri,
          name: asset.fileName || `image_${Date.now()}.jpg`,
          type: asset.type === 'video' ? 'video/mp4' : 'image/jpeg',
          size: asset.fileSize,
        };

        const result = await r2Service.uploadFile(mediaFile, prefix);
        onUploadComplete?.(result);

        if (!result.success) {
          Alert.alert('Upload Failed', result.error || 'Unknown error occurred');
        }
      }
    } catch (error) {
      Alert.alert('Upload Failed', 'An error occurred during upload');
    } finally {
      setUploading(false);
    }
  };

  const showOptions = () => {
    Alert.alert(
      'Select Media',
      'Choose how you want to add media',
      [
        { text: 'Camera', onPress: takePhoto },
        { text: 'Photo Library', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <TouchableOpacity
      onPress={showOptions}
      disabled={disabled || uploading}
      className={`bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 items-center ${
        disabled || uploading ? 'opacity-50' : ''
      }`}
    >
      {uploading ? (
        <>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="text-gray-600 mt-2 font-medium">Uploading...</Text>
          <Text className="text-gray-400 text-sm">Please wait</Text>
        </>
      ) : (
        <>
          <Feather name="upload" size={24} color="#6B7280" />
          <Text className="text-gray-600 mt-2 font-medium">Upload Media</Text>
          <Text className="text-gray-400 text-sm">Tap to select images or take photo</Text>
        </>
      )}
    </TouchableOpacity>
  );
}
