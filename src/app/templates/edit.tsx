import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { getExercisesByIds, listExercises } from '@/db/repos/exercises';
import { deleteTemplate, getTemplate, nextTemplatePosition, saveTemplate } from '@/db/repos/templates';
import { getExerciseContext } from '@/db/repos/workouts';
import { useQuery } from '@/db/useQuery';
import { formatRest } from '@/domain/dates';
import { parseDecimal, parseInteger, toInputValue } from '@/domain/format';
import { createId } from '@/domain/id';
import { SIDE_SHORT } from '@/domain/strength';
import type { SetKind, Side, Template } from '@/domain/types';
import { toast, useExercisePicker } from '@/state/ui';
import { Button, IconButton } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { confirm } from '@/ui/dialogs';
import { TextField } from '@/ui/Fields';
import { EmptyState, Loading } from '@/ui/Feedback';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';
import { SelectSheet } from '@/ui/Sheet';
import { Txt } from '@/ui/Text';
import { noOutline, radius, spacing, useTheme, withAlpha } from '@/ui/theme';

interface FormSet {
  id: string;
  reps: string;
  weight: string;
  duration: string;
  side: Side | null;
  kind: SetKind;
}

interface FormExercise {
  id: string;
  exerciseId: string;
  restSeconds: number | null;
  notes: string | null;
  sets: FormSet[];
}

const REST_OPTIONS = [30, 45, 60, 75, 90, 120, 150, 180, 240];

function toFormExercises(template: Template): FormExercise[] {
  return template.exercises.map((e) => ({
    id: e.id,
    exerciseId: e.exerciseId,
    restSeconds: e.restSeconds,
    notes: e.notes,
    sets: e.sets.map((s) => ({
      id: createId(),
      reps: s.reps != null ? String(s.reps) : '',
      weight: toInputValue(s.weight),
      duration: s.durationSec != null ? String(s.durationSec) : '',
      side: s.side,
      kind: s.kind,
    })),
  }));
}

export default function TemplateEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(!!id);
  const [template, setTemplate] = useState<Template | null>(null);
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<FormExercise[]>([]);
  const [restFor, setRestFor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const exercises = useQuery(() => listExercises({ includeArchived: true }), [], ['exercises']);
  const exerciseMap = useMemo(() => new Map((exercises.data ?? []).map((e) => [e.id, e])), [exercises.data]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void getTemplate(id).then((t) => {
      if (cancelled) return;
      if (t) {
        setTemplate(t);
        setName(t.name);
        setNotes(t.notes ?? '');
        setItems(toFormExercises(t));
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const updateItem = (itemId: string, fn: (item: FormExercise) => FormExercise) =>
    setItems((list) => list.map((i) => (i.id === itemId ? fn(i) : i)));

  const updateSet = (itemId: string, setId: string, patch: Partial<FormSet>) =>
    updateItem(itemId, (item) => ({ ...item, sets: item.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) }));

  const addExercises = async (ids: string[]) => {
    const map = await getExercisesByIds(ids);
    const added: FormExercise[] = [];
    for (const exerciseId of ids) {
      const ex = map.get(exerciseId);
      if (!ex) continue;
      const context = await getExerciseContext(ex.id, ex);
      const last = context.last?.sets ?? [];
      const sets: FormSet[] =
        last.length > 0
          ? last.map((s) => ({
              id: createId(),
              reps: s.reps != null ? String(s.reps) : '',
              weight: toInputValue(s.weight),
              duration: s.durationSec != null ? String(s.durationSec) : '',
              side: s.side,
              kind: s.kind,
            }))
          : Array.from({ length: 3 }, () => ({
              id: createId(),
              reps: '',
              weight: '',
              duration: '',
              side: null,
              kind: 'normal' as const,
            }));
      added.push({ id: createId(), exerciseId: ex.id, restSeconds: ex.restSeconds, notes: null, sets });
    }
    setItems((list) => [...list, ...added]);
  };

  const openPicker = () => {
    useExercisePicker
      .getState()
      .open({ title: 'Übungen hinzufügen', multi: true, onPick: (ids) => void addExercises(ids) });
    router.push({ pathname: '/exercises', params: { pick: '1' } });
  };

  const move = (itemId: string, dir: -1 | 1) =>
    setItems((list) => {
      const i = list.findIndex((x) => x.id === itemId);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const save = async () => {
    if (!name.trim()) {
      toast('Bitte gib dem Plan einen Namen', { kind: 'error' });
      return;
    }
    if (items.length === 0) {
      toast('Füge mindestens eine Übung hinzu', { kind: 'error' });
      return;
    }
    setSaving(true);
    try {
      const base: Template = template ?? {
        id: createId(),
        name: '',
        notes: null,
        position: await nextTemplatePosition(),
        lastUsedAt: null,
        createdAt: Date.now(),
        exercises: [],
      };
      await saveTemplate({
        ...base,
        name: name.trim(),
        notes: notes.trim() || null,
        exercises: items.map((i) => ({
          id: i.id,
          exerciseId: i.exerciseId,
          restSeconds: i.restSeconds,
          notes: i.notes,
          sets: i.sets.map((s) => ({
            reps: parseInteger(s.reps),
            weight: parseDecimal(s.weight),
            durationSec: parseInteger(s.duration),
            side: s.side,
            kind: s.kind,
          })),
        })),
      });
      toast('Plan gespeichert');
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!template) return;
    if (
      await confirm('Plan löschen?', `„${template.name}“ wird gelöscht.`, {
        confirmLabel: 'Löschen',
        destructive: true,
      })
    ) {
      await deleteTemplate(template.id);
      router.back();
    }
  };

  if (loading) return <Loading />;

  const restItem = items.find((i) => i.id === restFor);

  return (
    <Screen
      keyboard
      footer={<Button label="Plan speichern" icon="check" size="lg" full loading={saving} onPress={save} />}
    >
      <Stack.Screen options={{ title: template ? 'Plan bearbeiten' : 'Neuer Plan' }} />
      <TextField label="Name" value={name} onChangeText={setName} placeholder="z. B. Brust, Bizeps, Bauch" />

      {items.length === 0 ? (
        <Card>
          <EmptyState
            compact
            icon="clipboard-list-outline"
            title="Noch keine Übungen"
            message="Füge Übungen hinzu. Die Sätze werden mit deinen letzten Werten vorbelegt."
          />
        </Card>
      ) : null}

      {items.map((item, index) => {
        const ex = exerciseMap.get(item.exerciseId);
        const tracking = ex?.tracking ?? 'weight_reps';
        return (
          <Card key={item.id} style={styles.gap}>
            <View style={styles.header}>
              <View style={styles.flex}>
                <Txt variant="headline" numberOfLines={2}>
                  {ex?.name ?? 'Übung'}
                </Txt>
                <Pressable onPress={() => setRestFor(item.id)} accessibilityRole="button" style={styles.restLink}>
                  <Icon name="timer-outline" size={14} color={colors.textSecondary} />
                  <Txt variant="caption" color="textSecondary">
                    Pause {formatRest(item.restSeconds ?? ex?.restSeconds ?? 90)}
                  </Txt>
                </Pressable>
              </View>
              <IconButton
                icon="arrow-up"
                size={32}
                accessibilityLabel="Nach oben"
                disabled={index === 0}
                onPress={() => move(item.id, -1)}
              />
              <IconButton
                icon="arrow-down"
                size={32}
                accessibilityLabel="Nach unten"
                disabled={index === items.length - 1}
                onPress={() => move(item.id, 1)}
              />
              <IconButton
                icon="delete-outline"
                size={32}
                color={colors.danger}
                accessibilityLabel="Übung entfernen"
                onPress={() => setItems((list) => list.filter((i) => i.id !== item.id))}
              />
            </View>
            {item.sets.map((set, i) => (
              <View key={set.id} style={styles.setRow}>
                <Txt variant="subhead" color="textSecondary" style={styles.setIndex} weight="700">
                  {i + 1}
                </Txt>
                {ex?.unilateral ? (
                  <Pressable
                    onPress={() =>
                      updateSet(item.id, set.id, {
                        side: set.side === 'left' ? 'right' : set.side === 'right' ? null : 'left',
                      })
                    }
                    style={[
                      styles.side,
                      { backgroundColor: set.side ? withAlpha(colors.weight, 0.16) : colors.surfaceAlt },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Seite wechseln"
                  >
                    <Txt variant="caption" weight="800" color={set.side ? 'weight' : 'textTertiary'}>
                      {set.side ? SIDE_SHORT[set.side] : 'L/R'}
                    </Txt>
                  </Pressable>
                ) : null}
                {tracking === 'time' ? (
                  <SmallInput
                    value={set.duration}
                    onChange={(t) => updateSet(item.id, set.id, { duration: t })}
                    unit="s"
                  />
                ) : (
                  <SmallInput value={set.reps} onChange={(t) => updateSet(item.id, set.id, { reps: t })} unit="Wdh." />
                )}
                {tracking === 'weight_reps' ? (
                  <SmallInput
                    value={set.weight}
                    onChange={(t) => updateSet(item.id, set.id, { weight: t })}
                    unit="kg"
                    decimal
                  />
                ) : null}
                <IconButton
                  icon="close"
                  size={30}
                  accessibilityLabel="Satz entfernen"
                  onPress={() => updateItem(item.id, (it) => ({ ...it, sets: it.sets.filter((s) => s.id !== set.id) }))}
                />
              </View>
            ))}
            <Button
              label="Satz"
              icon="plus"
              size="sm"
              variant="secondary"
              onPress={() =>
                updateItem(item.id, (it) => {
                  const last = it.sets[it.sets.length - 1];
                  return {
                    ...it,
                    sets: [
                      ...it.sets,
                      {
                        ...(last ?? { reps: '', weight: '', duration: '', side: null, kind: 'normal' as const }),
                        id: createId(),
                      },
                    ],
                  };
                })
              }
            />
          </Card>
        );
      })}

      <Button label="Übungen hinzufügen" icon="plus" variant="tinted" size="lg" full onPress={openPicker} />
      <TextField
        label="Notizen"
        value={notes}
        onChangeText={setNotes}
        placeholder="Ziele, Reihenfolge, Hinweise …"
        multiline
      />
      {template ? (
        <Button label="Plan löschen" icon="delete-outline" variant="ghost" color={colors.danger} onPress={remove} />
      ) : null}

      <SelectSheet<number>
        visible={!!restFor}
        onClose={() => setRestFor(null)}
        title="Pausenzeit"
        value={restItem?.restSeconds ?? undefined}
        options={REST_OPTIONS.map((s) => ({ value: s, label: formatRest(s) }))}
        onSelect={(s) => restFor && updateItem(restFor, (it) => ({ ...it, restSeconds: s }))}
      />
    </Screen>
  );
}

function SmallInput({
  value,
  onChange,
  unit,
  decimal,
}: {
  value: string;
  onChange: (t: string) => void;
  unit: string;
  decimal?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.smallInput, { backgroundColor: colors.surfaceAlt }]}>
      <TextInput
        value={value}
        onChangeText={(t) => onChange(t.replace(decimal ? /[^0-9.,]/g : /[^0-9]/g, ''))}
        keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
        placeholder="–"
        placeholderTextColor={colors.textTertiary}
        style={[styles.smallText, noOutline, { color: colors.text }]}
        selectTextOnFocus
      />
      <Txt variant="caption" color="textSecondary">
        {unit}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  restLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  setIndex: { width: 22, textAlign: 'center' },
  side: { width: 34, height: 34, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  smallInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    height: 38,
  },
  smallText: { flex: 1, minWidth: 0, fontSize: 16, fontWeight: '700', paddingVertical: 0, textAlign: 'center' },
});
