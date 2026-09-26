import type { ReminderSetting } from '@/domain/types';

/** Web preview: local notifications are not available. */

export function configureNotifications(): void {}

export async function ensureNotificationPermission(): Promise<boolean> {
  return false;
}

export async function scheduleRestEnd(_seconds: number, _label: string | null): Promise<string | null> {
  return null;
}

export async function cancelScheduled(_id: string | null): Promise<void> {}

export async function applyWeightReminder(_setting: ReminderSetting): Promise<boolean> {
  return false;
}
