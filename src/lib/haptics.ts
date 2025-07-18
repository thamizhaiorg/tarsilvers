import * as Haptics from 'expo-haptics';

/**
 * Haptic feedback utilities for enhanced mobile UX
 */

export const hapticFeedback = {
  /**
   * Light tap feedback for button presses
   */
  light: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },

  /**
   * Medium feedback for important actions
   */
  medium: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  },

  /**
   * Heavy feedback for critical actions
   */
  heavy: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  },

  /**
   * Success feedback for completed actions
   */
  success: () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },

  /**
   * Warning feedback for cautionary actions
   */
  warning: () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  },

  /**
   * Error feedback for failed actions
   */
  error: () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  },

  /**
   * Selection feedback for picker/selector changes
   */
  selection: () => {
    Haptics.selectionAsync();
  }
};

/**
 * Enhanced TouchableOpacity with haptic feedback
 */
export const withHapticFeedback = (
  onPress: () => void,
  feedbackType: keyof typeof hapticFeedback = 'light'
) => {
  return () => {
    hapticFeedback[feedbackType]();
    onPress();
  };
};
