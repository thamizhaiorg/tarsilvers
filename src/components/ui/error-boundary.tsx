import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { trackError } from '../../lib/logger';

interface ErrorInfo {
  componentStack: string;
  errorBoundary?: string;
  errorBoundaryStack?: string;
}

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Use trackError which already handles logging properly
    trackError(error, 'ErrorBoundary', { errorInfo });
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View className="flex-1 bg-white justify-center items-center p-6">
          <MaterialIcons name="error-outline" size={64} color="#EF4444" />
          
          <Text className="text-xl font-bold text-gray-900 mt-4 text-center">
            Something went wrong
          </Text>
          
          <Text className="text-gray-600 mt-2 text-center">
            An unexpected error occurred. Please try again.
          </Text>

          {__DEV__ && this.state.error && (
            <ScrollView className="mt-4 max-h-40 w-full">
              <View className="bg-gray-100 p-3 rounded-lg">
                <Text className="text-xs text-gray-800 font-mono">
                  {this.state.error.toString()}
                </Text>
                {this.state.errorInfo?.componentStack && (
                  <Text className="text-xs text-gray-600 font-mono mt-2">
                    {this.state.errorInfo.componentStack}
                  </Text>
                )}
              </View>
            </ScrollView>
          )}

          <TouchableOpacity
            onPress={this.handleRetry}
            className="bg-blue-600 px-6 py-3 rounded-lg mt-6"
          >
            <Text className="text-white font-semibold">Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

// Hook for functional components to handle errors
export const useErrorHandler = () => {
  const handleError = (error: Error, context?: string) => {
    trackError(error, context || 'useErrorHandler');
  };

  return { handleError };
};

// Loading error component
interface LoadingErrorProps {
  error: string;
  onRetry?: () => void;
  retryText?: string;
}

export function LoadingError({ error, onRetry, retryText = 'Retry' }: LoadingErrorProps) {
  return (
    <View className="flex-1 justify-center items-center p-6">
      <MaterialIcons name="wifi-off" size={48} color="#9CA3AF" />
      <Text className="text-lg font-semibold text-gray-900 mt-4 text-center">
        Failed to load
      </Text>
      <Text className="text-gray-600 mt-2 text-center">
        {error}
      </Text>
      {onRetry && (
        <TouchableOpacity
          onPress={onRetry}
          className="bg-blue-600 px-4 py-2 mt-4"
        >
          <Text className="text-white font-medium">{retryText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// Empty state component
interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export function EmptyState({ icon = 'inbox', title, description, action }: EmptyStateProps) {
  return (
    <View className="flex-1 justify-center items-center p-6">
      <MaterialIcons name={icon as any} size={64} color="#9CA3AF" />
      <Text className="text-xl font-semibold text-gray-900 mt-4 text-center">
        {title}
      </Text>
      {description && (
        <Text className="text-gray-600 mt-2 text-center">
          {description}
        </Text>
      )}
      {action && (
        <TouchableOpacity
          onPress={action.onPress}
          className="bg-blue-600 px-6 py-3 mt-6"
        >
          <Text className="text-white font-semibold">{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
