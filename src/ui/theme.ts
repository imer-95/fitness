import { Platform, useColorScheme, type TextStyle } from 'react-native';

import { useSettings } from '@/state/settings';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  surfaceHigh: string;
  border: string;
  borderStrong: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  primary: string;
  primaryPressed: string;
  primarySoft: string;
  onPrimary: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  warningSoft: string;
  gold: string;
  goldSoft: string;
  protein: string;
  carbs: string;
  fat: string;
  water: string;
  weight: string;
  cardio: string;
  strength: string;
  tabBar: string;
  overlay: string;
}

const light: ThemeColors = {
  background: '#F3F4F7',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF0F4',
  surfaceHigh: '#E3E6EB',
  border: '#E3E6EB',
  borderStrong: '#CBD0D8',
  text: '#11141A',
  textSecondary: '#5A616E',
  textTertiary: '#939AA6',
  primary: '#FF5B2E',
  primaryPressed: '#E54A1F',
  primarySoft: '#FFEAE3',
  onPrimary: '#FFFFFF',
  success: '#16A34A',
  successSoft: '#DDF7E6',
  danger: '#DC2626',
  dangerSoft: '#FDE4E4',
  warning: '#D97706',
  warningSoft: '#FEF3C7',
  gold: '#D99A00',
  goldSoft: '#FFF3CC',
  protein: '#3B82F6',
  carbs: '#F59E0B',
  fat: '#EC4899',
  water: '#0EA5E9',
  weight: '#7C5CFF',
  cardio: '#10B981',
  strength: '#FF5B2E',
  tabBar: '#FFFFFF',
  overlay: 'rgba(10,12,16,0.45)',
};

const dark: ThemeColors = {
  background: '#0B0C0F',
  surface: '#16181D',
  surfaceAlt: '#1F2229',
  surfaceHigh: '#2A2E37',
  border: '#252931',
  borderStrong: '#3A3F4A',
  text: '#F3F4F6',
  textSecondary: '#A4AAB6',
  textTertiary: '#6B7280',
  primary: '#FF6A3D',
  primaryPressed: '#FF835C',
  primarySoft: '#3A1E14',
  onPrimary: '#FFFFFF',
  success: '#22C55E',
  successSoft: '#10301E',
  danger: '#F87171',
  dangerSoft: '#3B1717',
  warning: '#FBBF24',
  warningSoft: '#3A2E0F',
  gold: '#FACC15',
  goldSoft: '#3A3210',
  protein: '#60A5FA',
  carbs: '#FBBF24',
  fat: '#F472B6',
  water: '#38BDF8',
  weight: '#A78BFA',
  cardio: '#34D399',
  strength: '#FF6A3D',
  tabBar: '#111317',
  overlay: 'rgba(0,0,0,0.6)',
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

export interface Theme {
  dark: boolean;
  colors: ThemeColors;
}

export const LIGHT_THEME: Theme = { dark: false, colors: light };
export const DARK_THEME: Theme = { dark: true, colors: dark };

export function useTheme(): Theme {
  const system = useColorScheme();
  const preference = useSettings((s) => s.prefs.theme);
  const isDark = preference === 'system' ? system === 'dark' : preference === 'dark';
  return isDark ? DARK_THEME : LIGHT_THEME;
}

/** Adds an alpha channel to a #RRGGBB color. */
export function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}

/** Font for SVG text (the web preview would otherwise fall back to a serif font). */
export const CHART_FONT =
  Platform.OS === 'web' ? 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' : undefined;

/** Removes the browser focus ring of text inputs in the web preview. */
export const noOutline: TextStyle = Platform.OS === 'web' ? { outlineWidth: 0 } : {};
