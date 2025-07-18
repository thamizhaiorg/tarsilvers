import React from 'react';
import { View } from 'react-native';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';

interface LayoutWrapperProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
}

export default function LayoutWrapper({ children, sidebar }: LayoutWrapperProps) {
  const { isTablet, isMobile } = useResponsiveLayout();

  if (isMobile) {
    // Mobile: Single column layout
    return (
      <View className="flex-1 bg-gray-50">
        {children}
      </View>
    );
  }

  // Tablet/Desktop: Two column layout with sidebar
  return (
    <View className="flex-1 bg-gray-50 flex-row">
      <View className="flex-1">
        {children}
      </View>
      {sidebar && (
        <View className="w-80 bg-white border-l border-gray-200">
          {sidebar}
        </View>
      )}
    </View>
  );
}