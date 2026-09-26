import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { mergeSessions, SessionRow } from '@/components/SessionRows';
import { listCardio } from '@/db/repos/cardio';
import { listExercises } from '@/db/repos/exercises';
import { deleteTemplate, listTemplates, saveTemplate } from '@/db/repos/templates';
import { listWorkoutSummaries } from '@/db/repos/workouts';
import { useQuery } from '@/db/useQuery';
import { formatAgo, toDateKey } from '@/domain/dates';
import { createId } from '@/domain/id';
import type { Template } from '@/domain/types';
import { startEmptyWorkout, startTemplateWorkout } from '@/features/workoutActions';
import { useActiveWorkout } from '@/state/activeWorkout';
import { toast } from '@/state/ui';
import { Button, IconButton } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { confirm } from '@/ui/dialogs';
import { EmptyState } from '@/ui/Feedback';
import { Icon } from '@/ui/Icon';
import { ListGroup, Section } from '@/ui/List';
import { LargeHeader, Screen } from '@/ui/Screen';
import { SelectSheet } from '@/ui/Sheet';
import { Txt } from '@/ui/Text';
import { radius, spacing, useTheme, withAlpha } from '@/ui/theme';

type TemplateAction = 'start' | 'edit' | 'duplicate' | 'delete';

export default function TrainingScreen() {
  const { colors } = useTheme();
  const active = useActiveWorkout((s) => s.draft);
  const [menuFor, setMenuFor] = useState<Template | null>(null);

  const templates = useQuery(listTemplates, [], ['templates', 'exercises']);
  const exercises = useQuery(() => listExercises({ includeArchived: true }), [], ['exercises']);
  const recent = useQuery(
    async () => mergeSessions(await listWorkoutSummaries({ limit: 8 }), await listCardio({ limit: 8 }), 8),
    [],
    ['workouts', 'cardio', 'exercises'],
  );
  const names = useMemo(() => new Map((exercises.data ?? []).map((e) => [e.id, e.name])), [exercises.data]);

  const onTemplateAction = async (template: Template, action: TemplateAction) => {
    if (action === 'start') await startTemplateWorkout(template);
    if (action === 'edit') router.push({ pathname: '/templates/edit', params: { id: template.id } });
    if (action === 'duplicate') {
      await saveTemplate({
        ...template,
        id: createId(),
        name: `${template.name} (Kopie)`,
        position: template.position + 1,
        lastUsedAt: null,
        createdAt: Date.now(),
        exercises: template.exercises.map((e) => ({ ...e, id: createId() })),
      });
      toast('Plan dupliziert');
    }
    if (action === 'delete') {
      if (
        await confirm('Plan löschen?', `„${template.name}“ wird gelöscht. Deine Trainings bleiben erhalten.`, {
          confirmLabel: 'Löschen',
          destructive: true,
        })
      ) {
        await deleteTemplate(template.id);
      }
    }
  };

  return (
    <Screen safeTop>
      <LargeHeader
        title="Training"
        subtitle="Krafttraining & Cardio"
        right={
          <IconButton
            icon="book-open-variant"
            accessibilityLabel="Übungsbibliothek"
            onPress={() => router.push('/exercises')}
          />
        }
      />

      {active ? (
        <Card tint={withAlpha(colors.primary, 0.12)} onPress={() => router.push('/workout/active')}>
          <View style={styles.row}>
            <View style={[styles.bigIcon, { backgroundColor: colors.primary }]}>
              <Icon name="play" size={28} color={colors.onPrimary} />
            </View>
            <View style={styles.flex}>
              <Txt variant="overline" color="primary">
                {active.editingId ? 'Bearbeitung offen' : 'Training läuft'}
              </Txt>
              <Txt variant="title3" numberOfLines={1}>
                {active.title}
              </Txt>
            </View>
            <Icon name="chevron-right" size={24} color={colors.primary} />
          </View>
        </Card>
      ) : (
        <Card>
          <View style={styles.startRow}>
            <View style={[styles.bigIcon, { backgroundColor: withAlpha(colors.primary, 0.14) }]}>
              <Icon name="dumbbell" size={28} color={colors.primary} />
            </View>
            <View style={styles.flex}>
              <Txt variant="title3">Bereit fürs Training?</Txt>
              <Txt variant="footnote" color="textSecondary">
                Starte frei oder wähle unten einen Plan.
              </Txt>
            </View>
          </View>
          <Button
            label="Leeres Training starten"
            icon="play"
            size="lg"
            full
            onPress={startEmptyWorkout}
            style={styles.mt}
          />
        </Card>
      )}

      <View style={styles.actions}>
        <ActionTile
          icon="run"
          label="Cardio eintragen"
          color={colors.cardio}
          onPress={() => router.push('/cardio/edit')}
        />
        <ActionTile
          icon="clipboard-text-outline"
          label="Aus Notizen importieren"
          color={colors.weight}
          onPress={() => router.push('/workout/import')}
        />
      </View>

      <Section title="Meine Pläne" action={{ label: 'Neuer Plan', onPress: () => router.push('/templates/edit') }}>
        {templates.data && templates.data.length === 0 ? (
          <Card>
            <EmptyState
              compact
              icon="clipboard-list-outline"
              title="Noch keine Pläne"
              message="Speichere ein beendetes Training als Plan oder lege einen neuen an – z. B. „Brust, Bizeps, Bauch“."
              action={{ label: 'Plan erstellen', icon: 'plus', onPress: () => router.push('/templates/edit') }}
            />
          </Card>
        ) : null}
        {(templates.data ?? []).map((t) => (
          <Card key={t.id} onPress={() => setMenuFor(t)} accessibilityLabel={`Plan ${t.name}`}>
            <View style={styles.row}>
              <View style={styles.flex}>
                <Txt variant="headline" numberOfLines={1}>
                  {t.name}
                </Txt>
                <Txt variant="footnote" color="textSecondary">
                  {t.exercises.length} {t.exercises.length === 1 ? 'Übung' : 'Übungen'} ·{' '}
                  {t.exercises.reduce((n, e) => n + e.sets.length, 0)} Sätze
                  {t.lastUsedAt ? ` · zuletzt ${formatAgo(toDateKey(t.lastUsedAt))}` : ''}
                </Txt>
              </View>
              <IconButton
                icon="dots-horizontal"
                size={34}
                accessibilityLabel="Planoptionen"
                onPress={() => setMenuFor(t)}
              />
            </View>
            <Txt variant="footnote" color="textTertiary" numberOfLines={2} style={styles.names}>
              {t.exercises.map((e) => names.get(e.exerciseId) ?? '?').join(' · ')}
            </Txt>
            <Button label="Starten" icon="play" size="sm" onPress={() => startTemplateWorkout(t)} style={styles.mt} />
          </Card>
        ))}
      </Section>

      <Section title="Verlauf" action={{ label: 'Alle anzeigen', onPress: () => router.push('/workout/history') }}>
        {recent.data && recent.data.length === 0 ? (
          <Card>
            <EmptyState
              compact
              icon="history"
              title="Noch keine Einträge"
              message="Hier erscheinen deine Trainings und Cardio-Einheiten. Tipp: Importiere deine bisherigen Notizen!"
            />
          </Card>
        ) : (
          <ListGroup>
            {(recent.data ?? []).map((s) => (
              <SessionRow key={`${s.kind}-${s.kind === 'workout' ? s.workout.id : s.cardio.id}`} session={s} />
            ))}
          </ListGroup>
        )}
      </Section>

      <SelectSheet<TemplateAction>
        visible={!!menuFor}
        onClose={() => setMenuFor(null)}
        title={menuFor?.name ?? 'Plan'}
        options={[
          { value: 'start', label: 'Training starten', icon: 'play' },
          { value: 'edit', label: 'Bearbeiten', icon: 'pencil-outline' },
          { value: 'duplicate', label: 'Duplizieren', icon: 'content-copy' },
          { value: 'delete', label: 'Löschen', icon: 'delete-outline', destructive: true },
        ]}
        onSelect={(action) => menuFor && void onTemplateAction(menuFor, action)}
      />
    </Screen>
  );
}

function ActionTile({
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
  return (
    <Card onPress={onPress} style={styles.tile} accessibilityLabel={label}>
      <View style={[styles.tileIcon, { backgroundColor: withAlpha(color, 0.14) }]}>
        <Icon name={icon} size={22} color={color} />
      </View>
      <Txt variant="subhead" weight="700" numberOfLines={2}>
        {label}
      </Txt>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  startRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  bigIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mt: { marginTop: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.md },
  tile: { flex: 1, gap: spacing.sm },
  tileIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  names: { marginTop: spacing.xs },
});
