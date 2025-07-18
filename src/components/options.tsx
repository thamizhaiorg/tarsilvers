import React, { useState } from 'react';
import { View, Modal } from 'react-native';
import OptionSetsScreen from '../screens/option-sets';
import OptionSetEditScreen from '../screens/option-set-edit';

type OptionsScreenType = 'list' | 'edit';

interface OptionsState {
  screen: OptionsScreenType;
  selectedSetId?: string;
  selectedSetName?: string;
}

interface OptionsProps {
  onClose?: () => void;
  onOpenMenu?: () => void;
}

export default function Options({ onClose, onOpenMenu }: OptionsProps) {
  const [state, setState] = useState<OptionsState>({
    screen: 'list',
  });

  const navigateToEdit = (setId: string, setName: string) => {
    setState({
      screen: 'edit',
      selectedSetId: setId,
      selectedSetName: setName,
    });
  };

  const navigateToList = () => {
    setState({ screen: 'list' });
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {state.screen === 'list' && (
        <OptionSetsScreen
          onNavigateToEdit={navigateToEdit}
          onClose={onOpenMenu || handleClose}
        />
      )}

      {/* Full screen modal for edit option set */}
      <Modal
        visible={state.screen === 'edit'}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={navigateToList}
      >
        {state.screen === 'edit' && state.selectedSetId && state.selectedSetName && (
          <OptionSetEditScreen
            setId={state.selectedSetId}
            setName={state.selectedSetName}
            onClose={navigateToList}
          />
        )}
      </Modal>
    </View>
  );
}
