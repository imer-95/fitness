import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { listExercises } from '@/db/repos/exercises';
import {
  buildImportPlan,
  importWorkouts,
  type ImportExercisePlan,
  type ImportWorkoutPlan,
} from '@/db/repos/importNotes';
import { useQuery } from '@/db/useQuery';
import { formatRest, todayKey } from '@/domain/dates';
import { formatNumber } from '@/domain/format';
import { MUSCLE_LABELS, MUSCLE_ORDER } from '@/domain/labels';
import { normalizeName, parseWorkoutNotes, type ParseIssue } from '@/domain/notes';
import { SIDE_SHORT, weightAnnotation } from '@/domain/strength';
import type { MuscleGroup } from '@/domain/types';
import { haptics } from '@/services/haptics';
import { toast, useExercisePicker } from '@/state/ui';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Chip, ChipWrap } from '@/ui/Chips';
import { DateField } from '@/ui/DatePicker';
import { notify } from '@/ui/dialogs';
import { TextField } from '@/ui/Fields';
import { Badge } from '@/ui/Feedback';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';
import { BottomSheet } from '@/ui/Sheet';
import { Txt } from '@/ui/Text';
import { Toggle } from '@/ui/Toggle';
import { radius, spacing, useTheme, withAlpha } from '@/ui/theme';

const EXAMPLE = `Training 25.09.
Brust, Bizeps, Bauch

Schräg-Brustmaschine
10x40kg inkl. Stange
120sek Pause
10x50kg inkl. Stange

Kabel Crossover von unten
10x15kg pro Seite
60sek Pause
12x15kg pro Seite

Dipbarren Bauchmuskel
12x
60sek Pause
12x

Rudern
10x links
60sek Pause
10x rechts`;

function setsSummary(e: ImportExercisePlan): string {
  const parts = e.parsed.sets.map((s) => {
    const side = s.side ? ` ${SIDE_SHORT[s.side]}` : '';
    if (s.durationSec != null && s.reps == null) return `${s.durationSec}s${side}`;
    if (s.weight != null) return `${s.reps}×${formatNumber(s.weight, 2)}${side}`;
    return `${s.reps}×${side}`;
  });
  return parts.join(', ');
}

export default function ImportScreen() {
  const { colors } = useTheme();
  const [text, setText] = useState('');
  const [plans, setPlans] = useState<ImportWorkoutPlan[] | null>(null);
  const [issues, setIssues] = useState<ParseIssue[]>([]);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [rememberAliases, setRememberAliases] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<{ plan: string; index: number } | null>(null);
  const exercises = useQuery(() => listExercises({ includeArchived: true }), [], ['exercises']);
  const exerciseMap = useMemo(() => new Map((exercises.data ?? []).map((e) => [e.id, e])), [exercises.data]);

  const analyze = async () => {
    const result = parseWorkoutNotes(text);
    if (result.workouts.length === 0) {
      await notify(
        'Nichts erkannt',
        'Es wurden keine Übungen mit Sätzen gefunden. Jede Übung braucht einen Namen und darunter Zeilen wie „10x40kg“.',
      );
      return;
    }
    setBusy(true);
    try {
      const built = await buildImportPlan(result, todayKey());
      setPlans(built);
      setIssues(result.issues);
      // Only pre-deselect likely duplicates: same day and same title.
      setExcluded(
        built
          .filter((p) => p.existing.some((e) => normalizeName(e.title) === normalizeName(p.title)))
          .map((p) => p.key),
      );
      haptics.success();
    } finally {
      setBusy(false);
    }
  };

  const paste = async () => {
    const value = await Clipboard.getStringAsync();
    if (!value) {
      toast('Die Zwischenablage ist leer', { kind: 'info' });
      return;
    }
    setText(value);
  };

  const updatePlan = (key: string, fn: (p: ImportWorkoutPlan) => ImportWorkoutPlan) =>
    setPlans((list) => list?.map((p) => (p.key === key ? fn(p) : p)) ?? null);

  const updateExercise = (key: string, index: number, patch: Partial<ImportExercisePlan>) =>
    updatePlan(key, (p) => ({ ...p, exercises: p.exercises.map((e, i) => (i === index ? { ...e, ...patch } : e)) }));

  const pickFor = (key: string, index: number) => {
    setEditing(null);
    useExercisePicker.getState().open({
      title: 'Übung zuordnen',
      multi: false,
      onPick: ([id]) => id && updateExercise(key, index, { exerciseId: id, match: 'manual' }),
    });
    router.push({ pathname: '/exercises', params: { pick: '1' } });
  };

  const selected = (plans ?? []).filter((p) => !excluded.includes(p.key));

  const runImport = async () => {
    if (selected.length === 0) return;
    setBusy(true);
    try {
      const ids = await importWorkouts(selected, { rememberAliases });
      haptics.success();
      toast(ids.length === 1 ? 'Training importiert' : `${ids.length} Trainings importiert`, {
        message: 'Tipp: Speichere es als Plan für dein nächstes Training.',
      });
      router.back();
      if (ids.length === 1) router.push({ pathname: '/workout/[id]', params: { id: ids[0] } });
      else router.push('/workout/history');
    } catch (e) {
      await notify('Import fehlgeschlagen', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (!plans) {
    return (
      <Screen
        keyboard
        footer={
          <Button
            label="Weiter zur Vorschau"
            icon="arrow-right"
            size="lg"
            full
            disabled={!text.trim()}
            loading={busy}
            onPress={analyze}
          />
        }
      >
        <Card tint={withAlpha(colors.weight, 0.1)} style={styles.gap}>
          <View style={styles.row}>
            <Icon name="clipboard-text-outline" size={24} color={colors.weight} />
            <Txt variant="headline" style={styles.flex}>
              Deine Notizen übernehmen
            </Txt>
          </View>
          <Txt variant="callout" color="textSecondary">
            Kopiere deine Trainingsnotizen (z. B. aus der Notizen-App) und füge sie hier ein – mehrere Trainings auf
            einmal sind möglich. Formkurve erkennt Datum, Übungen, Sätze, Gewichte, Pausen, „pro Seite“, „inkl./exkl.
            Stange“ und links/rechts.
          </Txt>
        </Card>
        <View style={styles.actions}>
          <Button label="Einfügen" icon="content-paste" variant="secondary" style={styles.flex} onPress={paste} />
          <Button
            label="Beispiel"
            icon="text-box-outline"
            variant="secondary"
            style={styles.flex}
            onPress={() => setText(EXAMPLE)}
          />
        </View>
        <TextField
          value={text}
          onChangeText={setText}
          placeholder={'Training 25.09.\nBrust, Bizeps, Bauch\n\nButterfly\n8x55kg\n90sek Pause\n8x45kg'}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.textArea}
        />
      </Screen>
    );
  }

  const editingPlan = editing ? plans.find((p) => p.key === editing.plan) : null;
  const editingExercise = editingPlan ? editingPlan.exercises[editing!.index] : null;

  return (
    <Screen
      footer={
        <>
          <View style={styles.switchRow}>
            <Txt variant="footnote" color="textSecondary" style={styles.flex}>
              Namen merken (für den nächsten Import)
            </Txt>
            <Toggle value={rememberAliases} onValueChange={setRememberAliases} />
          </View>
          <Button
            label={selected.length === 1 ? 'Training importieren' : `${selected.length} Trainings importieren`}
            icon="check"
            size="lg"
            full
            disabled={selected.length === 0}
            loading={busy}
            onPress={runImport}
          />
        </>
      }
    >
      <Button
        label="Text bearbeiten"
        icon="arrow-left"
        variant="ghost"
        size="sm"
        onPress={() => setPlans(null)}
        style={styles.back}
      />

      {plans.map((plan) => {
        const isExcluded = excluded.includes(plan.key);
        return (
          <Card key={plan.key} style={[styles.gap, isExcluded && styles.dimmed]}>
            <View style={styles.row}>
              <Txt variant="title3" style={styles.flex}>
                {plan.exercises.length} Übungen · {plan.exercises.reduce((n, e) => n + e.parsed.sets.length, 0)} Sätze
              </Txt>
              <Toggle
                value={!isExcluded}
                onValueChange={(on) =>
                  setExcluded((list) => (on ? list.filter((k) => k !== plan.key) : [...list, plan.key]))
                }
                accessibilityLabel="Training importieren"
              />
            </View>
            {plan.existing.length > 0 ? (
              <View style={[styles.warning, { backgroundColor: colors.warningSoft }]}>
                <Icon name="alert-circle-outline" size={18} color={colors.warning} />
                <Txt variant="footnote" style={styles.flex}>
                  An diesem Tag gibt es bereits „{plan.existing[0].title}“. Wurde es schon importiert?
                </Txt>
              </View>
            ) : null}
            <DateField
              label="Datum"
              value={plan.date}
              maxDate={todayKey()}
              onChange={(d) => updatePlan(plan.key, (p) => ({ ...p, date: d }))}
            />
            <TextField
              label="Titel"
              value={plan.title}
              onChangeText={(t) => updatePlan(plan.key, (p) => ({ ...p, title: t }))}
            />
            {plan.exercises.map((e, index) => {
              const target = e.exerciseId ? exerciseMap.get(e.exerciseId) : null;
              const annotation = weightAnnotation(e.parsed);
              return (
                <Pressable
                  key={index}
                  onPress={() => setEditing({ plan: plan.key, index })}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.exercise,
                    { backgroundColor: pressed ? colors.surfaceHigh : colors.surfaceAlt },
                  ]}
                >
                  <View style={styles.row}>
                    <Txt variant="subhead" weight="700" style={styles.flex} numberOfLines={1}>
                      {e.parsed.name}
                    </Txt>
                    <Badge
                      label={
                        e.match === 'new'
                          ? 'Neu'
                          : e.match === 'fuzzy'
                            ? 'Ähnlich'
                            : e.match === 'manual'
                              ? 'Gewählt'
                              : 'Erkannt'
                      }
                      color={e.match === 'new' ? colors.warning : e.match === 'fuzzy' ? colors.protein : colors.success}
                    />
                  </View>
                  <View style={styles.row}>
                    <Icon name="arrow-right-bottom" size={16} color={colors.textTertiary} />
                    <Txt variant="footnote" color={target ? 'text' : 'warning'} style={styles.flex} numberOfLines={1}>
                      {target ? target.name : `Neue Übung · ${MUSCLE_LABELS[e.newExercise.muscle]}`}
                    </Txt>
                    <Icon name="pencil-outline" size={16} color={colors.textTertiary} />
                  </View>
                  <Txt variant="caption" color="textSecondary" numberOfLines={2}>
                    {e.parsed.sets.length} Sätze: {setsSummary(e)}
                    {e.parsed.tracking === 'weight_reps' ? ' kg' : ''}
                    {annotation ? ` · ${annotation}` : ''}
                    {e.parsed.restSec ? ` · Pause ${formatRest(e.parsed.restSec)}` : ''}
                  </Txt>
                </Pressable>
              );
            })}
            {plan.notes ? (
              <Txt variant="footnote" color="textSecondary">
                Notizen: {plan.notes}
              </Txt>
            ) : null}
          </Card>
        );
      })}

      {issues.length > 0 ? (
        <Card style={styles.gap}>
          <Txt variant="headline">Nicht erkannte Zeilen</Txt>
          {issues.map((issue, i) => (
            <Txt key={i} variant="footnote" color="textSecondary">
              Zeile {issue.line}: „{issue.text}“ – {issue.reason}
            </Txt>
          ))}
        </Card>
      ) : null}

      <BottomSheet visible={!!editingExercise} onClose={() => setEditing(null)} title={editingExercise?.parsed.name}>
        {editing && editingExercise ? (
          <View style={styles.gap}>
            <Button
              label="Übung aus Bibliothek wählen"
              icon="book-open-variant"
              variant="secondary"
              full
              onPress={() => pickFor(editing.plan, editing.index)}
            />
            <Txt variant="headline">…oder als neue Übung anlegen</Txt>
            <TextField
              label="Name"
              value={editingExercise.newExercise.name}
              onChangeText={(t) =>
                updateExercise(editing.plan, editing.index, {
                  newExercise: { ...editingExercise.newExercise, name: t },
                })
              }
            />
            <Txt variant="subhead" color="textSecondary">
              Muskelgruppe
            </Txt>
            <ChipWrap>
              {MUSCLE_ORDER.map((m: MuscleGroup) => (
                <Chip
                  key={m}
                  small
                  label={MUSCLE_LABELS[m]}
                  selected={!editingExercise.exerciseId && editingExercise.newExercise.muscle === m}
                  onPress={() =>
                    updateExercise(editing.plan, editing.index, {
                      exerciseId: null,
                      match: 'new',
                      newExercise: { ...editingExercise.newExercise, muscle: m },
                    })
                  }
                />
              ))}
            </ChipWrap>
            <Button
              label="Als neue Übung importieren"
              icon="plus"
              full
              onPress={() => {
                updateExercise(editing.plan, editing.index, { exerciseId: null, match: 'new' });
                setEditing(null);
              }}
            />
          </View>
        ) : null}
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.md },
  textArea: { minHeight: 280, fontFamily: undefined, fontSize: 15, lineHeight: 21 },
  back: { alignSelf: 'flex-start' },
  dimmed: { opacity: 0.55 },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  exercise: { borderRadius: radius.md, padding: spacing.md, gap: 4 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
