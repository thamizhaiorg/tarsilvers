import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StatusBar, BackHandler, Alert, Modal } from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../lib/instant';
import { useStore } from '../lib/store-context';
import { id } from '@instantdb/react-native';
import { MetafieldSet, MetafieldValue, MetafieldEntityType, METAFIELD_CATEGORIES } from './metafields-types';
import MetafieldValueForm from './metafield-value-form';

interface MetafieldValuesProps {
  entityId: string;
  entityType: MetafieldEntityType;
  onClose: () => void;
  showHeader?: boolean;
}

export default function MetafieldValues({ 
  entityId, 
  entityType, 
  onClose, 
  showHeader = true 
}: MetafieldValuesProps) {
  const insets = useSafeAreaInsets();
  const { currentStore } = useStore();
  const [definitions, setDefinitions] = useState<MetafieldSet[]>([]);
  const [values, setValues] = useState<Record<string, MetafieldValue>>({});
  const [showValueModal, setShowValueModal] = useState(false);
  const [selectedDefinition, setSelectedDefinition] = useState<MetafieldSet | null>(null);
  const [editingValue, setEditingValue] = useState<MetafieldValue | null>(null);

  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      onClose();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [onClose]);

  // Query metafield sets for this category
  const { data: definitionsData } = db.useQuery({
    metasets: {
      $: {
        where: {
          category: entityType
        }
      }
    }
  });

  // Query metafield values for this specific entity
  const { data: valuesData } = db.useQuery(
    entityId ? {
      metavalues: {
        $: {
          where: {
            entityId: entityId,
            entityType: entityType
          }
        }
      }
    } : {}
  );

  // Load definitions
  useEffect(() => {
    if (definitionsData?.metasets) {
      const defs = definitionsData.metasets.map(field => ({
        id: field.id,
        title: field.name || '',
        name: field.name || '',
        namespace: field.namespace,
        key: field.key,
        description: field.description,
        type: field.type as any,
        category: field.category as any,
        group: field.group || '',
        order: field.order || 0,
        filter: false,
        config: {},
        inputConfig: field.inputConfig || {},
        required: field.required || false,
        storeId: field.storeId,
        createdAt: new Date(field.createdAt),
        updatedAt: new Date(field.updatedAt),
      })).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setDefinitions(defs as MetafieldSet[]);
    } else {
      setDefinitions([]);
    }
  }, [definitionsData, entityType]);

  // Load values
  useEffect(() => {
    if (valuesData?.metavalues) {
      const vals: Record<string, MetafieldValue> = {};
      valuesData.metavalues.forEach((field: any) => {
        if (field?.setId) {
          vals[field.setId] = {
            id: field.id,
            setId: field.setId,
            metafieldSetId: field.setId,
            entityId: field.entityId,
            entityType: field.entityType || entityType,
            value: field.value || '',
            storeId: field.storeId,
            createdAt: new Date(field.createdAt),
            updatedAt: new Date(field.updatedAt),
          };
        }
      });
      setValues(vals);
    }
  }, [valuesData, entityType]);

  const saveValue = async (setId: string, value: string) => {

    try {
      const definition = definitions.find(d => d.id === setId);
      if (!definition) {
        Alert.alert('Error', 'Set not found');
        return;
      }

      const existingValue = values[setId];
      const valueId = existingValue?.id || id();

      const data = {
        setId: setId,
        entityId: entityId,
        value: value,
        storeId: currentStore.id,
        createdAt: existingValue ? Date.now() : Date.now(),
        updatedAt: Date.now(),
      };

      await db.transact(
        db.tx.metavalues[valueId].update(data)
      );

      setShowValueModal(false);
      setSelectedDefinition(null);
      setEditingValue(null);
    } catch (error) {
      Alert.alert('Error', `Failed to save metafield value: ${error.message || 'Unknown error'}`);
    }
  };

  const deleteValue = async (valueId: string) => {
    try {
      await db.transact(db.tx.metavalues[valueId].delete());
    } catch (error) {
      Alert.alert('Error', 'Failed to delete metafield value');
    }
  };

  // Get entity type info
  const entityTypeInfo = METAFIELD_CATEGORIES.find(et => et.id === entityType);

  // Group definitions by group
  const groupedDefinitions = definitions.reduce((groups, def) => {
    const group = def.group || 'General';
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(def);
    return groups;
  }, {} as Record<string, MetafieldSet[]>);

  const renderDefinitionItem = ({ item }: { item: MetafieldSet }) => {
    const currentValue = values[item.id];
    const hasValue = !!currentValue?.value;

    return (
      <TouchableOpacity
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 16,
          paddingLeft: 20,
          paddingRight: 12,
          backgroundColor: 'white',
          borderBottomWidth: 1,
          borderBottomColor: '#F2F2F7',
        }}
        onPress={() => {
          setSelectedDefinition(item);
          setEditingValue(currentValue || null);
          setShowValueModal(true);
        }}
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
            {item.type}
            {item.required && ' • Required'}
          </Text>
          {hasValue && (
            <Text style={{
              fontSize: 15,
              color: '#007AFF',
              marginTop: 4,
            }}>
              {currentValue.value.length > 50
                ? `${currentValue.value.substring(0, 50)}...`
                : currentValue.value}
            </Text>
          )}
          {!hasValue && item.required && (
            <Text style={{
              fontSize: 13,
              color: '#FF3B30',
              marginTop: 2,
            }}>
              Required field - no value set
            </Text>
          )}
        </View>

        <View style={{ alignItems: 'center' }}>
          {hasValue ? (
            <MaterialCommunityIcons
              name="check-circle"
              size={20}
              color="#34C759"
            />
          ) : (
            <MaterialCommunityIcons
              name="circle-outline"
              size={20}
              color="#C7C7CC"
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderGroupSection = (groupName: string, groupDefinitions: MetafieldSet[]) => {
    return (
      <View key={groupName}>
        {/* Group Header */}
        <View style={{
          paddingHorizontal: 20,
          paddingVertical: 12,
          backgroundColor: '#F2F2F7',
          borderBottomWidth: 1,
          borderBottomColor: '#E5E5EA',
        }}>
          <Text style={{
            fontSize: 15,
            fontWeight: '600',
            color: '#8E8E93',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}>
            {groupName}
          </Text>
        </View>

        {/* Group Definitions */}
        {groupDefinitions.map((definition) => (
          <View key={definition.id}>
            {renderDefinitionItem({ item: definition })}
          </View>
        ))}
      </View>
    );
  };

  const flattenedData = Object.entries(groupedDefinitions).flatMap(([groupName, groupDefinitions]) => [
    { type: 'group', groupName, groupDefinitions },
    ...groupDefinitions.map(def => ({ type: 'definition', definition: def }))
  ]);

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
            {entityTypeInfo?.name || entityType} metafields
          </Text>
        </View>
      )}

      {/* Content */}
      {definitions.length === 0 ? (
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 40,
        }}>
          <Text style={{
            fontSize: 17,
            color: '#8E8E93',
            textAlign: 'center',
            marginBottom: 8,
          }}>
            No metafield definitions
          </Text>
          <Text style={{
            fontSize: 15,
            color: '#8E8E93',
            textAlign: 'center',
            lineHeight: 20,
          }}>
            Create metafield definitions for {(entityTypeInfo?.name || '').toLowerCase() || entityType} to start adding custom data.
          </Text>
        </View>
      ) : (
        <FlatList
          data={Object.entries(groupedDefinitions)}
          keyExtractor={([groupName]) => groupName}
          renderItem={({ item: [groupName, groupDefinitions] }) => 
            renderGroupSection(groupName, groupDefinitions)
          }
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Value Form Modal */}
      <Modal
        visible={showValueModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowValueModal(false)}
      >
        {selectedDefinition && (
          <MetafieldValueForm
            definition={selectedDefinition}
            value={editingValue}
            onSave={(value) => saveValue(selectedDefinition.id, value)}
            onDelete={editingValue ? () => deleteValue(editingValue.id) : undefined}
            onClose={() => {
              setShowValueModal(false);
              setSelectedDefinition(null);
              setEditingValue(null);
            }}
          />
        )}
      </Modal>
    </View>
  );
}
