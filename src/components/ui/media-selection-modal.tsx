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
  userId?: string;
}

interface MediaSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (media: MediaItem[]) => void;
  title?: string;
  selectedMedia?: MediaItem[];
  reference?: string;
}

export default function MediaSelectionModal({
  visible,
  onClose,
  onSelect,
  title = 'Select Medias',
  selectedMedia = [],
  reference
}: MediaSelectionModalProps) {
  // console.log('📱 MEDIA MODAL: Component rendered', { visible, reference });

  const insets = useSafeAreaInsets();
  const { user } = db.useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMediaIds, setSelectedMediaIds] = useState<Set<string>>(new Set());
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

  // Initialize selected media
  useEffect(() => {
    if (selectedMedia.length > 0) {
      setSelectedMediaIds(new Set(selectedMedia.map(m => m.id)));
    }
  }, [selectedMedia]);

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

  const handleMediaToggle = (media: MediaItem) => {
    const newSelected = new Set(selectedMediaIds);

    // Always allow multiple selection for Medias
    if (newSelected.has(media.id)) {
      newSelected.delete(media.id);
    } else {
      newSelected.add(media.id);
    }

    setSelectedMediaIds(newSelected);
  };

  const handleConfirmSelection = () => {
    const selectedMediaArray = filteredImages.filter(media => selectedMediaIds.has(media.id));
    onSelect(selectedMediaArray);
    onClose();
  };

  const handleUpload = async () => {
    if (!user) {
      Alert.alert('Error', 'Please ensure you are logged in');
      return;
    }

    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant media library permissions to upload images.');
        return;
      }

      setUploading(true);

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true, // Allow multiple selection for media gallery
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets) {
        const uploadPromises = result.assets.map(async (asset, index) => {
          // Generate filename with product name if available
          const productName = reference?.includes('product-') ?
            reference.split('product-')[1]?.replace(/[^a-zA-Z0-9]/g, '') || 'product' :
            'media';
          const randomId = Math.floor(Math.random() * 1000000);
          const fileName = `${productName}_media_${randomId}_${index + 1}`;

          const file = {
            uri: asset.uri,
            name: asset.fileName || `${fileName}.jpg`,
            type: asset.type === 'image' ? 'image/jpeg' : (asset.type || 'image/jpeg'),
            mimeType: asset.type === 'image' ? 'image/jpeg' : (asset.type || 'image/jpeg'),
            size: asset.fileSize || 0
          };

          return await uploadFile(file, {
            title: fileName,
            alt: ''
          });
        });

        const results = await Promise.all(uploadPromises);

        // console.log removed

        // Check for any failures
        const failures = results.filter(r => !r.success);
        const successes = results.filter(r => r.success);

        if (failures.length > 0) {
          // console.log removed
          Alert.alert('Upload Error', `${failures.length} file(s) failed to upload`);
        } else {
          // console.log removed
          Alert.alert('Success', `${results.length} image(s) uploaded successfully`);
        }
      }
    } catch (error) {
      // console.error removed
      Alert.alert('Upload Error', 'Failed to upload images. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderMediaItem = ({ item: media }: { item: MediaItem }) => {
    const isSelected = selectedMediaIds.has(media.id);

    // console.log removed

    return (
      <TouchableOpacity
        onPress={() => handleMediaToggle(media)}
        className="relative"
        style={{ width: '48%', marginBottom: 12 }}
      >
        <View className={`bg-white rounded-lg overflow-hidden border ${
          isSelected ? 'border-blue-500' : 'border-gray-100'
        } shadow-sm`}>
          <View style={{ aspectRatio: 1, backgroundColor: '#F8F9FA' }}>
            <R2Image
              url={media.url}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
              onLoad={() => {
                log.debug('Image loaded successfully', 'MediaSelectionModal', { url: media.url });
              }}
              onError={(error) => {
                log.error('Image load error', 'MediaSelectionModal', { url: media.url, error });
              }}
            />
          </View>
          <View className="p-3">
            <Text className="text-sm font-medium text-gray-900" numberOfLines={1}>
              {media.title}
            </Text>
          </View>
        </View>

        {/* Selection Checkbox */}
        <View className="absolute top-2 right-2">
          <View className={`w-6 h-6 rounded border-2 items-center justify-center ${
            isSelected
              ? 'bg-blue-500 border-blue-500'
              : 'bg-white border-gray-300'
          }`}>
            {isSelected && (
              <MaterialIcons name="check" size={16} color="white" />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

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
            placeholder="Search"
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
                  {uploading ? 'Uploading...' : 'Upload Images'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filteredImages}
              renderItem={renderMediaItem}
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

        {/* Bottom Action Bar */}
        {selectedMediaIds.size > 0 && (
          <View className="bg-white border-t border-gray-200 px-4 py-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-gray-700 font-medium">
                {selectedMediaIds.size} selected
              </Text>
              <TouchableOpacity
                onPress={handleConfirmSelection}
                className="bg-blue-600 px-6 py-2 rounded-lg"
              >
                <Text className="text-white font-medium">
                  Select Medias
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}
