import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Modal, Alert, BackHandler } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { db } from '../../lib/instant';
import { useStore } from '../../lib/store-context';
import { useFiles } from '../../hooks/useFiles';
import { fileManager } from '../../lib/file-manager';
import { log } from '../../lib/logger';
import R2Image from './r2-image';
import LoadingSpinner from './loading-spinner';

interface MediaItem {
  id: string;
  title: string;
  url: string;
  handle: string;
  alt?: string;
  type: string;
  size: number;
  reference?: string;
  dateAdded: Date;
  storeId: string;
  userId?: string;
}

interface PrimaryImageSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (media: MediaItem) => void;
  title?: string;
  reference?: string;
}

export default function PrimaryImageSelectionModal({
  visible,
  onClose,
  onSelect,
  title = 'Select Primary Image',
  reference
}: PrimaryImageSelectionModalProps) {
  // log.debug('Component rendered', 'PrimaryImageSelectionModal', { visible, reference });

  const insets = useSafeAreaInsets();
  const { currentStore } = useStore();
  const { user } = db.useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);

  // Use the files hook to get images only
  const { files, uploadFile } = useFiles({ type: 'images' });

  // Removed R2 logs

  // Handle native back button
  useEffect(() => {
    if (!visible) return;

    const backAction = () => {
      onClose();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [visible, onClose]);

  // Filter images based on search query
  const filteredImages = useMemo(() => {
    const result = !searchQuery.trim() ? files : files.filter(file => {
      const searchQuery_lower = searchQuery.toLowerCase();
      return file.title.toLowerCase().includes(searchQuery_lower) ||
             file.alt?.toLowerCase().includes(searchQuery_lower);
    });

    // console.log removed

    return result;
  }, [files, searchQuery]);

  const handleImageSelect = (media: MediaItem) => {
    onSelect(media);
    onClose(); // Close immediately after selection
  };

  const handleUpload = async () => {
    if (!user || !currentStore) {
      Alert.alert('Error', 'Please ensure you are logged in and have selected a store');
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false, // Single selection for primary image
        quality: 0.8,
        exif: false,
      });

      if (!result.canceled && result.assets.length > 0) {
        setUploading(true);

        const asset = result.assets[0];

        // Generate filename with product name if available
        const productName = reference?.includes('product-') ?
          reference.split('product-')[1]?.replace(/[^a-zA-Z0-9]/g, '') || 'product' :
          'primary';
        const randomId = Math.floor(Math.random() * 1000000);
        const fileName = `${productName}_image_${randomId}`;

        // Ensure correct file type is set
        const fileWithCorrectType = {
          ...asset,
          type: asset.type === 'image' ? 'image/jpeg' : (asset.type || 'image/jpeg'),
          mimeType: asset.type === 'image' ? 'image/jpeg' : (asset.type || 'image/jpeg')
        };

        const uploadResult = await uploadFile(fileWithCorrectType, {
          title: fileName,
          alt: 'Primary image'
        });

        if (uploadResult.success && uploadResult.fileRecord) {
          // console.log removed
          // Immediately select the uploaded image
          handleImageSelect(uploadResult.fileRecord);
        } else {
          // console.log removed
          Alert.alert('Upload Error', uploadResult.error || 'Failed to upload image');
        }
      }
    } catch (error) {
      // console.error removed
      Alert.alert('Error', 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderImageItem = ({ item: media }: { item: MediaItem }) => {
    // console.log removed

    return (
      <TouchableOpacity
        onPress={() => handleImageSelect(media)}
        className="relative"
        style={{ width: '48%', marginBottom: 12 }}
      >
        <View className="bg-white rounded-lg overflow-hidden border border-gray-100 shadow-sm">
          <View style={{ aspectRatio: 1, backgroundColor: '#F8F9FA' }}>
            <R2Image
              url={media.url}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
              onLoad={() => {
                log.debug('Primary modal image loaded successfully', 'PrimaryImageModal', { url: media.url });
              }}
              onError={(error) => {
                log.error('Primary modal image load error', 'PrimaryImageModal', { url: media.url, error });
              }}
            />
          </View>
          <View className="p-3">
            <Text className="text-sm font-medium text-gray-900" numberOfLines={1}>
              {media.title}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: insets.top / 5 }}>
        {/* Header - Clean design without back arrow */}
        <View style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: '#fff',
          borderBottomWidth: 1,
          borderBottomColor: '#E5E7EB',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827' }}>
            {title}
          </Text>

          {/* Upload Button - Simple Black Upload Icon */}
          <TouchableOpacity
            onPress={handleUpload}
            disabled={uploading}
            style={{
              padding: 8,
              opacity: uploading ? 0.6 : 1
            }}
          >
            {uploading ? (
              <LoadingSpinner size={24} color="#111827" />
            ) : (
              <MaterialIcons name="add" size={24} color="#111827" />
            )}
          </TouchableOpacity>
        </View>

        {/* Search Bar - Matching type selector design */}
        <View style={{
          backgroundColor: '#fff',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: '#E5E7EB',
        }}>
          <TextInput
            placeholder="Search images by name..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{
              fontSize: 16,
              color: '#111827',
              paddingVertical: 0,
            }}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Images Grid */}
        <View className="flex-1">
          {filteredImages.length === 0 ? (
            <View className="flex-1 items-center justify-center p-8">
              <MaterialIcons name="photo-library" size={48} color="#9CA3AF" />
              <Text className="text-gray-500 mt-2 text-center">No images found</Text>
              {searchQuery && (
                <Text className="text-sm text-gray-400 mt-1 text-center">Try adjusting your search</Text>
              )}
              <TouchableOpacity 
                onPress={handleUpload}
                disabled={uploading}
                className="mt-4 bg-blue-600 px-4 py-2 rounded-lg"
              >
                <Text className="text-white font-medium">
                  {uploading ? 'Uploading...' : 'Upload Image'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filteredImages}
              renderItem={renderImageItem}
              keyExtractor={(item) => item.id}
              numColumns={2}
              contentContainerStyle={{
                padding: 16,
                gap: 12
              }}
              columnWrapperStyle={{ justifyContent: 'space-between' }}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}
