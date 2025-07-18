import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, Animated } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { r2Service, MediaFile, UploadResult } from '../../lib/r2-service';
import { db, getCurrentTimestamp } from '../../lib/instant';
import { useStore } from '../../lib/store-context';
import { fileManager } from '../../lib/file-manager';
import { log } from '../../lib/logger';
import { id } from '@instantdb/react-native';
import R2Image from './r2-image';

interface FileData {
  id: string;
  title: string;
  url: string;
  type: string;
  size: number;
  storeId: string;
  reference?: string;
  createdAt: string;
  updatedAt?: string;
}

interface FileUploadProps {
  onUploadComplete?: (fileId: string, fileData: FileData) => void;
  onUploadStart?: () => void;
  onUploadError?: (error: string) => void;
  allowMultiple?: boolean;
  acceptedTypes?: 'images' | 'videos' | 'documents' | 'all';
  maxFileSize?: number; // in bytes
  reference?: string; // reference to product/collection/option
  existingFile?: FileData; // for replacement
  disabled?: boolean;
  className?: string;
  style?: Record<string, unknown>;
}

export default function FileUpload({
  onUploadComplete,
  onUploadStart,
  onUploadError,
  allowMultiple = false,
  acceptedTypes = 'all',
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  reference,
  existingFile,
  disabled = false,
  className = '',
  style
}: FileUploadProps) {
  const { currentStore } = useStore();
  const { user } = db.useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant media library permissions to upload files.'
      );
      return false;
    }
    return true;
  };

  const validateFile = (file: any): boolean => {
    // Check file size
    if (file.size && file.size > maxFileSize) {
      const maxSizeMB = (maxFileSize / (1024 * 1024)).toFixed(1);
      Alert.alert('File Too Large', `File size must be less than ${maxSizeMB}MB`);
      return false;
    }

    // Check file type
    if (acceptedTypes !== 'all') {
      const fileType = file.type || file.mimeType || '';
      if (acceptedTypes === 'images' && !fileType.startsWith('image/')) {
        Alert.alert('Invalid File Type', 'Only image files are allowed');
        return false;
      }
      if (acceptedTypes === 'videos' && !fileType.startsWith('video/')) {
        Alert.alert('Invalid File Type', 'Only video files are allowed');
        return false;
      }
      if (acceptedTypes === 'documents' && (fileType.startsWith('image/') || fileType.startsWith('video/'))) {
        Alert.alert('Invalid File Type', 'Only document files are allowed');
        return false;
      }
    }

    return true;
  };

  const generateFileHandle = (fileName: string): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const cleanName = fileName.replace(/[^a-zA-Z0-9.-]/g, '').toLowerCase();
    return `${cleanName}-${timestamp}-${random}`;
  };

  const generateR2Path = (fileName: string, fileType: string): string => {
    if (!currentStore) return `files/${fileName}`;
    
    // Sanitize store ID
    const sanitizedStoreId = currentStore.id.replace(/[^a-zA-Z0-9]/g, '');
    
    // Determine category based on reference or file type
    let category = 'general';
    if (reference) {
      if (reference.includes('product')) category = 'products';
      else if (reference.includes('collection')) category = 'collections';
      else if (reference.includes('option')) category = 'options';
    } else if (fileType.startsWith('image/')) {
      category = 'images';
    } else if (fileType.startsWith('video/')) {
      category = 'videos';
    } else {
      category = 'documents';
    }
    
    // Generate random number for uniqueness
    const randomNumber = Math.floor(Math.random() * 1000000000);
    
    // Clean filename
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '').toLowerCase();
    
    return `${sanitizedStoreId}/${category}/${randomNumber}/${cleanFileName}`;
  };

  const uploadFile = async (file: any) => {

    if (!validateFile(file)) return;

    setUploading(true);
    setUploadProgress(0);
    onUploadStart?.();

    try {
      if (!user) {
        throw new Error('User must be authenticated to upload files');
      }

      // Use file manager for upload
      const uploadOptions = {
        storeId: currentStore.id,
        userId: user.id,
        category: acceptedTypes === 'images' ? 'images' :
                 acceptedTypes === 'videos' ? 'videos' :
                 acceptedTypes === 'documents' ? 'documents' : 'general',
        reference: reference || '',
        title: file.name || `file_${Date.now()}`,
        alt: ''
      };

      let result;
      if (existingFile && existingFile.id) {
        // Replace existing file
        result = await fileManager.replaceFile(file, {
          ...uploadOptions,
          existingFileId: existingFile.id
        });
      } else {
        // Upload new file
        result = await fileManager.uploadFile(file, uploadOptions);
      }

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      setUploadProgress(100);
      onUploadComplete?.(result.fileRecord!.id, result.fileRecord);

      // Success animation
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.5,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();

    } catch (error) {
      log.error('File upload failed', 'FileUpload', { error: error instanceof Error ? error.message : 'Unknown error' });
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      onUploadError?.(errorMessage);
      Alert.alert('Upload Failed', errorMessage);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const pickFromLibrary = async () => {
    if (disabled || uploading) return;

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      let result;
      
      if (acceptedTypes === 'documents') {
        result = await DocumentPicker.getDocumentAsync({
          multiple: allowMultiple,
          copyToCacheDirectory: true
        });
      } else {
        const mediaTypes = acceptedTypes === 'images' ? ['images'] :
                          acceptedTypes === 'videos' ? ['videos'] : ['images', 'videos'];

        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: mediaTypes,
          allowsMultipleSelection: allowMultiple,
          quality: 0.8,
          exif: false,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        for (const asset of result.assets) {
          // Transform ImagePicker asset to file object
          const fileObject = {
            uri: asset.uri,
            name: asset.fileName || `file_${Date.now()}.jpg`,
            type: asset.type === 'video' ? 'video/mp4' : 'image/jpeg',
            size: asset.fileSize || 0,
            mimeType: asset.type === 'video' ? 'video/mp4' : 'image/jpeg'
          };
          await uploadFile(fileObject);
          if (!allowMultiple) break; // Only upload first file if not allowing multiple
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick file');
    }
  };

  const takePhoto = async () => {
    if (disabled || uploading || acceptedTypes === 'documents') return;

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera permissions to take photos.');
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: acceptedTypes === 'videos' ? ['videos'] : ['images'],
        quality: 0.8,
        exif: false,
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        // Transform ImagePicker asset to file object
        const fileObject = {
          uri: asset.uri,
          name: asset.fileName || `photo_${Date.now()}.jpg`,
          type: asset.type === 'video' ? 'video/mp4' : 'image/jpeg',
          size: asset.fileSize || 0,
          mimeType: asset.type === 'video' ? 'video/mp4' : 'image/jpeg'
        };
        await uploadFile(fileObject);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const showActionSheet = () => {
    if (disabled || uploading) return;

    const options = ['Choose from Library'];
    if (acceptedTypes !== 'documents') {
      options.unshift('Take Photo');
    }
    options.push('Cancel');

    Alert.alert(
      'Select File',
      'Choose how you want to add a file',
      [
        ...(acceptedTypes !== 'documents' ? [{ text: 'Take Photo', onPress: takePhoto }] : []),
        { text: 'Choose from Library', onPress: pickFromLibrary },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const getUploadText = () => {
    if (existingFile) return 'Replace File';
    if (acceptedTypes === 'images') return 'Upload Image';
    if (acceptedTypes === 'videos') return 'Upload Video';
    if (acceptedTypes === 'documents') return 'Upload Document';
    return 'Upload File';
  };

  const getUploadIcon = () => {
    if (acceptedTypes === 'images') return 'image';
    if (acceptedTypes === 'videos') return 'videocam';
    if (acceptedTypes === 'documents') return 'description';
    return 'cloud-upload';
  };

  return (
    <Animated.View style={[{ opacity: fadeAnim }, style]}>
      <TouchableOpacity
        onPress={showActionSheet}
        disabled={disabled || uploading}
        className={`border-2 border-dashed border-gray-300 rounded-lg p-8 items-center justify-center bg-gray-50 ${
          dragActive ? 'border-blue-500 bg-blue-50' : ''
        } ${disabled ? 'opacity-50' : ''} ${className}`}
        style={{ minHeight: 120 }}
      >
        {uploading ? (
          <View className="items-center">
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text className="text-gray-600 mt-2">Uploading...</Text>
            {uploadProgress > 0 && (
              <Text className="text-sm text-gray-500 mt-1">{uploadProgress}%</Text>
            )}
          </View>
        ) : existingFile ? (
          <View className="items-center">
            {existingFile.type?.startsWith('image/') ? (
              <R2Image
                url={existingFile.url}
                style={{ width: 80, height: 80, borderRadius: 8, marginBottom: 8 }}
                resizeMode="cover"
              />
            ) : (
              <MaterialIcons 
                name={getUploadIcon() as any} 
                size={32} 
                color="#6B7280" 
                style={{ marginBottom: 8 }}
              />
            )}
            <Text className="text-blue-600 font-medium">{getUploadText()}</Text>
            <Text className="text-sm text-gray-500 mt-1">Tap to replace</Text>
          </View>
        ) : (
          <View className="items-center">
            <MaterialIcons 
              name={getUploadIcon() as any} 
              size={32} 
              color="#6B7280" 
              style={{ marginBottom: 8 }}
            />
            <Text className="text-gray-700 font-medium mb-1">{getUploadText()}</Text>
            <Text className="text-sm text-gray-500 text-center">
              Tap to select or drag and drop
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}
