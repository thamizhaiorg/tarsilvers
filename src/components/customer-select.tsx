import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { db } from '../lib/instant';
import { useStore } from '../lib/store-context';
import { id } from '@instantdb/react-native';
import { hapticFeedback } from '../lib/haptics';
import Button from './ui/Button';
import LoadingButton from './ui/LoadingButton';
import Card from './ui/Card';

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  totalOrders?: number;
  totalSpent?: number;
  lastOrderDate?: Date;
}

interface CustomerSelectProps {
  selectedCustomer?: Customer | null;
  onCustomerSelect: (customer: Customer | null) => void;
  onClose: () => void;
}

export default function CustomerSelect({ selectedCustomer, onCustomerSelect, onClose }: CustomerSelectProps) {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: ''
  });

  // Query customers from InstantDB with optimized schema
  const { data, isLoading, error } = db.useQuery({
    customers: {
      $: {
        where: {}, // No store filtering needed
        order: {
          createdAt: 'desc' // Use consistent field naming
        }
      }
    }
  });

  const customers = data?.customers || [];

  // Filter customers based on search
  const filteredCustomers = customers.filter((customer: Customer) => {
    const query = searchQuery.toLowerCase();
    return (
      (customer.name || '').toLowerCase().includes(query) ||
      (customer.email || '').toLowerCase().includes(query) ||
      (customer.phone || '').toLowerCase().includes(query)
    );
  });

  const handleAddCustomer = async () => {
    if (!newCustomerData.name.trim()) {
      hapticFeedback.warning();
      Alert.alert('Error', 'Customer name is required');
      return;
    }



    setIsAddingCustomer(true);
    try {
      const customerId = id();
      const customerData = {
        name: newCustomerData.name.trim(),
        email: newCustomerData.email.trim() || undefined,
        phone: newCustomerData.phone.trim() || undefined,
        notes: newCustomerData.notes.trim() || undefined,
        totalOrders: 0,
        totalSpent: 0,
        createdAt: new Date(),
      };

      await db.transact(db.tx.customers[customerId].update(customerData));

      // Select the new customer
      onCustomerSelect({
        id: customerId,
        ...customerData
      });

      hapticFeedback.success();
      setShowAddCustomer(false);
      setNewCustomerData({ name: '', email: '', phone: '', notes: '' });
      onClose();
    } catch (error) {
      console.error('Error adding customer:', error);
      hapticFeedback.error();
      Alert.alert('Error', 'Failed to add customer');
    } finally {
      setIsAddingCustomer(false);
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    onCustomerSelect(customer);
    onClose();
  };

  const handleRemoveCustomer = () => {
    onCustomerSelect(null);
    onClose();
  };

  if (showAddCustomer) {
    return (
      <Modal visible={true} animationType="slide" presentationStyle="pageSheet">
        <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
          {/* Header */}
          <View className="px-4 py-4 border-b border-gray-200">
            <View className="flex-row items-center justify-between">
              <TouchableOpacity onPress={() => setShowAddCustomer(false)}>
                <Text className="text-blue-600 text-base">Cancel</Text>
              </TouchableOpacity>
              <Text className="text-lg font-semibold text-gray-900">Add customer</Text>
              <LoadingButton
                title="Save"
                onPress={handleAddCustomer}
                loading={isAddingCustomer}
                variant="primary"
                size="small"
              />
            </View>
          </View>

          <ScrollView className="flex-1 px-4 py-6">
            {/* Name Field */}
            <View className="mb-6">
              <Text className="text-base font-medium text-gray-900 mb-2">Name *</Text>
              <TextInput
                value={newCustomerData.name}
                onChangeText={(text) => setNewCustomerData(prev => ({ ...prev, name: text }))}
                placeholder="Customer name"
                className="border border-gray-300 rounded-lg px-3 py-3 text-base"
                autoFocus
              />
            </View>

            {/* Email Field */}
            <View className="mb-6">
              <Text className="text-base font-medium text-gray-900 mb-2">Email</Text>
              <TextInput
                value={newCustomerData.email}
                onChangeText={(text) => setNewCustomerData(prev => ({ ...prev, email: text }))}
                placeholder="customer@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                className="border border-gray-300 rounded-lg px-3 py-3 text-base"
              />
            </View>

            {/* Phone Field */}
            <View className="mb-6">
              <Text className="text-base font-medium text-gray-900 mb-2">Phone</Text>
              <TextInput
                value={newCustomerData.phone}
                onChangeText={(text) => setNewCustomerData(prev => ({ ...prev, phone: text }))}
                placeholder="+1 (555) 123-4567"
                keyboardType="phone-pad"
                className="border border-gray-300 rounded-lg px-3 py-3 text-base"
              />
            </View>

            {/* Notes Field */}
            <View className="mb-6">
              <Text className="text-base font-medium text-gray-900 mb-2">Notes</Text>
              <TextInput
                value={newCustomerData.notes}
                onChangeText={(text) => setNewCustomerData(prev => ({ ...prev, notes: text }))}
                placeholder="Customer notes..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                className="border border-gray-300 rounded-lg px-3 py-3 text-base"
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={true} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
        {/* Header */}
        <View className="bg-white px-4 py-4 border-b border-gray-200">
          <View className="flex-row items-center justify-between mb-4">
            <TouchableOpacity onPress={onClose}>
              <Text className="text-blue-600 text-base">Cancel</Text>
            </TouchableOpacity>
            <Text className="text-lg font-semibold text-gray-900">Select customer</Text>
            <TouchableOpacity onPress={() => setShowAddCustomer(true)}>
              <Feather name="plus" size={24} color="#3B82F6" />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2">
            <Feather name="search" size={20} color="#6B7280" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search customers..."
              className="flex-1 ml-2 text-base"
            />
          </View>
        </View>

        <ScrollView className="flex-1">
          {/* Remove Customer Option */}
          {selectedCustomer && (
            <View className="px-4 pt-4">
              <TouchableOpacity onPress={handleRemoveCustomer}>
                <Card padding="medium">
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center mr-3">
                      <Feather name="user-x" size={20} color="#6B7280" />
                    </View>
                    <Text className="text-base font-medium text-gray-900">Remove customer</Text>
                  </View>
                </Card>
              </TouchableOpacity>
            </View>
          )}

          {/* Customer List */}
          <View className="px-4 py-4">
            {isLoading ? (
              <Text className="text-center text-gray-500 py-8">Loading customers...</Text>
            ) : filteredCustomers.length === 0 ? (
              <View className="py-8">
                <Text className="text-center text-gray-500 mb-4">
                  {searchQuery ? 'No customers found' : 'No customers yet'}
                </Text>
                <Button
                  title="Add first customer"
                  onPress={() => setShowAddCustomer(true)}
                  variant="outline"
                />
              </View>
            ) : (
              filteredCustomers.map((customer: Customer) => (
                <TouchableOpacity
                  key={customer.id}
                  onPress={() => handleSelectCustomer(customer)}
                  className="mb-3"
                >
                  <Card padding="medium">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center flex-1">
                        <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-3">
                          <Text className="text-blue-600 font-semibold">
                            {customer.name?.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View className="flex-1">
                          <Text className="text-base font-medium text-gray-900">
                            {customer.name}
                          </Text>
                          {customer.email && (
                            <Text className="text-sm text-gray-500">{customer.email}</Text>
                          )}
                          {customer.phone && (
                            <Text className="text-sm text-gray-500">{customer.phone}</Text>
                          )}
                        </View>
                      </View>
                      {selectedCustomer?.id === customer.id && (
                        <Feather name="check" size={20} color="#10B981" />
                      )}
                    </View>
                  </Card>
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
