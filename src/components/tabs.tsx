import React from 'react';
import { View } from 'react-native';
import { BottomTab, MainScreen } from './nav';
import WorkspaceContent from './bottom-tabs/work';
import AIContent from './bottom-tabs/ai';
import TasksContent from './bottom-tabs/tasks';
import PeopleContent from './bottom-tabs/people';

interface BottomTabContentProps {
  activeTab: BottomTab;
  currentScreen: MainScreen;
}

export default function BottomTabContent({ activeTab, currentScreen }: BottomTabContentProps) {
  const renderContent = () => {
    switch (activeTab) {
      case 'workspace':
        return <WorkspaceContent currentScreen={currentScreen} />;
      case 'ai':
        return <AIContent currentScreen={currentScreen} />;
      case 'tasks':
        return <TasksContent currentScreen={currentScreen} />;
      case 'people':
        return <PeopleContent currentScreen={currentScreen} />;
      default:
        return <WorkspaceContent currentScreen={currentScreen} />;
    }
  };

  return (
    <View className="flex-1">
      {renderContent()}
    </View>
  );
}
