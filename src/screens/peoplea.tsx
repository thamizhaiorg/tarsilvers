import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../lib/auth-context';
import { r2Service, UploadResult, UploadErrorType } from '../lib/r2-service';

interface PeopleaScreenProps {
  onClose: () => void;
}

export default function PeopleaScreen({ onClose }: PeopleaScreenProps) {
  const insets = useSafeAreaInsets();
  const { user, peopleaProfile, createPeopleaProfile, updatePeopleaProfile, signOut } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [displayImageUrl, setDisplayImageUrl] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    bio: '',
    profileImage: '',
  });

  // Handle upload errors with specific user messages based on error type
  const handleUploadError = (uploadResult: UploadResult) => {
    const errorType = uploadResult.errorType;
    const errorMessage = uploadResult.error || 'Upload failed';

    let title = 'Upload Error';
    let message = 'Failed to upload image. Please try again.';
    let actions = [{ text: 'OK' }];

    switch (errorType) {
      case UploadErrorType.CONFIGURATION:
        title = 'Configuration Error';
        message = 'Image storage is not properly configured. Please contact support.';
        break;
      
      case UploadErrorType.NETWORK:
        title = 'Network Error';
        message = 'Unable to connect to the server. Please check your internet connection and try again.';
        actions = [
          { text: 'Cancel' },
          { text: 'Retry', onPress: () => handleImagePicker() }
        ];
        break;
      
      case UploadErrorType.FILE_READ:
        title = 'File Error';
        message = 'Unable to read the selected image. Please try selecting a different image.';
        break;
      
      case UploadErrorType.SERVER:
        title = 'Server Error';
        message = 'The server is temporarily unavailable. Please try again in a few moments.';
        actions = [
          { text: 'Cancel' },
          { text: 'Retry', onPress: () => handleImagePicker() }
        ];
        break;
      
      default:
        message = `Upload failed: ${errorMessage}`;
        break;
    }

    Alert.alert(title, message, actions);
  };

  // Initialize form data when profile loads
  useEffect(() => {
    if (peopleaProfile) {
      setFormData({
        name: peopleaProfile.name || '',
        phone: peopleaProfile.phone || '',
        bio: peopleaProfile.bio || '',
        profileImage: peopleaProfile.profileImage || '',
      });
    } else if (user) {
      // If no profile exists, set default values
      setFormData({
        name: user.email?.split('@')[0] || '',
        phone: '',
        bio: '',
        profileImage: '',
      });
      setIsEditing(true); // Start in editing mode for new profiles
    }
  }, [peopleaProfile, user]);

  // Generate signed URL for displaying the profile image
  useEffect(() => {
    const generateDisplayUrl = async () => {
      if (formData.profileImage && formData.profileImage.startsWith('https://')) {
        // If it's an R2 URL, generate a signed URL
        if (formData.profileImage.includes('r2.cloudflarestorage.com')) {
          try {
            const key = r2Service.extractKeyFromUrl(formData.profileImage);
            if (key) {
              // Generate signed URL
              const signedUrl = await r2Service.getSignedUrl(key, 3600); // 1 hour expiry
              if (signedUrl) {
                setDisplayImageUrl(signedUrl);
                // Prefetch the image to cache it
                Image.prefetch(signedUrl);
              } else {
                setDisplayImageUrl(formData.profileImage);
              }
            } else {
              setDisplayImageUrl(formData.profileImage);
            }
          } catch (error) {
            setDisplayImageUrl(formData.profileImage);
          }
        } else {
          // For local files or other URLs, use as-is
          setDisplayImageUrl(formData.profileImage);
          // Prefetch non-R2 images too
          Image.prefetch(formData.profileImage);
        }
      } else {
        setDisplayImageUrl('');
      }
    };

    generateDisplayUrl();
  }, [formData.profileImage]);

  // ...existing code...

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (peopleaProfile) {
        await updatePeopleaProfile(formData);
      } else {
        await createPeopleaProfile(formData);
      }
      setIsEditing(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (peopleaProfile) {
      // Reset to original values
      setFormData({
        name: peopleaProfile.name || '',
        phone: peopleaProfile.phone || '',
        bio: peopleaProfile.bio || '',
        profileImage: peopleaProfile.profileImage || '',
      });
      setIsEditing(false);
    } else {
      // If no profile exists and user cancels, close the screen
      onClose();
    }
  };

  const handleImagePicker = async () => {
    if (isUploading) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions to change your profile picture.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        exif: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setIsUploading(true);

        // Show local image immediately for better UX
        const originalImage = formData.profileImage;
        setFormData(prev => ({
          ...prev,
          profileImage: asset.uri,
        }));

        try {
          // Prepare media file object
          const mediaFile = {
            uri: asset.uri,
            name: asset.fileName || `profile_${Date.now()}.jpg`,
            type: asset.type || 'image/jpeg',
            size: asset.fileSize,
          };

          // Check if R2 service is properly configured
          const { validateR2Config } = await import('../lib/r2-config');
          if (!validateR2Config()) {
            throw new Error('R2 storage is not properly configured. Please check your environment variables.');
          }

          // Use the standard uploadFile method like other components

          const uploadResult = await r2Service.uploadFile(mediaFile, 'profiles');

          // Check if we got a valid result
          if (!uploadResult) {
            throw new Error('R2 service returned null/undefined result');
          }

          if (uploadResult.success && uploadResult.url) {
            // Update with R2 URL
            setFormData(prev => ({
              ...prev,
              profileImage: uploadResult.url!,
            }));
          } else {
            // Handle different error types with specific user messages
            handleUploadError(uploadResult);
            // Revert to original image
            setFormData(prev => ({
              ...prev,
              profileImage: originalImage,
            }));
          }
        } catch (error) {
          // Show generic error for unexpected errors
          Alert.alert(
            'Upload Error', 
            'An unexpected error occurred while uploading your image. Please try again.',
            [{ text: 'OK' }]
          );
          
          // Revert to original image
          setFormData(prev => ({
            ...prev,
            profileImage: originalImage,
          }));
        } finally {
          setIsUploading(false);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
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

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-6 py-4 border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={isEditing ? handleCancelEdit : onClose}>
            <Text className="text-lg text-gray-600">
              {isEditing ? 'Cancel' : 'Close'}
            </Text>
          </TouchableOpacity>
          <Text className="text-xl font-semibold text-gray-900">Profile</Text>
          {isEditing ? (
            <TouchableOpacity onPress={handleSave} disabled={isSaving} testID="save-button">
              <Text className={`text-lg ${isSaving ? 'text-gray-400' : 'text-blue-600'}`}>
                {isSaving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setIsEditing(true)} testID="edit-button">
              <Text className="text-lg text-blue-600">Edit</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView className="flex-1 px-6 py-6">
        {/* Profile Image */}
        <View className="items-center mb-8">
          <TouchableOpacity
            onPress={isEditing && !isUploading ? handleImagePicker : undefined}
            className="relative"
            disabled={isUploading}
            testID="profile-image-button"
          >
            <View className="w-24 h-24 rounded-full overflow-hidden">
              <Image
                source={
                  displayImageUrl && displayImageUrl.length > 0 && displayImageUrl !== ''
                    ? { uri: displayImageUrl }
                    : require('../../assets/adaptive-icon.png')
                }
                style={{ width: 96, height: 96 }}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
              {isUploading && (
                <View className="absolute inset-0 bg-black/50 items-center justify-center rounded-full">
                  <ActivityIndicator size="small" color="#ffffff" />
                </View>
              )}
            </View>
            {isEditing && !isUploading && (
              <View className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-600 rounded-full items-center justify-center">
                <Text className="text-white text-sm">✏️</Text>
              </View>
            )}
          </TouchableOpacity>
          {isUploading && (
            <Text className="text-sm text-gray-500 mt-2">Uploading...</Text>
          )}
        </View>

        {/* Form Fields */}
        <View className="space-y-6">
          {/* Email (Read-only) */}
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-2">Email</Text>
            <View className="px-4 py-3 bg-gray-50 rounded-lg">
              <Text className="text-gray-600">{user?.email}</Text>
            </View>
          </View>

          {/* Name */}
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-2">Name</Text>
            <TextInput
              value={formData.name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
              placeholder="Enter your name"
              editable={isEditing}
              className={`px-4 py-3 rounded-lg ${isEditing ? 'bg-white border border-gray-300' : 'bg-gray-50'
                }`}
            />
          </View>

          {/* Phone */}
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-2">Phone</Text>
            <TextInput
              value={formData.phone}
              onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
              placeholder="Enter your phone number"
              keyboardType="phone-pad"
              editable={isEditing}
              className={`px-4 py-3 rounded-lg ${isEditing ? 'bg-white border border-gray-300' : 'bg-gray-50'
                }`}
            />
          </View>

          {/* Bio */}
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-2">Bio</Text>
            <TextInput
              value={formData.bio}
              onChangeText={(text) => setFormData(prev => ({ ...prev, bio: text }))}
              placeholder="Tell us about yourself"
              multiline
              numberOfLines={3}
              editable={isEditing}
              className={`px-4 py-3 rounded-lg ${isEditing ? 'bg-white border border-gray-300' : 'bg-gray-50'
                }`}
              style={{ textAlignVertical: 'top' }}
            />
          </View>
        </View>

        {/* Sign Out Button */}
        <View className="mt-12 pt-6 border-t border-gray-200">
          <TouchableOpacity
            onPress={handleSignOut}
            className="w-full py-4 bg-red-50 rounded-lg"
          >
            <Text className="text-red-600 text-center text-lg font-medium">
              Sign Out
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
