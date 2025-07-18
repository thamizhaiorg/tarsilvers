// Toast notification system for better user feedback
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Animated, TouchableOpacity, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface ToastProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

const { width: screenWidth } = Dimensions.get('window');

function Toast({ toast, onDismiss }: ToastProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto dismiss
    const timer = setTimeout(() => {
      handleDismiss();
    }, toast.duration || 4000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss(toast.id);
    });
  };

  const getToastStyles = () => {
    switch (toast.type) {
      case 'success':
        return {
          backgroundColor: '#10B981',
          iconName: 'check-circle',
          iconColor: '#FFFFFF',
        };
      case 'error':
        return {
          backgroundColor: '#EF4444',
          iconName: 'error',
          iconColor: '#FFFFFF',
        };
      case 'warning':
        return {
          backgroundColor: '#F59E0B',
          iconName: 'warning',
          iconColor: '#FFFFFF',
        };
      case 'info':
        return {
          backgroundColor: '#3B82F6',
          iconName: 'info',
          iconColor: '#FFFFFF',
        };
      default:
        return {
          backgroundColor: '#6B7280',
          iconName: 'info',
          iconColor: '#FFFFFF',
        };
    }
  };

  const styles = getToastStyles();

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: insets.top + 10,
        left: 16,
        right: 16,
        zIndex: 9999,
        transform: [{ translateY }],
        opacity,
      }}
    >
      <View
        className="rounded-lg shadow-lg flex-row items-center p-4"
        style={{ backgroundColor: styles.backgroundColor }}
      >
        <MaterialIcons 
          name={styles.iconName as any} 
          size={24} 
          color={styles.iconColor} 
        />
        
        <View className="flex-1 ml-3">
          <Text className="text-white font-semibold text-base">
            {toast.title}
          </Text>
          {toast.message && (
            <Text className="text-white opacity-90 text-sm mt-1">
              {toast.message}
            </Text>
          )}
        </View>

        {toast.action && (
          <TouchableOpacity
            onPress={toast.action.onPress}
            className="ml-3 px-3 py-1 rounded border border-white border-opacity-30"
          >
            <Text className="text-white font-medium text-sm">
              {toast.action.label}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={handleDismiss}
          className="ml-3 p-1"
        >
          <MaterialIcons name="close" size={20} color={styles.iconColor} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// Toast Manager Component
interface ToastManagerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastManager({ toasts, onDismiss }: ToastManagerProps) {
  return (
    <>
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </>
  );
}

// Toast Context and Hook
interface ToastContextType {
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
  hideToast: (id: string) => void;
  hideAllToasts: () => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = Date.now().toString();
    const newToast: ToastMessage = { ...toast, id };
    
    setToasts(prev => [...prev, newToast]);
  };

  const hideToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const hideAllToasts = () => {
    setToasts([]);
  };

  return (
    <ToastContext.Provider value={{ showToast, hideToast, hideAllToasts }}>
      {children}
      <ToastManager toasts={toasts} onDismiss={hideToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// Convenience functions
export const toast = {
  success: (title: string, message?: string, options?: Partial<ToastMessage>) => {
    // This would need to be called within a component that has access to the toast context
    return { type: 'success' as const, title, message, ...options };
  },
  error: (title: string, message?: string, options?: Partial<ToastMessage>) => {
    return { type: 'error' as const, title, message, ...options };
  },
  warning: (title: string, message?: string, options?: Partial<ToastMessage>) => {
    return { type: 'warning' as const, title, message, ...options };
  },
  info: (title: string, message?: string, options?: Partial<ToastMessage>) => {
    return { type: 'info' as const, title, message, ...options };
  },
};

// Simple toast functions for common use cases
export const showSuccessToast = (showToast: ToastContextType['showToast']) => 
  (title: string, message?: string) => {
    showToast({ type: 'success', title, message });
  };

export const showErrorToast = (showToast: ToastContextType['showToast']) => 
  (title: string, message?: string) => {
    showToast({ type: 'error', title, message });
  };

export const showWarningToast = (showToast: ToastContextType['showToast']) => 
  (title: string, message?: string) => {
    showToast({ type: 'warning', title, message });
  };

export const showInfoToast = (showToast: ToastContextType['showToast']) => 
  (title: string, message?: string) => {
    showToast({ type: 'info', title, message });
  };
