import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../lib/auth-context';

interface ProfileScreenProps {
  onClose: () => void;
}

export default function ProfileScreen({ onClose }: ProfileScreenProps) {
  const insets = useSafeAreaInsets();
  const { user, peopleaProfile, createPeopleaProfile, updatePeopleaProfile, signOut } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    bio: '',
  });

  // Initialize form data when profile loads
  useEffect(() => {
    if (peopleaProfile) {
      setFormData({
        name: peopleaProfile.name || '',
        phone: peopleaProfile.phone || '',
        bio: peopleaProfile.bio || '',
      });
    }
  }, [peopleaProfile]);



  const handleSave = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      if (peopleaProfile) {
        // Update existing profile
        await updatePeopleaProfile(formData);
      } else {
        // Create new profile
        await createPeopleaProfile(formData);
      }
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: any) {
      console.error('Profile save error:', error);
      Alert.alert('Error', error.message || 'Failed to save profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  const handleCancel = () => {
    if (peopleaProfile) {
      setFormData({
        name: peopleaProfile.name || '',
        phone: peopleaProfile.phone || '',
        bio: peopleaProfile.bio || '',
      });
    }
    setIsEditing(false);
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
      style={{ paddingTop: insets.top }}
    >
      {/* Header */}
      <View className="px-4 h-16 flex-row items-center justify-between bg-white border-b border-gray-200">
        <TouchableOpacity onPress={onClose} className="flex-row items-center">
          <Feather name="arrow-left" size={24} color="#374151" />
          <Text className="text-lg font-medium text-gray-900 ml-2">Profile</Text>
        </TouchableOpacity>
        
        {isEditing ? (
          <View className="flex-row gap-3">
            <TouchableOpacity onPress={handleCancel} disabled={isLoading}>
              <Text className="text-gray-600 text-base">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} disabled={isLoading}>
              <Text className="text-blue-600 text-base font-medium">
                {isLoading ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setIsEditing(true)}>
            <Text className="text-blue-600 text-base font-medium">Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 py-8">
          {/* User Info */}
          <View className="mb-8">
            <Text className="text-sm font-medium text-gray-500 mb-1">Email</Text>
            <Text className="text-lg text-gray-900 mb-4">{user?.email}</Text>
            
            <Text className="text-sm font-medium text-gray-500 mb-1">User ID</Text>
            <Text className="text-sm text-gray-600 font-mono">{user?.id}</Text>
          </View>

          {/* Profile Form */}
          <View className="space-y-6">
            {/* Name Field */}
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-2">Name</Text>
              {isEditing ? (
                <TextInput
                  value={formData.name}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 bg-gray-50 rounded-lg text-base border border-gray-200"
                  style={{ fontSize: 16 }}
                />
              ) : (
                <Text className="text-base text-gray-900 py-3">
                  {formData.name || peopleaProfile?.name || 'Not set'}
                </Text>
              )}
            </View>

            {/* Phone Field */}
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-2">Phone</Text>
              {isEditing ? (
                <TextInput
                  value={formData.phone}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
                  placeholder="Enter your phone number"
                  keyboardType="phone-pad"
                  className="w-full px-4 py-3 bg-gray-50 rounded-lg text-base border border-gray-200"
                  style={{ fontSize: 16 }}
                />
              ) : (
                <Text className="text-base text-gray-900 py-3">
                  {formData.phone || peopleaProfile?.phone || 'Not set'}
                </Text>
              )}
            </View>

            {/* Bio Field */}
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-2">Bio</Text>
              {isEditing ? (
                <TextInput
                  value={formData.bio}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, bio: text }))}
                  placeholder="Tell us about yourself"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  className="w-full px-4 py-3 bg-gray-50 rounded-lg text-base border border-gray-200"
                  style={{ fontSize: 16, minHeight: 100 }}
                />
              ) : (
                <Text className="text-base text-gray-900 py-3">
                  {formData.bio || peopleaProfile?.bio || 'Not set'}
                </Text>
              )}
            </View>
          </View>

          {/* Sign Out Button */}
          <View className="mt-12 pt-8 border-t border-gray-200">
            <TouchableOpacity
              onPress={handleSignOut}
              className="w-full py-4 bg-red-50 rounded-lg border border-red-200"
            >
              <Text className="text-red-600 text-center text-base font-medium">
                Sign Out
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}