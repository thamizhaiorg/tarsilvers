import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Modal, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { db } from '../../lib/instant';
import { useStore } from '../../lib/store-context';
import { useFileSelection } from '../../hooks/useFiles';
import R2Image from './r2-image';

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

interface FileSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (files: FileItem[]) => void;
  allowMultiple?: boolean;
  acceptedTypes?: 'images' | 'videos' | 'documents' | 'all';
  title?: string;
  selectedFiles?: FileItem[];
}

export default function FileSelectionModal({
  visible,
  onClose,
  onSelect,
  allowMultiple = false,
  acceptedTypes = 'all',
  title = 'Select files',
  selectedFiles = []
}: FileSelectionModalProps) {
  const insets = useSafeAreaInsets();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Initialize selected files
  useEffect(() => {
    if (selectedFiles.length > 0) {
      setSelectedFileIds(new Set(selectedFiles.map(f => f.id)));
    }
  }, [selectedFiles]);

  // Use the files hook for real-time data
  const { files, isLoading, searchFiles } = useFileSelection();

  // Filter files using the hook
  const filteredFiles = useMemo(() => {
    return searchFiles(searchQuery, acceptedTypes);
  }, [searchFiles, searchQuery, acceptedTypes]);

  const handleFileToggle = (file: FileItem) => {
    const newSelected = new Set(selectedFileIds);
    
    if (allowMultiple) {
      if (newSelected.has(file.id)) {
        newSelected.delete(file.id);
      } else {
        newSelected.add(file.id);
      }
    } else {
      // Single selection - clear others and add this one
      newSelected.clear();
      newSelected.add(file.id);
    }
    
    setSelectedFileIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedFileIds.size === filteredFiles.length) {
      // Deselect all
      setSelectedFileIds(new Set());
    } else {
      // Select all
      setSelectedFileIds(new Set(filteredFiles.map(f => f.id)));
    }
  };

  const handleConfirmSelection = () => {
    const selectedFilesArray = filteredFiles.filter(file => selectedFileIds.has(file.id));
    onSelect(selectedFilesArray);
    onClose();
  };

  const getFileIcon = (type: string): string => {
    if (type.startsWith('image/')) return 'image';
    if (type.startsWith('video/')) return 'videocam';
    if (type.includes('pdf')) return 'picture-as-pdf';
    if (type.includes('document') || type.includes('word')) return 'description';
    if (type.includes('spreadsheet') || type.includes('excel')) return 'table-chart';
    return 'insert-drive-file';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderFileItem = ({ item: file }: { item: FileItem }) => {
    const isSelected = selectedFileIds.has(file.id);
    const isImage = file.type.startsWith('image/');
    
    if (viewMode === 'grid') {
      return (
        <TouchableOpacity
          onPress={() => handleFileToggle(file)}
          className="relative"
          style={{ width: '48%', marginBottom: 12 }}
        >
          <View className={`bg-white rounded-lg overflow-hidden border-2 ${
            isSelected ? 'border-blue-500' : 'border-gray-200'
          }`}>
            <View style={{ height: 120, backgroundColor: '#F8F9FA' }}>
              {isImage ? (
                <R2Image
                  url={file.url}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
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
            <View className="p-2">
              <Text className="text-sm font-medium text-gray-900" numberOfLines={1}>
                {file.title}
              </Text>
              <Text className="text-xs text-gray-500">
                {formatFileSize(file.size)}
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
    }

    // List view
    return (
      <TouchableOpacity
        onPress={() => handleFileToggle(file)}
        className={`bg-white border-b border-gray-100 px-4 py-3 flex-row items-center ${
          isSelected ? 'bg-blue-50' : ''
        }`}
      >
        {/* Selection Checkbox */}
        <View className={`w-6 h-6 rounded border-2 items-center justify-center mr-3 ${
          isSelected 
            ? 'bg-blue-500 border-blue-500' 
            : 'bg-white border-gray-300'
        }`}>
          {isSelected && (
            <MaterialIcons name="check" size={16} color="white" />
          )}
        </View>

        <View className="w-12 h-12 bg-gray-100 rounded-lg items-center justify-center mr-3">
          {isImage ? (
            <R2Image
              url={file.url}
              style={{ width: 48, height: 48, borderRadius: 8 }}
              resizeMode="cover"
            />
          ) : (
            <MaterialIcons 
              name={getFileIcon(file.type) as any} 
              size={24} 
              color="#6B7280" 
            />
          )}
        </View>
        
        <View className="flex-1">
          <Text className="text-base font-medium text-gray-900 mb-1">
            {file.title}
          </Text>
          <Text className="text-sm text-gray-500">
            {formatFileSize(file.size)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
        {/* Header */}
        <View className="bg-white border-b border-gray-200 px-4 py-3">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#374151" />
            </TouchableOpacity>
            <Text className="text-lg font-semibold text-gray-900">{title}</Text>
            <TouchableOpacity onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
              <MaterialIcons 
                name={viewMode === 'grid' ? "view-list" : "view-module"} 
                size={24} 
                color="#6B7280" 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search and Controls */}
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
            {allowMultiple && (
              <TouchableOpacity
                onPress={handleSelectAll}
                className="ml-3 px-3 py-2 bg-gray-100 rounded-lg"
              >
                <Text className="text-sm font-medium text-gray-700">
                  {selectedFileIds.size === filteredFiles.length ? 'Deselect All' : 'Select All'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Files List */}
        <View className="flex-1">
          {isLoading ? (
            <View className="flex-1 items-center justify-center">
              <Text className="text-gray-500">Loading files...</Text>
            </View>
          ) : filteredFiles.length === 0 ? (
            <View className="flex-1 items-center justify-center">
              <MaterialIcons name="folder-open" size={48} color="#9CA3AF" />
              <Text className="text-gray-500 mt-2">No files found</Text>
              {searchQuery && (
                <Text className="text-sm text-gray-400 mt-1">Try adjusting your search</Text>
              )}
            </View>
          ) : (
            <FlatList
              data={filteredFiles}
              renderItem={renderFileItem}
              keyExtractor={(item) => item.id}
              numColumns={viewMode === 'grid' ? 2 : 1}
              key={viewMode}
              contentContainerStyle={{
                padding: viewMode === 'grid' ? 16 : 0,
                gap: viewMode === 'grid' ? 12 : 0
              }}
              columnWrapperStyle={viewMode === 'grid' ? { justifyContent: 'space-between' } : undefined}
            />
          )}
        </View>

        {/* Bottom Action Bar */}
        {selectedFileIds.size > 0 && (
          <View className="bg-white border-t border-gray-200 px-4 py-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-gray-700 font-medium">
                {selectedFileIds.size} selected
              </Text>
              <TouchableOpacity
                onPress={handleConfirmSelection}
                className="bg-blue-600 px-6 py-2 rounded-lg"
              >
                <Text className="text-white font-medium">
                  {allowMultiple ? 'Select Files' : 'Select File'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}
