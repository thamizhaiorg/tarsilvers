import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import MediaPicker from './picker';
import MediaGallery, { MediaItem } from './gallery';
import { UploadResult, r2Service, MediaFile } from '../../lib/r2-service';

interface MediaManagerProps {
  initialMedia?: MediaItem[];
  onMediaChange?: (media: MediaItem[]) => void;
  maxItems?: number;
  allowMultiple?: boolean;
  prefix?: string;
  title?: string;
  description?: string;
  useCustomUpload?: boolean;
  onCustomUpload?: () => void;
  customUploading?: boolean;
}

export default function MediaManager({
  initialMedia = [],
  onMediaChange,
  maxItems = 10,
  allowMultiple = true,
  prefix = 'products',
  title = 'Media Files',
  description = 'Upload images and videos for this product',
  useCustomUpload = false,
  onCustomUpload,
  customUploading = false,
}: MediaManagerProps) {
  const [media, setMedia] = useState<MediaItem[]>(initialMedia);
  const [uploading, setUploading] = useState(false);
  const onMediaChangeRef = useRef(onMediaChange);

  // Update ref when callback changes
  useEffect(() => {
    onMediaChangeRef.current = onMediaChange;
  }, [onMediaChange]);

  // Only update media when initialMedia actually changes
  useEffect(() => {
    setMedia(initialMedia);
  }, [initialMedia]);

  // Helper function to update media and notify parent
  const updateMedia = (newMedia: MediaItem[]) => {
    setMedia(newMedia);
    onMediaChangeRef.current?.(newMedia);
  };

  const handleUploadStart = () => {
    setUploading(true);
  };

  const handleUploadComplete = (result: UploadResult) => {
    setUploading(false);

    if (result.success && result.url) {
      const newMediaItem: MediaItem = {
        url: result.url,
        key: result.key,
        type: 'image/jpeg', // Default, could be enhanced to detect actual type
      };

      const newMedia = (() => {
        if (!allowMultiple) {
          return [newMediaItem];
        }

        if (maxItems && media.length >= maxItems) {
          return media; // Don't add if at max capacity
        }

        return [...media, newMediaItem];
      })();

      updateMedia(newMedia);
    }
  };

  const handleRemoveMedia = (index: number, item: MediaItem) => {
    const newMedia = media.filter((_, i) => i !== index);
    updateMedia(newMedia);
  };

  const handleUploadPress = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant camera roll permissions to upload images.'
      );
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: allowMultiple,
        quality: 0.8,
        exif: false,
      });

      if (!result.canceled && result.assets.length > 0) {
        setUploading(true);

        for (const asset of result.assets) {
          const mediaFile: MediaFile = {
            uri: asset.uri,
            name: asset.fileName || `image_${Date.now()}.jpg`,
            type: asset.type === 'video' ? 'video/mp4' : 'image/jpeg',
            size: asset.fileSize,
          };

          const uploadResult = await r2Service.uploadFile(mediaFile, prefix);
          handleUploadComplete(uploadResult);

          if (!uploadResult.success) {
            Alert.alert('Upload Failed', uploadResult.error || 'Unknown error occurred');
          }
        }

        setUploading(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
      setUploading(false);
    }
  };

  const canUploadMore = !maxItems || media.length < maxItems;
  const showPicker = canUploadMore;

  return (
    <View className="space-y-4">
      {/* Header - only show if title or description provided */}
      {(title || description) && (
        <View>
          {title && <Text className="text-base font-medium text-gray-900 mb-1">{title}</Text>}
          {description && (
            <Text className="text-sm text-gray-600">{description}</Text>
          )}
        </View>
      )}

      {/* Combined Media Gallery with Upload Tile */}
      <MediaGallery
        media={media}
        onRemove={handleRemoveMedia}
        maxItems={maxItems}
        editable={true}
        showUpload={showPicker && canUploadMore}
        onUploadPress={useCustomUpload ? onCustomUpload : handleUploadPress}
        uploading={useCustomUpload ? customUploading : uploading}
      />

      {/* Status Messages */}
      {maxItems && media.length >= maxItems && (
        <View className="bg-blue-50 border border-blue-200 p-3">
          <Text className="text-blue-800 text-sm">
            Maximum of {maxItems} media files reached
          </Text>
        </View>
      )}
    </View>
  );
}
