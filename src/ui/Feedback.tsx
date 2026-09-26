import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Txt } from './Text';
import { radius, spacing, useTheme, withAlpha } from './theme';

export function EmptyState({
  icon,
  title,
  message,
  action,
  compact,
}: {
  icon: IconName;
  title: string;
  message?: string;
  action?: { label: string; onPress: () => void; icon?: IconName };
  compact?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.empty, compact && styles.emptyCompact]}>
      <View style={[styles.emptyIcon, { backgroundColor: withAlpha(colors.primary, 0.12) }]}>
        <Icon name={icon} size={30} color={colors.primary} />
      </View>
      <Txt variant="headline" align="center">
        {title}
      </Txt>
      {message ? (
        <Txt variant="footnote" color="textSecondary" align="center" style={styles.emptyMessage}>
          {message}
        </Txt>
      ) : null}
      {action ? (
        <Button label={action.label} icon={action.icon} onPress={action.onPress} size="sm" variant="tinted" />
      ) : null}
    </View>
  );
}

export function ProgressBar({
  value,
  color,
  height = 8,
  style,
}: {
  value: number;
  color?: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const accent = color ?? colors.primary;
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  return (
    <View
      style={[
        { height, borderRadius: height / 2, backgroundColor: withAlpha(accent, 0.16), overflow: 'hidden' },
        style,
      ]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
    >
      <View style={{ width: `${clamped * 100}%`, height, borderRadius: height / 2, backgroundColor: accent }} />
    </View>
  );
}

export function Badge({ label, color, icon }: { label: string; color?: string; icon?: IconName }) {
  const { colors } = useTheme();
  const accent = color ?? colors.primary;
  return (
    <View style={[styles.badge, { backgroundColor: withAlpha(accent, 0.15) }]}>
      {icon ? <Icon name={icon} size={12} color={accent} /> : null}
      <Txt variant="caption" color={accent} weight="700">
        {label}
      </Txt>
    </View>
  );
}

export function StatTile({
  label,
  value,
  unit,
  sub,
  subColor,
  icon,
  color,
  third,
  style,
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: string | null;
  subColor?: string;
  icon?: IconName;
  color?: string;
  /** Three tiles per row instead of two. */
  third?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.tile, third && styles.tileThird, { backgroundColor: colors.surfaceAlt }, style]}>
      <View style={styles.tileHeader}>
        {icon ? <Icon name={icon} size={15} color={color ?? colors.textSecondary} /> : null}
        <Txt variant="caption" color="textSecondary" numberOfLines={1} style={styles.flex}>
          {label}
        </Txt>
      </View>
      <View style={styles.tileValue}>
        <Txt variant="title2" tabular numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Txt>
        {unit ? (
          <Txt variant="footnote" color="textSecondary">
            {unit}
          </Txt>
        ) : null}
      </View>
      {sub ? (
        <Txt variant="caption" color={subColor ?? 'textSecondary'} numberOfLines={1}>
          {sub}
        </Txt>
      ) : null}
    </View>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

export function Loading({ label }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.primary} />
      {label ? (
        <Txt variant="footnote" color="textSecondary">
          {label}
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyCompact: { paddingVertical: spacing.xl },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyMessage: { maxWidth: 320, marginBottom: spacing.sm },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 2,
  },
  tileThird: { flexBasis: '30%' },
  tileHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  tileValue: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  loading: { padding: spacing.xxxl, alignItems: 'center', gap: spacing.sm },
});
