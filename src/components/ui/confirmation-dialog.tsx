// Confirmation dialog component for better UX
import React from 'react';
import { View, Text, TouchableOpacity, Modal, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export interface ConfirmationDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: string;
  icon?: string;
  iconColor?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmationDialog({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmColor,
  icon,
  iconColor,
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  const scaleValue = React.useRef(new Animated.Value(0)).current;
  const opacityValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleValue, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(opacityValue, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleValue, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacityValue, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const getConfirmButtonColor = () => {
    if (confirmColor) return confirmColor;
    return destructive ? '#EF4444' : '#3B82F6';
  };

  const getIconConfig = () => {
    if (icon && iconColor) {
      return { name: icon, color: iconColor };
    }
    
    if (destructive) {
      return { name: 'warning', color: '#EF4444' };
    }
    
    return { name: 'help-outline', color: '#3B82F6' };
  };

  const iconConfig = getIconConfig();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onCancel}
    >
      <Animated.View 
        className="flex-1 justify-center items-center"
        style={{ 
          backgroundColor: 'rgba(0,0,0,0.5)',
          opacity: opacityValue 
        }}
      >
        <TouchableOpacity 
          className="absolute inset-0" 
          onPress={onCancel}
          activeOpacity={1}
        />
        
        <Animated.View
          className="bg-white rounded-2xl mx-6 max-w-sm w-full shadow-2xl"
          style={{
            transform: [{ scale: scaleValue }],
          }}
        >
          {/* Header */}
          <View className="items-center pt-8 pb-4 px-6">
            <View 
              className="w-16 h-16 rounded-full items-center justify-center mb-4"
              style={{ backgroundColor: `${iconConfig.color}15` }}
            >
              <MaterialIcons 
                name={iconConfig.name as any} 
                size={32} 
                color={iconConfig.color} 
              />
            </View>
            
            <Text className="text-xl font-bold text-gray-900 text-center mb-2">
              {title}
            </Text>
            
            <Text className="text-gray-600 text-center leading-5">
              {message}
            </Text>
          </View>

          {/* Actions */}
          <View className="flex-row border-t border-gray-100">
            <TouchableOpacity
              onPress={onCancel}
              className="flex-1 py-4 items-center justify-center border-r border-gray-100"
            >
              <Text className="text-gray-600 font-semibold text-base">
                {cancelText}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={onConfirm}
              className="flex-1 py-4 items-center justify-center"
            >
              <Text 
                className="font-semibold text-base"
                style={{ color: getConfirmButtonColor() }}
              >
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// Hook for easier confirmation dialogs
interface UseConfirmationOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  icon?: string;
  iconColor?: string;
}

export function useConfirmation() {
  const [dialog, setDialog] = React.useState<{
    visible: boolean;
    options: UseConfirmationOptions;
    onConfirm: () => void;
    onCancel: () => void;
  }>({
    visible: false,
    options: { title: '', message: '' },
    onConfirm: () => {},
    onCancel: () => {},
  });

  const confirm = React.useCallback((
    options: UseConfirmationOptions
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialog({
        visible: true,
        options,
        onConfirm: () => {
          setDialog(prev => ({ ...prev, visible: false }));
          resolve(true);
        },
        onCancel: () => {
          setDialog(prev => ({ ...prev, visible: false }));
          resolve(false);
        },
      });
    });
  }, []);

  const ConfirmationComponent = React.useCallback(() => (
    <ConfirmationDialog
      visible={dialog.visible}
      title={dialog.options.title}
      message={dialog.options.message}
      confirmText={dialog.options.confirmText}
      cancelText={dialog.options.cancelText}
      destructive={dialog.options.destructive}
      icon={dialog.options.icon}
      iconColor={dialog.options.iconColor}
      onConfirm={dialog.onConfirm}
      onCancel={dialog.onCancel}
    />
  ), [dialog]);

  return { confirm, ConfirmationComponent };
}

// Preset confirmation dialogs
export const confirmDelete = (itemName: string = 'item') => ({
  title: 'Delete Item',
  message: `Are you sure you want to delete this ${itemName}? This action cannot be undone.`,
  confirmText: 'Delete',
  destructive: true,
  icon: 'delete',
  iconColor: '#EF4444',
});

export const confirmDiscard = () => ({
  title: 'Discard Changes',
  message: 'You have unsaved changes. Are you sure you want to discard them?',
  confirmText: 'Discard',
  destructive: true,
  icon: 'warning',
  iconColor: '#F59E0B',
});

export const confirmLogout = () => ({
  title: 'Sign Out',
  message: 'Are you sure you want to sign out of your account?',
  confirmText: 'Sign Out',
  icon: 'logout',
  iconColor: '#6B7280',
});

export const confirmClearData = () => ({
  title: 'Clear All Data',
  message: 'This will permanently delete all your data. This action cannot be undone.',
  confirmText: 'Clear Data',
  destructive: true,
  icon: 'warning',
  iconColor: '#EF4444',
});

// Quick confirmation functions
export const quickConfirm = {
  delete: (itemName?: string) => confirmDelete(itemName),
  discard: () => confirmDiscard(),
  logout: () => confirmLogout(),
  clearData: () => confirmClearData(),
};
