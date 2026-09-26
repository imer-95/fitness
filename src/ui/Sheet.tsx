import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptics } from '@/services/haptics';

import { Icon, type IconName } from './Icon';
import { Txt } from './Text';
import { radius, spacing, useTheme, withAlpha } from './theme';

/** Simple bottom sheet built on the RN modal. */
export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  scroll = true,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  scroll?: boolean;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]}
          onPress={onClose}
          accessibilityLabel="Schließen"
        />
        <View style={styles.spacer} pointerEvents="none" />
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom, spacing.lg) },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.borderStrong }]} />
          {title ? (
            <View style={styles.header}>
              <Txt variant="title3" style={styles.flex}>
                {title}
              </Txt>
              <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Schließen">
                <Icon name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>
          ) : null}
          {scroll ? (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
          ) : (
            <View style={styles.content}>{children}</View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export interface SelectOption<T> {
  value: T;
  label: string;
  description?: string;
  icon?: IconName;
  color?: string;
  destructive?: boolean;
}

export function SelectSheet<T>({
  visible,
  onClose,
  title,
  options,
  value,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: readonly SelectOption<T>[];
  value?: T;
  onSelect: (value: T) => void;
}) {
  const { colors } = useTheme();
  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      <View style={styles.options}>
        {options.map((o, i) => {
          const selected = value !== undefined && o.value === value;
          const tint = o.destructive ? colors.danger : (o.color ?? colors.primary);
          return (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => {
                haptics.selection();
                onClose();
                onSelect(o.value);
              }}
              style={({ pressed }) => [
                styles.option,
                { backgroundColor: selected ? withAlpha(tint, 0.12) : pressed ? colors.surfaceAlt : 'transparent' },
              ]}
            >
              {o.icon ? <Icon name={o.icon} size={22} color={tint} /> : null}
              <View style={styles.flex}>
                <Txt variant="body" weight={selected ? '700' : '500'} color={o.destructive ? 'danger' : 'text'}>
                  {o.label}
                </Txt>
                {o.description ? (
                  <Txt variant="footnote" color="textSecondary">
                    {o.description}
                  </Txt>
                ) : null}
              </View>
              {selected ? <Icon name="check" size={22} color={tint} /> : null}
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  spacer: { flex: 1 },
  sheet: {
    borderTopLeftRadius: radius.xl + 4,
    borderTopRightRadius: radius.xl + 4,
    paddingTop: spacing.sm,
    maxHeight: '88%',
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },
  scroll: { flexGrow: 0 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, gap: spacing.md },
  options: { gap: 2 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
});
