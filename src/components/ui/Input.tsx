import React from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'filled' | 'outline';
  size?: 'small' | 'medium' | 'large';
}

export default function Input({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  variant = 'default',
  size = 'medium',
  className = '',
  multiline,
  numberOfLines,
  ...props
}: InputProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'filled':
        return 'bg-gray-100';
      case 'outline':
        return 'bg-transparent';
      default:
        return 'bg-gray-50';
    }
  };

  const getSizeStyles = () => {
    if (multiline) {
      const baseHeight = numberOfLines ? numberOfLines * 20 + 24 : 80;
      switch (size) {
        case 'small':
          return `px-3 text-sm`;
        case 'medium':
          return `px-4 text-base`;
        case 'large':
          return `px-4 text-lg`;
        default:
          return `px-4 text-base`;
      }
    }

    switch (size) {
      case 'small':
        return 'h-10 px-3 text-sm';
      case 'medium':
        return 'h-12 px-4 text-base';
      case 'large':
        return 'h-14 px-4 text-lg';
      default:
        return 'h-12 px-4 text-base';
    }
  };

  const borderColor = error ? '' : '';
  const focusBorderColor = error ? '' : '';

  return (
    <View className="w-full">
      {label && (
        <Text className="text-sm font-medium text-gray-700 mb-2">
          {label}
        </Text>
      )}
      
      <View className={`relative flex-row items-center`}>
        {leftIcon && (
          <View className="absolute left-3 z-10">
            {leftIcon}
          </View>
        )}
        
        <TextInput
          className={`
            ${getVariantStyles()}
            ${getSizeStyles()}
            ${leftIcon ? 'pl-10' : ''}
            ${rightIcon ? 'pr-10' : ''}
            text-gray-900 w-full
            ${multiline ? 'py-3' : ''}
            ${className}
          `}
          style={multiline ? {
            minHeight: numberOfLines ? numberOfLines * 20 + 24 : 80,
            textAlignVertical: 'top'
          } : undefined}
          placeholderTextColor="#9CA3AF"
          multiline={multiline}
          numberOfLines={numberOfLines}
          {...props}
        />
        
        {rightIcon && (
          <View className="absolute right-3 z-10">
            {rightIcon}
          </View>
        )}
      </View>
      
      {error && (
        <Text className="text-sm text-red-600 mt-1">
          {error}
        </Text>
      )}
      
      {helperText && !error && (
        <Text className="text-sm text-gray-500 mt-1">
          {helperText}
        </Text>
      )}
    </View>
  );
}
