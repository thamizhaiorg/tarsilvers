import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

interface TopBarProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onClose?: () => void;
  rightAction?: {
    icon?: string;
    text?: string;
    onPress: () => void;
    disabled?: boolean;
  };
  leftAction?: {
    icon?: string;
    text?: string;
    onPress: () => void;
  };
  showDivider?: boolean;
  backgroundColor?: string;
}

export default function TopBar({
  title,
  subtitle,
  onBack,
  onClose,
  rightAction,
  leftAction,
  showDivider = true,
  backgroundColor = 'bg-white'
}: TopBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View 
      className={`${backgroundColor} ${showDivider ? 'border-b border-gray-200' : ''}`}
      style={{ paddingTop: insets.top }}
    >
      <View className="px-4 py-4">
        <View className="flex-row items-center justify-between">
          {/* Left Side */}
          <View className="flex-row items-center flex-1">
            {onBack && (
              <TouchableOpacity
                onPress={onBack}
                className="mr-3 w-10 h-10 items-center justify-center"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="arrow-left" size={24} color="#374151" />
              </TouchableOpacity>
            )}
            
            {leftAction && (
              <TouchableOpacity
                onPress={leftAction.onPress}
                className="mr-3 flex-row items-center"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {leftAction.icon && (
                  <Feather name={leftAction.icon as any} size={20} color="#3B82F6" />
                )}
                {leftAction.text && (
                  <Text className="text-blue-600 text-base font-medium ml-1">
                    {leftAction.text}
                  </Text>
                )}
              </TouchableOpacity>
            )}

            <View className="flex-1">
              <Text className="text-xl font-bold text-gray-900" numberOfLines={1}>
                {title}
              </Text>
              {subtitle && (
                <Text className="text-sm text-gray-500 mt-1" numberOfLines={1}>
                  {subtitle}
                </Text>
              )}
            </View>
          </View>

          {/* Right Side */}
          <View className="flex-row items-center">
            {rightAction && (
              <TouchableOpacity
                onPress={rightAction.onPress}
                disabled={rightAction.disabled}
                className={`flex-row items-center ${
                  rightAction.disabled ? 'opacity-40' : ''
                }`}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {rightAction.icon && (
                  <Feather 
                    name={rightAction.icon as any} 
                    size={24} 
                    color={rightAction.disabled ? "#9CA3AF" : "#3B82F6"} 
                  />
                )}
                {rightAction.text && (
                  <Text className={`text-base font-semibold ml-1 ${
                    rightAction.disabled ? 'text-gray-400' : 'text-blue-600'
                  }`}>
                    {rightAction.text}
                  </Text>
                )}
              </TouchableOpacity>
            )}

            {onClose && (
              <TouchableOpacity
                onPress={onClose}
                className="ml-3 w-10 h-10 items-center justify-center"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="x" size={24} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}
