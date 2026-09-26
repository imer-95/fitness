import { create } from 'zustand';

import { cancelScheduled, scheduleRestEnd } from '@/services/notifications';

import { getSettings } from './settings';

interface RestTimerState {
  /** Timestamp when the rest ends, `null` if no timer runs. */
  endAt: number | null;
  duration: number;
  label: string | null;
  notificationId: string | null;
  start: (seconds: number, label: string | null) => void;
  adjust: (deltaSeconds: number) => void;
  stop: () => void;
}

async function reschedule(get: () => RestTimerState, set: (p: Partial<RestTimerState>) => void) {
  const { notificationId, endAt, label } = get();
  if (notificationId) {
    set({ notificationId: null });
    await cancelScheduled(notificationId);
  }
  if (!endAt || !getSettings().prefs.restNotification) return;
  const seconds = (endAt - Date.now()) / 1000;
  if (seconds < 1) return;
  const id = await scheduleRestEnd(seconds, label);
  // The timer may have been stopped or changed while scheduling.
  if (get().endAt === endAt) set({ notificationId: id });
  else await cancelScheduled(id);
}

/** Rest timer between sets. Based on timestamps so it survives backgrounding. */
export const useRestTimer = create<RestTimerState>((set, get) => ({
  endAt: null,
  duration: 0,
  label: null,
  notificationId: null,

  start(seconds, label) {
    if (seconds <= 0) {
      get().stop();
      return;
    }
    set({ endAt: Date.now() + seconds * 1000, duration: seconds, label });
    void reschedule(get, set);
  },

  adjust(deltaSeconds) {
    const { endAt, duration } = get();
    if (!endAt) return;
    const nextEnd = Math.max(Date.now() + 1000, endAt + deltaSeconds * 1000);
    set({ endAt: nextEnd, duration: Math.max(1, duration + deltaSeconds) });
    void reschedule(get, set);
  },

  stop() {
    const { notificationId } = get();
    set({ endAt: null, notificationId: null });
    void cancelScheduled(notificationId);
  },
}));
