import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Txt } from './Text';
import { spacing, useTheme } from './theme';

export interface ScreenProps {
  children: ReactNode;
  /** Adds the top safe-area inset (screens without a navigation header). */
  safeTop?: boolean;
  scroll?: boolean;
  padded?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  /** Fixed content below the scroll view (e.g. a primary action). */
  footer?: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  keyboard?: boolean;
}

export function Screen({
  children,
  safeTop,
  scroll = true,
  padded = true,
  contentStyle,
  footer,
  refreshing,
  onRefresh,
  keyboard,
}: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const padding: ViewStyle = {
    paddingHorizontal: padded ? spacing.lg : 0,
    paddingTop: (safeTop ? insets.top : 0) + (padded ? spacing.md : 0),
    paddingBottom: footer ? spacing.lg : spacing.xxxl + (safeTop ? 0 : insets.bottom),
    gap: spacing.lg,
  };
  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[padding, contentStyle]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.textSecondary} />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, padding, contentStyle]}>{children}</View>
  );
  const content = (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      {body}
      {footer ? (
        <View
          style={[
            styles.footer,
            {
              paddingBottom: Math.max(insets.bottom, spacing.md),
              borderTopColor: colors.border,
              backgroundColor: colors.background,
            },
          ]}
        >
          {footer}
        </View>
      ) : null}
    </View>
  );
  if (!keyboard || Platform.OS !== 'ios') return content;
  return (
    <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={insets.top + 44}>
      {content}
    </KeyboardAvoidingView>
  );
}

export function LargeHeader({
  title,
  eyebrow,
  subtitle,
  right,
}: {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.flex}>
        {eyebrow ? (
          <Txt variant="overline" color="textSecondary">
            {eyebrow}
          </Txt>
        ) : null}
        <Txt variant="title1" numberOfLines={1} adjustsFontSizeToFit>
          {title}
        </Txt>
        {subtitle ? (
          <Txt variant="subhead" color="textSecondary">
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {right ? <View style={styles.headerRight}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  headerRight: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
});
