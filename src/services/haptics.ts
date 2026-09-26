import * as Haptics from 'expo-haptics';
import { Platform, Vibration } from 'react-native';

const enabled = Platform.OS === 'ios' || Platform.OS === 'android';

function run(task: () => Promise<void>) {
  if (!enabled) return;
  task().catch(() => undefined);
}

/** Tactile feedback helpers (no-ops on the web). */
export const haptics = {
  selection: () => run(() => Haptics.selectionAsync()),
  light: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
  /** Strong pattern for the end of a rest period. */
  alarm: () => {
    if (!enabled) return;
    if (Platform.OS === 'android') Vibration.vibrate([0, 350, 150, 350]);
    else run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
  },
};
