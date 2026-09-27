import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { haptics } from '@/services/haptics';

import { Icon, type IconName } from './Icon';
import { Txt } from './Text';
import { radius, spacing, useTheme, withAlpha } from './theme';

export function Chip({
  label,
  selected,
  onPress,
  icon,
  color,
  small,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  color?: string;
  small?: boolean;
}) {
  const { colors } = useTheme();
  const accent = color ?? colors.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={() => {
        haptics.selection();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.chip,
        small && styles.chipSmall,
        {
          backgroundColor: selected ? withAlpha(accent, 0.16) : colors.surfaceAlt,
          borderColor: selected ? accent : 'transparent',
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      {icon ? <Icon name={icon} size={small ? 14 : 16} color={selected ? accent : colors.textSecondary} /> : null}
      <Txt variant={small ? 'caption' : 'subhead'} color={selected ? accent : 'text'} weight={selected ? '700' : '500'}>
        {label}
      </Txt>
    </Pressable>
  );
}

export function ChipRow({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.row, style]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function ChipWrap({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.wrap, style]}>{children}</View>;
}

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  /** Shows a small lock (e.g. Pro features). */
  locked?: boolean;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, dark } = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: colors.surfaceAlt }, style]} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (!active) haptics.selection();
              onChange(o.value);
            }}
            style={[
              styles.segment,
              active && {
                backgroundColor: dark ? colors.surfaceHigh : colors.surface,
                shadowColor: '#000',
                shadowOpacity: dark ? 0 : 0.08,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 1 },
                elevation: dark ? 0 : 1,
              },
            ]}
          >
            <View style={styles.segmentLabel}>
              <Txt
                variant="subhead"
                weight={active ? '700' : '500'}
                color={active ? 'text' : 'textSecondary'}
                numberOfLines={1}
              >
                {o.label}
              </Txt>
              {o.locked ? <Icon name="lock" size={12} color={colors.textTertiary} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  chipSmall: {
    height: 28,
    paddingHorizontal: spacing.sm + 2,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: radius.md,
    padding: 3,
  },
  segment: {
    flex: 1,
    height: 34,
    borderRadius: radius.sm + 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  segmentLabel: { flexDirection: 'row', alignItems: 'center', gap: 3 },
});
