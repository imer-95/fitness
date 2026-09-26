import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { computeWeightStats, WEIGHT_RANGES, WeightChart, type WeightRange } from '@/components/body/WeightChart';
import { prValueText } from '@/components/workout/WorkoutDetails';
import { listMeasurements, listWeights } from '@/db/repos/body';
import { listCardio } from '@/db/repos/cardio';
import { listExercises } from '@/db/repos/exercises';
import { dailyNutrition, waterRange } from '@/db/repos/nutrition';
import { activityByDay, analyzeTrainingHistory, muscleSetCounts, weeklyTraining } from '@/db/repos/stats';
import { countWorkouts } from '@/db/repos/workouts';
import { useQuery } from '@/db/useQuery';
import { bmi, bmiCategory } from '@/domain/body';
import {
  addDays,
  eachDay,
  formatDateMedium,
  formatDateShort,
  formatDayMonth,
  formatDuration,
  splitKey,
  startOfDayMs,
  todayKey,
  WEEKDAYS_SHORT,
  weekday,
} from '@/domain/dates';
import { formatNumber, formatSigned, formatVolume } from '@/domain/format';
import { CARDIO_LABELS, MEASUREMENT_LABELS, MUSCLE_LABELS } from '@/domain/labels';
import type { CardioType, MeasurementType } from '@/domain/types';
import { useSettings } from '@/state/settings';
import { Card } from '@/ui/Card';
import { BarChart } from '@/ui/charts/BarChart';
import { ActivityHeatmap } from '@/ui/charts/Heatmap';
import { Sparkline } from '@/ui/charts/Sparkline';
import { Segmented } from '@/ui/Chips';
import { EmptyState, ProgressBar, StatGrid, StatTile } from '@/ui/Feedback';
import { Icon } from '@/ui/Icon';
import { CARDIO_ICONS } from '@/ui/icons';
import { ListGroup, ListRow, Section } from '@/ui/List';
import { LargeHeader, Screen } from '@/ui/Screen';
import { Txt } from '@/ui/Text';
import { spacing, useTheme } from '@/ui/theme';

type Tab = 'body' | 'strength' | 'cardio' | 'nutrition';

export default function ProgressScreen() {
  const [tab, setTab] = useState<Tab>('body');
  return (
    <Screen safeTop>
      <LargeHeader title="Fortschritt" subtitle="Deine Entwicklung auf einen Blick" />
      <Segmented<Tab>
        options={[
          { value: 'body', label: 'Körper' },
          { value: 'strength', label: 'Kraft' },
          { value: 'cardio', label: 'Cardio' },
          { value: 'nutrition', label: 'Essen' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'body' ? (
        <BodyTab />
      ) : tab === 'strength' ? (
        <StrengthTab />
      ) : tab === 'cardio' ? (
        <CardioTab />
      ) : (
        <NutritionTab />
      )}
    </Screen>
  );
}

function weekLabel(weekStart: string): string {
  const [, m, d] = splitKey(weekStart);
  return `${d}.${m}.`;
}

// ---------------------------------------------------------------------------

function BodyTab() {
  const { colors } = useTheme();
  const targetWeight = useSettings((s) => s.goals.targetWeight);
  const heightCm = useSettings((s) => s.profile.heightCm);
  const [range, setRange] = useState<WeightRange>('90');
  const weights = useQuery(() => listWeights(), [], ['weights']);
  const measurements = useQuery(listMeasurements, [], ['measurements']);
  const entries = useMemo(() => weights.data ?? [], [weights.data]);
  const stats = computeWeightStats(entries, targetWeight);
  const bmiValue = bmi(stats.trend, heightCm);

  const latestMeasurements = useMemo(() => {
    const map = new Map<MeasurementType, { first: number; last: number; values: number[] }>();
    for (const m of measurements.data ?? []) {
      const e = map.get(m.type);
      if (e) {
        e.last = m.value;
        e.values.push(m.value);
      } else map.set(m.type, { first: m.value, last: m.value, values: [m.value] });
    }
    return map;
  }, [measurements.data]);

  if (weights.data && entries.length === 0) {
    return (
      <Card>
        <EmptyState
          icon="scale-bathroom"
          title="Noch keine Gewichtsdaten"
          message="Trag täglich dein Gewicht ein – hier siehst du dann Trend, Wochenrate und Prognose."
          action={{ label: 'Gewicht eintragen', icon: 'plus', onPress: () => router.push('/body/weight') }}
        />
      </Card>
    );
  }

  return (
    <>
      <Card style={styles.gap}>
        <View style={styles.headerRow}>
          <View style={styles.flex}>
            <Txt variant="overline" color="textSecondary">
              Aktueller Trend
            </Txt>
            <View style={styles.baseline}>
              <Txt variant="numberLarge" tabular>
                {stats.trend != null ? formatNumber(stats.trend, 1) : '–'}
              </Txt>
              <Txt variant="headline" color="textSecondary">
                kg
              </Txt>
            </View>
          </View>
          {stats.change30 != null ? (
            <View style={styles.right}>
              <Txt variant="title3" color={stats.change30 <= 0 ? 'success' : 'warning'} tabular>
                {formatSigned(stats.change30, 1)} kg
              </Txt>
              <Txt variant="caption" color="textSecondary">
                in 30 Tagen
              </Txt>
            </View>
          ) : null}
        </View>
        <Segmented<WeightRange> options={WEIGHT_RANGES} value={range} onChange={setRange} />
        <WeightChart entries={entries} range={range} targetWeight={targetWeight} />
      </Card>

      <StatGrid>
        <StatTile
          label="Pro Woche"
          value={stats.ratePerWeek != null ? formatSigned(stats.ratePerWeek, 2) : '–'}
          unit="kg"
          icon="speedometer"
          color={colors.weight}
        />
        <StatTile
          label="Seit Beginn"
          value={stats.start && stats.trend != null ? formatSigned(stats.trend - stats.start.weight, 1) : '–'}
          unit="kg"
          icon="flag-outline"
          sub={stats.start ? `seit ${formatDateMedium(stats.start.date)}` : null}
        />
        {targetWeight != null ? (
          <StatTile
            label="Ziel"
            value={formatNumber(targetWeight, 1)}
            unit="kg"
            icon="flag-checkered"
            color={colors.success}
            sub={stats.goalDate ? `Prognose: ${formatDateShort(stats.goalDate)}` : 'Prognose bei stabilem Trend'}
          />
        ) : null}
        {bmiValue != null ? (
          <StatTile label="BMI" value={formatNumber(bmiValue, 1)} icon="human" sub={bmiCategory(bmiValue)} />
        ) : null}
      </StatGrid>

      <Section title="Körpermaße" action={{ label: 'Eintragen', onPress: () => router.push('/body/measurements') }}>
        {latestMeasurements.size === 0 ? (
          <Card>
            <EmptyState
              compact
              icon="tape-measure"
              title="Noch keine Maße"
              message="Taille, Brust, Arme … zeigen Fortschritte, die die Waage nicht sieht."
            />
          </Card>
        ) : (
          <ListGroup>
            {[...latestMeasurements.entries()].map(([type, m]) => (
              <View key={type} style={styles.measureRow}>
                <Txt variant="callout" style={styles.flex}>
                  {MEASUREMENT_LABELS[type]}
                </Txt>
                <Sparkline values={m.values} width={64} height={24} color={colors.weight} />
                <Txt variant="footnote" color="textSecondary" style={styles.delta} tabular>
                  {m.values.length > 1 ? formatSigned(m.last - m.first, 1) : ''}
                </Txt>
                <Txt variant="headline" tabular>
                  {formatNumber(m.last, 1)} cm
                </Txt>
              </View>
            ))}
          </ListGroup>
        )}
      </Section>
      <ListGroup>
        <ListRow
          title="Alle Gewichtseinträge"
          icon="format-list-bulleted"
          iconColor={colors.weight}
          onPress={() => router.push('/body/weight')}
        />
      </ListGroup>
    </>
  );
}

// ---------------------------------------------------------------------------

function StrengthTab() {
  const { colors } = useTheme();
  const today = todayKey();
  const [metric, setMetric] = useState<'volume' | 'workouts'>('volume');
  const workoutsGoal = useSettings((s) => s.goals.workoutsPerWeek);
  const data = useQuery(
    async () => {
      const [analysis, weeks, days, muscles, total, exercises] = await Promise.all([
        analyzeTrainingHistory(),
        weeklyTraining(12, today),
        activityByDay(addDays(today, -7 * 17), today),
        muscleSetCounts(startOfDayMs(addDays(today, -29)), Date.now()),
        countWorkouts(),
        listExercises({ includeArchived: true }),
      ]);
      return { analysis, weeks, days, muscles, total, exercises: new Map(exercises.map((e) => [e.id, e])) };
    },
    [today],
    ['workouts', 'exercises', 'cardio'],
  );

  if (!data.data) return null;
  const { analysis, weeks, days, muscles, total, exercises } = data.data;
  if (total === 0) {
    return (
      <Card>
        <EmptyState
          icon="dumbbell"
          title="Noch keine Trainings"
          message="Nach deinem ersten Training siehst du hier Volumen, Rekorde, Muskelverteilung und deine Trainingstage."
          action={{
            label: 'Notizen importieren',
            icon: 'clipboard-text-outline',
            onPress: () => router.push('/workout/import'),
          }}
        />
      </Card>
    );
  }

  const heat = new Map<string, number>();
  for (const [day, a] of days) heat.set(day, a.strength + a.cardio);
  const muscleList = [...muscles.entries()].sort((a, b) => b[1] - a[1]);
  const maxSets = Math.max(1, ...muscleList.map(([, n]) => n));
  const topExercises = [...analysis.progress.values()]
    .sort((a, b) => b.sessions - a.sessions || b.lastAt - a.lastAt)
    .slice(0, 8);
  const last4 = weeks.slice(-4);

  return (
    <>
      <StatGrid>
        <StatTile label="Trainings gesamt" value={String(total)} icon="dumbbell" color={colors.strength} />
        <StatTile
          label="Letzte 4 Wochen"
          value={String(last4.reduce((n, w) => n + w.workouts, 0))}
          icon="calendar-month"
        />
        <StatTile
          label="Volumen (4 Wo.)"
          value={formatVolume(last4.reduce((n, w) => n + w.volume, 0)).replace(' kg', '')}
          unit="kg"
          icon="weight"
        />
        <StatTile label="Rekorde gesamt" value={String(analysis.prs.length)} icon="trophy" color={colors.gold} />
      </StatGrid>

      <Card style={styles.gap}>
        <View style={styles.headerRow}>
          <Txt variant="headline" style={styles.flex}>
            Pro Woche
          </Txt>
        </View>
        <Segmented
          options={[
            { value: 'volume', label: 'Volumen (kg)' },
            { value: 'workouts', label: 'Trainings' },
          ]}
          value={metric}
          onChange={setMetric}
        />
        <BarChart
          data={weeks.map((w) => ({
            label: weekLabel(w.weekStart),
            value: metric === 'volume' ? w.volume : w.workouts,
          }))}
          color={colors.strength}
          goal={metric === 'workouts' ? workoutsGoal : null}
          formatValue={(v) =>
            metric === 'volume'
              ? v >= 1000
                ? `${formatNumber(v / 1000, 1)}t`
                : formatNumber(v, 0)
              : formatNumber(v, 0)
          }
        />
      </Card>

      <Card style={styles.gap}>
        <Txt variant="headline">Trainingstage</Txt>
        <ActivityHeatmap weeks={17} values={heat} color={colors.strength} />
      </Card>

      {muscleList.length > 0 ? (
        <Card style={styles.gap}>
          <Txt variant="headline">Sätze pro Muskelgruppe</Txt>
          <Txt variant="caption" color="textSecondary">
            Arbeitssätze der letzten 30 Tage
          </Txt>
          {muscleList.map(([muscle, n]) => (
            <View key={muscle} style={styles.muscleRow}>
              <Txt variant="footnote" style={styles.muscleLabel} numberOfLines={1}>
                {MUSCLE_LABELS[muscle]}
              </Txt>
              <ProgressBar value={n / maxSets} color={colors.strength} height={10} style={styles.flex} />
              <Txt variant="footnote" weight="700" style={styles.muscleValue} tabular>
                {n}
              </Txt>
            </View>
          ))}
        </Card>
      ) : null}

      <Section title="Neueste Rekorde">
        {analysis.prs.length === 0 ? (
          <Card>
            <EmptyState
              compact
              icon="trophy-outline"
              title="Noch keine Rekorde"
              message="Rekorde entstehen, sobald du ein Gewicht oder eine Wiederholungszahl übertriffst."
            />
          </Card>
        ) : (
          <ListGroup>
            {analysis.prs.slice(0, 8).map((pr, i) => (
              <ListRow
                key={i}
                icon="trophy"
                iconColor={colors.gold}
                title={exercises.get(pr.exerciseId)?.name ?? 'Übung'}
                subtitle={`${prValueText(pr)} · ${formatDateMedium(pr.date)}`}
                onPress={() => router.push({ pathname: '/exercises/[id]', params: { id: pr.exerciseId } })}
              />
            ))}
          </ListGroup>
        )}
      </Section>

      <Section title="Deine Übungen" action={{ label: 'Alle', onPress: () => router.push('/exercises') }}>
        <ListGroup>
          {topExercises.map((p) => {
            const ex = exercises.get(p.exerciseId);
            const series = p.series.map((s) => s.value);
            const first = series[0];
            const last = series[series.length - 1];
            const unit = ex?.tracking === 'reps' ? 'Wdh.' : ex?.tracking === 'time' ? 's' : 'kg';
            return (
              <Pressable
                key={p.exerciseId}
                onPress={() => router.push({ pathname: '/exercises/[id]', params: { id: p.exerciseId } })}
                style={({ pressed }) => [
                  styles.exerciseRow,
                  { backgroundColor: pressed ? colors.surfaceAlt : 'transparent' },
                ]}
              >
                <View style={styles.flex}>
                  <Txt variant="callout" weight="600" numberOfLines={1}>
                    {ex?.name ?? 'Übung'}
                  </Txt>
                  <Txt variant="caption" color="textSecondary">
                    {p.sessions}× trainiert
                    {last != null
                      ? ` · ${ex?.tracking === 'weight_reps' ? '1RM ' : 'best '}${formatNumber(last, 1)} ${unit}`
                      : ''}
                    {series.length > 1 && first ? ` (${formatSigned(((last - first) / first) * 100, 0)} %)` : ''}
                  </Txt>
                </View>
                {series.length > 1 ? (
                  <Sparkline values={series.slice(-12)} width={72} height={30} color={colors.strength} />
                ) : null}
                <Icon name="chevron-right" size={18} color={colors.textTertiary} />
              </Pressable>
            );
          })}
        </ListGroup>
      </Section>
    </>
  );
}

// ---------------------------------------------------------------------------

function CardioTab() {
  const { colors } = useTheme();
  const today = todayKey();
  const data = useQuery(
    async () => {
      const [weeks, sessions] = await Promise.all([
        weeklyTraining(12, today),
        listCardio({ fromMs: startOfDayMs(addDays(today, -89)) }),
      ]);
      return { weeks, sessions };
    },
    [today],
    ['cardio', 'workouts'],
  );
  if (!data.data) return null;
  const { weeks, sessions } = data.data;
  if (sessions.length === 0 && weeks.every((w) => w.cardioMinutes === 0)) {
    return (
      <Card>
        <EmptyState
          icon="run"
          title="Noch kein Cardio"
          message="Laufen, Radfahren, Crosstrainer … trag deine Einheiten ein und sieh hier deine Wochenminuten."
          action={{ label: 'Cardio eintragen', icon: 'plus', onPress: () => router.push('/cardio/edit') }}
        />
      </Card>
    );
  }
  const byType = new Map<CardioType, { count: number; seconds: number; km: number; kcal: number }>();
  for (const s of sessions) {
    const e = byType.get(s.type) ?? { count: 0, seconds: 0, km: 0, kcal: 0 };
    e.count++;
    e.seconds += s.durationSec;
    e.km += s.distanceKm ?? 0;
    e.kcal += s.kcal ?? 0;
    byType.set(s.type, e);
  }
  const totalSeconds = sessions.reduce((n, s) => n + s.durationSec, 0);
  const totalKm = sessions.reduce((n, s) => n + (s.distanceKm ?? 0), 0);
  const totalKcal = sessions.reduce((n, s) => n + (s.kcal ?? 0), 0);

  return (
    <>
      <StatGrid>
        <StatTile label="Einheiten (90 T)" value={String(sessions.length)} icon="run" color={colors.cardio} />
        <StatTile label="Zeit (90 T)" value={formatDuration(totalSeconds)} icon="timer-outline" />
        <StatTile label="Distanz (90 T)" value={formatNumber(totalKm, 1)} unit="km" icon="map-marker-distance" />
        <StatTile
          label="Kalorien (90 T)"
          value={formatNumber(totalKcal, 0)}
          unit="kcal"
          icon="fire"
          color={colors.primary}
        />
      </StatGrid>
      <Card style={styles.gap}>
        <Txt variant="headline">Cardio-Minuten pro Woche</Txt>
        <BarChart
          data={weeks.map((w) => ({ label: weekLabel(w.weekStart), value: Math.round(w.cardioMinutes) }))}
          color={colors.cardio}
          goal={150}
          formatValue={(v) => formatNumber(v, 0)}
        />
        <Txt variant="caption" color="textTertiary">
          Gestrichelt: 150 Minuten pro Woche – die Empfehlung der WHO für moderate Ausdaueraktivität.
        </Txt>
      </Card>
      <Section title="Nach Aktivität (90 Tage)">
        <ListGroup>
          {[...byType.entries()]
            .sort((a, b) => b[1].seconds - a[1].seconds)
            .map(([type, e]) => (
              <ListRow
                key={type}
                icon={CARDIO_ICONS[type]}
                iconColor={colors.cardio}
                title={CARDIO_LABELS[type]}
                subtitle={`${e.count}× · ${formatDuration(e.seconds)}${e.km > 0 ? ` · ${formatNumber(e.km, 1)} km` : ''}`}
                value={e.kcal > 0 ? `${formatNumber(e.kcal, 0)} kcal` : undefined}
              />
            ))}
        </ListGroup>
      </Section>
    </>
  );
}

// ---------------------------------------------------------------------------

function NutritionTab() {
  const { colors } = useTheme();
  const goals = useSettings((s) => s.goals);
  const today = todayKey();
  const from = addDays(today, -13);
  const data = useQuery(
    async () => ({ days: await dailyNutrition(from, today), water: await waterRange(from, today) }),
    [from, today],
    ['food_entries', 'water'],
  );
  if (!data.data) return null;
  const { days, water } = data.data;
  const keys = eachDay(from, today);
  const logged = keys.filter((k) => (days.get(k)?.kcal ?? 0) > 0);
  if (logged.length === 0) {
    return (
      <Card>
        <EmptyState
          icon="food-apple-outline"
          title="Noch keine Mahlzeiten"
          message="Sobald du Essen einträgst, siehst du hier Kalorien- und Makro-Durchschnitte."
          action={{
            label: 'Essen eintragen',
            icon: 'plus',
            onPress: () => router.push({ pathname: '/nutrition/add', params: { date: today } }),
          }}
        />
      </Card>
    );
  }
  const last7 = keys.slice(-7).filter((k) => (days.get(k)?.kcal ?? 0) > 0);
  const avg = (key: 'kcal' | 'protein' | 'carbs' | 'fat') =>
    last7.length ? last7.reduce((n, k) => n + (days.get(k)?.[key] ?? 0), 0) / last7.length : 0;
  const onTarget = logged.filter(
    (k) => Math.abs((days.get(k)?.kcal ?? 0) - goals.nutrition.kcal) <= goals.nutrition.kcal * 0.1,
  ).length;
  const waterAvg = keys.slice(-7).reduce((n, k) => n + (water.get(k) ?? 0), 0) / 7;

  return (
    <>
      <StatGrid>
        <StatTile
          label="Ø kcal (7 Tage)"
          value={formatNumber(avg('kcal'), 0)}
          unit={`/ ${formatNumber(goals.nutrition.kcal, 0)}`}
          icon="fire"
          color={colors.primary}
        />
        <StatTile
          label="Ø Eiweiß (7 Tage)"
          value={formatNumber(avg('protein'), 0)}
          unit={`/ ${goals.nutrition.protein} g`}
          icon="food-drumstick"
          color={colors.protein}
        />
        <StatTile
          label="Tage im Zielbereich"
          value={`${onTarget}/${logged.length}`}
          icon="target"
          color={colors.success}
          sub="±10 % vom Kalorienziel"
        />
        <StatTile
          label="Ø Wasser (7 Tage)"
          value={formatNumber(waterAvg / 1000, 1)}
          unit="l"
          icon="cup-water"
          color={colors.water}
        />
      </StatGrid>
      <Card style={styles.gap}>
        <Txt variant="headline">Kalorien – letzte 14 Tage</Txt>
        <BarChart
          data={keys.map((k) => ({
            label: WEEKDAYS_SHORT[weekday(k)],
            value: Math.round(days.get(k)?.kcal ?? 0),
            color: (days.get(k)?.kcal ?? 0) > goals.nutrition.kcal * 1.1 ? colors.danger : colors.primary,
          }))}
          goal={goals.nutrition.kcal}
          formatValue={(v) => formatNumber(v, 0)}
        />
        <Txt variant="caption" color="textTertiary">
          {formatDayMonth(from)} – {formatDayMonth(today)} · gestrichelt: dein Kalorienziel
        </Txt>
      </Card>
      <Card style={styles.gap}>
        <Txt variant="headline">Ø Makros (7 Tage)</Txt>
        {(
          [
            ['Eiweiß', 'protein', colors.protein, goals.nutrition.protein],
            ['Kohlenhydrate', 'carbs', colors.carbs, goals.nutrition.carbs],
            ['Fett', 'fat', colors.fat, goals.nutrition.fat],
          ] as const
        ).map(([label, key, color, goal]) => (
          <View key={key} style={styles.muscleRow}>
            <Txt variant="footnote" style={styles.muscleLabel}>
              {label}
            </Txt>
            <ProgressBar value={goal > 0 ? avg(key) / goal : 0} color={color} height={10} style={styles.flex} />
            <Txt variant="footnote" weight="700" style={styles.macroValue} tabular>
              {formatNumber(avg(key), 0)}/{goal} g
            </Txt>
          </View>
        ))}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md },
  baseline: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  right: { alignItems: 'flex-end' },
  measureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  delta: { minWidth: 40, textAlign: 'right' },
  muscleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  muscleLabel: { width: 108 },
  muscleValue: { width: 32, textAlign: 'right' },
  macroValue: { width: 72, textAlign: 'right' },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
