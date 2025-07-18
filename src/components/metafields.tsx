import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StatusBar, BackHandler, TextInput, Alert, Modal, Switch, ScrollView } from 'react-native';
import { MaterialCommunityIcons, Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../lib/instant';
import { useStore } from '../lib/store-context';
import { id } from '@instantdb/react-native';

interface MetafieldDefinition {
  id: string;
  title: string;
  type: 'text' | 'number' | 'boolean' | 'date' | 'url' | 'email' | 'weight' | 'dimension' | 'volume' | 'rating' | 'color' | 'json';
  group: string;
  order: number;
  filter: boolean;
  config?: {
    min?: number;
    max?: number;
    unit?: string;
    options?: string[];
    placeholder?: string;
    required?: boolean;
  };
  value?: string; // Default value
}

interface MetafieldsProps {
  productId?: string;
  onClose?: () => void;
  showHeader?: boolean; // Control whether to show the main header
}

export default function Metafields({ productId, onClose, showHeader = true }: MetafieldsProps) {
  const insets = useSafeAreaInsets();
  const { currentStore } = useStore();
  const [definitions, setDefinitions] = useState<MetafieldDefinition[]>([]);
  const [values, setValues] = useState<Record<string, any>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [showValueModal, setShowValueModal] = useState(false);
  const [selectedField, setSelectedField] = useState<MetafieldDefinition | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [newFieldData, setNewFieldData] = useState({
    title: '',
    type: 'text' as MetafieldDefinition['type'],
    group: '',
    filter: false,
    config: {} as MetafieldDefinition['config'],
    value: ''
  });

  // State for managing groups
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupName, setEditingGroupName] = useState<string | null>(null); // Track which group is being edited
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [selectedGroupForMenu, setSelectedGroupForMenu] = useState<string | null>(null);
  const [showMetafieldMenu, setShowMetafieldMenu] = useState(false);
  const [selectedMetafieldForMenu, setSelectedMetafieldForMenu] = useState<MetafieldDefinition | null>(null);



  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      if (onClose) onClose();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [onClose]);

  // Query metafield definitions for this store (using special parentid for definitions)
  const { data: metafieldsData } = db.useQuery(
    currentStore?.id ? {
      metasets: {
        $: {
          where: {
            storeId: currentStore.id,
            parentid: 'metafield-definitions' // Special parentid for definitions
          }
        }
      }
    } : {}
  );

  // Query metafield values for this product
  const { data: valuesData } = db.useQuery(
    productId && currentStore?.id ? {
      metasets: {
        $: {
          where: {
            storeId: currentStore.id,
            parentid: productId
          }
        }
      }
    } : {}
  );

  // Load definitions and values
  useEffect(() => {
    if (metafieldsData?.metasets) {
      const defs = metafieldsData.metasets.map(field => ({
        id: field.id,
        title: field.title || '',
        type: field.type || 'text',
        group: field.group || 'General',
        order: field.order || 0,
        filter: field.filter || false,
        config: field.config || {},
        value: field.value || ''
      })).sort((a, b) => a.order - b.order);
      setDefinitions(defs);
    } else {
      setDefinitions([]);
    }
  }, [metafieldsData]);

  useEffect(() => {
    if (valuesData?.metasets) {
      const vals: Record<string, any> = {};
      valuesData.metasets.forEach(field => {
        if (field && (field as any).title && (field as any).value !== undefined) {
          vals[(field as any).title] = (field as any).value;
        }
      });
      setValues(vals);
    }
  }, [valuesData]);

  const addGroup = async () => {
    if (!newGroupName.trim() || !currentStore?.id) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    // Check if group already exists (but allow if we're editing the same group)
    const existingGroups = getAllGroups();
    if (existingGroups.includes(newGroupName.trim()) && newGroupName.trim() !== editingGroupName) {
      Alert.alert('Error', 'A group with this name already exists');
      return;
    }

    try {
      if (editingGroupName) {
        // Rename existing group - update all metafields in this group
        const groupFields = definitions.filter(def => def.group === editingGroupName);
        const updateTransactions = groupFields.map(field =>
          db.tx.metasets[field.id].update({ group: newGroupName.trim() })
        );
        for (const transaction of updateTransactions) {
          await db.transact(transaction);
        }
      } else {
        // Create new group placeholder metafield to establish the group
        const groupId = id();
        await db.transact(
          db.tx.metasets[groupId].update({
            title: '__GROUP_PLACEHOLDER__',
            type: '__GROUP__',
            group: newGroupName.trim(),
            order: 0,
            filter: false,
            config: {},
            value: '',
            storeId: currentStore.id,
            parentid: 'metafield-definitions'
          })
        );
      }

      setNewGroupName('');
      setEditingGroupName(null);
      setShowAddGroupModal(false);
    } catch (error) {
      Alert.alert('Error', editingGroupName ? 'Failed to rename group' : 'Failed to add group');
    }
  };

  const deleteGroup = async (groupName: string) => {

    try {
      // Delete all metafields in this group
      const groupFields = definitions.filter(def => def.group === groupName);
      const deleteTransactions = groupFields.map(field =>
        db.tx.metasets[field.id].delete()
      );

      for (const transaction of deleteTransactions) {
        await db.transact(transaction);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to delete group');
    }
  };

  const deleteMetafield = async (metafieldId: string) => {
    try {
      await db.transact(db.tx.metasets[metafieldId].delete());
    } catch (error) {
      Alert.alert('Error', 'Failed to delete metafield');
    }
  };

  const addDefinition = async () => {
    if (!newFieldData.title.trim()) {
      Alert.alert('Error', 'Please enter a title for the metafield');
      return;
    }

    if (!selectedGroup) {
      Alert.alert('Error', 'No group selected');
      return;
    }



    try {
      const definitionId = id();
      const maxOrder = definitions
        .filter(def => def.group === selectedGroup)
        .reduce((max, def) => Math.max(max, def.order), -1);

      await db.transact(
        db.tx.metasets[definitionId].update({
          title: newFieldData.title.trim(),
          type: newFieldData.type, // Use the actual field type
          group: selectedGroup,
          order: maxOrder + 1,
          filter: newFieldData.filter,
          config: newFieldData.config,
          value: newFieldData.value,
          storeId: currentStore.id,
          parentid: 'metafield-definitions'
        })
      );

      setNewFieldData({
        title: '',
        type: 'text',
        group: '',
        filter: false,
        config: {},
        value: ''
      });
      setShowAddModal(false);
    } catch (error) {
      Alert.alert('Error', `Failed to add metafield: ${error.message || 'Unknown error'}`);
    }
  };

  // Get all groups including those with only placeholders
  const getAllGroups = () => {
    const groups = [...new Set(definitions.map(def => def.group))];
    return groups.sort();
  };

  // Get groups that have actual metafields (not just placeholders)
  const getGroups = () => {
    const groups = [...new Set(definitions
      .filter(def => def.title !== '__GROUP_PLACEHOLDER__')
      .map(def => def.group))];
    return groups.sort();
  };

  // Get groups for display (all groups, including empty ones)
  const getDisplayGroups = () => {
    const displayGroups = getAllGroups();
    // Filter out any "Metafields" group that might be causing the duplicate header
    return displayGroups.filter(group => group !== 'Metafields');
  };

  // Get field type options
  const getFieldTypes = () => [
    { value: 'text', label: 'Text' },
    { value: 'number', label: 'Number' },
    { value: 'boolean', label: 'Boolean' },
    { value: 'date', label: 'Date' },
    { value: 'url', label: 'URL' },
    { value: 'email', label: 'Email' },
    { value: 'weight', label: 'Weight' },
    { value: 'dimension', label: 'Dimension' },
    { value: 'volume', label: 'Volume' },
    { value: 'rating', label: 'Rating' },
    { value: 'color', label: 'Color' },
    { value: 'json', label: 'JSON' }
  ];

  const updateValue = async (fieldName: string, value: any) => {
    if (!productId || !currentStore?.id) return;

    try {
      // Find existing value or create new
      const existingField = valuesData?.metasets?.find(f => f && (f as any).title === fieldName);

      if (existingField) {
        await db.transact(
          db.tx.metasets[existingField.id].update({ value: value.toString() })
        );
      } else {
        const valueId = id();
        await db.transact(
          db.tx.metasets[valueId].update({
            title: fieldName,
            value: value.toString(),
            storeId: currentStore.id,
            parentid: productId
          })
        );
      }

      setValues(prev => ({ ...prev, [fieldName]: value }));
    } catch (error) {
      Alert.alert('Error', 'Failed to update metafield value');
    }
  };

  const renderMetafield = ({ item }: { item: MetafieldDefinition }) => {
    const currentValue = values[item.title] || item.value || '';

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
            // Handle edit value if productId exists
            if (productId) {
              setSelectedField(item);
              setShowValueModal(true);
            }
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{
              fontSize: 17,
              fontWeight: '400',
              color: '#1C1C1E',
              marginBottom: 2,
            }}>
              {item.title}
            </Text>
            <Text style={{
              fontSize: 13,
              color: '#8E8E93',
            }}>
              {item.group} • {getFieldTypes().find(t => t.value === item.type)?.label || item.type}
              {item.filter && ' • Filterable'}
            </Text>
            {productId && currentValue && (
              <Text style={{
                fontSize: 13,
                color: '#007AFF',
                marginTop: 2,
              }}>
                Value: {currentValue.toString()}
              </Text>
            )}
          </View>
        </TouchableOpacity>

        {!productId && (
          <TouchableOpacity
            style={{
              padding: 8,
              marginLeft: 8,
            }}
            onPress={() => {
              setSelectedMetafieldForMenu(item);
              setShowMetafieldMenu(true);
            }}
          >
            <MaterialCommunityIcons
              name="dots-vertical"
              size={20}
              color="#8E8E93"
            />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Show groups or fields based on selection
  const showingGroup = selectedGroup !== '';
  const currentGroupFields = showingGroup
    ? definitions
        .filter(def => def.group === selectedGroup && def.title !== '__GROUP_PLACEHOLDER__')
        .sort((a, b) => a.order - b.order)
    : [];

  const renderGroupItem = ({ item }: { item: string }) => {
    const fieldCount = definitions.filter(def => def.group === item && def.title !== '__GROUP_PLACEHOLDER__').length;

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
              {fieldCount} {fieldCount === 1 ? 'field' : 'fields'}
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

      {/* Header - Only show when showHeader is true */}
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
            {showingGroup ? selectedGroup : '# Metafields'}
          </Text>

          <TouchableOpacity onPress={() => {
            if (showingGroup) {
              // Add metafield to current group
              setShowAddModal(true);
            } else {
              // Add new group
              setEditingGroupName(null);
              setNewGroupName('');
              setShowAddGroupModal(true);
            }
          }}>
            <Feather name="plus" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Floating Add Button for when header is hidden */}
      {!showHeader && (
        <View style={{
          position: 'absolute',
          top: insets.top + 20,
          right: 20,
          zIndex: 1000,
        }}>
          <TouchableOpacity
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: '#007AFF',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
            }}
            onPress={() => {
              if (showingGroup) {
                setShowAddModal(true);
              } else {
                setEditingGroupName(null);
                setNewGroupName('');
                setShowAddGroupModal(true);
              }
            }}
          >
            <Feather name="plus" size={24} color="white" />
          </TouchableOpacity>
        </View>
      )}

      {/* Content List */}
      {showingGroup ? (
        // Show fields in selected group
        <FlatList
          data={currentGroupFields}
          keyExtractor={(item) => item.id}
          renderItem={renderMetafield}
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
                No fields in {selectedGroup}
              </Text>
              <Text style={{
                fontSize: 15,
                color: '#8E8E93',
                textAlign: 'center',
                marginTop: 8,
              }}>
                Tap + to add a field to this group
              </Text>
            </View>
          }
        />
      ) : (
        // Show groups
        <FlatList
          data={getDisplayGroups()}
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
            }}>
              <Text style={{
                fontSize: 17,
                color: '#8E8E93',
                textAlign: 'center',
              }}>
                No metafields yet
              </Text>
              <Text style={{
                fontSize: 15,
                color: '#8E8E93',
                textAlign: 'center',
                marginTop: 8,
              }}>
                Tap + to create your first metafield
              </Text>
            </View>
          }

        />
      )}
      {/* Add Group Modal */}
      <Modal
        visible={showAddGroupModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowAddGroupModal(false)}
      >
        <AddGroupScreen
          newGroupName={newGroupName}
          setNewGroupName={setNewGroupName}
          onSave={addGroup}
          onClose={() => {
            setShowAddGroupModal(false);
            setEditingGroupName(null);
            setNewGroupName('');
          }}
          isEditing={!!editingGroupName}
        />
      </Modal>

      {/* Add Metafield Full Screen Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowAddModal(false)}
      >
        <AddMetafieldScreen
          newFieldData={newFieldData}
          setNewFieldData={setNewFieldData}
          onSave={addDefinition}
          onClose={() => setShowAddModal(false)}
          getFieldTypes={getFieldTypes}
          groupName={selectedGroup}
        />
      </Modal>

      {/* Edit Value Full Screen Modal */}
      <Modal
        visible={showValueModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowValueModal(false)}
      >
        {selectedField && (
          <EditValueScreen
            field={selectedField}
            currentValue={values[selectedField.title] || selectedField.value || ''}
            onSave={(value) => updateValue(selectedField.title, value)}
            onClose={() => setShowValueModal(false)}
            getFieldTypes={getFieldTypes}
          />
        )}
      </Modal>

      {/* Group Menu Bottom Drawer */}
      <Modal
        visible={showGroupMenu}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowGroupMenu(false)}
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
                {selectedGroupForMenu}
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
                setShowGroupMenu(false);
                if (selectedGroupForMenu) {
                  setEditingGroupName(selectedGroupForMenu);
                  setNewGroupName(selectedGroupForMenu);
                  setShowAddGroupModal(true);
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
                setShowGroupMenu(false);
                if (selectedGroupForMenu) {
                  Alert.alert(
                    'Delete Group',
                    `Delete "${selectedGroupForMenu}" and all its fields?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => deleteGroup(selectedGroupForMenu)
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

      {/* Metafield Menu Bottom Drawer */}
      <Modal
        visible={showMetafieldMenu}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMetafieldMenu(false)}
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
                {selectedMetafieldForMenu?.title}
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
                setShowMetafieldMenu(false);
                if (selectedMetafieldForMenu) {
                  // Pre-fill the form with current data
                  setNewFieldData({
                    title: selectedMetafieldForMenu.title,
                    type: selectedMetafieldForMenu.type,
                    group: selectedMetafieldForMenu.group,
                    filter: selectedMetafieldForMenu.filter,
                    config: selectedMetafieldForMenu.config || {},
                    value: selectedMetafieldForMenu.value || ''
                  });
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
                setShowMetafieldMenu(false);
                if (selectedMetafieldForMenu) {
                  Alert.alert(
                    'Delete Metafield',
                    `Delete "${selectedMetafieldForMenu.title}" metafield?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => deleteMetafield(selectedMetafieldForMenu.id)
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

// Add Group Screen Component
function AddGroupScreen({ newGroupName, setNewGroupName, onSave, onClose, isEditing = false }: {
  newGroupName: string;
  setNewGroupName: (name: string) => void;
  onSave: () => void;
  onClose: () => void;
  isEditing?: boolean;
}) {
  const insets = useSafeAreaInsets();

  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      onClose();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [onClose]);

  return (
    <View style={{ flex: 1, backgroundColor: 'white', paddingTop: insets.top }}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      {/* Header - Clean minimal design with left-aligned title */}
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
          {isEditing ? 'Edit Group' : 'Add Group'}
        </Text>

        <TouchableOpacity
          onPress={onSave}
          disabled={!newGroupName.trim()}
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: newGroupName.trim() ? '#007AFF' : '#E5E5EA',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialCommunityIcons
            name="check"
            size={20}
            color={newGroupName.trim() ? '#fff' : '#C7C7CC'}
          />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={{ padding: 20 }}>
        <Text style={{ fontSize: 16, fontWeight: '500', marginBottom: 8, color: '#1C1C1E' }}>
          Group Name
        </Text>
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: '#E5E7EB',
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 12,
            fontSize: 16,
          }}
          value={newGroupName}
          onChangeText={setNewGroupName}
          placeholder="Enter group name (e.g., Specifications, Dimensions)"
          autoFocus
        />
      </View>
    </View>
  );
}

// Add Metafield Screen Component
function AddMetafieldScreen({ newFieldData, setNewFieldData, onSave, onClose, getFieldTypes, groupName }: {
  newFieldData: any;
  setNewFieldData: (data: any) => void;
  onSave: () => void;
  onClose: () => void;
  getFieldTypes: () => any[];
  groupName: string;
}) {
  const insets = useSafeAreaInsets();

  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      onClose();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [onClose]);

  // Predefined groups to avoid typing errors
  const predefinedGroups = [
    'General',
    'Specifications',
    'Dimensions',
    'Materials',
    'Care Instructions',
    'Shipping',
    'SEO',
    'Custom'
  ];

  return (
    <View style={{ flex: 1, backgroundColor: 'white', paddingTop: insets.top }}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      {/* Header - Clean minimal design with left-aligned title */}
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
          Add Metafield
        </Text>

        <TouchableOpacity
          onPress={onSave}
          disabled={!newFieldData.title.trim()}
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: newFieldData.title.trim() ? '#007AFF' : '#E5E5EA',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialCommunityIcons
            name="check"
            size={20}
            color={newFieldData.title.trim() ? '#fff' : '#C7C7CC'}
          />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
        {/* Field Title */}
        <Text style={{ fontSize: 16, fontWeight: '500', marginBottom: 8, color: '#1C1C1E' }}>
          Title
        </Text>
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: '#E5E7EB',
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 12,
            fontSize: 16,
            marginBottom: 20,
          }}
          value={newFieldData.title}
          onChangeText={(value) => setNewFieldData(prev => ({ ...prev, title: value }))}
          placeholder="Field title"
        />

        {/* Group Display */}
        <Text style={{ fontSize: 16, fontWeight: '500', marginBottom: 8, color: '#1C1C1E' }}>
          Group
        </Text>
        <View style={{
          borderWidth: 1,
          borderColor: '#E5E7EB',
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 12,
          marginBottom: 20,
          backgroundColor: '#F9FAFB',
        }}>
          <Text style={{
            fontSize: 16,
            color: '#6B7280',
          }}>
            {groupName}
          </Text>
        </View>

        {/* Type Selector */}
        <Text style={{ fontSize: 16, fontWeight: '500', marginBottom: 8, color: '#1C1C1E' }}>
          Type
        </Text>
        <View style={{ marginBottom: 20 }}>
          {getFieldTypes().map((type) => (
            <TouchableOpacity
              key={type.value}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 12,
                paddingHorizontal: 16,
                backgroundColor: 'white',
                borderBottomWidth: 1,
                borderBottomColor: '#F2F2F7',
              }}
              onPress={() => setNewFieldData(prev => ({ ...prev, type: type.value }))}
            >
              <Text style={{
                fontSize: 16,
                color: '#1C1C1E',
              }}>
                {type.label}
              </Text>
              {newFieldData.type === type.value && (
                <Ionicons name="checkmark" size={20} color="#007AFF" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Filterable Toggle */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 12,
          paddingHorizontal: 16,
          backgroundColor: 'white',
          borderBottomWidth: 1,
          borderBottomColor: '#F2F2F7',
          marginBottom: 20,
        }}>
          <Text style={{ fontSize: 16, fontWeight: '500', color: '#1C1C1E' }}>
            Filterable
          </Text>
          <Switch
            value={newFieldData.filter}
            onValueChange={(value) => setNewFieldData(prev => ({ ...prev, filter: value }))}
            trackColor={{ false: '#E5E7EB', true: '#007AFF' }}
            thumbColor={newFieldData.filter ? '#fff' : '#f4f3f4'}
          />
        </View>

        {/* Default Value */}
        <Text style={{ fontSize: 16, fontWeight: '500', marginBottom: 8, color: '#1C1C1E' }}>
          Default Value (Optional)
        </Text>
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: '#E5E7EB',
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 12,
            fontSize: 16,
            marginBottom: 20,
          }}
          value={newFieldData.value}
          onChangeText={(value) => setNewFieldData(prev => ({ ...prev, value }))}
          placeholder="Default value"
        />
      </ScrollView>
    </View>
  );
}

// Edit Value Screen Component
function EditValueScreen({ field, currentValue, onSave, onClose, getFieldTypes }: {
  field: MetafieldDefinition;
  currentValue: string;
  onSave: (value: any) => void;
  onClose: () => void;
  getFieldTypes: () => any[];
}) {
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState(currentValue);

  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      onClose();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [onClose]);

  const handleSave = () => {
    onSave(value);
    onClose();
  };

  const renderInput = () => {
    switch (field.type) {
      case 'boolean':
        return (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 12,
            paddingHorizontal: 16,
            backgroundColor: 'white',
            borderBottomWidth: 1,
            borderBottomColor: '#F2F2F7',
          }}>
            <Text style={{ fontSize: 16, color: '#1C1C1E' }}>
              Value
            </Text>
            <Switch
              value={value === 'true' || value === 'True'}
              onValueChange={(val) => setValue(val.toString())}
              trackColor={{ false: '#E5E7EB', true: '#007AFF' }}
              thumbColor={value === 'true' ? '#fff' : '#f4f3f4'}
            />
          </View>
        );
      case 'number':
      case 'weight':
      case 'dimension':
      case 'volume':
      case 'rating':
        return (
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: '#E5E7EB',
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 12,
              fontSize: 16,
              marginBottom: 20,
            }}
            value={value.toString()}
            onChangeText={setValue}
            placeholder={field.config?.placeholder || `Enter ${field.type} value`}
            keyboardType="numeric"
          />
        );
      default:
        return (
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: '#E5E7EB',
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 12,
              fontSize: 16,
              marginBottom: 20,
            }}
            value={value.toString()}
            onChangeText={setValue}
            placeholder={field.config?.placeholder || `Enter ${field.type} value`}
            keyboardType={field.type === 'email' ? 'email-address' : field.type === 'url' ? 'url' : 'default'}
            multiline={field.type === 'json'}
            numberOfLines={field.type === 'json' ? 4 : 1}
          />
        );
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'white', paddingTop: insets.top }}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      {/* Header - Clean minimal design with left-aligned title */}
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
          {field.title}
        </Text>

        <TouchableOpacity
          onPress={handleSave}
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: '#007AFF',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialCommunityIcons
            name="check"
            size={20}
            color="#fff"
          />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
        <Text style={{ fontSize: 16, fontWeight: '500', marginBottom: 8, color: '#1C1C1E' }}>
          Value
        </Text>
        {renderInput()}

        {field.config?.unit && (
          <Text style={{
            fontSize: 14,
            color: '#6B7280',
            marginTop: 8,
          }}>
            Unit: {field.config.unit}
          </Text>
        )}

        <Text style={{
          fontSize: 14,
          color: '#8E8E93',
          marginTop: 16,
        }}>
          Type: {getFieldTypes().find(t => t.value === field.type)?.label || field.type}
        </Text>

        <Text style={{
          fontSize: 14,
          color: '#8E8E93',
          marginTop: 4,
        }}>
          Group: {field.group}
        </Text>
      </ScrollView>
    </View>
  );
}
