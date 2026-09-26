import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatClock } from '@/domain/dates';
import { useNow } from '@/hooks/useNow';
import { haptics } from '@/services/haptics';
import { useRestTimer } from '@/state/restTimer';
import { useSettings } from '@/state/settings';
import { Ring } from '@/ui/charts/Ring';
import { Icon } from '@/ui/Icon';
import { Txt } from '@/ui/Text';
import { radius, spacing, useTheme } from '@/ui/theme';

/** Floating rest timer at the bottom of the workout screen. */
export function RestTimerBar() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { endAt, duration, label, adjust, stop } = useRestTimer();
  const vibrate = useSettings((s) => s.prefs.restVibration);
  const now = useNow(250, endAt != null);
  const alarmed = useRef<number | null>(null);
  const [finishedLabel, setFinishedLabel] = useState<string | null>(null);

  const remaining = endAt ? Math.max(0, (endAt - now) / 1000) : 0;

  useEffect(() => {
    if (!endAt || remaining > 0 || alarmed.current === endAt) return;
    alarmed.current = endAt;
    if (vibrate) haptics.alarm();
    setFinishedLabel(label ?? '');
    stop();
  }, [endAt, remaining, vibrate, label, stop]);

  useEffect(() => {
    if (finishedLabel == null) return;
    const t = setTimeout(() => setFinishedLabel(null), 3500);
    return () => clearTimeout(t);
  }, [finishedLabel]);

  if (!endAt && finishedLabel == null) return null;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
      <View style={[styles.bar, { backgroundColor: endAt ? colors.text : colors.success }]}>
        {endAt ? (
          <>
            <Ring
              size={46}
              stroke={5}
              progress={duration > 0 ? remaining / duration : 0}
              color={colors.primary}
              trackColor="rgba(255,255,255,0.18)"
            >
              <Icon name="timer-sand" size={20} color={colors.background} />
            </Ring>
            <View style={styles.flex}>
              <Txt variant="overline" color={colors.surfaceHigh}>
                Pause
              </Txt>
              <Txt variant="title3" color={colors.background} tabular>
                {formatClock(Math.ceil(remaining))}
              </Txt>
            </View>
            <TimerButton label="−15" onPress={() => adjust(-15)} />
            <TimerButton label="+15" onPress={() => adjust(15)} />
            <TimerButton label="Skip" onPress={stop} accent />
          </>
        ) : (
          <View style={styles.flex}>
            <Txt variant="headline" color="#FFFFFF" align="center">
              Pause vorbei – weiter geht&apos;s! 💪
            </Txt>
          </View>
        )}
      </View>
    </View>
  );
}

function TimerButton({ label, onPress, accent }: { label: string; onPress: () => void; accent?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label === 'Skip' ? 'Pause überspringen' : `${label} Sekunden`}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: accent ? colors.primary : 'rgba(255,255,255,0.14)', opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Txt variant="subhead" color="#FFFFFF" weight="700">
        {label}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.md },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.xl,
    padding: spacing.sm + 2,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
    minHeight: 66,
  },
  button: {
    paddingHorizontal: spacing.md,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
