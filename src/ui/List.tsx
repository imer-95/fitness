import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Card } from './Card';
import { Icon, type IconName } from './Icon';
import { Txt } from './Text';
import { radius, spacing, useTheme, withAlpha } from './theme';

export function Section({
  title,
  action,
  children,
  style,
}: {
  title?: string;
  action?: { label: string; onPress: () => void };
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.section, style]}>
      {title || action ? (
        <View style={styles.sectionHeader}>
          {title ? (
            <Txt variant="title3" style={styles.flex}>
              {title}
            </Txt>
          ) : (
            <View style={styles.flex} />
          )}
          {action ? (
            <Pressable onPress={action.onPress} hitSlop={8} accessibilityRole="button">
              <Txt variant="subhead" color="primary" weight="600">
                {action.label}
              </Txt>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export interface ListRowProps {
  title: string;
  subtitle?: string | null;
  value?: string | null;
  icon?: IconName;
  iconColor?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  right?: ReactNode;
  chevron?: boolean;
  destructive?: boolean;
  numberOfLines?: number;
}

export function ListRow({
  title,
  subtitle,
  value,
  icon,
  iconColor,
  onPress,
  onLongPress,
  right,
  chevron,
  destructive,
  numberOfLines = 1,
}: ListRowProps) {
  const { colors } = useTheme();
  const tint = destructive ? colors.danger : (iconColor ?? colors.primary);
  const content = (
    <View style={styles.row}>
      {icon ? (
        <View style={[styles.iconBox, { backgroundColor: withAlpha(tint, 0.14) }]}>
          <Icon name={icon} size={19} color={tint} />
        </View>
      ) : null}
      <View style={styles.flex}>
        <Txt variant="body" color={destructive ? 'danger' : 'text'} numberOfLines={numberOfLines} weight="500">
          {title}
        </Txt>
        {subtitle ? (
          <Txt variant="footnote" color="textSecondary" numberOfLines={2}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {value ? (
        <Txt variant="callout" color="textSecondary" numberOfLines={1} style={styles.value}>
          {value}
        </Txt>
      ) : null}
      {right}
      {(chevron ?? !!onPress) ? <Icon name="chevron-right" size={20} color={colors.textTertiary} /> : null}
    </View>
  );
  if (!onPress && !onLongPress) return content;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      style={({ pressed }) => [{ backgroundColor: pressed ? colors.surfaceAlt : 'transparent' }]}
    >
      {content}
    </Pressable>
  );
}

/** Card with hairline dividers between its children. */
export function ListGroup({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const items = Children.toArray(children).filter(isValidElement);
  return (
    <Card padded={false} style={[styles.group, style]}>
      {items.map((child, index) => (
        <Fragment key={child.key ?? index}>
          {index > 0 ? <View style={[styles.divider, { backgroundColor: colors.border }]} /> : null}
          {child}
        </Fragment>
      ))}
    </Card>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }, style]} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  section: { gap: spacing.sm + 2 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 54,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: radius.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { maxWidth: '45%' },
  group: { overflow: 'hidden' },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: spacing.lg },
});
