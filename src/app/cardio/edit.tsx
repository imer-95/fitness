import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { getLatestWeight } from '@/db/repos/body';
import { deleteCardio, getCardio, saveCardio } from '@/db/repos/cardio';
import { useQuery } from '@/db/useQuery';
import { dateKeyWithTime, formatClock, toDateKey, todayKey } from '@/domain/dates';
import { formatNumber, formatPace, formatSpeed, parseDecimal, parseInteger, toInputValue } from '@/domain/format';
import { estimateCardioKcal, paceSecPerKm, speedKmh } from '@/domain/cardio';
import { createId } from '@/domain/id';
import { CARDIO_HAS_DISTANCE, CARDIO_LABELS, CARDIO_ORDER } from '@/domain/labels';
import type { CardioSession, CardioType, DateKey } from '@/domain/types';
import { useNow } from '@/hooks/useNow';
import { haptics } from '@/services/haptics';
import { elapsedMs, useCardioTimer } from '@/state/cardioTimer';
import { toast } from '@/state/ui';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Chip, ChipWrap } from '@/ui/Chips';
import { DateField, TimeField } from '@/ui/DatePicker';
import { confirm } from '@/ui/dialogs';
import { NumberField, TextField } from '@/ui/Fields';
import { Loading, StatGrid, StatTile } from '@/ui/Feedback';
import { CARDIO_ICONS } from '@/ui/icons';
import { Screen } from '@/ui/Screen';
import { Txt } from '@/ui/Text';
import { spacing, useTheme } from '@/ui/theme';

export default function CardioEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { colors } = useTheme();
  const timer = useCardioTimer();
  const now = useNow(500, timer.runningSince != null);
  const [existing, setExisting] = useState<CardioSession | null>(null);
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<CardioType>(timer.type);
  const [date, setDate] = useState<DateKey>(todayKey());
  const [time, setTime] = useState(() => {
    const d = new Date();
    return { hour: d.getHours(), minute: Math.floor(d.getMinutes() / 5) * 5 };
  });
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');
  const [distance, setDistance] = useState('');
  const [kcal, setKcal] = useState('');
  const [avgHr, setAvgHr] = useState('');
  const [notes, setNotes] = useState('');
  const latestWeight = useQuery(() => getLatestWeight(), [], ['weights']);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void getCardio(id).then((c) => {
      if (cancelled) return;
      if (c) {
        setExisting(c);
        setType(c.type);
        setDate(toDateKey(c.startedAt));
        const d = new Date(c.startedAt);
        setTime({ hour: d.getHours(), minute: d.getMinutes() });
        setHours(c.durationSec >= 3600 ? String(Math.floor(c.durationSec / 3600)) : '');
        setMinutes(String(Math.floor((c.durationSec % 3600) / 60)));
        setSeconds(c.durationSec % 60 ? String(c.durationSec % 60) : '');
        setDistance(toInputValue(c.distanceKm));
        setKcal(c.kcal != null ? String(Math.round(c.kcal)) : '');
        setAvgHr(c.avgHr != null ? String(c.avgHr) : '');
        setNotes(c.notes ?? '');
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const durationSec =
    (parseInteger(hours) ?? 0) * 3600 + (parseInteger(minutes) ?? 0) * 60 + (parseInteger(seconds) ?? 0);
  const distanceKm = CARDIO_HAS_DISTANCE[type] ? parseDecimal(distance) : null;
  const estimate = estimateCardioKcal(type, durationSec, distanceKm, latestWeight.data?.weight ?? null);
  const speed = speedKmh(distanceKm, durationSec);
  const pace = paceSecPerKm(distanceKm, durationSec);
  const stopwatchMs = elapsedMs(timer, now);

  const applyStopwatch = () => {
    const total = Math.round(stopwatchMs / 1000);
    timer.pause();
    setHours(total >= 3600 ? String(Math.floor(total / 3600)) : '');
    setMinutes(String(Math.floor((total % 3600) / 60)));
    setSeconds(String(total % 60));
    if (timer.startedAt) {
      setDate(toDateKey(timer.startedAt));
      const d = new Date(timer.startedAt);
      setTime({ hour: d.getHours(), minute: d.getMinutes() });
    }
    haptics.success();
  };

  const save = async () => {
    if (durationSec <= 0) {
      toast('Bitte eine Dauer eintragen', { kind: 'error' });
      return;
    }
    setSaving(true);
    try {
      await saveCardio({
        id: existing?.id ?? createId(),
        type,
        startedAt: dateKeyWithTime(date, time.hour, time.minute),
        durationSec,
        distanceKm,
        kcal: parseDecimal(kcal) ?? estimate,
        avgHr: parseInteger(avgHr),
        notes: notes.trim() || null,
        createdAt: existing?.createdAt ?? Date.now(),
      });
      if (!existing) timer.reset();
      haptics.success();
      toast(existing ? 'Einheit gespeichert' : `${CARDIO_LABELS[type]} eingetragen 🏃`);
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!existing) return;
    if (await confirm('Einheit löschen?', undefined, { confirmLabel: 'Löschen', destructive: true })) {
      await deleteCardio(existing.id);
      router.back();
    }
  };

  if (loading) return <Loading />;

  return (
    <Screen
      keyboard
      footer={
        <Button label="Speichern" icon="check" size="lg" full loading={saving} onPress={save} color={colors.cardio} />
      }
    >
      <Stack.Screen options={{ title: existing ? 'Cardio bearbeiten' : 'Cardio eintragen' }} />
      <Card style={styles.gap}>
        <Txt variant="headline">Aktivität</Txt>
        <ChipWrap>
          {CARDIO_ORDER.map((t) => (
            <Chip
              key={t}
              label={CARDIO_LABELS[t]}
              icon={CARDIO_ICONS[t]}
              color={colors.cardio}
              selected={type === t}
              onPress={() => {
                setType(t);
                if (!existing) timer.setType(t);
              }}
              small
            />
          ))}
        </ChipWrap>
      </Card>

      {!existing ? (
        <Card style={styles.gap}>
          <View style={styles.row}>
            <View style={styles.flex}>
              <Txt variant="overline" color="textSecondary">
                Stoppuhr
              </Txt>
              <Txt variant="numberLarge" tabular>
                {formatClock(stopwatchMs / 1000)}
              </Txt>
            </View>
            {timer.runningSince ? (
              <Button label="Pause" icon="pause" variant="secondary" onPress={timer.pause} />
            ) : (
              <Button
                label={stopwatchMs > 0 ? 'Weiter' : 'Start'}
                icon="play"
                color={colors.cardio}
                onPress={timer.start}
              />
            )}
          </View>
          {stopwatchMs > 0 ? (
            <View style={styles.row}>
              <Button label="Zurücksetzen" variant="ghost" size="sm" onPress={timer.reset} />
              <View style={styles.flex} />
              <Button
                label="Zeit übernehmen"
                icon="check"
                variant="tinted"
                size="sm"
                color={colors.cardio}
                onPress={applyStopwatch}
              />
            </View>
          ) : (
            <Txt variant="caption" color="textTertiary">
              Läuft weiter, auch wenn du diesen Bildschirm schließt.
            </Txt>
          )}
        </Card>
      ) : null}

      <Card style={styles.gap}>
        <Txt variant="headline">Dauer</Txt>
        <View style={styles.row}>
          <NumberField
            containerStyle={styles.flex}
            label="Std."
            value={hours}
            onChangeText={setHours}
            decimal={false}
            placeholder="0"
          />
          <NumberField
            containerStyle={styles.flex}
            label="Min."
            value={minutes}
            onChangeText={setMinutes}
            decimal={false}
            placeholder="30"
          />
          <NumberField
            containerStyle={styles.flex}
            label="Sek."
            value={seconds}
            onChangeText={setSeconds}
            decimal={false}
            placeholder="0"
          />
        </View>
        <DateField label="Datum" value={date} onChange={setDate} maxDate={todayKey()} />
        <TimeField
          label="Beginn"
          hour={time.hour}
          minute={time.minute}
          onChange={(h, m) => setTime({ hour: h, minute: m })}
        />
      </Card>

      <Card style={styles.gap}>
        <Txt variant="headline">Details</Txt>
        {CARDIO_HAS_DISTANCE[type] ? (
          <NumberField label="Distanz" unit="km" value={distance} onChangeText={setDistance} placeholder="z. B. 5,2" />
        ) : null}
        <NumberField
          label="Kalorien"
          unit="kcal"
          decimal={false}
          value={kcal}
          onChangeText={setKcal}
          placeholder={estimate != null ? String(estimate) : '–'}
          hint={
            estimate != null
              ? `Leer lassen für Schätzung (${estimate} kcal nach MET-Wert und deinem Gewicht)`
              : 'Trag dein Gewicht ein, um Kalorien automatisch zu schätzen.'
          }
        />
        <NumberField
          label="Ø Puls"
          unit="bpm"
          decimal={false}
          value={avgHr}
          onChangeText={setAvgHr}
          placeholder="optional"
        />
        {speed != null && pace != null ? (
          <StatGrid>
            <StatTile
              label="Tempo"
              value={formatPace(pace).replace(' /km', '')}
              unit="min/km"
              icon="speedometer"
              color={colors.cardio}
            />
            <StatTile
              label="Geschwindigkeit"
              value={formatSpeed(speed).replace(' km/h', '')}
              unit="km/h"
              icon="speedometer-medium"
              color={colors.cardio}
            />
          </StatGrid>
        ) : null}
      </Card>

      <TextField
        label="Notizen"
        value={notes}
        onChangeText={setNotes}
        placeholder="Strecke, Stufe, Steigung, Gefühl …"
        multiline
      />
      {durationSec > 0 && estimate != null && !kcal ? (
        <Txt variant="caption" color="textTertiary" align="center">
          ≈ {formatNumber(estimate, 0)} kcal verbrannt
        </Txt>
      ) : null}
      {existing ? (
        <Button label="Einheit löschen" icon="delete-outline" variant="ghost" color={colors.danger} onPress={remove} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
