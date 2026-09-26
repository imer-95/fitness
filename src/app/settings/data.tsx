import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import {
  createBackup,
  exportCardioCsv,
  exportNutritionCsv,
  exportWeightsCsv,
  exportWorkoutsCsv,
  resetAllData,
  restoreBackup,
  validateBackup,
} from '@/db/repos/backup';
import { formatDateMedium, toDateKey } from '@/domain/dates';
import { pickTextFile, shareTextFile, timestampForFilename } from '@/services/files';
import { useActiveWorkout } from '@/state/activeWorkout';
import { useSettings } from '@/state/settings';
import { toast } from '@/state/ui';
import { Card } from '@/ui/Card';
import { choose, confirm, notify } from '@/ui/dialogs';
import { Loading } from '@/ui/Feedback';
import { ListGroup, ListRow, Section } from '@/ui/List';
import { Screen } from '@/ui/Screen';
import { Txt } from '@/ui/Text';
import { spacing, useTheme } from '@/ui/theme';

export default function DataScreen() {
  const { colors } = useTheme();
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (label: string, task: () => Promise<void>) => {
    setBusy(label);
    try {
      await task();
    } catch (e) {
      await notify('Das hat nicht geklappt', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const exportBackup = () =>
    run('Backup wird erstellt …', async () => {
      const backup = await createBackup();
      await shareTextFile(
        `formkurve-backup_${timestampForFilename()}.json`,
        JSON.stringify(backup),
        'application/json',
      );
    });

  const importBackup = () =>
    run('Backup wird geladen …', async () => {
      const text = await pickTextFile();
      if (!text) return;
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('Die Datei ist kein gültiges JSON-Backup.');
      }
      const backup = validateBackup(data);
      const count = backup.tables.workouts?.length ?? 0;
      const ok = await confirm(
        'Backup wiederherstellen?',
        `Backup vom ${formatDateMedium(toDateKey(new Date(backup.exportedAt)))} mit ${count} Trainings. Alle aktuellen Daten werden ersetzt.`,
        { confirmLabel: 'Wiederherstellen', destructive: true },
      );
      if (!ok) return;
      await restoreBackup(backup);
      await useSettings.getState().hydrate();
      await useActiveWorkout.getState().hydrate();
      toast('Backup wiederhergestellt');
    });

  const exportCsv = (kind: 'weights' | 'workouts' | 'nutrition' | 'cardio') =>
    run('Export wird erstellt …', async () => {
      const content =
        kind === 'weights'
          ? await exportWeightsCsv()
          : kind === 'workouts'
            ? await exportWorkoutsCsv()
            : kind === 'nutrition'
              ? await exportNutritionCsv()
              : await exportCardioCsv();
      const names = { weights: 'gewicht', workouts: 'training', nutrition: 'ernaehrung', cardio: 'cardio' };
      await shareTextFile(`formkurve-${names[kind]}_${timestampForFilename()}.csv`, content, 'text/csv');
    });

  const reset = async () => {
    const first = await choose(
      'Alle Daten löschen?',
      'Trainings, Gewicht, Ernährung und Einstellungen werden unwiderruflich gelöscht.',
      [
        { label: 'Vorher Backup erstellen', value: 'backup' as const },
        { label: 'Endgültig löschen', value: 'delete' as const, style: 'destructive' },
        { label: 'Abbrechen', value: 'cancel' as const, style: 'cancel' },
      ],
    );
    if (first === 'backup') {
      await exportBackup();
      return;
    }
    if (first !== 'delete') return;
    if (
      !(await confirm('Wirklich alles löschen?', 'Das kann nicht rückgängig gemacht werden.', {
        confirmLabel: 'Alles löschen',
        destructive: true,
      }))
    )
      return;
    await run('Daten werden gelöscht …', async () => {
      useActiveWorkout.getState().discard();
      await resetAllData();
      await useSettings.getState().hydrate();
      router.dismissAll();
    });
  };

  return (
    <Screen>
      <Card tint={colors.successSoft}>
        <Txt variant="footnote">
          🔒 Formkurve speichert alles ausschließlich lokal auf deinem Gerät – ohne Konto, ohne Cloud. Erstelle
          regelmäßig ein Backup (z. B. in iCloud Drive oder Google Drive), damit bei einem Handywechsel nichts verloren
          geht.
        </Txt>
      </Card>
      {busy ? <Loading label={busy} /> : null}

      <Section title="Backup">
        <ListGroup>
          <ListRow
            icon="database-export"
            title="Backup exportieren"
            subtitle="Alle Daten als JSON-Datei sichern"
            onPress={exportBackup}
          />
          <ListRow
            icon="database-import"
            title="Backup wiederherstellen"
            subtitle="Ersetzt alle aktuellen Daten"
            onPress={importBackup}
          />
        </ListGroup>
      </Section>

      <Section title="Import">
        <ListGroup>
          <ListRow
            icon="clipboard-text-outline"
            iconColor={colors.weight}
            title="Trainings aus Notizen importieren"
            subtitle="Text aus der Notizen-App einfügen"
            onPress={() => router.push('/workout/import')}
          />
        </ListGroup>
      </Section>

      <Section title="Export als CSV (Excel)">
        <ListGroup>
          <ListRow icon="dumbbell" title="Trainings & Sätze" onPress={() => exportCsv('workouts')} />
          <ListRow
            icon="scale-bathroom"
            iconColor={colors.weight}
            title="Körpergewicht"
            onPress={() => exportCsv('weights')}
          />
          <ListRow
            icon="food-apple"
            iconColor={colors.carbs}
            title="Ernährungstagebuch"
            onPress={() => exportCsv('nutrition')}
          />
          <ListRow icon="run" iconColor={colors.cardio} title="Cardio" onPress={() => exportCsv('cardio')} />
        </ListGroup>
      </Section>

      <Section title="Gefahrenzone">
        <ListGroup>
          <ListRow icon="delete-forever-outline" title="Alle Daten löschen" destructive onPress={reset} />
        </ListGroup>
      </Section>
      <Txt variant="caption" color="textTertiary" align="center" style={styles.footer}>
        CSV-Dateien nutzen Semikolon und deutsches Zahlenformat und lassen sich direkt in Excel oder Numbers öffnen.
      </Txt>
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: { paddingHorizontal: spacing.lg },
});
