import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StatusBar, BackHandler, Alert, Modal } from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../lib/instant';
import { useStore } from '../lib/store-context';
import { id } from '@instantdb/react-native';
import { MetafieldSet, MetafieldEntityType, METAFIELD_CATEGORIES } from './metafields-types';
import MetafieldDefinitionForm from './metafield-definition-form';
import GroupForm from './group-form';

interface MetafieldDefinitionsProps {
  entityType: MetafieldEntityType;
  onClose: () => void;
  showHeader?: boolean;
}

export default function MetafieldDefinitions({ 
  entityType, 
  onClose, 
  showHeader = true 
}: MetafieldDefinitionsProps) {
  const insets = useSafeAreaInsets();
  const { currentStore } = useStore();
  const [definitions, setDefinitions] = useState<MetafieldSet[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [editingDefinition, setEditingDefinition] = useState<MetafieldSet | null>(null);
  const [showDefinitionMenu, setShowDefinitionMenu] = useState(false);
  const [selectedDefinitionForMenu, setSelectedDefinitionForMenu] = useState<MetafieldSet | null>(null);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [selectedGroupForMenu, setSelectedGroupForMenu] = useState<string | null>(null);

  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      if (selectedGroup) {
        setSelectedGroup('');
        return true;
      }
      onClose();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [selectedGroup, onClose]);

  // Query metafield sets for this category
  const { data: metafieldsData } = db.useQuery(
    currentStore?.id ? {
      metasets: {
        $: {
          where: {
            storeId: currentStore.id,
            category: entityType
          }
        }
      }
    } : {}
  );

  // Load definitions
  useEffect(() => {
    if (metafieldsData?.metasets) {
      const defs = metafieldsData.metasets.map(field => ({
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
  }, [metafieldsData, entityType]);

  const addDefinition = async (definitionData: Partial<MetafieldSet>) => {
    if (!currentStore?.id) {
      Alert.alert('Error', 'No store selected');
      return;
    }

    if (!definitionData.name?.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    try {
      const definitionId = editingDefinition?.id || id();

      // Calculate order for new definitions
      const maxOrder = selectedGroup
        ? definitions.filter(def => def.group === selectedGroup).reduce((max, def) => Math.max(max, def.order || 0), -1)
        : definitions.reduce((max, def) => Math.max(max, def.order || 0), -1);

      const data = {
        name: definitionData.name,
        type: definitionData.type,
        category: entityType,
        group: selectedGroup || 'General',
        order: editingDefinition ? editingDefinition.order : maxOrder + 1,
        inputConfig: definitionData.inputConfig || {},
        required: definitionData.required || false,
        storeId: currentStore.id,
        createdAt: editingDefinition ? Date.now() : Date.now(),
        updatedAt: Date.now(),
      };

      await db.transact(
        db.tx.metasets[definitionId].update(data)
      );

      setEditingDefinition(null);
      setShowAddModal(false);
    } catch (error) {
      Alert.alert('Error', `Failed to save metafield set: ${error.message || 'Unknown error'}`);
    }
  };

  const deleteDefinition = async (definitionId: string) => {
    if (!currentStore?.id) {
      Alert.alert('Error', 'No store selected');
      return;
    }

    try {
      await db.transact(db.tx.metasets[definitionId].delete());
    } catch (error) {
      Alert.alert('Error', 'Failed to delete metafield set');
    }
  };

  const deleteGroup = async (groupName: string) => {
    if (!currentStore?.id) {
      Alert.alert('Error', 'No store selected');
      return;
    }

    try {
      const groupDefinitions = definitions.filter(def => def.name === groupName);
      const deleteTransactions = groupDefinitions.map(def =>
        db.tx.metasets[def.id].delete()
      );

      for (const transaction of deleteTransactions) {
        await db.transact(transaction);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to delete group');
    }
  };

  // Get all groups
  const getAllGroups = () => {
    const groups = [...new Set(definitions.map(def => def.group))];
    return groups.sort();
  };

  // Get entity type info
  const entityTypeInfo = METAFIELD_CATEGORIES.find(et => et.id === entityType);

  // Show groups or definitions based on selection
  const showingGroup = selectedGroup !== '';
  const currentGroupDefinitions = showingGroup
    ? definitions.filter(def => def.group === selectedGroup).sort((a, b) => a.order - b.order)
    : [];

  const renderDefinitionItem = ({ item }: { item: MetafieldSet }) => {
    return (
      <View
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
      >
        <TouchableOpacity
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
          onPress={() => {
            setEditingDefinition(item);
            setShowAddModal(true);
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
              {item.key}
              {item.required && ' • Required'}
            </Text>
            {item.description && (
              <Text style={{
                fontSize: 13,
                color: '#8E8E93',
                marginTop: 2,
              }}>
                {item.description}
              </Text>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            padding: 8,
            marginLeft: 8,
          }}
          onPress={() => {
            setSelectedDefinitionForMenu(item);
            setShowDefinitionMenu(true);
          }}
        >
          <MaterialCommunityIcons
            name="dots-vertical"
            size={20}
            color="#8E8E93"
          />
        </TouchableOpacity>
      </View>
    );
  };

  const renderGroupItem = ({ item }: { item: string }) => {
    const definitionCount = definitions.filter(def => def.group === item).length;

    return (
      <View
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
      >
        <TouchableOpacity
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
          onPress={() => setSelectedGroup(item)}
        >
          <View style={{ flex: 1 }}>
            <Text style={{
              fontSize: 17,
              fontWeight: '400',
              color: '#1C1C1E',
              marginBottom: 2,
            }}>
              {item}
            </Text>
            <Text style={{
              fontSize: 13,
              color: '#8E8E93',
            }}>
              {definitionCount} {definitionCount === 1 ? 'definition' : 'definitions'}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            padding: 8,
            marginLeft: 8,
          }}
          onPress={() => {
            setSelectedGroupForMenu(item);
            setShowGroupMenu(true);
          }}
        >
          <MaterialCommunityIcons
            name="dots-vertical"
            size={20}
            color="#8E8E93"
          />
        </TouchableOpacity>
      </View>
    );
  };

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
            {showingGroup ? selectedGroup : `${entityTypeInfo?.name || entityType} metafields`}
          </Text>

          <TouchableOpacity onPress={() => {
            if (showingGroup) {
              setShowAddModal(true);
            } else {
              // If no groups exist, create a metafield in "General" group
              const hasGroups = getAllGroups().length > 0;
              if (!hasGroups) {
                setSelectedGroup('General');
                setShowAddModal(true);
              } else {
                setShowAddGroupModal(true);
              }
            }
          }}>
            <Feather name="plus" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Content List */}
      {showingGroup ? (
        <FlatList
          data={currentGroupDefinitions}
          keyExtractor={(item) => item.id}
          renderItem={renderDefinitionItem}
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              paddingTop: 100,
            }}>
              <Text style={{
                fontSize: 17,
                color: '#8E8E93',
                textAlign: 'center',
              }}>
                No definitions in {selectedGroup}
              </Text>
              <Text style={{
                fontSize: 15,
                color: '#8E8E93',
                textAlign: 'center',
                marginTop: 8,
              }}>
                Tap + to add a definition to this group
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={getAllGroups()}
          keyExtractor={(item) => item}
          renderItem={renderGroupItem}
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              paddingTop: 100,
              paddingHorizontal: 40,
            }}>
              <Text style={{
                fontSize: 17,
                color: '#8E8E93',
                textAlign: 'center',
                marginBottom: 8,
              }}>
                No metafield definitions yet
              </Text>
              <Text style={{
                fontSize: 15,
                color: '#8E8E93',
                textAlign: 'center',
                marginBottom: 24,
                lineHeight: 20,
              }}>
                Create custom fields to store additional information for your {(entityTypeInfo?.name || '').toLowerCase() || entityType}.
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setSelectedGroup('General');
                  setShowAddModal(true);
                }}
                style={{
                  backgroundColor: '#007AFF',
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 8,
                }}
              >
                <Text style={{
                  color: 'white',
                  fontSize: 16,
                  fontWeight: '500',
                }}>
                  Add Metafield
                </Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Add Definition Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowAddModal(false)}
      >
        <MetafieldDefinitionForm
          entityType={entityType}
          groupName={selectedGroup}
          definition={editingDefinition}
          onSave={addDefinition}
          onClose={() => {
            setShowAddModal(false);
            setEditingDefinition(null);
          }}
        />
      </Modal>

      {/* Add Group Modal */}
      <Modal
        visible={showAddGroupModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowAddGroupModal(false)}
      >
        <GroupForm
          onSave={(groupName) => {
            // Navigate to the newly created group so user can add definitions
            setSelectedGroup(groupName);
            setShowAddGroupModal(false);
            // Immediately open the add definition modal
            setShowAddModal(true);
          }}
          onClose={() => setShowAddGroupModal(false)}
        />
      </Modal>

      {/* Definition Menu Bottom Drawer */}
      <Modal
        visible={showDefinitionMenu}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDefinitionMenu(false)}
      >
        <View style={{
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: 'rgba(0,0,0,0.5)'
        }}>
          <View style={{
            backgroundColor: 'white',
            paddingBottom: insets.bottom,
          }}>
            <View style={{
              paddingVertical: 20,
              paddingHorizontal: 20,
              borderBottomWidth: 1,
              borderBottomColor: '#E5E5EA',
            }}>
              <Text style={{
                fontSize: 18,
                fontWeight: '600',
                color: '#1C1C1E',
                textAlign: 'center',
              }}>
                {selectedDefinitionForMenu?.name}
              </Text>
            </View>

            <TouchableOpacity
              style={{
                paddingVertical: 16,
                paddingHorizontal: 20,
                borderBottomWidth: 1,
                borderBottomColor: '#E5E5EA',
              }}
              onPress={() => {
                setShowDefinitionMenu(false);
                if (selectedDefinitionForMenu) {
                  setEditingDefinition(selectedDefinitionForMenu);
                  setShowAddModal(true);
                }
              }}
            >
              <Text style={{
                fontSize: 17,
                color: '#007AFF',
                textAlign: 'center',
              }}>
                Edit
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                paddingVertical: 16,
                paddingHorizontal: 20,
              }}
              onPress={() => {
                setShowDefinitionMenu(false);
                if (selectedDefinitionForMenu) {
                  Alert.alert(
                    'Delete Definition',
                    `Delete "${selectedDefinitionForMenu.name}" definition?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => deleteDefinition(selectedDefinitionForMenu.id)
                      }
                    ]
                  );
                }
              }}
            >
              <Text style={{
                fontSize: 17,
                color: '#FF3B30',
                textAlign: 'center',
              }}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
