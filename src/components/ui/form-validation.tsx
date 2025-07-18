// Enhanced form validation components for better UX
import React from 'react';
import { View, Text, TextInput, TextInputProps, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | null;
}

interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateField(value: string, rules: ValidationRule): ValidationResult {
  // Required validation
  if (rules.required && (!value || value.trim().length === 0)) {
    return { isValid: false, error: 'This field is required' };
  }

  // Skip other validations if field is empty and not required
  if (!value || value.trim().length === 0) {
    return { isValid: true };
  }

  // Min length validation
  if (rules.minLength && value.length < rules.minLength) {
    return { 
      isValid: false, 
      error: `Must be at least ${rules.minLength} characters` 
    };
  }

  // Max length validation
  if (rules.maxLength && value.length > rules.maxLength) {
    return { 
      isValid: false, 
      error: `Must be no more than ${rules.maxLength} characters` 
    };
  }

  // Pattern validation
  if (rules.pattern && !rules.pattern.test(value)) {
    return { isValid: false, error: 'Invalid format' };
  }

  // Custom validation
  if (rules.custom) {
    const customError = rules.custom(value);
    if (customError) {
      return { isValid: false, error: customError };
    }
  }

  return { isValid: true };
}

interface ValidatedInputProps extends TextInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  rules?: ValidationRule;
  error?: string;
  touched?: boolean;
  helperText?: string;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  containerClassName?: string;
  inputClassName?: string;
  showValidIcon?: boolean;
}

export function ValidatedInput({
  label,
  value,
  onChangeText,
  rules = {},
  error,
  touched = false,
  helperText,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerClassName = '',
  inputClassName = '',
  showValidIcon = true,
  ...textInputProps
}: ValidatedInputProps) {
  const [isFocused, setIsFocused] = React.useState(false);
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  const validation = validateField(value, rules);
  const hasError = touched && !validation.isValid;
  const isValid = touched && validation.isValid && value.length > 0;

  React.useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: hasError ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [hasError]);

  const borderColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [isFocused ? '#3B82F6' : '#D1D5DB', '#EF4444'],
  });

  const getBorderColor = () => {
    if (hasError) return '#EF4444';
    if (isValid) return '#10B981';
    if (isFocused) return '#3B82F6';
    return '#D1D5DB';
  };

  const getRightIcon = () => {
    if (rightIcon) return rightIcon;
    if (showValidIcon && isValid) return 'check-circle';
    if (hasError) return 'error';
    return undefined;
  };

  const getRightIconColor = () => {
    if (rightIcon) return '#6B7280';
    if (showValidIcon && isValid) return '#10B981';
    if (hasError) return '#EF4444';
    return '#6B7280';
  };

  return (
    <View className={`mb-4 ${containerClassName}`}>
      {/* Label */}
      <Text className="text-sm font-medium text-gray-700 mb-2">
        {label}
        {rules.required && <Text className="text-red-500 ml-1">*</Text>}
      </Text>

      {/* Input Container */}
      <View className="relative">
        <View
          className={`flex-row items-center bg-white rounded-lg px-3 py-3 ${inputClassName}`}
          style={{
            borderWidth: 1,
            borderColor: getBorderColor(),
          }}
        >
          {/* Left Icon */}
          {leftIcon && (
            <MaterialIcons 
              name={leftIcon as any} 
              size={20} 
              color="#6B7280" 
              style={{ marginRight: 8 }}
            />
          )}

          {/* Text Input */}
          <TextInput
            value={value}
            onChangeText={onChangeText}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="flex-1 text-gray-900 text-base"
            placeholderTextColor="#9CA3AF"
            {...textInputProps}
          />

          {/* Right Icon */}
          {getRightIcon() && (
            <MaterialIcons 
              name={getRightIcon() as any} 
              size={20} 
              color={getRightIconColor()}
              onPress={onRightIconPress}
              style={{ marginLeft: 8 }}
            />
          )}
        </View>
      </View>

      {/* Error Message */}
      {hasError && (
        <Animated.View
          style={{
            opacity: animatedValue,
            transform: [{
              translateY: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [-10, 0],
              }),
            }],
          }}
        >
          <Text className="text-red-500 text-sm mt-1 flex-row items-center">
            <MaterialIcons name="error" size={14} color="#EF4444" />
            <Text className="ml-1">{error || validation.error}</Text>
          </Text>
        </Animated.View>
      )}

      {/* Helper Text */}
      {!hasError && helperText && (
        <Text className="text-gray-500 text-sm mt-1">
          {helperText}
        </Text>
      )}
    </View>
  );
}

interface FormFieldProps {
  children: React.ReactNode;
  error?: string;
  touched?: boolean;
}

export function FormField({ children, error, touched }: FormFieldProps) {
  const hasError = touched && error;

  return (
    <View className="mb-4">
      {children}
      {hasError && (
        <View className="flex-row items-center mt-1">
          <MaterialIcons name="error" size={14} color="#EF4444" />
          <Text className="text-red-500 text-sm ml-1">{error}</Text>
        </View>
      )}
    </View>
  );
}

interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export function FormSection({ 
  title, 
  description, 
  children, 
  collapsible = false,
  defaultExpanded = true 
}: FormSectionProps) {
  const [expanded, setExpanded] = React.useState(defaultExpanded);
  const animatedHeight = React.useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;

  const toggleExpanded = () => {
    if (!collapsible) return;
    
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    
    Animated.timing(animatedHeight, {
      toValue: newExpanded ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  return (
    <View className="mb-6">
      {/* Header */}
      <View 
        className={`flex-row items-center justify-between mb-3 ${
          collapsible ? 'cursor-pointer' : ''
        }`}
        onTouchEnd={toggleExpanded}
      >
        <View className="flex-1">
          <Text className="text-lg font-semibold text-gray-900">
            {title}
          </Text>
          {description && (
            <Text className="text-gray-600 text-sm mt-1">
              {description}
            </Text>
          )}
        </View>
        
        {collapsible && (
          <MaterialIcons 
            name={expanded ? 'expand-less' : 'expand-more'} 
            size={24} 
            color="#6B7280" 
          />
        )}
      </View>

      {/* Content */}
      <Animated.View
        style={{
          opacity: animatedHeight,
          maxHeight: animatedHeight.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 1000], // Adjust based on your content
          }),
          overflow: 'hidden',
        }}
      >
        {children}
      </Animated.View>
    </View>
  );
}

// Common validation rules
export const validationRules = {
  required: { required: true },
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    custom: (value: string) => {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return 'Please enter a valid email address';
      }
      return null;
    },
  },
  phone: {
    pattern: /^[\+]?[1-9][\d]{0,15}$/,
    custom: (value: string) => {
      const cleaned = value.replace(/[\s\-\(\)]/g, '');
      if (!/^[\+]?[1-9][\d]{0,15}$/.test(cleaned)) {
        return 'Please enter a valid phone number';
      }
      return null;
    },
  },
  url: {
    custom: (value: string) => {
      try {
        new URL(value.startsWith('http') ? value : `https://${value}`);
        return null;
      } catch {
        return 'Please enter a valid URL';
      }
    },
  },
  price: {
    custom: (value: string) => {
      const num = parseFloat(value);
      if (isNaN(num) || num < 0) {
        return 'Please enter a valid price';
      }
      if (num > 999999.99) {
        return 'Price cannot exceed $999,999.99';
      }
      return null;
    },
  },
  stock: {
    custom: (value: string) => {
      const num = parseInt(value);
      if (isNaN(num) || num < 0) {
        return 'Please enter a valid stock quantity';
      }
      if (num > 999999) {
        return 'Stock cannot exceed 999,999';
      }
      return null;
    },
  },
};
