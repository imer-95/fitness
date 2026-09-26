import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { haptics } from '@/services/haptics';

import { Icon, type IconName } from './Icon';
import { Txt } from './Text';
import { radius, spacing, useTheme, withAlpha } from './theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'tinted';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconRight?: IconName;
  disabled?: boolean;
  loading?: boolean;
  full?: boolean;
  /** Accent color for `primary` and `tinted`. */
  color?: string;
  /** Overrides the label/icon color. */
  textColor?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const SIZES: Record<ButtonSize, { height: number; padding: number; font: 'subhead' | 'headline'; icon: number }> = {
  sm: { height: 36, padding: spacing.md, font: 'subhead', icon: 18 },
  md: { height: 46, padding: spacing.lg, font: 'headline', icon: 20 },
  lg: { height: 54, padding: spacing.xl, font: 'headline', icon: 22 },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  disabled,
  loading,
  full,
  color,
  textColor,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const { colors } = useTheme();
  const accent = color ?? (variant === 'danger' ? colors.danger : colors.primary);
  const s = SIZES[size];
  const base = {
    primary: { bg: accent, fg: colors.onPrimary, border: 'transparent' },
    danger: { bg: colors.danger, fg: '#FFFFFF', border: 'transparent' },
    secondary: { bg: colors.surfaceAlt, fg: colors.text, border: 'transparent' },
    ghost: { bg: 'transparent', fg: color ?? colors.primary, border: 'transparent' },
    tinted: { bg: withAlpha(accent, 0.14), fg: accent, border: 'transparent' },
  }[variant];
  const palette = textColor ? { ...base, fg: textColor } : base;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={() => {
        haptics.light();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.base,
        {
          height: s.height,
          paddingHorizontal: s.padding,
          backgroundColor: palette.bg,
          borderColor: palette.border,
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
          alignSelf: full ? 'stretch' : 'auto',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={styles.row}>
          {icon ? <Icon name={icon} size={s.icon} color={palette.fg} /> : null}
          <Txt variant={s.font} color={palette.fg} weight="700" numberOfLines={1}>
            {label}
          </Txt>
          {iconRight ? <Icon name={iconRight} size={s.icon} color={palette.fg} /> : null}
        </View>
      )}
    </Pressable>
  );
}

export interface IconButtonProps {
  icon: IconName;
  onPress?: () => void;
  onLongPress?: () => void;
  size?: number;
  color?: string;
  background?: string;
  accessibilityLabel: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({
  icon,
  onPress,
  onLongPress,
  size = 40,
  color,
  background,
  accessibilityLabel,
  disabled,
  style,
}: IconButtonProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      hitSlop={6}
      onPress={() => {
        haptics.selection();
        onPress?.();
      }}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: background ?? colors.surfaceAlt,
          opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      <Icon name={icon} size={Math.round(size * 0.52)} color={color ?? colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
