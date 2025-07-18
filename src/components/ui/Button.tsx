import React from 'react';
import { TouchableOpacity, Text, View, ActivityIndicator } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'destructive' | 'success';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
}: ButtonProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-600';
      case 'secondary':
        return 'bg-gray-100';
      case 'outline':
        return 'bg-transparent';
      case 'destructive':
        return 'bg-red-600';
      case 'success':
        return 'bg-green-600';
      default:
        return 'bg-blue-600';
    }
  };

  const getTextStyles = () => {
    switch (variant) {
      case 'primary':
        return 'text-white';
      case 'secondary':
        return 'text-gray-900';
      case 'outline':
        return 'text-gray-700';
      case 'destructive':
        return 'text-white';
      case 'success':
        return 'text-white';
      default:
        return 'text-white';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return 'px-3 py-2 h-9';
      case 'medium':
        return 'px-4 py-3 h-12';
      case 'large':
        return 'px-6 py-4 h-14';
      default:
        return 'px-4 py-3 h-12';
    }
  };

  const getTextSizeStyles = () => {
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
    >
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={variant === 'secondary' || variant === 'outline' ? '#374151' : '#ffffff'} 
        />
      ) : (
        <View className="flex-row items-center">
          {icon && <View className="mr-2">{icon}</View>}
          <Text className={`${getTextStyles()} ${getTextSizeStyles()} font-semibold`}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
