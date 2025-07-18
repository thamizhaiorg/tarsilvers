import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StatusBar, BackHandler, Alert } from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../lib/instant';
import { useStore } from '../lib/store-context';
import { id } from '@instantdb/react-native';
import { MetafieldSet, MetafieldValue, MetafieldEntityType, METAFIELD_CATEGORIES } from './metafields-types';
import MetafieldDefinitions from './metafields-definitions';
import MetafieldValues from './metafields-values';

// Re-export types for backward compatibility
export type { MetafieldSet, MetafieldValue, MetafieldEntityType } from './metafields-types';
export { METAFIELD_CATEGORIES } from './metafields-types';

interface MetafieldsSystemProps {
  onClose?: () => void;
  showHeader?: boolean;
  entityId?: string; // If provided, show values for this specific entity
  entityType?: MetafieldEntityType; // Required if entityId is provided
}

export default function MetafieldsSystem({ 
  onClose, 
  showHeader = true, 
  entityId, 
  entityType 
}: MetafieldsSystemProps) {
  const insets = useSafeAreaInsets();
  const { currentStore } = useStore();
  const [selectedEntityType, setSelectedEntityType] = useState<MetafieldEntityType | null>(
    entityType || null
  );
  const [showDefinitions, setShowDefinitions] = useState(!entityId); // If entityId provided, show values by default
  const [entityCounts, setEntityCounts] = useState<Record<string, number>>({});

  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      if (selectedEntityType && !entityId) {
        setSelectedEntityType(null);
        return true;
      }
      if (onClose) onClose();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [selectedEntityType, entityId, onClose]);

  // Query metafield sets count for each category
  const { data: metafieldsData } = db.useQuery(
    currentStore?.id ? {
      metasets: {
        $: {
          where: {
            storeId: currentStore.id
          }
        }
      }
    } : {}
  );

  // Update entity counts
  useEffect(() => {
    const counts: Record<string, number> = {};

    // Count metafield sets per category
    if (metafieldsData?.metasets) {
      metafieldsData.metasets.forEach(set => {
        if (set && (set as any).category) {
          counts[(set as any).category] = (counts[(set as any).category] || 0) + 1;
        }
      });
    }

    setEntityCounts(counts);
  }, [metafieldsData]);

  const getMetafieldCount = (entityType: string) => {
    return entityCounts[entityType] || 0;
  };

  const renderCategoryItem = ({ item }: { item: typeof METAFIELD_CATEGORIES[number] }) => {
    const metafieldCount = getMetafieldCount(item.id);

    return (
      <TouchableOpacity
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 16,
          paddingHorizontal: 20,
          backgroundColor: 'white',
          borderBottomWidth: 1,
          borderBottomColor: '#F2F2F7',
        }}
        onPress={() => setSelectedEntityType(item.id)}
      >
        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: 17,
            fontWeight: '400',
            color: '#1C1C1E',
            marginBottom: 2,
          }}>
            {item.name}
          </Text>
          <Text style={{
            fontSize: 13,
            color: '#8E8E93',
          }}>
            {metafieldCount} {metafieldCount === 1 ? 'set' : 'sets'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // If specific entity is selected or provided, show definitions/values
  if (selectedEntityType) {
    if (entityId) {
      // Show values for specific entity
      return (
        <MetafieldValues
          entityId={entityId}
          entityType={selectedEntityType}
          onClose={() => {
            if (entityType) {
              // If entityType was provided as prop, close completely
              if (onClose) onClose();
            } else {
              // Otherwise go back to entity type selection
              setSelectedEntityType(null);
            }
          }}
          showHeader={showHeader}
        />
      );
    } else {
      // Show definitions for entity type
      return (
        <MetafieldDefinitions
          entityType={selectedEntityType}
          onClose={() => setSelectedEntityType(null)}
          showHeader={showHeader}
        />
      );
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: 'white', paddingTop: showHeader ? insets.top : 0 }}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      {/* Header */}
      {showHeader && (
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingVertical: 20,
          backgroundColor: 'white',
          borderBottomWidth: 1,
          borderBottomColor: '#E5E5EA',
        }}>
          <Text style={{
            fontSize: 18,
            fontWeight: '600',
            color: '#1C1C1E',
            flex: 1,
          }}>
            Metafields
          </Text>
        </View>
      )}

      {/* Categories List */}
      <FlatList
        data={METAFIELD_CATEGORIES}
        keyExtractor={(item) => item.id}
        renderItem={renderCategoryItem}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
