import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, TextInput, BackHandler, Modal, ScrollView, Keyboard, Platform, KeyboardAvoidingView, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { id } from '@instantdb/react-native';
import { MaterialIcons, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import Input from './ui/Input';
import QuantitySelector from './ui/qty';
import FileUpload from './ui/file-upload';
import MediaSelectionModal from './ui/media-selection-modal';
import PrimaryImageSelectionModal from './ui/primary-image-selection-modal';

interface MediaItem {
  url: string;
  fileId: string;
  name: string;
  type: string;
}

import R2Image from './ui/r2-image';
import { db, getCurrentTimestamp } from '../lib/instant';
import { useStore } from '../lib/store-context';
import { fileManager } from '../lib/file-manager';
import { createDefaultLocation } from '../lib/inventory-setup';

// Simple replacement components for removed vtabs
const TabContent = ({ title, children }: { title: string; children?: React.ReactNode }) => (
  <View style={{ flex: 1, padding: 16 }}>
    {children}
  </View>
);

const FieldGroup = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={{ marginBottom: 24 }}>
    <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 12 }}>
      {title}
    </Text>
    <View style={{ gap: 12 }}>
      {children}
    </View>
  </View>
);

import TypeSelect from './type-select';
import CategorySelect from './category-select';
import { r2Service } from '../lib/r2-service';
import VendorSelect from './vendor-select';
import BrandSelect from './brand-select';
import CollectionSelect from './collection-select';
import TagSelect from './tag-select';
import MetafieldsSystem from './metafields-system';
import { log, trackError, PerformanceMonitor } from '../lib/logger';
import ErrorBoundary from './ui/error-boundary';
import OptionValuesSelector from '../screens/option-values-selector';

interface ProductFormScreenProps {
  product?: any;
  onClose: () => void;
  onSave?: () => void;
  onNavigate?: (screen: string, data?: any) => void;
  onHasChangesChange?: (hasChanges: boolean) => void;
}

export default function ProductFormScreen({ product, onClose, onSave, onNavigate, onHasChangesChange }: ProductFormScreenProps) {
  const insets = useSafeAreaInsets();
  const isEditing = !!product;

  // Query product with relationships using optimized schema
  const { data: productWithCollection } = db.useQuery(
    product?.id ? {
      products: {
        $: {
          where: {
            id: product.id
          }
        },
        collection: {},
        brand: {}, // Include all relationship data
        category: {},
        type: {},
        vendor: {}
      }
    } : null
  );

  const productCollection = productWithCollection?.products?.[0]?.collection as any;

  // Query option sets and values
  const { data: optionSetsData } = db.useQuery({
    opsets: {},
    opvalues: {}
  });

  // Query all relationship entities for display names
  const { data: relationshipData } = db.useQuery({
    types: {},
    categories: {},
    vendors: {},
    brands: {}
  });

  // Query items for the current product
  const { data: productItemsData } = db.useQuery(
    product?.id ? {
      items: {
        $: { where: { productId: product.id } }
      }
    } : {}
  );

  // Query metafield definitions for products
  const { data: metafieldDefinitionsData } = db.useQuery({
    metasets: {
      $: {
        where: {
          category: 'products'
        }
      }
    }
  });





  const [formData, setFormData] = useState({
    // Use title as primary field (schema uses title, not name)
    title: product?.title || '',
    image: product?.image || '',
    medias: product?.medias || [],
    blurb: product?.blurb || product?.excerpt || '',
    notes: product?.notes || '',
    typeId: product?.typeId || '',
    categoryId: product?.categoryId || '',
    vendorId: product?.vendorId || '',
    brandId: product?.brandId || '',
    unit: product?.unit || '',
    sku: product?.sku || '',
    price: product?.price?.toString() || '',
    saleprice: product?.saleprice?.toString() || '',

    options: product?.options || null,
    modifiers: product?.modifiers || null,
    metafields: product?.metafields || null,
    saleinfo: product?.saleinfo || null,
    stores: product?.stores || null,
    pos: product?.pos ?? false,
    website: product?.website ?? false,
    seo: product?.seo || null,
    tags: (() => {
      // Handle tags conversion from database format (string) to UI format (array)
      if (typeof product?.tags === 'string') {
        try {
          return JSON.parse(product.tags);
        } catch {
          return product.tags ? [product.tags] : [];
        }
      }
      return Array.isArray(product?.tags) ? product.tags : (product?.tags ? [product.tags] : []);
    })(),
    cost: product?.cost?.toString() || '',
    qrcode: product?.qrcode || '',
    stock: product?.stock || 0,
    publishAt: product?.publishAt || null,
    promoinfo: product?.promoinfo || null,
    featured: product?.featured ?? false,
    relproducts: product?.relproducts || null,
    sellproducts: product?.sellproducts || null,
    status: product?.status ?? 'active', // 'active', 'draft', or 'archived'
  });

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('core');
  const [imageError, setImageError] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [showTypeSelect, setShowTypeSelect] = useState(false);
  const [showCategorySelect, setShowCategorySelect] = useState(false);
  const [showVendorSelect, setShowVendorSelect] = useState(false);
  const [showBrandSelect, setShowBrandSelect] = useState(false);
  const [showCollectionSelect, setShowCollectionSelect] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(productCollection?.id || null);
  const [selectedCollectionName, setSelectedCollectionName] = useState<string | null>(productCollection?.name || null);
  const [showTagSelect, setShowTagSelect] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>((() => {
    // Handle tags conversion from database format (string) to UI format (array)
    if (typeof product?.tags === 'string') {
      try {
        return JSON.parse(product.tags);
      } catch {
        return product.tags ? [product.tags] : [];
      }
    }
    return Array.isArray(product?.tags) ? product.tags : (product?.tags ? [product.tags] : []);
  })());
  const [showLabelSkuDrawer, setShowLabelSkuDrawer] = useState(false);
  const [showStatusDrawer, setShowStatusDrawer] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [showMediaSelection, setShowMediaSelection] = useState(false);
  const [showPrimaryImageSelection, setShowPrimaryImageSelection] = useState(false);
  const [currentFileField, setCurrentFileField] = useState<'image' | 'medias'>('image');





  const [selectedOptionSet, setSelectedOptionSet] = useState<string | null>(null);
  const [selectedOptionValues, setSelectedOptionValues] = useState<string[]>([]);


  const [showFullScreenNotesEditor, setShowFullScreenNotesEditor] = useState(false);
  const [showOptionSetSelector, setShowOptionSetSelector] = useState(false);
  const [selectedOptionSets, setSelectedOptionSets] = useState<string[]>([]);
  const [showOptionValuesSelector, setShowOptionValuesSelector] = useState(false);
  const [currentOptionSet, setCurrentOptionSet] = useState<any>(null);
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);
  const [showPrimaryImageActions, setShowPrimaryImageActions] = useState(false);
  const [showMetafields, setShowMetafields] = useState(false);
  const [selectedMetafieldIds, setSelectedMetafieldIds] = useState<string[]>([]);
  const [showMetafieldSelector, setShowMetafieldSelector] = useState(false);
  const [selectedMetafieldGroup, setSelectedMetafieldGroup] = useState<string | null>(null);
  const [metafieldValues, setMetafieldValues] = useState<Record<string, any>>({});
  const [showMetafieldValueEditor, setShowMetafieldValueEditor] = useState(false);
  const [currentEditingField, setCurrentEditingField] = useState<any>(null);
  const [tempFieldValue, setTempFieldValue] = useState('');
  const [showItemGenerationLoading, setShowItemGenerationLoading] = useState(false);
  const [itemGenerationProgress, setItemGenerationProgress] = useState('');
  const [itemGenerationPercentage, setItemGenerationPercentage] = useState(0);
  
  // Animation for rotating circle
  const rotationAnim = useRef(new Animated.Value(0)).current;

  // Start rotation animation when loading begins
  useEffect(() => {
    if (showItemGenerationLoading) {
      // Start continuous rotation
      const startRotation = () => {
        rotationAnim.setValue(0);
        Animated.loop(
          Animated.timing(rotationAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          })
        ).start();
      };
      startRotation();
    } else {
      // Stop rotation when loading ends
      rotationAnim.stopAnimation();
    }
  }, [showItemGenerationLoading, rotationAnim]);

  // Memoized computations for better performance
  const selectedMetafields = useMemo(() => {
    if (!metafieldDefinitionsData?.metasets) return [];
    return metafieldDefinitionsData.metasets.filter((def: any) =>
      selectedMetafieldIds.includes(def.id)
    );
  }, [metafieldDefinitionsData?.metasets, selectedMetafieldIds]);

  const groupedMetafields = useMemo(() => {
    if (!metafieldDefinitionsData?.metasets) return {};
    return (metafieldDefinitionsData.metasets as any[]).reduce((acc: Record<string, any>, field: any) => {
      const groupName = field.group || 'Ungrouped';
      if (!acc[groupName]) {
        acc[groupName] = [];
      }
      acc[groupName].push(field);
      return acc;
    }, {} as Record<string, any>);
  }, [metafieldDefinitionsData?.metasets]);

  // Memoized placeholder function for better performance
  const getFieldPlaceholder = useCallback((type: string) => {
    switch (type) {
      case 'single_line_text': return 'Enter text';
      case 'multi_line_text': return 'Enter description';
      case 'number': return 'Enter number';
      case 'email': return 'Enter email address';
      case 'url': return 'Enter URL';
      case 'phone': return 'Enter phone number';
      case 'weight': return 'Enter weight';
      case 'dimension': return 'Enter dimensions';
      case 'volume': return 'Enter volume';
      case 'money': return 'Enter amount';
      case 'rating': return 'Enter rating';
      case 'date': return 'Enter date';
      case 'date_time': return 'Enter date and time';
      case 'color': return 'Enter color';
      case 'boolean': return 'True or False';
      default: return 'Enter value';
    }
  }, []);

  // Memoized type display function
  const getFieldTypeDisplay = useCallback((type: string) => {
    return type ? type.replace(/_/g, ' ') : 'Value';
  }, []);

  // Helper functions to get display names from relationship IDs
  const getTypeName = useCallback((typeId: string) => {
    if (!typeId) return null;
    
    // Try to get from relationship data first
    if (relationshipData?.types) {
      const type = relationshipData.types.find((t: any) => t.id === typeId);
      if (type?.name) return type.name;
    }
    
    // Fallback: try to get from product relationship data
    if (productWithCollection?.products?.[0]?.type?.[0]?.name) {
      return productWithCollection.products[0].type[0].name;
    }
    
    return null;
  }, [relationshipData?.types, productWithCollection?.products]);

  // Static jewelry categories mapping
  const JEWELRY_CATEGORIES_MAP = {
    'chuttis': 'Chuttis',
    'earrings': 'Earrings',
    'nose-rings': 'Nose rings',
    'necklaces': 'Necklaces',
    'bracelets': 'Bracelets',
    'hipchains': 'Hipchains',
    'anklets': 'Anklets',
  };

  const getCategoryName = useCallback((categoryId: string) => {
    if (!categoryId) return null;
    return JEWELRY_CATEGORIES_MAP[categoryId as keyof typeof JEWELRY_CATEGORIES_MAP] || null;
  }, []);

  const getVendorName = useCallback((vendorId: string) => {
    if (!vendorId || !relationshipData?.vendors) return null;
    const vendor = relationshipData.vendors.find((v: any) => v.id === vendorId);
    return vendor?.name || null;
  }, [relationshipData?.vendors]);

  const getBrandName = useCallback((brandId: string) => {
    if (!brandId || !relationshipData?.brands) return null;
    const brand = relationshipData.brands.find((b: any) => b.id === brandId);
    return brand?.name || null;
  }, [relationshipData?.brands]);









  // Update selectedCollectionId when productCollection changes
  useEffect(() => {
    setSelectedCollectionId(productCollection?.id || null);
    setSelectedCollectionName(productCollection?.name || null);
  }, [productCollection?.id, productCollection?.name]);

  // Initialize selected options from product data
  useEffect(() => {
    if (product?.options) {
      try {
        // Parse the options JSON string to get the option sets data
        const optionsData = typeof product.options === 'string'
          ? JSON.parse(product.options)
          : product.options;

        if (Array.isArray(optionsData)) {
          // Extract unique option set IDs from the stored options data
          const setIds = new Set<string>();

          // Get all option values to find which sets they belong to
          const allOptionValues = optionSetsData?.opvalues || [];

          optionsData.forEach((groupData: any) => {
            if (groupData.values && Array.isArray(groupData.values)) {
              groupData.values.forEach((value: any) => {
                // Find the option value in the database to get its setId
                const optionValue = allOptionValues.find((ov: any) =>
                  ov.name === value.name && ov.identifierValue === value.identifier
                );
                if (optionValue) {
                  setIds.add(optionValue.setId);
                }
              });
            }
          });

          setSelectedOptionSets(Array.from(setIds));
        }
      } catch (error) {
        console.error('Error parsing product options:', error);
        setSelectedOptionSets([]);
      }
    } else {
      setSelectedOptionSets([]);
    }
  }, [product?.options, optionSetsData?.opvalues]);

  // Update options in form data when selection changes
  useEffect(() => {
    updateOptions();
  }, [selectedOptionSet, selectedOptionValues]);

  // Track collection changes for hasChanges detection
  useEffect(() => {
    if (!isInitializing && isDataLoaded && isEditing && productCollection) {
      // If we're editing and the selected collection differs from the original
      if (selectedCollectionId !== productCollection?.id) {
        setHasChanges(true);
      }
    }
    // For new products, don't automatically set hasChanges just because a collection is selected
    // Only set hasChanges when user actually makes changes via updateField
  }, [selectedCollectionId, productCollection?.id, isEditing, isInitializing, isDataLoaded]);





  // Handle Android back button
  // Handle back button - show unsaved changes modal if needed
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

  // Show unsaved changes modal when trying to close with changes
  const handleClose = useCallback(() => {
    if (hasChanges) {
      setShowUnsavedChangesModal(true);
    } else {
      onClose();
    }
  }, [hasChanges, onClose]);

  // Notify main app when hasChanges state changes
  useEffect(() => {
    onHasChangesChange?.(hasChanges);
  }, [hasChanges, onHasChangesChange]);

  // Initialize metafield values and selected fields from product data
  useEffect(() => {
    if (product?.metafields && metafieldDefinitionsData?.metasets) {
      const values: Record<string, any> = {};
      const selectedIds: string[] = [];

      // Extract values from product metafields
      Object.entries(product.metafields).forEach(([fieldName, fieldData]: [string, any]) => {
        if (fieldData?.value !== undefined) {
          values[fieldName] = fieldData.value;

          // Find the field definition and add its ID to selected
          const definition = metafieldDefinitionsData.metasets.find((def: any) =>
            (def.name || def.title) === fieldName
          );
          if (definition?.id && !selectedIds.includes(definition.id)) {
            selectedIds.push(definition.id);
          }
        }
      });

      setMetafieldValues(values);
      setSelectedMetafieldIds(selectedIds);
    }
  }, [product?.metafields, metafieldDefinitionsData]);

  // Track when initial data is fully loaded
  useEffect(() => {
    if (!isDataLoaded && formData && (isEditing ? product : true)) {
      setIsDataLoaded(true);
    }
  }, [formData, product, isEditing, isDataLoaded]);

  // Mark initialization as complete after all initial data is loaded
  useEffect(() => {
    if (isInitializing && isDataLoaded) {
      // Wait for data to be loaded, then add a delay to ensure all effects have completed
      const timer = setTimeout(() => {
        setIsInitializing(false);
        // Reset hasChanges to false after initialization to clear any false positives
        setHasChanges(false);
      }, 500); // Longer delay to ensure all effects have completed
      return () => clearTimeout(timer);
    }
  }, [isInitializing, isDataLoaded]);

  // Function to check if there are actual changes
  const checkForChanges = (newFormData: any) => {
    if (!product) {
      // For new products, check if any meaningful fields have been filled
      const hasContent = newFormData.title.trim() ||
                        newFormData.image ||
                        newFormData.blurb.trim() ||
                        newFormData.notes.trim() ||
                        newFormData.typeId.trim() ||
                        newFormData.categoryId.trim() ||
                        newFormData.price.trim() ||
                        newFormData.sku.trim() ||
                        (newFormData.tags && newFormData.tags.length > 0);
      return !!hasContent;
    }

    // For existing products, compare with original values
    const originalData = {
      title: product.title || '',
      image: product.image || '',
      blurb: product.blurb || product.excerpt || '',
      notes: product.notes || '',
      type: product.type || '',
      category: product.category || '',
      unit: product.unit || '',
      sku: product.sku || '',
      price: product.price?.toString() || '',
      saleprice: product.saleprice?.toString() || '',
      vendor: product.vendor || '',
      brand: product.brand || '',
      cost: product.cost?.toString() || '',
      tags: Array.isArray(product.tags) ? product.tags : (product.tags ? [product.tags] : []),
      pos: product.pos ?? false,
      website: product.website ?? false,
      status: product.status ?? true,
    };

    // Check if any field has changed
    const fieldChanged = Object.keys(originalData).some(key => {
      const original = originalData[key as keyof typeof originalData];
      const current = newFormData[key];

      // Special handling for arrays (like tags)
      if (Array.isArray(original) && Array.isArray(current)) {
        return JSON.stringify(original.sort()) !== JSON.stringify(current.sort());
      }

      // Handle null/undefined comparisons
      if (original == null && current == null) return false;
      if (original == null || current == null) return true;

      // Convert to strings for comparison to handle type differences
      return String(original) !== String(current);
    });

    // Check if metafields have changed
    const originalMetafields = product?.metafields || {};
    const originalIds: string[] = [];
    const originalValues: Record<string, any> = {};

    // Extract original field IDs and values
    if (metafieldDefinitionsData?.metasets) {
      Object.entries(originalMetafields).forEach(([fieldName, fieldData]: [string, any]) => {
        if (fieldData?.value !== undefined) {
          originalValues[fieldName] = fieldData.value;
          const definition = metafieldDefinitionsData.metasets.find((def: any) =>
            (def.name || def.title) === fieldName
          );
          if (definition?.id && !originalIds.includes(definition.id)) {
            originalIds.push(definition.id);
          }
        }
      });
    }

    const metafieldsChanged =
      JSON.stringify(originalIds.sort()) !== JSON.stringify(selectedMetafieldIds.sort()) ||
      Object.keys(metafieldValues).some(key => metafieldValues[key] !== originalValues[key]) ||
      Object.keys(originalValues).some(key => originalValues[key] !== metafieldValues[key]);

    return fieldChanged || metafieldsChanged;
  };

  // Function to show notification
  const showNotificationMessage = (message: string) => {
    setNotificationMessage(message);
    setShowNotification(true);
    setTimeout(() => {
      setShowNotification(false);
    }, 3000);
  };

  const updateField = (field: string, value: any) => {
    if (field === 'image') {
      setImageError(false); // Reset image error when image URL changes
    }

    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);

    // Only set hasChanges if fully initialized and there are actual changes
    if (!isInitializing && isDataLoaded) {
      setHasChanges(checkForChanges(newFormData));
    }
  };

  // Function to handle status change with validation
  const handleStatusChange = (newStatus: string) => {
    if (newStatus === 'active' && !formData.pos && !formData.website) {
      showNotificationMessage('Enable POS or Website to set product as Active');
      return;
    }
    updateField('status', newStatus);
    setShowStatusDrawer(false);
  };

  const updateOptions = () => {
    const optionsData = selectedOptionSet ? {
      optionSet: selectedOptionSet,
      selectedValues: selectedOptionValues
    } : null;
    updateField('options', optionsData);
  };

  const handleMetafieldSelection = useCallback((fieldId: string) => {
    if (selectedMetafieldIds.includes(fieldId)) {
      // Remove field
      setSelectedMetafieldIds(prev => prev.filter(id => id !== fieldId));
    } else {
      // Add field
      setSelectedMetafieldIds(prev => [...prev, fieldId]);

      // Initialize default value for newly selected field
      if (metafieldDefinitionsData?.metasets) {
        const field = metafieldDefinitionsData.metasets.find((def: any) => def.id === fieldId);
        if (field) {
          const fieldName = field.name || (field as any).title;
          if (!metafieldValues[fieldName]) {
            setMetafieldValues(prev => ({
              ...prev,
              [fieldName]: ''
            }));
          }
        }
      }
    }

    // Only set hasChanges if fully initialized
    if (!isInitializing && isDataLoaded) {
      setHasChanges(true);
    }
  }, [selectedMetafieldIds, metafieldDefinitionsData?.metasets, metafieldValues, isInitializing, isDataLoaded]);

  const handleSelectAllMetafields = useCallback((groupName: string) => {
    const fieldsInGroup = groupedMetafields[groupName] || [];
    const allSelected = fieldsInGroup.every((field: any) => selectedMetafieldIds.includes(field.id));

    if (allSelected) {
      // Deselect all fields in group
      fieldsInGroup.forEach((field: any) => {
        if (selectedMetafieldIds.includes(field.id)) {
          handleMetafieldSelection(field.id);
        }
      });
    } else {
      // Select all fields in group
      fieldsInGroup.forEach((field: any) => {
        if (!selectedMetafieldIds.includes(field.id)) {
          handleMetafieldSelection(field.id);
        }
      });
    }
  }, [groupedMetafields, selectedMetafieldIds, handleMetafieldSelection]);





  const handleMediaChange = useCallback((media: MediaItem[]) => {
    setImageError(false); // Reset image error when media changes
    const newFormData = { ...formData, medias: media };
    setFormData(newFormData);

    // Only set hasChanges if fully initialized and there are actual changes
    if (!isInitializing && isDataLoaded) {
      setHasChanges(checkForChanges(newFormData));
    }
  }, [formData, product, isInitializing, isDataLoaded]);

  const generateItemsFromOptionSets = async (optionSetNames: string[]) => {
    if (!product?.id) {
      Alert.alert('Error', 'Product must be saved before generating items');
      return;
    }

    if (optionSetNames.length === 0) {
      Alert.alert('Error', 'Please select at least one option set');
      return;
    }

    try {
      // First, delete all existing items for this product
      const existingItems = productItemsData?.items || [];
      if (existingItems.length > 0) {
        const deletePromises = existingItems.map((item: any) =>
          db.transact(db.tx.items[item.id].delete())
        );
        await Promise.all(deletePromises);
      }

      // Get options for each selected set and group by their group field
      const optionArrays: any[][] = [];

      for (const setId of optionSetNames.slice(0, 3)) { // Limit to 3 option sets (option1, option2, option3)
        const setOptions = optionSetsData?.opvalues?.filter(
          (option: any) => option.setId === setId
        ) || [];

        if (setOptions.length > 0) {
          // Group options by their group field (Group 1, Group 2, Group 3)
          const groupMap = new Map<string, any[]>();

          setOptions.forEach((option: any) => {
            const group = option.group || 'Group 1';
            if (!groupMap.has(group)) {
              groupMap.set(group, []);
            }
            groupMap.get(group)!.push(option);
          });

          // Sort groups and add each group as a separate dimension
          const sortedGroups = Array.from(groupMap.keys()).sort();
          sortedGroups.forEach(groupName => {
            const groupOptions = groupMap.get(groupName)!;
            optionArrays.push(groupOptions.sort((a: any, b: any) => (a.order || 0) - (b.order || 0)));
          });
        }
      }

      if (optionArrays.length === 0) {
        Alert.alert('Error', 'No option values found for selected sets');
        return;
      }

      // Generate all possible combinations
      const generateCombinations = (arrays: any[][]): any[][] => {
        if (arrays.length === 0) return [[]];
        if (arrays.length === 1) return arrays[0].map(item => [item]);

        const result: any[][] = [];
        const firstArray = arrays[0];
        const restCombinations = generateCombinations(arrays.slice(1));

        firstArray.forEach(firstItem => {
          restCombinations.forEach(restCombination => {
            result.push([firstItem, ...restCombination]);
          });
        });

        return result;
      };

      const combinations = generateCombinations(optionArrays);

      // Generate items for each combination
      const itemPromises = combinations.map(async (combination: any[], index: number) => {
        const itemId = id();

        // Create SKU from combination values
        const skuParts = combination.map(option =>
          option.name?.toUpperCase().replace(/\s+/g, '-') || `OPT${index}`
        );
        const productPrefix = formData.title?.toUpperCase().replace(/\s+/g, '-') || formData.sku || 'ITEM';
        const itemSku = `${productPrefix}-${skuParts.join('-')}`;

        // Create item data with up to 3 options
        const itemData: any = {
          productId: product.id,
          sku: itemSku,
          price: formData.price || 0,
          saleprice: formData.saleprice || 0,
          cost: formData.cost || 0,
        };

        // Assign option values to option1, option2, option3
        if (combination[0]) itemData.option1 = combination[0].name;
        if (combination[1]) itemData.option2 = combination[1].name;
        if (combination[2]) itemData.option3 = combination[2].name;

        // Create the item first
        await db.transact([
          db.tx.items[itemId].update(itemData),
          db.tx.items[itemId].link({ product: product.id })
        ]);

        return Promise.resolve();
      });

      await Promise.all(itemPromises);

      const setNames = optionSetNames.join(', ');
      Alert.alert('Success', `Generated ${combinations.length} item variants from option sets: ${setNames}`);
      setShowOptionSetSelector(false);
      // Don't clear selectedOptionSets - keep them to show which sets have been used

    } catch (error) {
      console.error('Failed to generate items:', error);
      Alert.alert('Error', 'Failed to generate items. Please try again.');
    }
  };

  const generateItemsFromSelectedValues = async (selectedValues: any[], optionSetData: any) => {
    if (!product?.id) {
      Alert.alert('Error', 'Product must be saved before generating items');
      return;
    }

    if (selectedValues.length === 0) {
      Alert.alert('Error', 'Please select at least one option value');
      return;
    }

    // Show full-screen loading immediately - no delay
    setShowItemGenerationLoading(true);
    setItemGenerationProgress('Preparing to generate items...');
    setItemGenerationPercentage(0);

    try {
      // First, delete all existing items for this product
      setItemGenerationProgress('Removing existing items...');
      setItemGenerationPercentage(10);
      const existingItems = productItemsData?.items || [];
      if (existingItems.length > 0) {
        const deletePromises = existingItems.map((item: any) =>
          db.transact(db.tx.items[item.id].delete())
        );
        await Promise.all(deletePromises);
      }

      // Group selected values by their group field
      setItemGenerationProgress('Processing option combinations...');
      setItemGenerationPercentage(20);
      const groupMap = new Map<string, any[]>();
      selectedValues.forEach((value: any) => {
        const group = value.group || 'Group 1';
        if (!groupMap.has(group)) {
          groupMap.set(group, []);
        }
        groupMap.get(group)!.push(value);
      });

      // Convert groups to arrays for combination generation
      const optionArrays = Array.from(groupMap.values());

      // Generate all possible combinations
      const generateCombinations = (arrays: any[][]): any[][] => {
        if (arrays.length === 0) return [[]];
        if (arrays.length === 1) return arrays[0].map(item => [item]);

        const result: any[][] = [];
        const firstArray = arrays[0];
        const restCombinations = generateCombinations(arrays.slice(1));

        firstArray.forEach(firstItem => {
          restCombinations.forEach(restCombination => {
            result.push([firstItem, ...restCombination]);
          });
        });

        return result;
      };

      const combinations = generateCombinations(optionArrays);
      setItemGenerationProgress(`Creating ${combinations.length} item variants...`);
      setItemGenerationPercentage(30);

      // Generate items for each combination with progress updates
      const totalItems = combinations.length;
      let completedItems = 0;

      const itemPromises = combinations.map(async (combination: any[], index: number) => {
        const itemId = id();

        // Create SKU from combination values
        const skuParts = combination.map(option =>
          option.name?.toUpperCase().replace(/\s+/g, '-') || `OPT${index}`
        );
        const productPrefix = formData.title?.toUpperCase().replace(/\s+/g, '-') || formData.sku || 'ITEM';
        const itemSku = `${productPrefix}-${skuParts.join('-')}`;

        // Create item data with up to 3 options
        const itemData: any = {
          productId: product.id,
          sku: itemSku,
          price: formData.price || 0,
          saleprice: formData.saleprice || 0,
          cost: formData.cost || 0,
        };

        // Assign option values to option1, option2, option3
        if (combination[0]) itemData.option1 = combination[0].name;
        if (combination[1]) itemData.option2 = combination[1].name;
        if (combination[2]) itemData.option3 = combination[2].name;

        // Create the item first
        await db.transact([
          db.tx.items[itemId].update(itemData),
          db.tx.items[itemId].link({ product: product.id })
        ]);

        // Update progress
        completedItems++;
        const progress = 30 + Math.floor((completedItems / totalItems) * 50); // 30-80% for item creation
        setItemGenerationPercentage(progress);

        return Promise.resolve();
      });

      await Promise.all(itemPromises);

      // Update product options field for storefront display
      setItemGenerationProgress('Updating product options...');
      setItemGenerationPercentage(85);
      const optionsGroupMap = new Map<string, any[]>();
      selectedValues.forEach((value: any) => {
        const group = value.group || 'Group 1';
        if (!optionsGroupMap.has(group)) {
          optionsGroupMap.set(group, []);
        }
        optionsGroupMap.get(group)!.push({
          name: value.name,
          type: value.identifierType,
          identifier: value.identifierValue
        });
      });

      // Convert to the required format
      const productOptionsData = Array.from(optionsGroupMap.entries()).map(([group, values]) => ({
        group,
        values
      }));

      await db.transact(
        db.tx.products[product.id].update({
          options: JSON.stringify(productOptionsData)
        })
      );

      setItemGenerationProgress('Finalizing...');
      setItemGenerationPercentage(95);
      
      // Add a small delay to show completion
      await new Promise(resolve => setTimeout(resolve, 500));
      setItemGenerationPercentage(100);

      // Hide loading screen and close modals
      setShowItemGenerationLoading(false);
      setShowOptionValuesSelector(false);
      setCurrentOptionSet(null);
      setShowOptionSetSelector(false);

    } catch (error) {
      setShowItemGenerationLoading(false);
      log.error('Failed to generate items', 'ProductForm', { error: error instanceof Error ? error.message : 'Unknown error' });
      Alert.alert('Error', 'Failed to generate items. Please try again.');
    }
  };

  // Function to fix unlinked items
  const fixUnlinkedItems = async () => {
    try {
      // Query all items
      const { data: allItemsData } = await db.queryOnce({
        items: {
          $: { where: {} }, // No store filtering needed
          product: {}
        }
      });

      const allItems = allItemsData?.items || [];

      // Find items that have productId but no product link
      const unlinkedItems = allItems.filter(item =>
        item.productId && (!item.product || (item.product as any).length === 0)
      );

      if (unlinkedItems.length > 0) {
        console.log(`Found ${unlinkedItems.length} unlinked items, fixing...`);

        // Create link transactions for unlinked items
        const linkTransactions = unlinkedItems.map(item =>
          db.tx.items[item.id].link({ product: item.productId })
        );

        await db.transact(linkTransactions);
        console.log(`Fixed ${unlinkedItems.length} unlinked items`);

        // Show success message
        Alert.alert('Success', `Fixed ${unlinkedItems.length} unlinked items`);
      } else {
        Alert.alert('Info', 'No unlinked items found');
      }
    } catch (error) {
      console.error('Failed to fix unlinked items:', error);
      Alert.alert('Error', 'Failed to fix unlinked items');
    }
  };

  const generateSingleItem = async (productId: string, productTitle: string) => {

    try {
      // Check if items already exist for this product
      const existingItems = productItemsData?.items || [];
      if (existingItems.length > 0) {
        // Update existing single item name if it exists
        const singleItem = existingItems.find((item: any) =>
          !item.option1 && !item.option2 && !item.option3
        );
        if (singleItem) {
          const productPrefix = productTitle.toUpperCase().replace(/\s+/g, '-');
          await db.transact(
            db.tx.items[singleItem.id].update({
              sku: productPrefix
            })
          );
        }
        return;
      }

      // Generate a single item for products without options
      const itemId = id();
      const productPrefix = productTitle.toUpperCase().replace(/\s+/g, '-');

      const itemData = {
        productId: productId,
        sku: productPrefix,
        price: formData.price || 0,
        saleprice: formData.saleprice || 0,
        cost: formData.cost || 0,
      };

      await db.transact([
        db.tx.items[itemId].update(itemData),
        db.tx.items[itemId].link({ product: productId })
      ]);
    } catch (error) {
      trackError(error as Error, 'ProdForm', { operation: 'generateSingleItem' });
    }
  };

  // New file upload handlers using file manager
  const handleFileUploadComplete = (fileId: string, fileData: any) => {
    if (currentFileField === 'image') {
      updateField('image', fileData.url);
      updateField('imageFileId', fileId); // Store file ID for reference
    } else if (currentFileField === 'medias') {
      const currentMedias = formData.medias || [];
      const newMedia = {
        url: fileData.url,
        fileId: fileId,
        name: fileData.title,
        type: fileData.type
      };
      updateField('medias', [...currentMedias, newMedia]);
    }
  };

  const handleMediaSelectionComplete = (media: any[]) => {
    // Convert media items to the format expected by MediaManager
    const mediaItems = media.map(m => ({
      url: m.url,
      fileId: m.id,
      name: m.title,
      type: m.type
    }));
    updateField('medias', mediaItems);
  };

  const handlePrimaryImageSelectionComplete = (media: any) => {
    // Update both fields in a single operation to avoid state race condition
    const newFormData = {
      ...formData,
      image: media.url,
      imageFileId: media.id
    };

    setImageError(false); // Reset image error
    setFormData(newFormData);

    // Only set hasChanges if fully initialized and there are actual changes
    if (!isInitializing && isDataLoaded) {
      setHasChanges(checkForChanges(newFormData));
    }
  };

  const openMediaSelection = (field: 'image' | 'medias') => {
    if (field === 'image') {
      setShowPrimaryImageSelection(true);
    } else {
      setShowMediaSelection(true);
    }
  };

  const handlePrimaryImageUpload = () => {
    openMediaSelection('image');
  };



  const handleSave = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Product title is required');
      return;
    }



    setLoading(true);
    log.info(`Starting product save: ${isEditing ? 'edit' : 'create'}`, 'ProductForm', {
      productId: product?.id,
      title: formData.title
    });

    try {
      await PerformanceMonitor.measureAsync('product-save', async () => {
      const timestamp = getCurrentTimestamp();
      const productData: any = {
        // Required fields
        updatedAt: timestamp,
        ...(isEditing ? {} : { createdAt: timestamp }),
      };

      // Add title (primary field in schema)
      productData.title = formData.title.trim();

      // Add optional fields if they have values
      if (formData.image) productData.image = formData.image;
      if (formData.medias && formData.medias.length > 0) productData.medias = formData.medias;
      if (formData.blurb) productData.blurb = formData.blurb.trim();
      if (formData.notes && typeof formData.notes === 'string') productData.notes = formData.notes.trim();
      if (formData.typeId) productData.typeId = formData.typeId.trim();
      if (formData.categoryId) productData.categoryId = formData.categoryId.trim();
      if (formData.vendorId) productData.vendorId = formData.vendorId.trim();
      if (formData.brandId) productData.brandId = formData.brandId.trim();
      if (formData.unit) productData.unit = formData.unit.trim();
      if (formData.sku) productData.sku = formData.sku.trim();
      if (formData.price) productData.price = parseFloat(formData.price) || 0;
      if (formData.saleprice) productData.saleprice = parseFloat(formData.saleprice) || 0;
      if (formData.options) productData.options = formData.options;
      if (formData.modifiers) productData.modifiers = formData.modifiers;
      // Handle metafields - build metafields object from selected fields and values
      if (selectedMetafields.length > 0) {
        const metafieldData: Record<string, any> = {};

        selectedMetafields.forEach((field: any) => {
          const fieldName = field.name || field.title;
          const value = metafieldValues[fieldName];
          if (value !== undefined && value !== '') {
            metafieldData[fieldName] = {
              value: value.toString(),
              type: field.type,
              group: field.group
            };
          }
        });

        if (Object.keys(metafieldData).length > 0) {
          productData.metafields = metafieldData;
        }
      }
      if (formData.saleinfo) productData.saleinfo = formData.saleinfo;
      if (formData.stores) productData.stores = formData.stores;

      // Boolean fields
      productData.pos = formData.pos;
      productData.website = formData.website;
      productData.featured = formData.featured;
      productData.status = formData.status;

      if (formData.seo) productData.seo = formData.seo;
      // Convert tags array to JSON string for database compatibility
      // The database schema expects a string, but we work with arrays in the UI
      if (Array.isArray(formData.tags)) {
        productData.tags = JSON.stringify(formData.tags);
      } else {
        productData.tags = JSON.stringify([]);
      }
      if (formData.cost) productData.cost = parseFloat(formData.cost) || 0;
      if (formData.qrcode) productData.qrcode = formData.qrcode.trim();
      if (formData.stock !== undefined) productData.stock = formData.stock;
      if (formData.publishAt) productData.publishAt = formData.publishAt;
      if (formData.promoinfo) productData.promoinfo = formData.promoinfo;
      if (formData.relproducts) productData.relproducts = formData.relproducts;
      if (formData.sellproducts) productData.sellproducts = formData.sellproducts;



      let productId: string;

      if (isEditing) {
        productId = product.id;
        await db.transact(db.tx.products[product.id].update(productData));
      } else {
        productId = id();
        await db.transact(db.tx.products[productId].update(productData));
      }

      // Handle collection relationship
      if (selectedCollectionId) {
        await db.transact(db.tx.products[productId].link({ collection: selectedCollectionId }));
      } else if (isEditing && productCollection?.id) {
        // If editing and collection was removed, unlink it
        await db.transact(db.tx.products[productId].unlink({ collection: productCollection.id }));
      }

      // Auto-generate items for new products
      if (!isEditing) {
        // If creating new product, generate a single item by default
        await generateSingleItem(productId, formData.title.trim());
      }

      log.info(`Product saved successfully: ${productId}`, 'ProductForm');
      onSave?.();
      onClose();
      }); // End performance monitoring
    } catch (error) {
      trackError(error as Error, 'ProductForm', {
        productId: product?.id,
        isEditing,
        formData: { title: formData.title }
      });
      Alert.alert('Error', 'Failed to save product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Define tabs with their content
  const tabs = [
    {
      id: 'core',
      label: 'Core',
      icon: <Ionicons name="cube-outline" size={20} color="#6B7280" />,
      content: (
        <TabContent title="">
          {/* Main Container with Border around entire structure */}
          <View style={{
            borderWidth: 1,
            borderColor: '#E5E7EB',
            backgroundColor: '#fff',
            borderRadius: 8,
            marginHorizontal: 0,
            marginVertical: 0,
            overflow: 'hidden',
          }}>
            {/* First Row: Image Upload Only */}
            <View style={{
              flexDirection: 'row',
              borderBottomWidth: 1,
              borderBottomColor: '#E5E7EB',
            }}>
              {/* Image Upload Tile - Square */}
              <TouchableOpacity
                style={{
                  width: 120,
                  height: 120,
                  backgroundColor: '#F9FAFB',
                  borderRightWidth: 1,
                  borderColor: '#E5E7EB',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onPress={handlePrimaryImageUpload}
              >
                {formData.image && !imageError ? (
                  <R2Image
                    url={formData.image}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                    onError={() => {
                      setImageError(true);
                    }}
                    onLoad={() => {
                      // Image loaded successfully
                    }}
                  />
                ) : (
                  <View style={{ alignItems: 'center' }}>
                    <MaterialIcons name="camera-alt" size={24} color="#9CA3AF" />
                    <Text style={{ color: '#9CA3AF', fontSize: 10, marginTop: 4, textAlign: 'center' }}>
                      Upload
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Stock Units and Price - Takes remaining space */}
              <View style={{ flex: 1, height: 120, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 48, fontWeight: '700', color: '#111827' }}>
                    {formData.stock || 0}
                  </Text>
                  <Text style={{ fontSize: 16, color: '#6B7280', marginTop: 4 }}>
                    {formData.unit || 'units'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 24, fontWeight: '600', color: '#111827' }}>
                    {parseFloat(formData.saleprice || '0').toFixed(2)} $
                  </Text>
                </View>
              </View>
            </View>

            {/* Product Title */}
            <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
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
                value={formData.title}
                onChangeText={(value) => updateField('title', value)}
                placeholder="PRODUCT TITLE"
                placeholderTextColor="#999"
              />

              {/* Excerpt field */}
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
                value={formData.blurb}
                onChangeText={(value) => updateField('blurb', value)}
                placeholder="blurb"
                placeholderTextColor="#9CA3AF"
                multiline
              />
            </View>



            {/* Bottom Row: Notes, Options, POS, Website, Status */}
            <View style={{
              flexDirection: 'row',
              backgroundColor: '#fff',
              borderTopWidth: 1,
              borderTopColor: '#E5E7EB',
            }}>
              {/* Notes Tile - Square */}
              <TouchableOpacity
                style={{
                  width: 60,
                  height: 60,
                  backgroundColor: '#fff',
                  borderRightWidth: 1,
                  borderColor: '#E5E7EB',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onPress={() => setShowFullScreenNotesEditor(true)}
              >
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>n</Text>
              </TouchableOpacity>

              {/* POS Tile - Square */}
              <TouchableOpacity
                style={{
                  width: 60,
                  height: 60,
                  backgroundColor: formData.pos ? '#F3F4F6' : '#fff',
                  borderRightWidth: 1,
                  borderColor: '#E5E7EB',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onPress={() => updateField('pos', !formData.pos)}
              >
                <MaterialIcons name="point-of-sale" size={24} color={formData.pos ? '#111827' : '#9CA3AF'} />
              </TouchableOpacity>

              {/* Website Tile - Square */}
              <TouchableOpacity
                style={{
                  width: 60,
                  height: 60,
                  backgroundColor: formData.website ? '#F3F4F6' : '#fff',
                  borderRightWidth: 1,
                  borderColor: '#E5E7EB',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onPress={() => updateField('website', !formData.website)}
              >
                <MaterialIcons name="language" size={24} color={formData.website ? '#111827' : '#9CA3AF'} />
              </TouchableOpacity>

              {/* Status Tile - Rectangle taking remaining space */}
              <TouchableOpacity
                style={{
                  flex: 1,
                  height: 60,
                  backgroundColor: '#fff',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 12,
                }}
                onPress={() => setShowStatusDrawer(true)}
              >
                <Text style={{ fontSize: 14, color: '#111827', fontWeight: '500' }}>
                  {formData.status === 'active' ? 'Active' : formData.status === 'draft' ? 'Draft' : 'Archived'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Second Container - Options and Items */}
          <View style={{
            borderWidth: 1,
            borderColor: '#E5E7EB',
            backgroundColor: '#fff',
            borderRadius: 8,
            marginHorizontal: 0,
            marginTop: 16,
            overflow: 'hidden',
          }}>

            {/* Options Row */}
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: '#E5E7EB',
              }}
              onPress={() => setShowOptionSetSelector(true)}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '500', color: '#111827' }}>
                  Options
                </Text>
                <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 2 }}>
                  {(() => {
                    // Show selected option values from product.options
                    if (product?.options) {
                      try {
                        const optionsData = typeof product.options === 'string'
                          ? JSON.parse(product.options)
                          : product.options;

                        if (Array.isArray(optionsData) && optionsData.length > 0) {
                          // Count total selected values across all groups
                          const totalValues = optionsData.reduce((sum, group) => {
                            return sum + (group.values ? group.values.length : 0);
                          }, 0);

                          // Get first few option values to display
                          const allValues = optionsData.flatMap(group => group.values || []);
                          const displayValues = allValues.slice(0, 3).map(v => v.name).join(', ');
                          const remainingCount = Math.max(0, totalValues - 3);

                          if (totalValues === 0) {
                            return 'No option values selected';
                          }

                          return remainingCount > 0
                            ? `${displayValues} +${remainingCount} more (${totalValues} total)`
                            : `${displayValues} (${totalValues} total)`;
                        }
                      } catch (error) {
                        console.error('Error parsing product options:', error);
                      }
                    }

                    // Fallback to showing option sets if no values are stored
                    const optionSets = optionSetsData?.opsets || [];
                    const productOptionSets = optionSets.filter(set =>
                      selectedOptionSets.includes(set.id)
                    );

                    if (productOptionSets.length === 0) {
                      return 'No options selected';
                    }

                    const optionNames = productOptionSets.map(set => set.name).join(', ');
                    return `${productOptionSets.length} option set${productOptionSets.length !== 1 ? 's' : ''}: ${optionNames}`;
                  })()}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            {/* Items Row */}
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
              onPress={() => onNavigate?.('items', { productId: product?.id, product: product })}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '500', color: '#111827' }}>
                  Items
                </Text>
                <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 2 }}>
                  {(() => {
                    const items = productItemsData?.items || [];
                    return `${items.length} item${items.length !== 1 ? 's' : ''}`;
                  })()}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
            </TouchableOpacity>


          </View>
        </TabContent>
      ),
    },
    {
      id: 'metafields',
      label: 'Metafields',
      icon: <MaterialIcons name="numbers" size={20} color="#6B7280" />,
      content: (
        <TabContent title="">
          <View style={{ margin: -16, padding: 0 }}>
            <View style={{
              marginTop: 0,
              marginBottom: 0,
              paddingTop: 0,
              marginHorizontal: 0,
              borderTopWidth: 0
            }}>
              {/* Metafield Group Selector */}
              <TouchableOpacity
                style={{
                  backgroundColor: '#fff',
                  borderBottomWidth: 1,
                  borderBottomColor: '#E5E7EB',
                  paddingVertical: 16,
                  paddingHorizontal: 16,
                  borderTopWidth: 0,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
                onPress={() => setShowMetafieldSelector(true)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '500', color: '#111827' }}>Select Metafields</Text>
                  <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>
                    {selectedMetafieldIds.length > 0
                      ? `${selectedMetafieldIds.length} field${selectedMetafieldIds.length !== 1 ? 's' : ''} selected`
                      : 'Choose metafields'
                    }
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#C7C7CC" />
              </TouchableOpacity>

              {/* Selected Metafields */}
              {selectedMetafields.length > 0 && (
                <View>
                  {selectedMetafields.map((field: any) => {
                    const fieldName = field.name || field.title || 'Untitled Field';

                      return (
                        <TouchableOpacity
                          key={field.id}
                          style={{
                            backgroundColor: '#fff',
                            borderBottomWidth: 1,
                            borderBottomColor: '#E5E7EB',
                            paddingVertical: 16,
                            paddingHorizontal: 16,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                          onPress={() => {
                            setCurrentEditingField(field);
                            setTempFieldValue(metafieldValues[fieldName] || '');
                            setShowMetafieldValueEditor(true);
                          }}
                        >
                          <Text style={{
                            fontSize: 16,
                            fontWeight: '400',
                            color: '#111827',
                            flex: 1,
                          }}>
                            {fieldName}
                          </Text>
                          <Text style={{
                            fontSize: 16,
                            color: metafieldValues[fieldName] ? '#111827' : '#9CA3AF',
                            textAlign: 'right',
                          }}>
                            {metafieldValues[fieldName] || 'value'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                </View>
              )}
            </View>
          </View>
        </TabContent>
      ),
    },
    {
      id: 'media',
      label: 'Media',
      icon: <MaterialIcons name="photo-library" size={20} color="#6B7280" />,
      content: (
        <TabContent title="">
          <View style={{ margin: -16, padding: 0 }}>
            <View style={{
              marginTop: 0,
              backgroundColor: '#fff',
              borderRadius: 12,
              marginVertical: 0,
              overflow: 'hidden',
            }}>
              {/* Medias Section */}
              <View style={{ padding: 24 }}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 16 }}>
                  Media Gallery
                </Text>

                {/* Media Grid */}
                {formData.medias && formData.medias.length > 0 ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                    {formData.medias.map((media: any, index: number) => (
                      <View key={index} style={{ width: 100, height: 100 }}>
                        <R2Image
                          url={media.url}
                          style={{ width: '100%', height: '100%', borderRadius: 8 }}
                          resizeMode="cover"
                        />
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 40,
                    backgroundColor: '#F9FAFB',
                    borderRadius: 8,
                    marginBottom: 16
                  }}>
                    <MaterialIcons name="photo-library" size={48} color="#9CA3AF" />
                    <Text style={{ color: '#6B7280', marginTop: 8 }}>No media added yet</Text>
                  </View>
                )}

                {/* Add Media Button */}
                <TouchableOpacity
                  onPress={() => setShowMediaSelection(true)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#3B82F6',
                    borderRadius: 8,
                    paddingVertical: 12,
                    paddingHorizontal: 20
                  }}
                >
                  <MaterialIcons name="add" size={20} color="white" />
                  <Text style={{ marginLeft: 8, fontSize: 16, color: 'white', fontWeight: '500' }}>
                    {formData.medias && formData.medias.length > 0 ? 'Add More Media' : 'Add Media'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TabContent>
      ),
    },
    {
      id: 'categorization',
      label: 'Categorization',
      icon: <Ionicons name="folder-outline" size={20} color="#6B7280" />,
      content: (
        <TabContent title="">
          <View style={{ margin: -16, padding: 0 }}>
            <View style={{
              marginTop: 0,
              marginBottom: 0,
              paddingTop: 0,
              marginHorizontal: 0,
              borderTopWidth: 0
            }}>
              <TouchableOpacity
                style={{
                  backgroundColor: '#fff',
                  borderBottomWidth: 1,
                  borderBottomColor: '#E5E7EB',
                  paddingVertical: 16,
                  paddingHorizontal: 16,
                  borderTopWidth: 0,
                }}
                onPress={() => setShowTypeSelect(true)}
              >
                <Text style={{ fontSize: 16, fontWeight: '500', color: '#111827' }}>Type</Text>
                <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>
                  {formData.typeId ? (getTypeName(formData.typeId) || 'Type selected') : 'Select type'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  backgroundColor: '#fff',
                  borderBottomWidth: 1,
                  borderBottomColor: '#E5E7EB',
                  paddingVertical: 16,
                  paddingHorizontal: 16,
                }}
                onPress={() => setShowCategorySelect(true)}
              >
                <Text style={{ fontSize: 16, fontWeight: '500', color: '#111827' }}>Category</Text>
                <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>
                  {formData.categoryId ? (getCategoryName(formData.categoryId) || 'Category selected') : 'Select category'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  backgroundColor: '#fff',
                  borderBottomWidth: 1,
                  borderBottomColor: '#E5E7EB',
                  paddingVertical: 16,
                  paddingHorizontal: 16,
                }}
                onPress={() => setShowVendorSelect(true)}
              >
                <Text style={{ fontSize: 16, fontWeight: '500', color: '#111827' }}>Vendor</Text>
                <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>
                  {formData.vendorId ? (getVendorName(formData.vendorId) || 'Vendor selected') : 'Select vendor'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  backgroundColor: '#fff',
                  borderBottomWidth: 1,
                  borderBottomColor: '#E5E7EB',
                  paddingVertical: 16,
                  paddingHorizontal: 16,
                }}
                onPress={() => setShowBrandSelect(true)}
              >
                <Text style={{ fontSize: 16, fontWeight: '500', color: '#111827' }}>Brand</Text>
                <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>
                  {formData.brandId ? (getBrandName(formData.brandId) || 'Brand selected') : 'Select brand'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  backgroundColor: '#fff',
                  borderBottomWidth: 1,
                  borderBottomColor: '#E5E7EB',
                  paddingVertical: 16,
                  paddingHorizontal: 16,
                }}
                onPress={() => setShowCollectionSelect(true)}
              >
                <Text style={{ fontSize: 16, fontWeight: '500', color: '#111827' }}>Collection</Text>
                <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>
                  {selectedCollectionName || 'Select collection'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  backgroundColor: '#fff',
                  borderBottomWidth: 1,
                  borderBottomColor: '#E5E7EB',
                  paddingVertical: 16,
                  paddingHorizontal: 16,
                }}
                onPress={() => setShowTagSelect(true)}
              >
                <Text style={{ fontSize: 16, fontWeight: '500', color: '#111827' }}>Tags</Text>
                <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>
                  {selectedTags.length > 0 ? `${selectedTags.length} tag${selectedTags.length !== 1 ? 's' : ''} selected` : 'Select tags'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TabContent>
      ),
    },
  ];

  const activeTabData = tabs.find(tab => tab.id === activeTab);

  return (
    <View style={{
      flex: 1,
      backgroundColor: '#fff',
      paddingTop: insets.top,
      paddingBottom: insets.bottom
    }}>
      {/* Top Notification Bar */}
      {showNotification && (
        <View style={{
          position: 'absolute',
          top: insets.top + 10,
          left: 20,
          right: 20,
          backgroundColor: '#FEF3C7',
          borderWidth: 1,
          borderColor: '#F59E0B',
          borderRadius: 8,
          paddingVertical: 12,
          paddingHorizontal: 16,
          zIndex: 1000,
          flexDirection: 'row',
          alignItems: 'center',
        }}>
          <MaterialIcons name="info" size={20} color="#F59E0B" style={{ marginRight: 8 }} />
          <Text style={{ fontSize: 14, color: '#92400E', flex: 1 }}>
            {notificationMessage}
          </Text>
        </View>
      )}

      {/* Content Area */}
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        {activeTabData && (
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
          >
            {activeTabData.content}
          </ScrollView>
        )}
      </View>

      {/* Bottom Floating Tab Bar - Modern Android Design */}
      <View style={{
        position: 'absolute',
        bottom: 20 + insets.bottom,
        left: 20,
        right: 20,
        backgroundColor: '#fff',
        borderRadius: 28,
        paddingVertical: 8,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        borderWidth: 1,
        borderColor: '#E5E7EB',
      }}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          const iconColor = isActive ? '#3B82F6' : '#6B7280';

          // Create icon with proper color
          let tabIcon: React.ReactElement;
          if (tab.id === 'core') {
            tabIcon = <Ionicons name="cube-outline" size={20} color={iconColor} />;
          } else if (tab.id === 'metafields') {
            tabIcon = <MaterialIcons name="numbers" size={20} color={iconColor} />;
          } else if (tab.id === 'media') {
            tabIcon = <MaterialIcons name="photo-library" size={20} color={iconColor} />;
          } else if (tab.id === 'categorization') {
            tabIcon = <Ionicons name="folder-outline" size={20} color={iconColor} />;
          }

          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 20,
                backgroundColor: isActive ? '#F0F9FF' : 'transparent',
                minWidth: 48,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              activeOpacity={0.7}
            >
              <View style={{
                alignItems: 'center',
                opacity: isActive ? 1 : 0.6
              }}>
                {tabIcon}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Save Button - Check Icon on Blue Circle */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={loading || !hasChanges}
          style={{
            paddingVertical: 8,
            paddingHorizontal: 8,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          activeOpacity={0.7}
        >
          <View style={{
            width: 40,
            height: 40,
            backgroundColor: loading ? '#9CA3AF' : hasChanges ? '#3B82F6' : '#E5E7EB',
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <MaterialIcons
              name="check"
              size={22}
              color={hasChanges ? "#fff" : "#9CA3AF"}
            />
          </View>
        </TouchableOpacity>
      </View>





      {/* Type Selection Modal */}
      <Modal
        visible={showTypeSelect}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTypeSelect(false)}
      >
        <TypeSelect
          selectedType={formData.typeId}
          onSelect={(typeId) => {
            updateField('typeId', typeId);
            setShowTypeSelect(false);
          }}
          onClose={() => setShowTypeSelect(false)}
        />
      </Modal>

      {/* Category Selection Modal */}
      <Modal
        visible={showCategorySelect}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCategorySelect(false)}
      >
        <CategorySelect
          selectedCategory={formData.categoryId}
          onSelect={(categoryId) => {
            updateField('categoryId', categoryId);
            setShowCategorySelect(false);
          }}
          onClose={() => setShowCategorySelect(false)}
        />
      </Modal>

      {/* Vendor Selection Modal */}
      <Modal
        visible={showVendorSelect}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowVendorSelect(false)}
      >
        <VendorSelect
          selectedVendor={formData.vendorId}
          onSelect={(vendorId) => {
            updateField('vendorId', vendorId);
            setShowVendorSelect(false);
          }}
          onClose={() => setShowVendorSelect(false)}
        />
      </Modal>

      {/* Brand Selection Modal */}
      <Modal
        visible={showBrandSelect}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowBrandSelect(false)}
      >
        <BrandSelect
          selectedBrand={formData.brandId}
          onSelect={(brandId) => {
            updateField('brandId', brandId);
            setShowBrandSelect(false);
          }}
          onClose={() => setShowBrandSelect(false)}
        />
      </Modal>

      {/* Collection Selection Modal */}
      <Modal
        visible={showCollectionSelect}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCollectionSelect(false)}
      >
        <CollectionSelect
          selectedCollection={selectedCollectionId}
          onSelect={(collectionId, collectionName) => {
            setSelectedCollectionId(collectionId || null);
            setSelectedCollectionName(collectionName || null);
            setShowCollectionSelect(false);
          }}
          onClose={() => setShowCollectionSelect(false)}
        />
      </Modal>

      {/* Tag Select Modal */}
      <Modal
        visible={showTagSelect}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowTagSelect(false)}
      >
        <TagSelect
          selectedTags={selectedTags}
          onSelect={(tags) => {
            setSelectedTags(tags);
            updateField('tags', tags);
          }}
          onClose={() => setShowTagSelect(false)}
        />
      </Modal>

      {/* Label/SKU Bottom Drawer */}
      <Modal
        visible={showLabelSkuDrawer}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLabelSkuDrawer(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'flex-end',
          }}
          activeOpacity={1}
          onPress={() => setShowLabelSkuDrawer(false)}
        >
          <TouchableOpacity
            style={{
              backgroundColor: '#fff',
              width: '100%',
              borderTopWidth: 1,
              borderTopColor: '#E5E7EB',
              paddingTop: 20,
              paddingBottom: 40,
              paddingHorizontal: 20,
            }}
            activeOpacity={1}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <TouchableOpacity onPress={() => setShowLabelSkuDrawer(false)}>
                <Text style={{ fontSize: 16, color: '#6B7280' }}>Close</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827' }}>
                SKU Details
              </Text>
              <TouchableOpacity onPress={() => setShowLabelSkuDrawer(false)}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#3B82F6' }}>Save</Text>
              </TouchableOpacity>
            </View>

            <Input
              label="SKU"
              placeholder="Enter SKU"
              value={formData.sku}
              onChangeText={(value) => updateField('sku', value)}
              variant="outline"
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Status Bottom Drawer */}
      <Modal
        visible={showStatusDrawer}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowStatusDrawer(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: 'transparent',
            justifyContent: 'flex-end',
          }}
          activeOpacity={1}
          onPress={() => setShowStatusDrawer(false)}
        >
          <View style={{
            backgroundColor: '#fff',
            width: '100%',
            borderTopWidth: 1,
            borderTopColor: '#E5E7EB',
            paddingTop: 20,
            paddingBottom: 40,
            paddingHorizontal: 20,
          }}>
            <TouchableOpacity
              style={{
                backgroundColor: formData.status === 'active' ? '#F3F4F6' : '#fff',
                borderWidth: 1,
                borderColor: '#E5E7EB',
                borderRadius: 8,
                paddingVertical: 16,
                paddingHorizontal: 16,
                marginBottom: 12,
              }}
              onPress={() => handleStatusChange('active')}
            >
              <Text style={{ fontSize: 16, fontWeight: '500', color: '#111827' }}>Active</Text>
              <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>
                Product is visible and available for sale
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: formData.status === 'draft' ? '#F3F4F6' : '#fff',
                borderWidth: 1,
                borderColor: '#E5E7EB',
                borderRadius: 8,
                paddingVertical: 16,
                paddingHorizontal: 16,
                marginBottom: 12,
              }}
              onPress={() => handleStatusChange('draft')}
            >
              <Text style={{ fontSize: 16, fontWeight: '500', color: '#111827' }}>Draft</Text>
              <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>
                Product is hidden and not available for sale
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: formData.status === 'archived' ? '#F3F4F6' : '#fff',
                borderWidth: 1,
                borderColor: '#E5E7EB',
                borderRadius: 8,
                paddingVertical: 16,
                paddingHorizontal: 16,
              }}
              onPress={() => handleStatusChange('archived')}
            >
              <Text style={{ fontSize: 16, fontWeight: '500', color: '#111827' }}>Archived</Text>
              <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>
                Product is archived and not available
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>





      {/* Primary Image Actions Drawer */}
      <Modal
        visible={showPrimaryImageActions}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPrimaryImageActions(false)}
      >
        <View style={{
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: 'rgba(0,0,0,0.3)'
        }}>
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => setShowPrimaryImageActions(false)}
          />

          <View style={{ backgroundColor: '#fff' }}>
            <TouchableOpacity
              onPress={() => {
                setShowPrimaryImageActions(false);
                handlePrimaryImageUpload();
              }}
              style={{
                paddingVertical: 20,
                paddingHorizontal: 24,
                borderBottomWidth: 1,
                borderBottomColor: '#F3F4F6',
              }}
            >
              <Text style={{ fontSize: 16, color: '#111827' }}>Replace</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setShowPrimaryImageActions(false);
                updateField('image', '');
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
              onPress={() => setShowPrimaryImageActions(false)}
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

      {/* Full-Screen Notes Editor - Simple TextInput */}
      <Modal
        visible={showFullScreenNotesEditor}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowFullScreenNotesEditor(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
          {/* Header - Shopify Style */}
          <View style={{
            paddingTop: insets.top,
            paddingBottom: 12,
            paddingHorizontal: 16,
            backgroundColor: '#fff',
            borderBottomWidth: 0.5,
            borderBottomColor: '#E1E1E1',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <Text style={{
              fontSize: 17,
              fontWeight: '600',
              color: '#000',
              textAlign: 'left',
            }}>
              Notes
            </Text>

            <TouchableOpacity
              onPress={async () => {
                // Save notes directly to InstantDB
                if (product?.id) {
                  try {
                    const notesContent = formData.notes || '';
                    const timestamp = getCurrentTimestamp();
                    await db.transact(db.tx.products[product.id].update({
                      notes: notesContent,
                      updatedAt: timestamp,
                    }));
                  } catch (error) {
                    console.error('Failed to save notes:', error);
                    Alert.alert('Error', 'Failed to save notes. Please try again.');
                  }
                }
                setShowFullScreenNotesEditor(false);
              }}
              style={{
                padding: 8,
                marginRight: -8,
              }}
            >
              <Text style={{
                fontSize: 17,
                fontWeight: '600',
                color: '#007AFF',
              }}>
                Done
              </Text>
            </TouchableOpacity>
          </View>

          {/* Simple TextInput for Notes */}
          <View style={{ flex: 1, padding: 16 }}>
            <TextInput
              style={{
                flex: 1,
                fontSize: 16,
                color: '#000',
                textAlignVertical: 'top',
                backgroundColor: '#fff',
                padding: 0,
              }}
              value={formData.notes}
              onChangeText={(text) => updateField('notes', text)}
              placeholder="Add product notes..."
              placeholderTextColor="#9CA3AF"
              multiline
              autoFocus
            />
          </View>
        </View>
      </Modal>

      {/* Option Set Selector Modal */}
      <Modal
        visible={showOptionSetSelector}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowOptionSetSelector(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
          {/* Header */}
          <View style={{
            paddingTop: insets.top + 16,
            paddingBottom: 16,
            paddingHorizontal: 20,
            backgroundColor: '#fff',
          }}>
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: '#111827',
              textAlign: 'left',
            }}>
              Select Option Sets
            </Text>
          </View>

          {/* Content */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20 }}
            showsVerticalScrollIndicator={false}
          >
            {(() => {
              // Process option sets from data
              const optionSets = React.useMemo(() => {
                if (!optionSetsData?.opsets || !optionSetsData?.opvalues) return [];

                return optionSetsData.opsets.map((set: any) => {
                  const values = optionSetsData.opvalues
                    .filter((value: any) => value.setId === set.id)
                    .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

                  return {
                    id: set.id,
                    name: set.name,
                    values: values
                  };
                });
              }, [optionSetsData?.opsets, optionSetsData?.opvalues]);

              if (optionSets.length === 0) {
                return (
                  <View style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 60
                  }}>
                    <MaterialIcons name="tune" size={48} color="#9CA3AF" />
                    <Text style={{
                      fontSize: 18,
                      fontWeight: '600',
                      color: '#6B7280',
                      marginTop: 16,
                      textAlign: 'center'
                    }}>
                      No Option Sets Found
                    </Text>
                    <Text style={{
                      fontSize: 14,
                      color: '#9CA3AF',
                      marginTop: 8,
                      textAlign: 'center'
                    }}>
                      Create option sets first to generate product variants
                    </Text>
                  </View>
                );
              }

              return optionSets.map((optionSet) => {
                return (
                  <TouchableOpacity
                    key={optionSet.name}
                    style={{
                      backgroundColor: '#fff',
                      paddingVertical: 16,
                      paddingHorizontal: 20,
                      borderBottomWidth: 1,
                      borderBottomColor: '#F3F4F6',
                    }}
                    onPress={() => {
                      setCurrentOptionSet(optionSet);
                      setShowOptionValuesSelector(true);
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: '500', color: '#111827' }}>
                          {optionSet.name}
                        </Text>
                        <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 2 }}>
                          {optionSet.values.length} {optionSet.values.length === 1 ? 'variant' : 'variants'}
                        </Text>
                      </View>
                      {selectedOptionSets.includes(optionSet.id) && (
                        <MaterialIcons name="check-circle" size={24} color="#10B981" />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              });
            })()}
          </ScrollView>
        </View>
      </Modal>

      {/* Custom Unsaved Changes Bottom Drawer */}
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

            <View style={{
              flexDirection: 'row',
              gap: 12,
            }}>
              <TouchableOpacity
                onPress={() => setShowUnsavedChangesModal(false)}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  alignItems: 'center',
                  backgroundColor: '#F3F4F6',
                }}
              >
                <Text style={{
                  fontSize: 16,
                  fontWeight: '500',
                  color: '#374151',
                }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setShowUnsavedChangesModal(false);
                  onClose();
                }}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  alignItems: 'center',
                  backgroundColor: '#3B82F6',
                }}
              >
                <Text style={{
                  fontSize: 16,
                  fontWeight: '500',
                  color: '#fff',
                }}>
                  Discard
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Metafields Modal */}
      <Modal
        visible={showMetafields}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowMetafields(false)}
      >
        <MetafieldsSystem
          entityId={product?.id}
          entityType="products"
          onClose={() => setShowMetafields(false)}
          showHeader={true}
        />
      </Modal>

      {/* Metafield Selector Modal */}
      <Modal
        visible={showMetafieldSelector}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowMetafieldSelector(false);
          setSelectedMetafieldGroup(null);
        }}
      >
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
          {/* Header */}
          <View style={{
            paddingTop: insets.top,
            backgroundColor: '#fff',
            borderBottomWidth: 1,
            borderBottomColor: '#E5E7EB',
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingVertical: 16,
            }}>
              {selectedMetafieldGroup ? (
                <TouchableOpacity
                  onPress={() => setSelectedMetafieldGroup(null)}
                  style={{ padding: 4 }}
                >
                  <MaterialIcons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
              ) : (
                <View style={{ width: 32 }} />
              )}
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', flex: 1, textAlign: 'center' }}>
                {selectedMetafieldGroup || 'Select Metafields'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowMetafieldSelector(false);
                  setSelectedMetafieldGroup(null);
                }}
                style={{ padding: 4 }}
              >
                <Text style={{ fontSize: 16, color: '#3B82F6', fontWeight: '500' }}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Content */}
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            {(() => {
              if (!metafieldDefinitionsData?.metasets || metafieldDefinitionsData.metasets.length === 0) {
                return (
                  <View style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 60,
                    paddingHorizontal: 20
                  }}>
                    <MaterialIcons name="numbers" size={48} color="#9CA3AF" />
                    <Text style={{
                      fontSize: 18,
                      fontWeight: '600',
                      color: '#6B7280',
                      marginTop: 16,
                      textAlign: 'center'
                    }}>
                      No Metafields Available
                    </Text>
                    <Text style={{
                      fontSize: 14,
                      color: '#9CA3AF',
                      marginTop: 8,
                      textAlign: 'center',
                      lineHeight: 20
                    }}>
                      Create metafields from the main menu{'\n'}to add custom fields to products
                    </Text>
                  </View>
                );
              }

              // Get unique groups from memoized data
              const groups = Object.keys(groupedMetafields).sort();

              if (selectedMetafieldGroup) {
                // Show fields in selected group
                const fieldsInGroup = groupedMetafields[selectedMetafieldGroup] || [];
                const allSelected = fieldsInGroup.every((field: any) => selectedMetafieldIds.includes(field.id));
                const someSelected = fieldsInGroup.some((field: any) => selectedMetafieldIds.includes(field.id));

                return (
                  <View>
                    {/* Select All Button */}
                    <TouchableOpacity
                      style={{
                        backgroundColor: '#F9FAFB',
                        paddingVertical: 16,
                        paddingHorizontal: 16,
                        borderBottomWidth: 1,
                        borderBottomColor: '#E5E7EB',
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}
                      onPress={() => handleSelectAllMetafields(selectedMetafieldGroup)}
                    >
                      <View style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        borderWidth: 2,
                        borderColor: allSelected ? '#3B82F6' : someSelected ? '#3B82F6' : '#D1D5DB',
                        backgroundColor: allSelected ? '#3B82F6' : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                      }}>
                        {allSelected && (
                          <MaterialIcons name="check" size={12} color="#fff" />
                        )}
                        {someSelected && !allSelected && (
                          <View style={{
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: '#3B82F6',
                          }} />
                        )}
                      </View>
                      <Text style={{
                        fontSize: 16,
                        fontWeight: '600',
                        color: '#111827',
                      }}>
                        Select All
                      </Text>
                    </TouchableOpacity>

                    {/* Fields List */}
                    {fieldsInGroup.map((field: any) => {
                      const isSelected = selectedMetafieldIds.includes(field.id);

                      return (
                        <TouchableOpacity
                          key={field.id}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingVertical: 16,
                            paddingHorizontal: 16,
                            backgroundColor: '#fff',
                            borderBottomWidth: 1,
                            borderBottomColor: '#F3F4F6',
                          }}
                          onPress={() => handleMetafieldSelection(field.id)}
                        >
                          <View style={{
                            width: 20,
                            height: 20,
                            borderRadius: 10,
                            borderWidth: 2,
                            borderColor: isSelected ? '#3B82F6' : '#D1D5DB',
                            backgroundColor: isSelected ? '#3B82F6' : 'transparent',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 12,
                          }}>
                            {isSelected && (
                              <MaterialIcons name="check" size={12} color="#fff" />
                            )}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{
                              fontSize: 16,
                              fontWeight: '400',
                              color: '#111827',
                            }}>
                              {field.name || field.title || 'Untitled Field'}
                            </Text>
                            <Text style={{
                              fontSize: 14,
                              color: '#6B7280',
                              marginTop: 2,
                            }}>
                              {getFieldTypeDisplay(field.type)}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                );
              } else {
                // Show group list
                return groups.map((groupName: string) => {
                  const fieldsInGroup = groupedMetafields[groupName] || [];
                  const selectedCount = fieldsInGroup.filter((field: any) => selectedMetafieldIds.includes(field.id)).length;

                  return (
                    <TouchableOpacity
                      key={groupName}
                      style={{
                        backgroundColor: '#fff',
                        paddingVertical: 16,
                        paddingHorizontal: 16,
                        borderBottomWidth: 1,
                        borderBottomColor: '#F3F4F6',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                      onPress={() => setSelectedMetafieldGroup(groupName)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{
                          fontSize: 16,
                          fontWeight: '500',
                          color: '#111827',
                        }}>
                          {groupName}
                        </Text>
                        <Text style={{
                          fontSize: 14,
                          color: '#6B7280',
                          marginTop: 2,
                        }}>
                          {selectedCount > 0
                            ? `${selectedCount} of ${fieldsInGroup.length} selected`
                            : `${fieldsInGroup.length} field${fieldsInGroup.length !== 1 ? 's' : ''}`
                          }
                        </Text>
                      </View>
                      <MaterialCommunityIcons name="chevron-right" size={20} color="#C7C7CC" />
                    </TouchableOpacity>
                  );
                });
              }
            })()}
          </ScrollView>
        </View>
      </Modal>

      {/* Metafield Value Editor Modal */}
      <Modal
        visible={showMetafieldValueEditor}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowMetafieldValueEditor(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
          {/* Header */}
          <View style={{
            paddingTop: insets.top,
            backgroundColor: '#fff',
            borderBottomWidth: 1,
            borderBottomColor: '#E5E7EB',
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingVertical: 16,
            }}>
              <TouchableOpacity
                onPress={() => setShowMetafieldValueEditor(false)}
                style={{ padding: 4 }}
              >
                <Text style={{ fontSize: 16, color: '#6B7280', fontWeight: '500' }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827' }}>
                {currentEditingField?.name || currentEditingField?.title || 'Edit Value'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  if (currentEditingField) {
                    const fieldName = currentEditingField.name || currentEditingField.title;
                    setMetafieldValues(prev => ({
                      ...prev,
                      [fieldName]: tempFieldValue
                    }));
                    if (!isInitializing && isDataLoaded) {
                      setHasChanges(true);
                    }
                  }
                  setShowMetafieldValueEditor(false);
                  setCurrentEditingField(null);
                  setTempFieldValue('');
                }}
                style={{ padding: 4 }}
              >
                <Text style={{ fontSize: 16, color: '#3B82F6', fontWeight: '500' }}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Content */}
          <View style={{ flex: 1, padding: 16 }}>
            <Text style={{
              fontSize: 14,
              color: '#6B7280',
              marginBottom: 8,
            }}>
              {getFieldTypeDisplay(currentEditingField?.type)}
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#D1D5DB',
                borderRadius: 8,
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontSize: 16,
                backgroundColor: '#fff',
              }}
              value={tempFieldValue}
              onChangeText={setTempFieldValue}
              placeholder={getFieldPlaceholder(currentEditingField?.type || '')}
              keyboardType={
                currentEditingField?.type === 'number' ||
                currentEditingField?.type === 'weight' ||
                currentEditingField?.type === 'dimension' ||
                currentEditingField?.type === 'volume' ||
                currentEditingField?.type === 'money' ||
                currentEditingField?.type === 'rating'
                  ? 'numeric'
                  : currentEditingField?.type === 'email'
                    ? 'email-address'
                    : 'default'
              }
              autoCapitalize={
                currentEditingField?.type === 'email' ||
                currentEditingField?.type === 'url'
                  ? 'none'
                  : 'sentences'
              }
              autoFocus
              multiline={currentEditingField?.type === 'multi_line_text'}
              numberOfLines={currentEditingField?.type === 'multi_line_text' ? 4 : 1}
            />
          </View>
        </View>
      </Modal>

      {/* Option Values Selector */}
      <OptionValuesSelector
        visible={showOptionValuesSelector}
        optionSet={currentOptionSet}
        productOptions={product?.options}
        onClose={() => {
          setShowOptionValuesSelector(false);
          setCurrentOptionSet(null);
        }}
        onGenerate={async (selectedValues, optionSetData) => {
          await generateItemsFromSelectedValues(selectedValues, optionSetData);
        }}
      />

      {/* Primary Image Selection Modal */}
      <PrimaryImageSelectionModal
        visible={showPrimaryImageSelection}
        onClose={() => setShowPrimaryImageSelection(false)}
        onSelect={handlePrimaryImageSelectionComplete}
        title="Select Primary Image"
        reference={`product-${formData.title || 'new'}`}
      />

      {/* Media Selection Modal */}
      <MediaSelectionModal
        visible={showMediaSelection}
        onClose={() => setShowMediaSelection(false)}
        onSelect={handleMediaSelectionComplete}
        title="Select Medias"
        reference={`product-${formData.title || 'new'}`}
      />

      {/* Item Generation Loading Screen */}
      <Modal
        visible={showItemGenerationLoading}
        animationType="none"
        presentationStyle="overFullScreen"
        transparent={false}
        onRequestClose={() => {}}
      >
        <View style={{
          flex: 1,
          backgroundColor: '#fff',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 40,
        }}>
          {/* Circular Progress Indicator */}
          <View style={{
            width: 120,
            height: 120,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 40,
          }}>
            {/* Background Circle */}
            <View style={{
              position: 'absolute',
              width: 120,
              height: 120,
              borderRadius: 60,
              borderWidth: 6,
              borderColor: '#E5E7EB',
            }} />
            
            {/* Animated Rotating Gradient Circle */}
            <Animated.View style={{
              position: 'absolute',
              width: 120,
              height: 120,
              borderRadius: 60,
              borderWidth: 8,
              borderColor: 'transparent',
              borderTopColor: '#3B82F6',
              borderRightColor: '#60A5FA',
              transform: [{
                rotate: rotationAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '360deg'],
                })
              }],
            }} />
            
            {/* Second Rotating Gradient Circle - Offset */}
            <Animated.View style={{
              position: 'absolute',
              width: 120,
              height: 120,
              borderRadius: 60,
              borderWidth: 8,
              borderColor: 'transparent',
              borderBottomColor: '#93C5FD',
              borderLeftColor: '#DBEAFE',
              transform: [{
                rotate: rotationAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['180deg', '540deg'],
                })
              }],
            }} />
            
            {/* Progress Circle Overlay */}
            <View style={{
              position: 'absolute',
              width: 104,
              height: 104,
              borderRadius: 52,
              borderWidth: 4,
              borderColor: 'transparent',
              borderTopColor: itemGenerationPercentage > 0 ? '#1E40AF' : 'transparent',
              transform: [{ rotate: `${(itemGenerationPercentage / 100) * 360}deg` }],
            }} />
            
            {/* Percentage Text */}
            <Text style={{
              fontSize: 24,
              fontWeight: '700',
              color: '#111827',
            }}>
              {itemGenerationPercentage}%
            </Text>
          </View>

          {/* Title */}
          <Text style={{
            fontSize: 28,
            fontWeight: '700',
            color: '#111827',
            textAlign: 'center',
            marginBottom: 16,
          }}>
            Generating Items
          </Text>

          {/* Progress Text */}
          <Text style={{
            fontSize: 16,
            color: '#6B7280',
            textAlign: 'center',
            lineHeight: 24,
          }}>
            {itemGenerationProgress}
          </Text>
        </View>
      </Modal>

    </View>
  );
}


