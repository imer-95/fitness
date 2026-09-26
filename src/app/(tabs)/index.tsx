import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { computeWeightStats } from '@/components/body/WeightChart';
import { NutritionSummary } from '@/components/nutrition/NutritionSummary';
import { WaterCard } from '@/components/nutrition/WaterCard';
import { WorkoutSessionRow } from '@/components/SessionRows';
import { listWeights, upsertWeight } from '@/db/repos/body';
import { listFoodEntries } from '@/db/repos/nutrition';
import { activityByDay, weeklyTraining } from '@/db/repos/stats';
import { listWorkoutSummaries, workoutTimestamps } from '@/db/repos/workouts';
import { useQuery } from '@/db/useQuery';
import {
  addDays,
  formatDateLong,
  greeting,
  startOfDayMs,
  startOfWeek,
  toDateKey,
  todayKey,
  WEEKDAYS_MONDAY_FIRST,
} from '@/domain/dates';
import { formatNumber, formatSigned, formatVolume, parseDecimal, toInputValue } from '@/domain/format';
import { sumMacros } from '@/domain/nutrition';
import type { WeightEntry } from '@/domain/types';
import { weeklyStreak } from '@/domain/stats';
import { startEmptyWorkout } from '@/features/workoutActions';
import { haptics } from '@/services/haptics';
import { useActiveWorkout } from '@/state/activeWorkout';
import { useSettings } from '@/state/settings';
import { toast } from '@/state/ui';
import { Button, IconButton } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Sparkline } from '@/ui/charts/Sparkline';
import { NumberField } from '@/ui/Fields';
import { Icon } from '@/ui/Icon';
import { ListGroup } from '@/ui/List';
import { LargeHeader, Screen } from '@/ui/Screen';
import { Txt } from '@/ui/Text';
import { radius, spacing, useTheme, withAlpha } from '@/ui/theme';

export default function TodayScreen() {
  const { colors } = useTheme();
  const today = todayKey();
  const name = useSettings((s) => s.profile.name);
  const goals = useSettings((s) => s.goals);
  const active = useActiveWorkout((s) => s.draft);

  const weights = useQuery(() => listWeights(addDays(today, -90), today), [today], ['weights']);
  const food = useQuery(() => listFoodEntries(today), [today], ['food_entries']);
  const week = useQuery(
    async () => {
      const weekStart = startOfWeek(today);
      const [days, buckets, stamps, last] = await Promise.all([
        activityByDay(weekStart, addDays(weekStart, 6)),
        weeklyTraining(1, today),
        workoutTimestamps(startOfDayMs(addDays(today, -7 * 60))),
        listWorkoutSummaries({ limit: 1 }),
      ]);
      return {
        weekStart,
        days,
        bucket: buckets[0],
        workoutDays: stamps.map((t) => toDateKey(t)),
        last: last[0] ?? null,
      };
    },
    [today],
    ['workouts', 'cardio', 'exercises'],
  );

  const totals = useMemo(() => sumMacros(food.data ?? []), [food.data]);
  const streak = week.data ? weeklyStreak(week.data.workoutDays, goals.workoutsPerWeek, today) : 0;
  const workoutsThisWeek = week.data?.bucket.workouts ?? 0;

  return (
    <Screen safeTop>
      <LargeHeader
        eyebrow={formatDateLong(today)}
        title={`${greeting()}${name ? `, ${name}` : ''}!`}
        right={
          <IconButton
            icon="cog-outline"
            accessibilityLabel="Einstellungen"
            onPress={() => router.push('/(tabs)/profile')}
          />
        }
      />

      {!active ? (
        <View style={styles.quick}>
          <QuickAction icon="dumbbell" label="Training" color={colors.strength} onPress={startEmptyWorkout} />
          <QuickAction icon="run" label="Cardio" color={colors.cardio} onPress={() => router.push('/cardio/edit')} />
          <QuickAction
            icon="food-apple"
            label="Essen"
            color={colors.carbs}
            onPress={() => router.push({ pathname: '/nutrition/add', params: { date: today } })}
          />
          <QuickAction
            icon="scale-bathroom"
            label="Gewicht"
            color={colors.weight}
            onPress={() => router.push('/body/weight')}
          />
        </View>
      ) : null}

      <WeightCard entries={weights.data ?? []} targetWeight={goals.targetWeight} />

      <Card style={styles.gap} onPress={() => router.push('/(tabs)/nutrition')} accessibilityLabel="Ernährung heute">
        <View style={styles.cardHeader}>
          <Icon name="food-apple" size={20} color={colors.primary} />
          <Txt variant="headline" style={styles.flex}>
            Ernährung heute
          </Txt>
          <Icon name="chevron-right" size={20} color={colors.textTertiary} />
        </View>
        <NutritionSummary totals={totals} goals={goals.nutrition} compact />
      </Card>

      <WaterCard date={today} />

      <Card style={styles.gap} onPress={() => router.push('/workout/history')} accessibilityLabel="Diese Woche">
        <View style={styles.cardHeader}>
          <Icon name="calendar-week" size={20} color={colors.strength} />
          <Txt variant="headline" style={styles.flex}>
            Diese Woche
          </Txt>
          {streak > 0 ? (
            <View style={[styles.streak, { backgroundColor: withAlpha(colors.primary, 0.14) }]}>
              <Icon name="fire" size={15} color={colors.primary} />
              <Txt variant="caption" color="primary" weight="800">
                {streak} {streak === 1 ? 'Woche' : 'Wochen'}
              </Txt>
            </View>
          ) : null}
        </View>
        <View style={styles.weekRow}>
          {WEEKDAYS_MONDAY_FIRST.map((label, i) => {
            const day = week.data ? addDays(week.data.weekStart, i) : today;
            const a = week.data?.days.get(day);
            const isToday = day === today;
            const color = a?.strength ? colors.strength : a?.cardio ? colors.cardio : null;
            return (
              <View key={label} style={styles.weekDay}>
                <Txt variant="caption" color={isToday ? 'primary' : 'textTertiary'} weight={isToday ? '800' : '600'}>
                  {label}
                </Txt>
                <View
                  style={[
                    styles.weekDot,
                    {
                      backgroundColor: color ?? colors.surfaceAlt,
                      borderColor: isToday ? colors.primary : 'transparent',
                    },
                  ]}
                >
                  {a?.strength ? (
                    <Icon name="dumbbell" size={14} color="#FFFFFF" />
                  ) : a?.cardio ? (
                    <Icon name="run" size={14} color="#FFFFFF" />
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
        <View style={styles.weekStats}>
          <WeekStat label="Trainings" value={`${workoutsThisWeek}/${goals.workoutsPerWeek}`} />
          <WeekStat label="Volumen" value={formatVolume(week.data?.bucket.volume ?? 0)} />
          <WeekStat label="Cardio" value={`${formatNumber(week.data?.bucket.cardioMinutes ?? 0, 0)} min`} />
        </View>
      </Card>

      {week.data?.last ? (
        <View style={styles.gapSm}>
          <Txt variant="title3">Letztes Training</Txt>
          <ListGroup>
            <WorkoutSessionRow workout={week.data.last} />
          </ListGroup>
        </View>
      ) : (
        <Card tint={withAlpha(colors.weight, 0.1)} style={styles.gap}>
          <Txt variant="headline">Bisher alles in der Notizen-App?</Txt>
          <Txt variant="footnote" color="textSecondary">
            Kopiere deine alten Trainingsnotizen und importiere sie – Übungen, Sätze, Gewichte und Pausen werden
            automatisch erkannt.
          </Txt>
          <Button
            label="Notizen importieren"
            icon="clipboard-text-outline"
            variant="tinted"
            color={colors.weight}
            onPress={() => router.push('/workout/import')}
          />
        </Card>
      )}
    </Screen>
  );
}

function QuickAction({
  icon,
  label,
  color,
  onPress,
}: {
  icon: Parameters<typeof Icon>[0]['name'];
  label: string;
  color: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => {
        haptics.light();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.quickItem, { backgroundColor: colors.surface, opacity: pressed ? 0.8 : 1 }]}
    >
      <View style={[styles.quickIcon, { backgroundColor: withAlpha(color, 0.15) }]}>
        <Icon name={icon} size={22} color={color} />
      </View>
      <Txt variant="caption" weight="700">
        {label}
      </Txt>
    </Pressable>
  );
}

function WeekStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.weekStat}>
      <Txt variant="headline" tabular numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Txt>
      <Txt variant="caption" color="textSecondary">
        {label}
      </Txt>
    </View>
  );
}

function WeightCard({ entries, targetWeight }: { entries: WeightEntry[]; targetWeight: number | null }) {
  const { colors } = useTheme();
  const today = todayKey();
  const [value, setValue] = useState('');
  const stats = computeWeightStats(entries, targetWeight, today);
  const todayEntry = entries.find((e) => e.date === today);
  const last = stats.latest;

  const save = async () => {
    const weight = parseDecimal(value) ?? last?.weight ?? null;
    if (weight == null || weight < 20 || weight > 400) {
      toast('Bitte ein gültiges Gewicht eintragen', { kind: 'error' });
      return;
    }
    await upsertWeight(today, weight);
    await useSettings.getState().refreshAutoNutrition();
    setValue('');
    haptics.success();
    toast(`${formatNumber(weight, 1)} kg gespeichert`, {
      message: 'Weiter so – jeden Tag wiegen macht den Trend genau.',
    });
  };

  return (
    <Card style={styles.gap}>
      <Pressable style={styles.cardHeader} onPress={() => router.push('/body/weight')} accessibilityRole="button">
        <Icon name="scale-bathroom" size={20} color={colors.weight} />
        <Txt variant="headline" style={styles.flex}>
          Körpergewicht
        </Txt>
        <Txt variant="footnote" color="primary" weight="600">
          Verlauf
        </Txt>
        <Icon name="chevron-right" size={20} color={colors.textTertiary} />
      </Pressable>
      {todayEntry ? (
        <View style={styles.weightRow}>
          <View style={styles.flex}>
            <View style={styles.baseline}>
              <Txt variant="number" tabular>
                {formatNumber(todayEntry.weight, 1)}
              </Txt>
              <Txt variant="subhead" color="textSecondary">
                kg heute
              </Txt>
            </View>
            <Txt variant="footnote" color="textSecondary">
              Trend {stats.trend != null ? `${formatNumber(stats.trend, 1)} kg` : '–'}
              {stats.change7 != null ? ` · ${formatSigned(stats.change7, 1)} kg / 7 Tage` : ''}
            </Txt>
            {targetWeight != null && stats.trend != null ? (
              <Txt variant="footnote" color="success">
                Noch {formatNumber(Math.abs(targetWeight - stats.trend), 1)} kg bis zum Ziel (
                {formatNumber(targetWeight, 1)} kg)
              </Txt>
            ) : null}
          </View>
          <Sparkline values={entries.slice(-30).map((e) => e.weight)} width={96} height={48} color={colors.weight} />
        </View>
      ) : (
        <>
          <Txt variant="footnote" color="textSecondary">
            {last
              ? `Zuletzt ${formatNumber(last.weight, 1)} kg – wie viel wiegst du heute?`
              : 'Trag dein heutiges Gewicht ein.'}
          </Txt>
          <View style={styles.weightEntry}>
            <NumberField
              containerStyle={styles.flex}
              value={value}
              onChangeText={setValue}
              unit="kg"
              step={0.1}
              placeholder={last ? toInputValue(last.weight) : '80,0'}
              accessibilityLabel="Heutiges Gewicht"
            />
          </View>
          <Button label="Gewicht speichern" icon="check" onPress={save} color={colors.weight} full />
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: spacing.md },
  gapSm: { gap: spacing.sm },
  quick: { flexDirection: 'row', gap: spacing.sm },
  quickItem: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  quickIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  weekDay: { alignItems: 'center', gap: 6, flex: 1 },
  weekDot: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  weekStats: { flexDirection: 'row', gap: spacing.sm },
  weekStat: { flex: 1, alignItems: 'center' },
  weightRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  baseline: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  weightEntry: { flexDirection: 'row', gap: spacing.sm },
});
