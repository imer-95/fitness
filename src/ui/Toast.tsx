import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToast, type ToastKind } from '@/state/ui';

import { Icon, type IconName } from './Icon';
import { Txt } from './Text';
import { radius, spacing, useTheme } from './theme';

const ICONS: Record<ToastKind, IconName> = {
  info: 'information-outline',
  success: 'check-circle',
  error: 'alert-circle-outline',
  record: 'trophy',
};

/** Renders the current toast at the top of the screen. Mount once per navigation layer. */
export function ToastHost() {
  const current = useToast((s) => s.current);
  const hide = useToast((s) => s.hide);
  const insets = useSafeAreaInsets();
  const { colors, dark } = useTheme();
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.spring(anim, {
      toValue: current ? 1 : 0,
      useNativeDriver: true,
      friction: 8,
      tension: 80,
    }).start();
  }, [current, anim]);

  if (!current) return null;
  const accent =
    current.kind === 'error'
      ? colors.danger
      : current.kind === 'record'
        ? colors.gold
        : current.kind === 'info'
          ? colors.primary
          : colors.success;

  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { paddingTop: insets.top + spacing.sm }]}>
      <Animated.View
        style={[
          styles.toast,
          {
            backgroundColor: dark ? colors.surfaceHigh : colors.text,
            opacity: anim,
            transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }],
          },
        ]}
      >
        <Pressable style={styles.row} onPress={hide} accessibilityRole="alert">
          <Icon name={current.icon ?? ICONS[current.kind]} size={22} color={accent} />
          <View style={styles.flex}>
            <Txt variant="headline" color={dark ? colors.text : colors.background}>
              {current.title}
            </Txt>
            {current.message ? (
              <Txt variant="footnote" color={dark ? colors.textSecondary : colors.surfaceHigh}>
                {current.message}
              </Txt>
            ) : null}
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  toast: {
    marginHorizontal: spacing.lg,
    borderRadius: radius.lg,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    alignSelf: 'center',
    maxWidth: 480,
    width: '92%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
