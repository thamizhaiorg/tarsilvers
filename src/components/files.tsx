import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, Modal, ScrollView, Animated, BackHandler } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { db, getCurrentTimestamp } from '../lib/instant';
import { useStore } from '../lib/store-context';
import { log, trackError, PerformanceMonitor } from '../lib/logger';
import { LoadingError, EmptyState } from './ui/error-boundary';
import R2Image from './ui/r2-image';
import FileUpload from './ui/file-upload';
import { useFileSelection } from '../hooks/useFiles';

interface FilesScreenProps {
  onClose: () => void;
}

interface FileItem {
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

export default function FilesScreen({ onClose }: FilesScreenProps) {
  // log.debug('Component rendered', 'FilesScreen');

  const insets = useSafeAreaInsets();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [showFileDetails, setShowFileDetails] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [currentFileField, setCurrentFileField] = useState<'image' | 'medias'>('image');

  // Use the files hook for real-time data
  const { files, isLoading, error, searchFiles } = useFileSelection();

  // Removed R2 logs

  // Filter and search files using the hook - optimized with performance monitoring
  const filteredFiles = useMemo(() => {
    return PerformanceMonitor.measure('filter-files', () => {
      const typeFilter = selectedType as 'images' | 'videos' | 'documents' | 'all';
      const result = searchFiles(searchQuery, typeFilter);
      // Files filtered successfully
      return result;
    });
  }, [searchFiles, searchQuery, selectedType, files.length]);

  // Handle back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (showFileDetails) {
        setShowFileDetails(false);
        return true;
      }
      if (showUploadModal) {
        setShowUploadModal(false);
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [showFileDetails, showUploadModal]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getFileIcon = (type: string): string => {
    if (type.startsWith('image/')) return 'image';
    if (type.startsWith('video/')) return 'videocam';
    if (type.includes('pdf')) return 'picture-as-pdf';
    if (type.includes('document') || type.includes('word')) return 'description';
    if (type.includes('spreadsheet') || type.includes('excel')) return 'table-chart';
    return 'insert-drive-file';
  };

  const handleFilePress = (file: FileItem) => {
    setSelectedFile(file);
    setShowFileDetails(true);
  };

  const renderFileItem = ({ item: file }: { item: FileItem }) => {
    const isImage = file.type.startsWith('image/') || file.type === 'image';

    // Rendering file item

    return (
      <TouchableOpacity
        onPress={() => handleFilePress(file)}
        className="bg-white rounded-lg overflow-hidden"
        style={{ width: '48%', marginBottom: 12 }}
      >
        <View style={{ aspectRatio: 1, backgroundColor: '#F8F9FA' }}>
          {isImage ? (
            <R2Image
              url={file.url}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
              onLoad={() => {
                // Image loaded successfully
              }}
              onError={(error) => {
                // Image load error
              }}
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <MaterialIcons
                name={getFileIcon(file.type) as any}
                size={32}
                color="#6B7280"
              />
            </View>
          )}
        </View>
        <View className="p-3">
          <Text className="text-sm font-medium text-gray-900" numberOfLines={1}>
            {file.title}
          </Text>
        </View>
      </TouchableOpacity>
    );


  };

  if (error) {
    return (
      <LoadingError 
        message="Failed to load files" 
        onRetry={() => window.location.reload()} 
      />
    );
  }

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 py-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-lg font-semibold text-gray-900">Files</Text>
          <TouchableOpacity
            onPress={() => setShowUploadModal(true)}
            className="p-2"
          >
            <MaterialIcons name="cloud-upload" size={24} color="#3B82F6" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search and Filters */}
      <View className="bg-white border-b border-gray-200 px-4 py-3">
        <View className="flex-row items-center mb-3">
          <View className="flex-1 bg-gray-100 rounded-lg px-3 py-2 flex-row items-center">
            <MaterialIcons name="search" size={20} color="#6B7280" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Filter by title"
              className="flex-1 ml-2 text-base"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row">
            {[
              { key: 'all', label: 'All' },
              { key: 'images', label: 'Images' },
              { key: 'videos', label: 'Videos' },
              { key: 'documents', label: 'Documents' }
            ].map((filter) => (
              <TouchableOpacity
                key={filter.key}
                onPress={() => setSelectedType(filter.key)}
                className={`px-4 py-2 rounded-full mr-2 ${
                  selectedType === filter.key 
                    ? 'bg-blue-600' 
                    : 'bg-gray-200'
                }`}
              >
                <Text className={`text-sm font-medium ${
                  selectedType === filter.key 
                    ? 'text-white' 
                    : 'text-gray-700'
                }`}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Files List */}
      <View className="flex-1">
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-gray-500">Loading files...</Text>
          </View>
        ) : filteredFiles.length === 0 ? (
          <EmptyState
            title="No files found"
            description={searchQuery ? "Try adjusting your search" : "Upload your first file to get started"}
            actionText="Upload File"
            onAction={() => setShowUploadModal(true)}
          />
        ) : (
          <FlatList
            data={filteredFiles}
            renderItem={renderFileItem}
            keyExtractor={(item) => item.id}
            numColumns={2}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={10}
            initialNumToRender={20}
            getItemLayout={(data, index) => ({
              length: 160, // Approximate height of each item
              offset: 160 * Math.floor(index / 2),
              index,
            })}
            contentContainerStyle={{
              padding: 16,
              gap: 12
            }}
            columnWrapperStyle={{ justifyContent: 'space-between' }}
          />
        )}
      </View>

      {/* File Details Modal */}
      <Modal
        visible={showFileDetails}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        {selectedFile && (
          <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
            {/* Modal Header */}
            <View className="border-b border-gray-200 px-4 py-3">
              <View className="flex-row items-center justify-between">
                <TouchableOpacity onPress={() => setShowFileDetails(false)}>
                  <MaterialIcons name="close" size={24} color="#374151" />
                </TouchableOpacity>
                <Text className="text-lg font-semibold text-gray-900">File Details</Text>
                <View style={{ width: 24 }} />
              </View>
            </View>

            <ScrollView className="flex-1 p-4">
              {/* File Preview */}
              <View className="bg-gray-50 rounded-lg mb-6 overflow-hidden">
                {selectedFile.type.startsWith('image/') ? (
                  <R2Image
                    url={selectedFile.url}
                    style={{ width: '100%', height: 200 }}
                    resizeMode="contain"
                  />
                ) : (
                  <View className="h-48 items-center justify-center">
                    <MaterialIcons
                      name={getFileIcon(selectedFile.type) as any}
                      size={64}
                      color="#6B7280"
                    />
                    <Text className="text-gray-600 mt-2">image</Text>
                  </View>
                )}
              </View>

              {/* File Information */}
              <View className="space-y-4">
                <View>
                  <Text className="text-sm font-medium text-gray-500 mb-1">Title</Text>
                  <Text className="text-base text-gray-900">{selectedFile.title}</Text>
                </View>

                <View>
                  <Text className="text-sm font-medium text-gray-500 mb-1">Alt Text</Text>
                  <Text className="text-base text-gray-900">{selectedFile.alt || 'Primary image'}</Text>
                </View>

                <View>
                  <Text className="text-sm font-medium text-gray-500 mb-1">Type</Text>
                  <Text className="text-base text-gray-900">{selectedFile.type}</Text>
                </View>

                <View>
                  <Text className="text-sm font-medium text-gray-500 mb-1">Size</Text>
                  <Text className="text-base text-gray-900">{formatFileSize(selectedFile.size)}</Text>
                </View>

                <View>
                  <Text className="text-sm font-medium text-gray-500 mb-1">Date Added</Text>
                  <Text className="text-base text-gray-900">{formatDate(selectedFile.dateAdded)}</Text>
                </View>

                <View>
                  <Text className="text-sm font-medium text-gray-500 mb-1">Handle</Text>
                  <Text className="text-base text-gray-900 font-mono">{selectedFile.handle}</Text>
                </View>
              </View>

              {/* Actions */}
              <View className="mt-8 space-y-3">
                <TouchableOpacity
                  onPress={() => {
                    setCurrentFileField('image');
                    setShowUploadModal(true);
                    setShowFileDetails(false);
                  }}
                  className="bg-blue-600 py-3 px-4 rounded-lg"
                >
                  <Text className="text-white font-medium text-center">Replace File</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    // Copy URL to clipboard
                    Alert.alert('URL Copied', selectedFile.url);
                  }}
                  className="border border-gray-300 py-3 px-4 rounded-lg"
                >
                  <Text className="text-gray-700 font-medium text-center">Copy URL</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* Upload Modal */}
      <Modal
        visible={showUploadModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
          <View className="border-b border-gray-200 px-4 py-3">
            <View className="flex-row items-center justify-between">
              <TouchableOpacity onPress={() => setShowUploadModal(false)}>
                <MaterialIcons name="close" size={24} color="#374151" />
              </TouchableOpacity>
              <Text className="text-lg font-semibold text-gray-900">Upload Files</Text>
              <View style={{ width: 24 }} />
            </View>
          </View>

          <View className="flex-1 p-4">
            <FileUpload
              onUploadComplete={(fileId, fileData) => {
                setShowUploadModal(false);
                // Refresh the files list would happen automatically due to real-time sync
              }}
              onUploadError={(error) => {
                Alert.alert('Upload Error', error);
              }}
              allowMultiple={true}
              acceptedTypes="all"
              reference="files-manager"
              className="mb-4"
            />

            <Text className="text-sm text-gray-600 text-center">
              You can upload images, videos, and documents. Files will be automatically organized and made available throughout your store.
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}
