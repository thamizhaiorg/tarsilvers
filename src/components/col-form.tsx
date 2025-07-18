import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, TextInput, BackHandler, Modal, ScrollView, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { id } from '@instantdb/react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, getCurrentTimestamp } from '../lib/instant';
import R2Image from './ui/r2-image';
import FileUpload from './ui/file-upload';
import MediaSelectionModal from './ui/media-selection-modal';
import ProductSelect from './product-select';
import { useStore } from '../lib/store-context';
import { fileManager } from '../lib/file-manager';
import { trackError, log } from '../lib/logger';

interface CollectionFormScreenProps {
  collection?: any;
  onClose: () => void;
  onSave?: () => void;
}

export default function CollectionFormScreen({ collection, onClose, onSave }: CollectionFormScreenProps) {
  const insets = useSafeAreaInsets();
  const { currentStore } = useStore();
  const isEditing = !!collection;

  // Query collection with products relationship using optimized schema
  const { data: collectionWithProducts } = db.useQuery(
    collection?.id ? {
      collections: {
        $: {
          where: {
            id: collection.id
          }
        },
        products: {
          brand: {}, // Include relationship data
          category: {},
          type: {},
          vendor: {}
        }
      }
    } : null
  );

  const [formData, setFormData] = useState({
    name: collection?.name || '',
    description: collection?.description || '',
    image: collection?.image || '',
    isActive: collection?.isActive ?? true,
    storefront: collection?.storefront ?? true,
    pos: collection?.pos ?? true,
  });

  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [showProductSelect, setShowProductSelect] = useState(false);
  const [showMediaSelection, setShowMediaSelection] = useState(false);

  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      if (hasChanges) {
        setShowUnsavedChangesModal(true);
        return true;
      }
      onClose();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [hasChanges, onClose]);

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  // New file upload handlers
  const handleFileUploadComplete = (fileId: string, fileData: any) => {
    updateField('image', fileData.url);
    updateField('imageFileId', fileId); // Store file ID for reference
  };

  const handleMediaSelectionComplete = (media: any[]) => {
    if (media.length > 0) {
      const selectedMedia = media[0];
      updateField('image', selectedMedia.url);
      updateField('imageFileId', selectedMedia.id);
    }
  };

  const handleImageUpload = () => {
    setShowMediaSelection(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Collection name is required');
      return;
    }

    if (!currentStore?.id) {
      Alert.alert('Error', 'No store selected');
      return;
    }

    // Check for duplicate collection names (only for new collections)
    if (!isEditing) {
      try {
        const { data: existingCollections } = await db.queryOnce({
          collections: {
            $: { where: { name: formData.name.trim(), storeId: currentStore.id } }
          }
        });

        if (existingCollections.collections.length > 0) {
          Alert.alert('Error', 'A collection with this name already exists');
          return;
        }
      } catch (error) {
        console.error('Error checking for duplicate collection name:', error);
      }
    }

    setLoading(true);
    try {
      const timestamp = Date.now(); // Use timestamp number
      const collectionData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        image: formData.image,
        isActive: formData.isActive,
        storefront: formData.storefront,
        pos: formData.pos,
        storeId: currentStore.id, // Required field that was missing
        updatedAt: timestamp,
        ...(isEditing ? {} : { createdAt: timestamp }),
      };

      log.info('Saving collection', 'CollectionForm', { collectionData, isEditing });

      if (isEditing) {
        await db.transact(db.tx.collections[collection.id].update(collectionData));
        log.info('Collection updated successfully', 'CollectionForm', { collectionId: collection.id });
      } else {
        const newId = id();
        await db.transact(db.tx.collections[newId].update(collectionData));
        log.info('Collection created successfully', 'CollectionForm', { collectionId: newId });
      }

      setHasChanges(false);
      onSave?.();
      onClose();
    } catch (error) {
      trackError(error as Error, 'CollectionForm', { collectionData, isEditing });
      Alert.alert('Error', `Failed to save collection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      setShowUnsavedChangesModal(true);
    } else {
      onClose();
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: insets.top }}>
      {/* Header - Clean minimal design with left-aligned title */}
      <View style={{
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        backgroundColor: '#fff',
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <Text style={{
            fontSize: 18,
            fontWeight: '600',
            color: '#111827',
            flex: 1,
          }}>
            {isEditing ? 'Edit Collection' : 'New Collection'}
          </Text>

          {/* Save Button - Show when changes exist or for new collections with title */}
          {(hasChanges || (!isEditing && formData.name.trim())) && (
            <TouchableOpacity
              onPress={handleSave}
              disabled={loading || !formData.name.trim()}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: formData.name.trim() ? '#3B82F6' : '#E5E7EB',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialIcons
                name="check"
                size={20}
                color={formData.name.trim() ? '#fff' : '#9CA3AF'}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Form Content - Following prod-form design pattern */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {/* Main Container with Border */}
        <View style={{
          borderWidth: 1,
          borderColor: '#E5E7EB',
          backgroundColor: '#fff',
          borderRadius: 8,
          overflow: 'hidden',
        }}>
          {/* Collection Name */}
          <View style={{ paddingHorizontal: 16, paddingTop: 16, borderBottomWidth: 1, borderColor: '#E5E7EB' }}>
            <TextInput
              style={{
                fontSize: 24,
                fontWeight: '600',
                color: '#000',
                paddingVertical: 12,
                paddingHorizontal: 0,
                borderWidth: 0,
                backgroundColor: 'transparent',
              }}
              value={formData.name}
              onChangeText={(value) => updateField('name', value)}
              placeholder="COLLECTION NAME"
              placeholderTextColor="#999"
            />

            {/* Description field */}
            <TextInput
              style={{
                fontSize: 16,
                color: '#6B7280',
                paddingVertical: 8,
                paddingHorizontal: 0,
                borderWidth: 0,
                backgroundColor: 'transparent',
                marginTop: 4,
                marginBottom: 16,
              }}
              value={formData.description}
              onChangeText={(value) => updateField('description', value)}
              placeholder="description"
              placeholderTextColor="#9CA3AF"
              multiline
            />
          </View>

          {/* Image Upload Section */}
          <View style={{
            paddingHorizontal: 16,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderColor: '#E5E7EB',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{
                fontSize: 16,
                fontWeight: '500',
                color: '#111827',
              }}>
                Collection Image
              </Text>
              <TouchableOpacity
                onPress={() => setShowMediaSelection(true)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  backgroundColor: '#F3F4F6',
                  borderRadius: 6,
                }}
              >
                <Text style={{ fontSize: 12, color: '#6B7280' }}>Choose from Files</Text>
              </TouchableOpacity>
            </View>

            <FileUpload
              onUploadComplete={handleFileUploadComplete}
              onUploadStart={() => setImageUploading(true)}
              onUploadError={(error) => {
                setImageUploading(false);
                Alert.alert('Upload Error', error);
              }}
              acceptedTypes="images"
              reference={`collection-${collection?.id || 'new'}`}
              existingFile={formData.image ? { url: formData.image, type: 'image/jpeg' } : undefined}
              disabled={imageUploading}
              style={{ width: 120, height: 120 }}
            />
          </View>

          {/* Status Toggles */}
          <View style={{
            flexDirection: 'row',
            backgroundColor: '#fff',
            paddingHorizontal: 16,
            paddingVertical: 16,
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottomWidth: 1,
            borderColor: '#E5E7EB',
          }}>
            <Text style={{ fontSize: 16, fontWeight: '500', color: '#111827' }}>
              Active Status
            </Text>
            <TouchableOpacity
              onPress={() => updateField('isActive', !formData.isActive)}
              style={{
                width: 48,
                height: 28,
                borderRadius: 14,
                backgroundColor: formData.isActive ? '#10B981' : '#D1D5DB',
                justifyContent: 'center',
                paddingHorizontal: 2,
              }}
            >
              <View style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: '#fff',
                alignSelf: formData.isActive ? 'flex-end' : 'flex-start',
              }} />
            </TouchableOpacity>
          </View>

          {/* Storefront Toggle */}
          <View style={{
            flexDirection: 'row',
            backgroundColor: '#fff',
            paddingHorizontal: 16,
            paddingVertical: 16,
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottomWidth: 1,
            borderColor: '#E5E7EB',
          }}>
            <Text style={{ fontSize: 16, fontWeight: '500', color: '#111827' }}>
              Available on Storefront
            </Text>
            <TouchableOpacity
              onPress={() => updateField('storefront', !formData.storefront)}
              style={{
                width: 48,
                height: 28,
                borderRadius: 14,
                backgroundColor: formData.storefront ? '#10B981' : '#D1D5DB',
                justifyContent: 'center',
                paddingHorizontal: 2,
              }}
            >
              <View style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: '#fff',
                alignSelf: formData.storefront ? 'flex-end' : 'flex-start',
              }} />
            </TouchableOpacity>
          </View>

          {/* POS Toggle */}
          <View style={{
            flexDirection: 'row',
            backgroundColor: '#fff',
            paddingHorizontal: 16,
            paddingVertical: 16,
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottomWidth: isEditing ? 1 : 0,
            borderColor: '#E5E7EB',
          }}>
            <Text style={{ fontSize: 16, fontWeight: '500', color: '#111827' }}>
              Available in POS
            </Text>
            <TouchableOpacity
              onPress={() => updateField('pos', !formData.pos)}
              style={{
                width: 48,
                height: 28,
                borderRadius: 14,
                backgroundColor: formData.pos ? '#10B981' : '#D1D5DB',
                justifyContent: 'center',
                paddingHorizontal: 2,
              }}
            >
              <View style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: '#fff',
                alignSelf: formData.pos ? 'flex-end' : 'flex-start',
              }} />
            </TouchableOpacity>
          </View>

          {/* Products Section - Only show for existing collections */}
          {isEditing && (
            <View style={{
              paddingHorizontal: 16,
              paddingVertical: 16,
              backgroundColor: '#fff',
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}>
                <Text style={{
                  fontSize: 16,
                  fontWeight: '500',
                  color: '#111827',
                }}>
                  Products
                </Text>
                <TouchableOpacity
                  onPress={() => setShowProductSelect(true)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    backgroundColor: '#3B82F6',
                    borderRadius: 6,
                  }}
                >
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '500',
                    color: '#fff',
                  }}>
                    Manage
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={{
                fontSize: 14,
                color: '#6B7280',
              }}>
                {(collectionWithProducts?.collections?.[0] as any)?.products?.length || 0} product{((collectionWithProducts?.collections?.[0] as any)?.products?.length || 0) !== 1 ? 's' : ''} in this collection
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Unsaved Changes Modal */}
      <Modal
        visible={showUnsavedChangesModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowUnsavedChangesModal(false)}
      >
        <View style={{
          flex: 1,
          justifyContent: 'flex-end',
        }}>
          <View style={{
            backgroundColor: '#fff',
            paddingTop: 20,
            paddingBottom: 20 + insets.bottom,
            paddingHorizontal: 20,
          }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '500',
              color: '#111827',
              marginBottom: 16,
              textAlign: 'center',
            }}>
              Unsaved Changes
            </Text>
            <Text style={{
              fontSize: 14,
              color: '#6B7280',
              marginBottom: 24,
              textAlign: 'center',
            }}>
              You have unsaved changes. What would you like to do?
            </Text>
            <View style={{ gap: 12 }}>
              <TouchableOpacity
                onPress={handleSave}
                style={{
                  backgroundColor: '#3B82F6',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '500' }}>
                  Save Changes
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setShowUnsavedChangesModal(false);
                  onClose();
                }}
                style={{
                  backgroundColor: '#F3F4F6',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#111827', fontSize: 16, fontWeight: '500' }}>
                  Discard Changes
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowUnsavedChangesModal(false)}
                style={{
                  paddingVertical: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#6B7280', fontSize: 16 }}>
                  Continue Editing
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Product Selection Modal */}
      {isEditing && (
        <Modal
          visible={showProductSelect}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowProductSelect(false)}
        >
          <ProductSelect
            collectionId={collection.id}
            onClose={() => setShowProductSelect(false)}
          />
        </Modal>
      )}

      {/* Media Selection Modal */}
      <MediaSelectionModal
        visible={showMediaSelection}
        onClose={() => setShowMediaSelection(false)}
        onSelect={handleMediaSelectionComplete}
        allowMultiple={false}
        title="Select Collection Image"
      />
    </View>
  );
}
