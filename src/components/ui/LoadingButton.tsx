import React from 'react';
import { TouchableOpacity, Text, View, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface LoadingButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  size?: 'small' | 'medium' | 'large';
  icon?: string;
  fullWidth?: boolean;
  style?: Record<string, unknown>;
}

export default function LoadingButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  size = 'medium',
  icon,
  fullWidth = false,
  style
}: LoadingButtonProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-600';
      case 'secondary':
        return 'bg-gray-100';
      case 'success':
        return 'bg-green-600';
      case 'danger':
        return 'bg-red-600';
      default:
        return 'bg-blue-600';
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'secondary':
        return 'text-gray-900';
      default:
        return 'text-white';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return 'py-2 px-4 rounded-xl';
      case 'medium':
        return 'py-3 px-6 rounded-2xl';
      case 'large':
        return 'py-4 px-8 rounded-2xl';
      default:
        return 'py-3 px-6 rounded-2xl';
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'small':
        return 'text-sm';
      case 'medium':
        return 'text-base';
      case 'large':
        return 'text-lg';
      default:
        return 'text-base';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 16;
      case 'medium':
        return 20;
      case 'large':
        return 24;
      default:
        return 20;
    }
  };

  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      className={`
        ${getVariantStyles()}
        ${getSizeStyles()}
        ${fullWidth ? 'w-full' : ''}
        ${isDisabled ? 'opacity-50' : ''}
        flex-row items-center justify-center
      `}
      style={[
        { minHeight: size === 'large' ? 56 : size === 'medium' ? 48 : 40 },
        style
      ]}
    >
      {loading ? (
        <View className="flex-row items-center">
          <ActivityIndicator 
            size="small" 
            color={variant === 'secondary' ? '#374151' : '#ffffff'} 
          />
          <Text className={`${getTextColor()} ${getTextSize()} font-semibold ml-2`}>
            {title}
          </Text>
        </View>
      ) : (
        <View className="flex-row items-center">
          {icon && (
            <Feather 
              name={icon as any} 
              size={getIconSize()} 
              color={variant === 'secondary' ? '#374151' : '#ffffff'} 
            />
          )}
          <Text className={`${getTextColor()} ${getTextSize()} font-semibold ${icon ? 'ml-2' : ''}`}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
