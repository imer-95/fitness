import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { ReminderSetting } from '@/domain/types';

/**
 * Local notifications: end of the rest timer (also when the phone is locked)
 * and the daily reminder to weigh in. No push/server involved.
 */

const REST_CHANNEL = 'rest-timer';
const REMINDER_CHANNEL = 'reminders';
const WEIGHT_REMINDER_ID = 'weight-reminder';
const supported = Platform.OS === 'ios' || Platform.OS === 'android';

export function configureNotifications(): void {
  if (!supported) return;
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      // While the app is open the rest timer gives in-app feedback instead.
      const isRest = notification.request.content.data?.kind === 'rest';
      return {
        shouldShowBanner: !isRest,
        shouldShowList: !isRest,
        shouldPlaySound: !isRest,
        shouldSetBadge: false,
      };
    },
  });
  if (Platform.OS === 'android') {
    void Notifications.setNotificationChannelAsync(REST_CHANNEL, {
      name: 'Pausen-Timer',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 300, 150, 300],
      sound: 'default',
    });
    void Notifications.setNotificationChannelAsync(REMINDER_CHANNEL, {
      name: 'Erinnerungen',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!supported) return false;
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  } catch {
    return false;
  }
}

export async function scheduleRestEnd(seconds: number, label: string | null): Promise<string | null> {
  if (!supported || seconds <= 0) return null;
  try {
    const granted = (await Notifications.getPermissionsAsync()).granted;
    if (!granted) return null;
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Pause vorbei 💪',
        body: label ? `Weiter geht's mit ${label}.` : "Weiter geht's mit dem nächsten Satz.",
        sound: 'default',
        data: { kind: 'rest' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, Math.round(seconds)),
        channelId: REST_CHANNEL,
      },
    });
  } catch {
    return null;
  }
}

export async function cancelScheduled(id: string | null): Promise<void> {
  if (!supported || !id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // already delivered or unknown
  }
}

/** (Re-)schedules the daily weigh-in reminder. Returns false if permission is missing. */
export async function applyWeightReminder(setting: ReminderSetting): Promise<boolean> {
  if (!supported) return false;
  try {
    await Notifications.cancelScheduledNotificationAsync(WEIGHT_REMINDER_ID);
  } catch {
    // not scheduled yet
  }
  if (!setting.enabled) return true;
  if (!(await ensureNotificationPermission())) return false;
  await Notifications.scheduleNotificationAsync({
    identifier: WEIGHT_REMINDER_ID,
    content: {
      title: 'Zeit fürs Wiegen ⚖️',
      body: 'Trag dein heutiges Gewicht ein – am besten morgens nüchtern.',
      data: { kind: 'weight', url: '/body/weight' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: setting.hour,
      minute: setting.minute,
      channelId: REMINDER_CHANNEL,
    },
  });
  return true;
}
