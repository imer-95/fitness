import { Platform, Switch } from 'react-native';

import { haptics } from '@/services/haptics';

import { useTheme } from './theme';

/** Themed on/off switch. */
export function Toggle({
  value,
  onValueChange,
  accessibilityLabel,
  disabled,
}: {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel?: string;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Switch
      value={value}
      disabled={disabled}
      onValueChange={(v) => {
        haptics.selection();
        onValueChange(v);
      }}
      accessibilityLabel={accessibilityLabel}
      trackColor={{ true: colors.primary, false: colors.surfaceHigh }}
      thumbColor={Platform.OS === 'ios' ? undefined : '#FFFFFF'}
      ios_backgroundColor={colors.surfaceHigh}
      {...(Platform.OS === 'web' ? { activeThumbColor: '#FFFFFF' } : null)}
    />
  );
}
