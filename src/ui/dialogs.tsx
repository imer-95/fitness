import { Alert, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { create } from 'zustand';

import { Txt } from './Text';
import { radius, spacing, useTheme } from './theme';

/**
 * Cross-platform dialogs. Native platforms use the system alert (always on
 * top, also above modal screens); the web preview renders its own dialog.
 */

export interface DialogButton<T> {
  label: string;
  value: T;
  style?: 'default' | 'cancel' | 'destructive';
}

interface DialogRequest {
  title: string;
  message?: string;
  buttons: DialogButton<unknown>[];
  resolve: (value: unknown) => void;
}

const useDialog = create<{ request: DialogRequest | null }>(() => ({ request: null }));

export function choose<T>(title: string, message: string | undefined, buttons: DialogButton<T>[]): Promise<T | null> {
  return new Promise((resolve) => {
    if (Platform.OS === 'web') {
      useDialog.setState({
        request: {
          title,
          message,
          buttons: buttons as DialogButton<unknown>[],
          resolve: resolve as (v: unknown) => void,
        },
      });
      return;
    }
    Alert.alert(
      title,
      message,
      buttons.map((b) => ({ text: b.label, style: b.style, onPress: () => resolve(b.value) })),
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}

export async function confirm(
  title: string,
  message?: string,
  options: { confirmLabel?: string; destructive?: boolean; cancelLabel?: string } = {},
): Promise<boolean> {
  const result = await choose(title, message, [
    { label: options.cancelLabel ?? 'Abbrechen', value: false, style: 'cancel' },
    { label: options.confirmLabel ?? 'OK', value: true, style: options.destructive ? 'destructive' : 'default' },
  ]);
  return result === true;
}

export async function notify(title: string, message?: string): Promise<void> {
  await choose(title, message, [{ label: 'OK', value: true }]);
}

/** Renders dialogs on the web. Native uses `Alert`. */
export function DialogHost() {
  const request = useDialog((s) => s.request);
  const { colors } = useTheme();
  if (Platform.OS !== 'web' || !request) return null;
  const close = (value: unknown) => {
    useDialog.setState({ request: null });
    request.resolve(value);
  };
  return (
    <Modal transparent visible animationType="fade" onRequestClose={() => close(null)}>
      <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={() => close(null)}>
        <Pressable style={[styles.dialog, { backgroundColor: colors.surface }]} onPress={() => undefined}>
          <Txt variant="title3" align="center">
            {request.title}
          </Txt>
          {request.message ? (
            <Txt variant="callout" color="textSecondary" align="center">
              {request.message}
            </Txt>
          ) : null}
          <View style={styles.buttons}>
            {request.buttons.map((b, i) => (
              <Pressable
                key={i}
                onPress={() => close(b.value)}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.button,
                  {
                    backgroundColor:
                      b.style === 'destructive'
                        ? colors.danger
                        : b.style === 'cancel'
                          ? colors.surfaceAlt
                          : colors.primary,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Txt variant="headline" color={b.style === 'cancel' ? 'text' : '#FFFFFF'} align="center">
                  {b.label}
                </Txt>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  dialog: { width: '100%', maxWidth: 360, borderRadius: radius.xl, padding: spacing.xl, gap: spacing.md },
  buttons: { gap: spacing.sm, marginTop: spacing.sm },
  button: { borderRadius: radius.md, paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
});
