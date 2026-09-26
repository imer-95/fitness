import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Keyboard, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExerciseCard } from '@/components/workout/ExerciseCard';
import { RestTimerBar } from '@/components/workout/RestTimerBar';
import { listExercises } from '@/db/repos/exercises';
import { useQuery } from '@/db/useQuery';
import { dateKeyWithTime, formatClock, formatRest, toDateKey } from '@/domain/dates';
import { formatVolume, parseInteger } from '@/domain/format';
import { SET_KIND_LABELS } from '@/domain/labels';
import { PR_LABELS, formatSet } from '@/domain/strength';
import type { SetKind } from '@/domain/types';
import { useNow } from '@/hooks/useNow';
import { haptics } from '@/services/haptics';
import { ensureNotificationPermission } from '@/services/notifications';
import { draftStats, effectiveValues, useActiveWorkout, type DraftExercise } from '@/state/activeWorkout';
import { useRestTimer } from '@/state/restTimer';
import { useSettings } from '@/state/settings';
import { toast, useExercisePicker } from '@/state/ui';
import { Button, IconButton } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { DateField, TimeField } from '@/ui/DatePicker';
import { choose, confirm, notify } from '@/ui/dialogs';
import { NumberField, TextField } from '@/ui/Fields';
import { EmptyState } from '@/ui/Feedback';
import { SelectSheet, type SelectOption } from '@/ui/Sheet';
import { Txt } from '@/ui/Text';
import { ToastHost } from '@/ui/Toast';
import { noOutline, spacing, useTheme } from '@/ui/theme';

const REST_OPTIONS = [0, 30, 45, 60, 75, 90, 105, 120, 150, 180, 240, 300];

type ExerciseAction = 'rest' | 'notes' | 'replace' | 'up' | 'down' | 'history' | 'remove';
type SetAction = SetKind | 'delete';

export default function ActiveWorkoutScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const draft = useActiveWorkout((s) => s.draft);
  const keepAwake = useSettings((s) => s.prefs.keepAwake);
  const restRunning = useRestTimer((s) => s.endAt != null);
  const editing = !!draft?.editingId;
  const now = useNow(1000, !!draft && !editing);
  const [setMenu, setSetMenu] = useState<{ exId: string; setId: string } | null>(null);
  const [exerciseMenu, setExerciseMenu] = useState<string | null>(null);
  const [restFor, setRestFor] = useState<string | null>(null);
  const [notesOpen, setNotesOpen] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: exercises } = useQuery(() => listExercises({ includeArchived: true }), [], ['exercises']);
  const exerciseMap = useMemo(() => new Map((exercises ?? []).map((e) => [e.id, e])), [exercises]);

  useEffect(() => {
    if (!keepAwake || Platform.OS === 'web') return;
    void activateKeepAwakeAsync('workout').catch(() => undefined);
    return () => {
      void deactivateKeepAwake('workout').catch(() => undefined);
    };
  }, [keepAwake]);

  useEffect(() => {
    if (!editing && useSettings.getState().prefs.restNotification) void ensureNotificationPermission();
  }, [editing]);

  if (!draft) {
    return (
      <View style={[styles.flex, styles.center, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <EmptyState
          icon="dumbbell"
          title="Kein aktives Training"
          message="Starte ein Training im Tab „Training“."
          action={{ label: 'Zurück', onPress: () => router.back() }}
        />
      </View>
    );
  }

  const store = useActiveWorkout.getState();
  const stats = draftStats(draft);
  const nameOf = (ex: DraftExercise) => exerciseMap.get(ex.exerciseId)?.name ?? ex.exercise.name;

  const openPicker = (replaceId?: string) => {
    useExercisePicker.getState().open({
      title: replaceId ? 'Übung ersetzen' : 'Übungen hinzufügen',
      multi: !replaceId,
      onPick: (ids) => {
        if (ids.length === 0) return;
        if (replaceId) void store.replaceExercise(replaceId, ids[0]);
        else void store.addExercises(ids);
      },
    });
    router.push({ pathname: '/exercises', params: { pick: '1' } });
  };

  const toggleSet = (ex: DraftExercise, setId: string) => {
    const set = ex.sets.find((s) => s.id === setId);
    if (!set) return;
    if (set.done) {
      store.uncompleteSet(ex.id, setId);
      haptics.light();
      return;
    }
    const result = store.completeSet(ex.id, setId);
    if (!result.ok) {
      haptics.error();
      toast(result.error, { kind: 'error' });
      return;
    }
    Keyboard.dismiss();
    if (result.prs.length > 0) {
      haptics.success();
      const values = effectiveValues({ ...set, done: true });
      toast('Neuer Rekord! 🏆', {
        kind: 'record',
        message: `${nameOf(ex)}: ${formatSet(values, ex.exercise.tracking)} · ${PR_LABELS[result.prs[0]]}`,
      });
    } else {
      haptics.medium();
    }
    if (!editing && ex.restSec > 0) useRestTimer.getState().start(ex.restSec, nameOf(ex));
  };

  const onExerciseAction = async (exId: string, action: ExerciseAction) => {
    const ex = draft.exercises.find((e) => e.id === exId);
    if (!ex) return;
    switch (action) {
      case 'rest':
        setRestFor(exId);
        break;
      case 'notes':
        setNotesOpen((open) => (open.includes(exId) ? open.filter((i) => i !== exId) : [...open, exId]));
        break;
      case 'replace':
        openPicker(exId);
        break;
      case 'up':
        store.moveExercise(exId, -1);
        break;
      case 'down':
        store.moveExercise(exId, 1);
        break;
      case 'history':
        router.push({ pathname: '/exercises/[id]', params: { id: ex.exerciseId } });
        break;
      case 'remove': {
        const hasDone = ex.sets.some((s) => s.done);
        if (
          !hasDone ||
          (await confirm('Übung entfernen?', `${nameOf(ex)} und alle Sätze werden entfernt.`, {
            confirmLabel: 'Entfernen',
            destructive: true,
          }))
        ) {
          store.removeExercise(exId);
        }
        break;
      }
    }
  };

  const onSetAction = (action: SetAction) => {
    if (!setMenu) return;
    if (action === 'delete') store.removeSet(setMenu.exId, setMenu.setId);
    else store.updateSet(setMenu.exId, setMenu.setId, { kind: action });
  };

  const finish = async () => {
    Keyboard.dismiss();
    if (stats.done === 0 && stats.unchecked === 0) {
      await notify('Noch keine Sätze', 'Trag Werte ein und hake mindestens einen Satz ab.');
      return;
    }
    let includeUnchecked = editing;
    if (!editing) {
      if (stats.unchecked > 0) {
        const choice = await choose(
          'Nicht abgehakte Sätze',
          `${stats.unchecked} ${stats.unchecked === 1 ? 'Satz hat' : 'Sätze haben'} eingetragene Werte, ${
            stats.unchecked === 1 ? 'ist' : 'sind'
          } aber nicht abgehakt.`,
          [
            { label: 'Mitspeichern', value: 'keep' as const },
            { label: 'Verwerfen', value: 'discard' as const, style: 'destructive' },
            { label: 'Zurück', value: 'back' as const, style: 'cancel' },
          ],
        );
        if (!choice || choice === 'back') return;
        includeUnchecked = choice === 'keep';
        if (!includeUnchecked && stats.done === 0) {
          await notify('Noch keine Sätze', 'Es gibt keine abgehakten Sätze zum Speichern.');
          return;
        }
      } else {
        const ok = await confirm(
          'Training beenden?',
          `${stats.done} Sätze · ${formatVolume(stats.volume)} · ${formatClock((now - draft.startedAt) / 1000)}`,
          { confirmLabel: 'Beenden' },
        );
        if (!ok) return;
      }
    }
    setSaving(true);
    try {
      const id = await store.finish({ includeUnchecked });
      haptics.success();
      if (editing) {
        toast('Änderungen gespeichert');
        router.back();
      } else {
        router.replace({ pathname: '/workout/summary', params: { id } });
      }
    } catch (e) {
      await notify('Speichern nicht möglich', e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const discard = async () => {
    const ok = await confirm(
      editing ? 'Bearbeitung verwerfen?' : 'Training verwerfen?',
      editing ? 'Deine Änderungen gehen verloren.' : 'Alle Sätze dieses Trainings werden gelöscht.',
      { confirmLabel: 'Verwerfen', destructive: true },
    );
    if (!ok) return;
    store.discard();
    router.back();
  };

  const activeSetExercise = setMenu ? draft.exercises.find((e) => e.id === setMenu.exId) : null;
  const activeSet = activeSetExercise?.sets.find((s) => s.id === setMenu?.setId);
  const menuExercise = exerciseMenu ? draft.exercises.find((e) => e.id === exerciseMenu) : null;
  const menuIndex = menuExercise ? draft.exercises.indexOf(menuExercise) : -1;
  const exerciseOptions: SelectOption<ExerciseAction>[] = [
    { value: 'rest', label: 'Pausenzeit ändern', icon: 'timer-outline' },
    {
      value: 'notes',
      label: menuExercise && notesOpen.includes(menuExercise.id) ? 'Notiz ausblenden' : 'Notiz',
      icon: 'note-text-outline',
    },
    { value: 'replace', label: 'Übung ersetzen', icon: 'swap-horizontal' },
    ...(menuIndex > 0 ? [{ value: 'up' as const, label: 'Nach oben', icon: 'arrow-up' as const }] : []),
    ...(menuIndex >= 0 && menuIndex < draft.exercises.length - 1
      ? [{ value: 'down' as const, label: 'Nach unten', icon: 'arrow-down' as const }]
      : []),
    { value: 'history', label: 'Verlauf & Rekorde', icon: 'chart-line' },
    { value: 'remove', label: 'Übung entfernen', icon: 'delete-outline', destructive: true },
  ];
  const startDate = new Date(draft.startedAt);
  const dateKey = toDateKey(startDate);
  const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
  const durationMin = draft.endedAt ? Math.round((draft.endedAt - draft.startedAt) / 60000) : null;

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + spacing.sm, borderBottomColor: colors.border, backgroundColor: colors.background },
        ]}
      >
        <IconButton
          icon={editing ? 'close' : 'chevron-down'}
          accessibilityLabel={editing ? 'Bearbeitung verwerfen' : 'Training minimieren'}
          onPress={() => (editing ? void discard() : router.back())}
        />
        <View style={styles.flex}>
          <TextInput
            value={draft.title}
            onChangeText={store.setTitle}
            placeholder="Training"
            placeholderTextColor={colors.textTertiary}
            style={[styles.title, noOutline, { color: colors.text }]}
            accessibilityLabel="Titel des Trainings"
          />
          <Txt variant="footnote" color="textSecondary" tabular>
            {editing
              ? `${stats.done} Sätze · ${formatVolume(stats.volume)}`
              : `${formatClock((now - draft.startedAt) / 1000)} · ${stats.done}/${stats.total} Sätze · ${formatVolume(stats.volume)}`}
          </Txt>
        </View>
        <Button
          label={editing ? 'Speichern' : 'Beenden'}
          size="sm"
          onPress={finish}
          loading={saving}
          color={colors.success}
        />
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: (restRunning ? 110 : 40) + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      >
        {editing ? (
          <Card style={styles.gap}>
            <Txt variant="headline">Datum & Dauer</Txt>
            <DateField
              label="Datum"
              value={dateKey}
              maxDate={toDateKey(now)}
              onChange={(d) => store.setStartedAt(dateKeyWithTime(d, Math.floor(startMinutes / 60), startMinutes % 60))}
            />
            <TimeField
              label="Beginn"
              hour={Math.floor(startMinutes / 60)}
              minute={startMinutes % 60}
              onChange={(h, m) => store.setStartedAt(dateKeyWithTime(dateKey, h, m))}
            />
            <NumberField
              label="Dauer"
              unit="min"
              decimal={false}
              value={durationMin != null ? String(durationMin) : ''}
              placeholder="unbekannt"
              step={5}
              min={0}
              onChangeText={(t) => {
                const minutes = parseInteger(t);
                store.setEndedAt(minutes != null && minutes > 0 ? draft.startedAt + minutes * 60000 : null);
              }}
            />
          </Card>
        ) : null}

        {draft.exercises.length === 0 ? (
          <Card>
            <EmptyState
              compact
              icon="dumbbell"
              title="Los geht's!"
              message="Füge deine erste Übung hinzu. Deine Werte vom letzten Mal werden automatisch vorgeschlagen."
            />
          </Card>
        ) : null}

        {draft.exercises.map((ex) => (
          <ExerciseCard
            key={ex.id}
            item={ex}
            exercise={exerciseMap.get(ex.exerciseId)}
            showNotes={notesOpen.includes(ex.id) || ex.notes.length > 0}
            showSuggestion={!editing}
            onMenu={() => setExerciseMenu(ex.id)}
            onOpenRest={() => setRestFor(ex.id)}
            onChangeSet={(setId, patch) => store.updateSet(ex.id, setId, patch)}
            onToggleSet={(setId) => toggleSet(ex, setId)}
            onSetMenu={(setId) => setSetMenu({ exId: ex.id, setId })}
            onAddSet={() => store.addSet(ex.id)}
            onNotes={(text) => store.setExerciseNotes(ex.id, text)}
          />
        ))}

        <Button label="Übung hinzufügen" icon="plus" variant="tinted" size="lg" onPress={() => openPicker()} full />

        <TextField
          label="Notizen zum Training"
          value={draft.notes}
          onChangeText={store.setNotes}
          placeholder="Wie lief's? Energie, Schlaf, Besonderheiten …"
          multiline
        />

        <Button
          label={editing ? 'Änderungen verwerfen' : 'Training verwerfen'}
          icon="delete-outline"
          variant="ghost"
          color={colors.danger}
          onPress={discard}
        />
      </ScrollView>

      {!editing ? <RestTimerBar /> : null}

      <SelectSheet<SetAction>
        visible={!!setMenu}
        onClose={() => setSetMenu(null)}
        title={activeSet ? `Satz ${(activeSetExercise?.sets.indexOf(activeSet) ?? 0) + 1}` : 'Satz'}
        value={activeSet?.kind}
        options={[
          { value: 'normal', label: SET_KIND_LABELS.normal, icon: 'numeric' },
          {
            value: 'warmup',
            label: SET_KIND_LABELS.warmup,
            description: 'Zählt nicht für Rekorde',
            icon: 'fire',
            color: colors.warning,
          },
          { value: 'drop', label: SET_KIND_LABELS.drop, icon: 'arrow-down-bold-outline', color: colors.protein },
          { value: 'failure', label: SET_KIND_LABELS.failure, icon: 'lightning-bolt', color: colors.danger },
          { value: 'delete', label: 'Satz löschen', icon: 'delete-outline', destructive: true },
        ]}
        onSelect={onSetAction}
      />
      <SelectSheet<ExerciseAction>
        visible={!!exerciseMenu}
        onClose={() => setExerciseMenu(null)}
        title={menuExercise ? nameOf(menuExercise) : 'Übung'}
        options={exerciseOptions}
        onSelect={(action) => exerciseMenu && void onExerciseAction(exerciseMenu, action)}
      />
      <SelectSheet<number>
        visible={!!restFor}
        onClose={() => setRestFor(null)}
        title="Pausenzeit"
        value={draft.exercises.find((e) => e.id === restFor)?.restSec}
        options={REST_OPTIONS.map((s) => ({ value: s, label: s === 0 ? 'Kein Timer' : formatRest(s) }))}
        onSelect={(seconds) => restFor && store.setExerciseRest(restFor, seconds)}
      />
      <ToastHost />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 20, fontWeight: '800', padding: 0 },
  content: { padding: spacing.md, gap: spacing.md },
  gap: { gap: spacing.md },
});
