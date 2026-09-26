import { create } from 'zustand';

import type { CardioType } from '@/domain/types';

/** Stopwatch for live cardio sessions. Kept outside the screen so it survives closing it. */
interface CardioTimerState {
  type: CardioType;
  startedAt: number | null;
  runningSince: number | null;
  accumulatedMs: number;
  setType: (type: CardioType) => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
}

export const useCardioTimer = create<CardioTimerState>((set, get) => ({
  type: 'running',
  startedAt: null,
  runningSince: null,
  accumulatedMs: 0,
  setType: (type) => set({ type }),
  start() {
    const now = Date.now();
    set((s) => ({ runningSince: now, startedAt: s.startedAt ?? now }));
  },
  pause() {
    const { runningSince, accumulatedMs } = get();
    if (!runningSince) return;
    set({ runningSince: null, accumulatedMs: accumulatedMs + (Date.now() - runningSince) });
  },
  reset() {
    set({ startedAt: null, runningSince: null, accumulatedMs: 0 });
  },
}));

export function elapsedMs(state: Pick<CardioTimerState, 'runningSince' | 'accumulatedMs'>, now: number): number {
  return state.accumulatedMs + (state.runningSince ? now - state.runningSince : 0);
}
