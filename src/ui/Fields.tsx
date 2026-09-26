import { forwardRef, type ReactNode } from 'react';
import {
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { formatNumber, parseDecimal, tidy, toInputValue } from '@/domain/format';
import { haptics } from '@/services/haptics';

import { Icon } from './Icon';
import { Txt } from './Text';
import { noOutline, radius, spacing, useTheme } from './theme';

export const DONE_ACCESSORY_ID = 'formkurve-keyboard-done';

/** "Fertig" bar above the iOS number pad (which has no return key). */
export function KeyboardDoneBar() {
  const { colors } = useTheme();
  if (Platform.OS !== 'ios') return null;
  return (
    <InputAccessoryView nativeID={DONE_ACCESSORY_ID}>
      <View style={[styles.accessory, { backgroundColor: colors.surfaceAlt, borderTopColor: colors.border }]}>
        <Pressable onPress={() => Keyboard.dismiss()} hitSlop={10} accessibilityRole="button">
          <Txt variant="headline" color="primary">
            Fertig
          </Txt>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}

export interface TextFieldProps extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string | null;
  containerStyle?: StyleProp<ViewStyle>;
  right?: ReactNode;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, hint, error, containerStyle, right, style, multiline, ...rest },
  ref,
) {
  const { colors } = useTheme();
  return (
    <View style={[styles.field, containerStyle]}>
      {label ? (
        <Txt variant="subhead" color="textSecondary">
          {label}
        </Txt>
      ) : null}
      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: colors.surfaceAlt,
            borderColor: error ? colors.danger : 'transparent',
            minHeight: multiline ? 96 : 48,
            alignItems: multiline ? 'flex-start' : 'center',
          },
        ]}
      >
        <TextInput
          ref={ref}
          placeholderTextColor={colors.textTertiary}
          multiline={multiline}
          style={[
            styles.input,
            noOutline,
            {
              color: colors.text,
              textAlignVertical: multiline ? 'top' : 'center',
              paddingTop: multiline ? spacing.md : 0,
            },
            style,
          ]}
          {...rest}
        />
        {right}
      </View>
      {error ? (
        <Txt variant="caption" color="danger">
          {error}
        </Txt>
      ) : hint ? (
        <Txt variant="caption" color="textTertiary">
          {hint}
        </Txt>
      ) : null}
    </View>
  );
});

export interface NumberFieldProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  unit?: string;
  placeholder?: string;
  /** Allow decimals (German comma). */
  decimal?: boolean;
  /** Shows − / + buttons that change the value by `step`. */
  step?: number;
  min?: number;
  max?: number;
  hint?: string;
  error?: string | null;
  autoFocus?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  large?: boolean;
  accessibilityLabel?: string;
}

export function NumberField({
  label,
  value,
  onChangeText,
  unit,
  placeholder,
  decimal = true,
  step,
  min,
  max,
  hint,
  error,
  autoFocus,
  containerStyle,
  large,
  accessibilityLabel,
}: NumberFieldProps) {
  const { colors } = useTheme();
  const change = (delta: number) => {
    const current = parseDecimal(value) ?? parseDecimal(placeholder) ?? 0;
    let next = tidy(current + delta, 3);
    if (min != null) next = Math.max(min, next);
    if (max != null) next = Math.min(max, next);
    haptics.selection();
    onChangeText(toInputValue(next, decimal ? 2 : 0));
  };
  return (
    <View style={[styles.field, containerStyle]}>
      {label ? (
        <Txt variant="subhead" color="textSecondary">
          {label}
        </Txt>
      ) : null}
      <View style={styles.numberRow}>
        {step ? (
          <StepButton icon="minus" onPress={() => change(-step)} label={`${label ?? 'Wert'} verringern`} />
        ) : null}
        <View
          style={[
            styles.inputWrap,
            styles.flex,
            {
              backgroundColor: colors.surfaceAlt,
              borderColor: error ? colors.danger : 'transparent',
              minHeight: large ? 64 : 48,
            },
          ]}
        >
          <TextInput
            value={value}
            onChangeText={(t) => onChangeText(t.replace(decimal ? /[^0-9.,-]/g : /[^0-9-]/g, ''))}
            keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
            inputAccessoryViewID={Platform.OS === 'ios' ? DONE_ACCESSORY_ID : undefined}
            placeholder={placeholder}
            placeholderTextColor={colors.textTertiary}
            autoFocus={autoFocus}
            selectTextOnFocus
            accessibilityLabel={accessibilityLabel ?? label}
            style={[
              styles.input,
              noOutline,
              styles.numberInput,
              { color: colors.text, fontSize: large ? 30 : 18, fontWeight: large ? '800' : '600' },
            ]}
          />
          {unit ? (
            <Txt variant={large ? 'title3' : 'subhead'} color="textSecondary" style={styles.unit}>
              {unit}
            </Txt>
          ) : null}
        </View>
        {step ? <StepButton icon="plus" onPress={() => change(step)} label={`${label ?? 'Wert'} erhöhen`} /> : null}
      </View>
      {error ? (
        <Txt variant="caption" color="danger">
          {error}
        </Txt>
      ) : hint ? (
        <Txt variant="caption" color="textTertiary">
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

function StepButton({ icon, onPress, label }: { icon: 'minus' | 'plus'; onPress: () => void; label: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.stepButton, { backgroundColor: colors.surfaceAlt, opacity: pressed ? 0.7 : 1 }]}
    >
      <Icon name={icon} size={22} color={colors.text} />
    </Pressable>
  );
}

/** Read-only display of a value in field style (opens a picker on press). */
export function PressableField({
  label,
  value,
  placeholder,
  onPress,
  icon,
}: {
  label?: string;
  value: string | null;
  placeholder?: string;
  onPress: () => void;
  icon?: Parameters<typeof Icon>[0]['name'];
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      {label ? (
        <Txt variant="subhead" color="textSecondary">
          {label}
        </Txt>
      ) : null}
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.inputWrap,
          styles.pressableField,
          { backgroundColor: colors.surfaceAlt, borderColor: 'transparent', opacity: pressed ? 0.75 : 1 },
        ]}
      >
        {icon ? <Icon name={icon} size={20} color={colors.textSecondary} style={styles.fieldIcon} /> : null}
        <Txt variant="body" color={value ? 'text' : 'textTertiary'} style={styles.flex} numberOfLines={1}>
          {value ?? placeholder ?? ''}
        </Txt>
        <Icon name="chevron-down" size={20} color={colors.textTertiary} />
      </Pressable>
    </View>
  );
}

export function formatOptional(value: number | null | undefined, decimals = 1): string {
  return value == null ? '' : formatNumber(value, decimals);
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  field: { gap: spacing.xs + 2 },
  inputWrap: {
    flexDirection: 'row',
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    paddingVertical: 0,
    minHeight: 44,
  },
  numberInput: {
    fontVariant: ['tabular-nums'],
  },
  numberRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'stretch',
  },
  unit: { alignSelf: 'center', marginLeft: spacing.xs },
  stepButton: {
    width: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldIcon: { marginRight: spacing.sm },
  pressableField: { minHeight: 48, alignItems: 'center' },
  accessory: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
