import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView, Modal, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { r2Service } from '../../lib/r2-service';
import R2Image from '../ui/r2-image';

export interface MediaItem {
  url: string;
  key?: string;
  name?: string;
  type?: string;
}

interface MediaGalleryProps {
  media: MediaItem[];
  onRemove?: (index: number, item: MediaItem) => void;
  onReorder?: (media: MediaItem[]) => void;
  maxItems?: number;
  editable?: boolean;
  columns?: number;
  showUpload?: boolean;
  onUploadPress?: () => void;
  uploading?: boolean;
}

export default function MediaGallery({
  media,
  onRemove,
  onReorder,
  maxItems,
  editable = true,
  columns = 3,
  showUpload = false,
  onUploadPress,
  uploading = false,
}: MediaGalleryProps) {
  const [selectedItem, setSelectedItem] = useState<{ item: MediaItem; index: number } | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Rotate animation for loading
  useEffect(() => {
    if (uploading) {
      const rotate = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      );
      rotate.start();
      return () => rotate.stop();
    } else {
      rotateAnim.setValue(0);
    }
  }, [uploading, rotateAnim]);

  const handleItemPress = (item: MediaItem, index: number) => {
    if (!editable) return;
    setSelectedItem({ item, index });
    setShowDrawer(true);
  };

  const handleRemove = async () => {
    if (!selectedItem) return;

    const { item, index } = selectedItem;

    // Try to delete from R2 if we have the key
    if (item.key) {
      await r2Service.deleteFile(item.key);
    } else if (item.url) {
      // Extract key from URL
      const key = r2Service.extractKeyFromUrl(item.url);
      if (key) {
        await r2Service.deleteFile(key);
      }
    }

    onRemove?.(index, item);
    setShowDrawer(false);
    setSelectedItem(null);
  };

  const handleChange = () => {
    // TODO: Implement change functionality
    setShowDrawer(false);
    setSelectedItem(null);
  };

  const renderMediaItem = (item: MediaItem, index: number) => {
    const isVideo = item.type?.startsWith('video/') || item.url.includes('.mp4');

    return (
      <TouchableOpacity
        key={index}
        onPress={() => handleItemPress(item, index)}
        activeOpacity={0.8}
        style={{ marginRight: 8, marginBottom: 8 }}
      >
        <View style={{
          width: 80,
          height: 80,
          backgroundColor: '#F8F9FA',
          overflow: 'hidden'
        }}>
          {isVideo ? (
            <View style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#F3F4F6'
            }}>
              <MaterialIcons name="play-circle-outline" size={24} color="#6B7280" />
            </View>
          ) : (
            <R2Image
              url={item.url}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderUploadTile = () => {
    const spin = rotateAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    return (
      <TouchableOpacity
        onPress={onUploadPress}
        style={{
          width: 80,
          height: 80,
          backgroundColor: '#F8F9FA',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 8,
          marginBottom: 8
        }}
        disabled={uploading}
        activeOpacity={0.8}
      >
        {uploading ? (
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <View style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              borderWidth: 2,
              borderColor: '#E5E7EB',
              borderTopColor: '#9CA3AF',
            }} />
          </Animated.View>
        ) : (
          <MaterialIcons name="add" size={20} color="#9CA3AF" />
        )}
      </TouchableOpacity>
    );
  };

  const allItems = [...media];
  if (showUpload) {
    allItems.push({ url: 'upload', type: 'upload' } as MediaItem);
  }

  if (!media || (media.length === 0 && !showUpload)) {
    return (
      <View style={{
        backgroundColor: '#F8F9FA',
        padding: 16,
        alignItems: 'center'
      }}>
        <MaterialIcons name="photo" size={20} color="#9CA3AF" />
        <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 4 }}>No media</Text>
      </View>
    );
  }

  return (
    <View>
      <ScrollView
        horizontal={false}
        showsVerticalScrollIndicator={false}
        style={{ maxHeight: 300 }}
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {allItems.slice(0, maxItems ? maxItems + (showUpload ? 1 : 0) : undefined).map((item, index) => {
            if (item.url === 'upload') {
              return (
                <View key={`upload-${index}`}>
                  {renderUploadTile()}
                </View>
              );
            } else {
              return (
                <View key={`media-${index}`}>
                  {renderMediaItem(item, index)}
                </View>
              );
            }
          })}
        </View>
      </ScrollView>

      {/* Simple Actions Drawer */}
      <Modal
        visible={showDrawer}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDrawer(false)}
      >
        <View style={{
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: 'rgba(0,0,0,0.3)'
        }}>
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => setShowDrawer(false)}
          />

          <View style={{ backgroundColor: '#fff' }}>
            <TouchableOpacity
              onPress={() => {
                setShowDrawer(false);
                handleRemove();
              }}
              style={{
                paddingVertical: 20,
                paddingHorizontal: 24,
                borderBottomWidth: 1,
                borderBottomColor: '#F3F4F6',
              }}
            >
              <Text style={{ fontSize: 16, color: '#EF4444' }}>Delete</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowDrawer(false)}
              style={{
                paddingVertical: 20,
                paddingHorizontal: 24,
              }}
            >
              <Text style={{ fontSize: 16, color: '#6B7280' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
