import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar, BackHandler, Alert } from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../lib/instant';
import { id } from '@instantdb/react-native';
import { useStore } from '../lib/store-context';

interface OptionSet {
  id: string;
  name: string;
  valueCount: number;
}

interface OptionSetsScreenProps {
  onNavigateToEdit: (setId: string, setName: string) => void;
  onClose: () => void;
}

export default function OptionSetsScreen({ onNavigateToEdit, onClose }: OptionSetsScreenProps) {
  const { isLoading: storeLoading } = useStore();
  const insets = useSafeAreaInsets();

  // ...existing code...

  // Get option sets from database
  const { data, isLoading, error } = db.useQuery({
    opsets: {},
    opvalues: {}
  });

  // Handle case where opsets table doesn't exist yet
  const safeData = React.useMemo(() => {
    if (!data) return { opsets: [], opvalues: [] };
    return {
      opsets: data.opsets || [],
      opvalues: data.opvalues || []
    };
  }, [data]);

  // Process data into option sets
  const optionSets: OptionSet[] = React.useMemo(() => {
    if (isLoading || !safeData.opsets) return [];

    return safeData.opsets.map(set => {
      const valueCount = safeData.opvalues?.filter(value => value.setId === set.id).length || 0;
      return {
        id: set.id,
        name: set.name,
        valueCount,
      };
    });
  }, [safeData, isLoading]);

  const totalSets = optionSets.length;

  const handleCreateSet = async () => {

    try {
      const setId = id();

      await db.transact([
        db.tx.opsets[setId].update({
          name: 'New Option Set',
        })
      ]);

      onNavigateToEdit(setId, 'New Option Set');
    } catch (error) {
      // ...removed debug log...
      Alert.alert('Error', 'Failed to create option set');
    }
  };

  const renderOptionSet = (item: OptionSet) => (
    <TouchableOpacity
      key={item.id}
      onPress={() => onNavigateToEdit(item.id, item.name)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 20,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#F2F2F7',
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
          {item.valueCount} {item.valueCount === 1 ? 'value' : 'values'}
        </Text>
      </View>

      <MaterialCommunityIcons
        name="chevron-right"
        size={20}
        color="#C7C7CC"
      />
    </TouchableOpacity>
  );



  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
        <Text style={{ color: '#FF3B30', fontSize: 16 }}>Error loading option sets</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: insets.top + 20,
        paddingBottom: 20,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
      }}>
        <TouchableOpacity onPress={onClose}>
          <Text style={{
            fontSize: 17,
            fontWeight: '600',
            color: '#1C1C1E',
          }}>
            Options
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleCreateSet}>
          <Feather name="plus" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#8E8E93', fontSize: 16 }}>Loading...</Text>
        </View>
      ) : totalSets === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 }}>
          <Text style={{
            fontSize: 20,
            fontWeight: '600',
            color: '#1C1C1E',
            marginBottom: 8,
            textAlign: 'center',
          }}>
            No Option Sets
          </Text>
          <Text style={{
            fontSize: 16,
            color: '#8E8E93',
            textAlign: 'center',
            marginBottom: 24,
          }}>
            Create your first option set to get started
          </Text>
          <TouchableOpacity
            onPress={handleCreateSet}
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
              fontWeight: '600',
            }}>
              Create Option Set
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={{ backgroundColor: 'white' }}>
            {optionSets.map(renderOptionSet)}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
