import { create } from 'zustand';

import type { IconName } from '@/ui/Icon';

// ---------------------------------------------------------------------------
// Toasts
// ---------------------------------------------------------------------------

export type ToastKind = 'info' | 'success' | 'error' | 'record';

export interface ToastMessage {
  id: number;
  title: string;
  message?: string;
  kind: ToastKind;
  icon?: IconName;
}

interface ToastState {
  current: ToastMessage | null;
  show: (toast: Omit<ToastMessage, 'id'>, durationMs?: number) => void;
  hide: () => void;
}

let toastId = 0;
let toastTimer: ReturnType<typeof setTimeout> | null = null;

export const useToast = create<ToastState>((set) => ({
  current: null,
  show(toast, durationMs = 2600) {
    const id = ++toastId;
    set({ current: { ...toast, id } });
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      set((s) => (s.current?.id === id ? { current: null } : s));
    }, durationMs);
  },
  hide() {
    set({ current: null });
  },
}));

export const toast = (title: string, options: { message?: string; kind?: ToastKind; icon?: IconName } = {}) =>
  useToast.getState().show({ title, message: options.message, kind: options.kind ?? 'success', icon: options.icon });

// ---------------------------------------------------------------------------
// Exercise picker bridge
// ---------------------------------------------------------------------------

export interface ExercisePickRequest {
  title: string;
  multi: boolean;
  /** Pre-selected exercise ids. */
  selected?: string[];
  onPick: (ids: string[]) => void;
}

interface PickerState {
  request: ExercisePickRequest | null;
  open: (request: ExercisePickRequest) => void;
  clear: () => void;
}

/**
 * The exercise library doubles as a picker. The caller registers a callback
 * here and navigates to `/exercises?pick=1`.
 */
export const useExercisePicker = create<PickerState>((set) => ({
  request: null,
  open: (request) => set({ request }),
  clear: () => set({ request: null }),
}));
