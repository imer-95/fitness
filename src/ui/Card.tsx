import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius, spacing, useTheme } from './theme';

export interface CardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  onLongPress?: () => void;
  padded?: boolean;
  /** Background tint (e.g. a soft accent color). */
  tint?: string;
  accessibilityLabel?: string;
}

export function Card({ children, style, onPress, onLongPress, padded = true, tint, accessibilityLabel }: CardProps) {
  const { colors, dark } = useTheme();
  const base: ViewStyle = {
    backgroundColor: tint ?? colors.surface,
    borderRadius: radius.xl,
    padding: padded ? spacing.lg : 0,
    borderWidth: dark ? StyleSheet.hairlineWidth : 0,
    borderColor: colors.border,
    ...(dark || tint
      ? null
      : Platform.select<ViewStyle>({
          ios: { shadowColor: '#1B2230', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
          android: { elevation: 1 },
          default: { boxShadow: '0 4px 14px rgba(27,34,48,0.07)' },
        })),
  };
  if (!onPress && !onLongPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [base, pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }, style]}
    >
      {children}
    </Pressable>
  );
}
