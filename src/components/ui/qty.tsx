import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface QuantitySelectorProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
}

export default function QuantitySelector({
  value,
  onValueChange,
  min = 0,
  max = 999999,
  step = 1,
  size = 'medium',
  disabled = false,
}: QuantitySelectorProps) {
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          button: 'w-8 h-8',
          text: 'text-sm',
          container: 'h-8',
        };
      case 'medium':
        return {
          button: 'w-12 h-12',
          text: 'text-lg',
          container: 'h-12',
        };
      case 'large':
        return {
          button: 'w-16 h-16',
          text: 'text-xl',
          container: 'h-16',
        };
      default:
        return {
          button: 'w-12 h-12',
          text: 'text-lg',
          container: 'h-12',
        };
    }
  };

  const styles = getSizeStyles();

  const handleDecrease = () => {
    const newValue = Math.max(min, value - step);
    onValueChange(newValue);
  };

  const handleIncrease = () => {
    const newValue = Math.min(max, value + step);
    onValueChange(newValue);
  };

  const canDecrease = value > min && !disabled;
  const canIncrease = value < max && !disabled;

  return (
    <View className={`flex-row items-center ${styles.container}`}>
      {/* Decrease Button */}
      <TouchableOpacity
        onPress={handleDecrease}
        disabled={!canDecrease}
        className={`
          ${styles.button}
          ${canDecrease ? 'bg-gray-100' : 'bg-gray-50'}
          ${canDecrease ? '' : 'opacity-50'}
          items-center justify-center
        `}
      >
        <Text className={`${styles.text} font-medium text-gray-700`}>
          −
        </Text>
      </TouchableOpacity>

      {/* Value Display */}
      <View className="mx-6 min-w-[60px] items-center">
        <Text className={`${styles.text} font-bold text-gray-900`}>
          {value}
        </Text>
      </View>

      {/* Increase Button */}
      <TouchableOpacity
        onPress={handleIncrease}
        disabled={!canIncrease}
        className={`
          ${styles.button}
          ${canIncrease ? 'bg-gray-100' : 'bg-gray-50'}
          ${canIncrease ? '' : 'opacity-50'}
          items-center justify-center
        `}
      >
        <Text className={`${styles.text} font-medium text-gray-700`}>
          +
        </Text>
      </TouchableOpacity>
    </View>
  );
}
