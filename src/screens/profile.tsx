import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../lib/auth-context';
import { r2Service } from '../lib/r2-service';

interface ProfileScreenProps {
  onClose: () => void;
}

export default function ProfileScreen({ onClose }: ProfileScreenProps) {
  const insets = useSafeAreaInsets();
  const { user, peopleaProfile, createPeopleaProfile, updatePeopleaProfile, signOut } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [displayImageUrl, setDisplayImageUrl] = useState<string>('');
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    bio: '',
    profileImage: '',
  });

  // Initialize form data when profile loads
  useEffect(() => {
    if (peopleaProfile) {
      setFormData({
        name: peopleaProfile.name || '',
        phone: peopleaProfile.phone || '',
        bio: peopleaProfile.bio || '',
        profileImage: peopleaProfile.profileImage || '',
      });
    }
  }, [peopleaProfile]);

  // Handle profile image URL generation
  useEffect(() => {
    const imageUrl = formData.profileImage || peopleaProfile?.profileImage;
    if (imageUrl) {
      if (imageUrl.includes('r2.cloudflarestorage.com')) {
        const generateSignedUrl = async () => {
          try {
            const key = r2Service.extractKeyFromUrl(imageUrl);
            if (key) {
              const signedUrl = await r2Service.getSignedUrl(key, 3600);
              if (signedUrl) {
                setDisplayImageUrl(signedUrl);
                Image.prefetch(signedUrl);
              } else {
                setDisplayImageUrl(imageUrl);
              }
            } else {
              setDisplayImageUrl(imageUrl);
            }
          } catch (error) {
            setDisplayImageUrl(imageUrl);
          }
        };
        generateSignedUrl();
      } else {
        setDisplayImageUrl(imageUrl);
        if (imageUrl) {
          Image.prefetch(imageUrl);
        }
      }
    } else {
      setDisplayImageUrl('');
    }
  }, [formData.profileImage, peopleaProfile?.profileImage]);

  const handleImagePicker = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access camera roll is required!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setIsLoading(true);
        try {
          const asset = result.assets[0];
          const uploadResult = await r2Service.uploadFile(asset.uri, `profile-images/${user?.id}-${Date.now()}.jpg`);
          
          if (uploadResult.success && uploadResult.url) {
            setFormData(prev => ({
              ...prev,
              profileImage: uploadResult.url
            }));
          } else {
            Alert.alert('Upload Failed', 'Failed to upload profile image');
          }
        } catch (error) {
          console.error('Image upload error:', error);
          Alert.alert('Upload Error', 'An error occurred while uploading the image');
        } finally {
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'An error occurred while selecting the image');
    }
  };

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
        profileImage: peopleaProfile.profileImage || '',
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
          {/* Profile Image Section */}
          <View className="items-center mb-8">
            <TouchableOpacity
              onPress={isEditing ? handleImagePicker : undefined}
              disabled={!isEditing || isLoading}
              className="relative"
            >
              <View className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200">
                <Image
                  source={
                    displayImageUrl && displayImageUrl.length > 0
                      ? { uri: displayImageUrl }
                      : require('../../assets/adaptive-icon.png')
                  }
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              </View>
              {isEditing && (
                <View className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-600 rounded-full items-center justify-center border-2 border-white">
                  <Feather name="camera" size={14} color="white" />
                </View>
              )}
            </TouchableOpacity>
            
            {isEditing && (
              <Text className="text-sm text-gray-500 mt-2 text-center">
                Tap to change profile photo
              </Text>
            )}
          </View>

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

          {/* App Info */}
          <View className="mt-8 pt-6 border-t border-gray-100">
            <Text className="text-xs text-gray-400 text-center">
              TAR POS • Powered by InstantDB
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}