import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { createExercise, deleteExercise, getExercise, updateExercise } from '@/db/repos/exercises';
import { formatRest } from '@/domain/dates';
import { parseDecimal, toInputValue } from '@/domain/format';
import {
  BAR_MODE_LABELS,
  EQUIPMENT_LABELS,
  EQUIPMENT_ORDER,
  MUSCLE_LABELS,
  MUSCLE_ORDER,
  TRACKING_LABELS,
  WEIGHT_MODE_LABELS,
} from '@/domain/labels';
import { guessEquipment, guessMuscle } from '@/domain/notes';
import type { BarMode, Equipment, Exercise, MuscleGroup, TrackingType, WeightMode } from '@/domain/types';
import { useSettings } from '@/state/settings';
import { toast } from '@/state/ui';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Chip, ChipWrap, Segmented } from '@/ui/Chips';
import { confirm } from '@/ui/dialogs';
import { NumberField, TextField } from '@/ui/Fields';
import { Loading } from '@/ui/Feedback';
import { Screen } from '@/ui/Screen';
import { Txt } from '@/ui/Text';
import { Toggle } from '@/ui/Toggle';
import { spacing, useTheme } from '@/ui/theme';

const REST_CHOICES = [45, 60, 90, 120, 150, 180];

interface Form {
  name: string;
  muscle: MuscleGroup;
  equipment: Equipment;
  tracking: TrackingType;
  weightMode: WeightMode;
  barMode: BarMode;
  barWeight: string;
  unilateral: boolean;
  restSeconds: number;
  notes: string;
  aliases: string;
}

function toForm(e: Exercise): Form {
  return {
    name: e.name,
    muscle: e.muscle,
    equipment: e.equipment,
    tracking: e.tracking,
    weightMode: e.weightMode,
    barMode: e.barMode,
    barWeight: toInputValue(e.barWeight),
    unilateral: e.unilateral,
    restSeconds: e.restSeconds,
    notes: e.notes ?? '',
    aliases: e.aliases.join(', '),
  };
}

export default function ExerciseEditScreen() {
  const params = useLocalSearchParams<{ id?: string; name?: string }>();
  const { colors } = useTheme();
  const defaultRest = useSettings((s) => s.prefs.defaultRestSec);
  const [existing, setExisting] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(!!params.id);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Form>(() => ({
    name: params.name ?? '',
    muscle: params.name ? guessMuscle(params.name) : 'chest',
    equipment: params.name ? guessEquipment(params.name) : 'machine',
    tracking: 'weight_reps',
    weightMode: 'total',
    barMode: 'none',
    barWeight: '',
    unilateral: false,
    restSeconds: defaultRest,
    notes: '',
    aliases: '',
  }));

  useEffect(() => {
    if (!params.id) return;
    let cancelled = false;
    void getExercise(params.id).then((e) => {
      if (cancelled) return;
      if (e) {
        setExisting(e);
        setForm(toForm(e));
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    const name = form.name.trim();
    if (!name) {
      toast('Bitte einen Namen eingeben', { kind: 'error' });
      return;
    }
    setSaving(true);
    const values = {
      name,
      muscle: form.muscle,
      equipment: form.equipment,
      tracking: form.tracking,
      weightMode: form.weightMode,
      barMode: form.barMode,
      barWeight: form.barMode === 'none' ? null : parseDecimal(form.barWeight),
      unilateral: form.unilateral,
      restSeconds: form.restSeconds,
      notes: form.notes.trim() || null,
      aliases: form.aliases
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean),
    };
    try {
      if (existing) {
        await updateExercise(existing.id, values);
        toast('Übung gespeichert');
        router.back();
      } else {
        const created = await createExercise({ ...values, isCustom: true });
        toast('Übung angelegt');
        router.replace({ pathname: '/exercises/[id]', params: { id: created.id } });
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!existing) return;
    const ok = await confirm(
      existing.isCustom ? 'Übung löschen?' : 'Übung ausblenden?',
      'Übungen mit Trainingsverlauf werden archiviert und bleiben im Verlauf sichtbar.',
      { confirmLabel: existing.isCustom ? 'Löschen' : 'Ausblenden', destructive: true },
    );
    if (!ok) return;
    const result = await deleteExercise(existing.id);
    toast(result === 'deleted' ? 'Übung gelöscht' : 'Übung archiviert');
    router.dismissAll();
  };

  if (loading) return <Loading />;

  return (
    <Screen keyboard footer={<Button label="Speichern" icon="check" size="lg" full loading={saving} onPress={save} />}>
      <Stack.Screen options={{ title: existing ? 'Übung bearbeiten' : 'Neue Übung' }} />
      <TextField
        label="Name"
        value={form.name}
        onChangeText={(t) => set('name', t)}
        placeholder="z. B. Schrägbankdrücken"
        autoFocus={!existing}
      />

      <Card style={styles.gap}>
        <Txt variant="headline">Muskelgruppe</Txt>
        <ChipWrap>
          {MUSCLE_ORDER.map((m) => (
            <Chip
              key={m}
              label={MUSCLE_LABELS[m]}
              selected={form.muscle === m}
              onPress={() => set('muscle', m)}
              small
            />
          ))}
        </ChipWrap>
        <Txt variant="headline">Ausrüstung</Txt>
        <ChipWrap>
          {EQUIPMENT_ORDER.map((e) => (
            <Chip
              key={e}
              label={EQUIPMENT_LABELS[e]}
              selected={form.equipment === e}
              onPress={() => set('equipment', e)}
              small
            />
          ))}
        </ChipWrap>
      </Card>

      <Card style={styles.gap}>
        <Txt variant="headline">Erfassung</Txt>
        <Segmented<TrackingType>
          options={[
            { value: 'weight_reps', label: 'kg × Wdh.' },
            { value: 'reps', label: 'Nur Wdh.' },
            { value: 'time', label: 'Zeit' },
          ]}
          value={form.tracking}
          onChange={(v) => set('tracking', v)}
        />
        <Txt variant="caption" color="textTertiary">
          {TRACKING_LABELS[form.tracking]}
          {form.tracking === 'reps'
            ? ' – z. B. Klimmzüge, Dips, Beinheben'
            : form.tracking === 'time'
              ? ' – z. B. Plank'
              : ''}
        </Txt>
        {form.tracking === 'weight_reps' ? (
          <>
            <Txt variant="subhead" color="textSecondary">
              Gewichtsangabe
            </Txt>
            <Segmented<WeightMode>
              options={[
                { value: 'total', label: WEIGHT_MODE_LABELS.total },
                { value: 'per_side', label: WEIGHT_MODE_LABELS.per_side },
              ]}
              value={form.weightMode}
              onChange={(v) => set('weightMode', v)}
            />
            <Txt variant="subhead" color="textSecondary">
              Stange
            </Txt>
            <Segmented<BarMode>
              options={[
                { value: 'none', label: 'Keine' },
                { value: 'included', label: BAR_MODE_LABELS.included },
                { value: 'excluded', label: BAR_MODE_LABELS.excluded },
              ]}
              value={form.barMode}
              onChange={(v) => set('barMode', v)}
            />
            {form.barMode === 'excluded' ? (
              <NumberField
                label="Gewicht der Stange"
                unit="kg"
                value={form.barWeight}
                onChangeText={(t) => set('barWeight', t)}
                placeholder="z. B. 10"
                hint="Wird fürs Trainingsvolumen addiert. Leer lassen, wenn unbekannt."
              />
            ) : null}
            <Txt variant="caption" color="textTertiary">
              Beispiel deiner Notizen: „12x10kg pro Seite exkl. Stange“ → Pro Seite + Exkl. Stange.
            </Txt>
          </>
        ) : null}
        <View style={styles.switchRow}>
          <View style={styles.flex}>
            <Txt variant="body" weight="500">
              Einseitig (links/rechts)
            </Txt>
            <Txt variant="caption" color="textSecondary">
              Sätze werden pro Seite erfasst, z. B. einarmiges Rudern.
            </Txt>
          </View>
          <Toggle value={form.unilateral} onValueChange={(v) => set('unilateral', v)} />
        </View>
      </Card>

      <Card style={styles.gap}>
        <Txt variant="headline">Standard-Pause</Txt>
        <ChipWrap>
          {REST_CHOICES.map((s) => (
            <Chip
              key={s}
              label={formatRest(s)}
              selected={form.restSeconds === s}
              onPress={() => set('restSeconds', s)}
              small
            />
          ))}
        </ChipWrap>
      </Card>

      <TextField
        label="Notizen"
        value={form.notes}
        onChangeText={(t) => set('notes', t)}
        placeholder="Einstellungen, Technik-Hinweise …"
        multiline
      />
      <TextField
        label="Alternative Namen"
        value={form.aliases}
        onChangeText={(t) => set('aliases', t)}
        placeholder="z. B. Brustmaschine, Chest Press"
        hint="Kommagetrennt. Wird beim Import aus Notizen zum Erkennen genutzt."
        autoCapitalize="words"
      />

      {existing ? (
        <Button
          label={existing.isCustom ? 'Übung löschen' : 'Übung ausblenden'}
          icon="delete-outline"
          variant="ghost"
          color={colors.danger}
          onPress={remove}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: spacing.md },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
