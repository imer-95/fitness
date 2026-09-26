import { create } from 'zustand';

import { getLatestWeight } from '@/db/repos/body';
import { kvGet, kvSet } from '@/db/repos/kv';
import { computeNutritionGoals } from '@/domain/nutrition';
import type { Goals, NutritionGoals, Preferences, Profile } from '@/domain/types';

export interface SettingsData {
  onboarded: boolean;
  profile: Profile;
  goals: Goals;
  prefs: Preferences;
}

export const DEFAULT_SETTINGS: SettingsData = {
  onboarded: false,
  profile: {
    name: '',
    sex: null,
    birthYear: null,
    heightCm: null,
    activity: 'moderate',
    goal: 'maintain',
  },
  goals: {
    targetWeight: null,
    nutrition: { auto: true, kcal: 2200, protein: 150, carbs: 240, fat: 70 },
    waterMl: 2500,
    workoutsPerWeek: 3,
  },
  prefs: {
    theme: 'system',
    defaultRestSec: 90,
    weightStep: 2.5,
    keepAwake: true,
    restVibration: true,
    restNotification: true,
    weightReminder: { enabled: false, hour: 7, minute: 30 },
    defaultBarWeight: 20,
  },
};

const KEY = 'settings';

interface SettingsState extends SettingsData {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setProfile: (patch: Partial<Profile>) => Promise<void>;
  setGoals: (patch: Partial<Omit<Goals, 'nutrition'>>) => Promise<void>;
  setNutritionGoals: (patch: Partial<NutritionGoals>) => Promise<void>;
  setPrefs: (patch: Partial<Preferences>) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  /** Recalculates calorie/macro targets from profile + latest weight (if automatic). */
  refreshAutoNutrition: () => Promise<void>;
}

function merge(stored: Partial<SettingsData> | null): SettingsData {
  const s = stored ?? {};
  return {
    onboarded: s.onboarded ?? DEFAULT_SETTINGS.onboarded,
    profile: { ...DEFAULT_SETTINGS.profile, ...s.profile },
    goals: {
      ...DEFAULT_SETTINGS.goals,
      ...s.goals,
      nutrition: { ...DEFAULT_SETTINGS.goals.nutrition, ...s.goals?.nutrition },
    },
    prefs: {
      ...DEFAULT_SETTINGS.prefs,
      ...s.prefs,
      weightReminder: { ...DEFAULT_SETTINGS.prefs.weightReminder, ...s.prefs?.weightReminder },
    },
  };
}

export const useSettings = create<SettingsState>((set, get) => {
  const persist = async () => {
    const { onboarded, profile, goals, prefs } = get();
    await kvSet(KEY, { onboarded, profile, goals, prefs });
  };

  return {
    ...DEFAULT_SETTINGS,
    hydrated: false,

    async hydrate() {
      const stored = await kvGet<Partial<SettingsData>>(KEY);
      set({ ...merge(stored), hydrated: true });
    },

    async setProfile(patch) {
      set({ profile: { ...get().profile, ...patch } });
      await persist();
      await get().refreshAutoNutrition();
    },

    async setGoals(patch) {
      set({ goals: { ...get().goals, ...patch } });
      await persist();
    },

    async setNutritionGoals(patch) {
      const goals = get().goals;
      set({ goals: { ...goals, nutrition: { ...goals.nutrition, ...patch } } });
      await persist();
      if (patch.auto) await get().refreshAutoNutrition();
    },

    async setPrefs(patch) {
      set({ prefs: { ...get().prefs, ...patch } });
      await persist();
    },

    async completeOnboarding() {
      set({ onboarded: true });
      await persist();
    },

    async refreshAutoNutrition() {
      const { goals, profile } = get();
      if (!goals.nutrition.auto) return;
      const latest = await getLatestWeight();
      const computed = computeNutritionGoals(profile, latest?.weight ?? null);
      if (!computed) return;
      const n = goals.nutrition;
      if (
        n.kcal === computed.kcal &&
        n.protein === computed.protein &&
        n.carbs === computed.carbs &&
        n.fat === computed.fat
      ) {
        return;
      }
      set({ goals: { ...goals, nutrition: computed } });
      await persist();
    },
  };
});

/** Non-reactive access, e.g. inside callbacks. */
export const getSettings = () => useSettings.getState();
