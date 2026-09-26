import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { exerciseUsage, listExercises } from '@/db/repos/exercises';
import { useQuery } from '@/db/useQuery';
import { formatAgo, toDateKey } from '@/domain/dates';
import { EQUIPMENT_LABELS, MUSCLE_LABELS, MUSCLE_ORDER } from '@/domain/labels';
import { normalizeName } from '@/domain/notes';
import type { Exercise, MuscleGroup } from '@/domain/types';
import { useExercisePicker } from '@/state/ui';
import { Button, IconButton } from '@/ui/Button';
import { Chip, ChipRow } from '@/ui/Chips';
import { TextField } from '@/ui/Fields';
import { EmptyState } from '@/ui/Feedback';
import { Icon } from '@/ui/Icon';
import { Txt } from '@/ui/Text';
import { radius, spacing, useTheme } from '@/ui/theme';

type Filter = 'all' | 'recent' | MuscleGroup;

export default function ExercisesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ pick?: string }>();
  const request = useExercisePicker((s) => s.request);
  const picking = params.pick === '1' && request != null;
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>(picking ? 'recent' : 'all');
  const [selected, setSelected] = useState<string[]>(() => request?.selected ?? []);

  const exercises = useQuery(() => listExercises(), [], ['exercises']);
  const usage = useQuery(exerciseUsage, [], ['workouts']);

  const usedMuscles = useMemo(() => {
    const set = new Set((exercises.data ?? []).map((e) => e.muscle));
    return MUSCLE_ORDER.filter((m) => set.has(m));
  }, [exercises.data]);

  const hasRecent = (usage.data?.size ?? 0) > 0;
  const effectiveFilter: Filter = filter === 'recent' && !hasRecent ? 'all' : filter;

  const items = useMemo(() => {
    const q = normalizeName(query);
    let list = exercises.data ?? [];
    if (q) {
      list = list.filter(
        (e) => normalizeName(e.name).includes(q) || e.aliases.some((a) => normalizeName(a).includes(q)),
      );
    } else if (effectiveFilter === 'recent') {
      list = list
        .filter((e) => usage.data?.has(e.id))
        .sort((a, b) => (usage.data?.get(b.id)?.lastAt ?? 0) - (usage.data?.get(a.id)?.lastAt ?? 0));
    } else if (effectiveFilter !== 'all') {
      list = list.filter((e) => e.muscle === effectiveFilter);
    }
    return list;
  }, [exercises.data, usage.data, query, effectiveFilter]);

  const onPress = (exercise: Exercise) => {
    if (!picking || !request) {
      router.push({ pathname: '/exercises/[id]', params: { id: exercise.id } });
      return;
    }
    if (!request.multi) {
      request.onPick([exercise.id]);
      useExercisePicker.getState().clear();
      router.back();
      return;
    }
    setSelected((s) => (s.includes(exercise.id) ? s.filter((id) => id !== exercise.id) : [...s, exercise.id]));
  };

  const confirmSelection = () => {
    request?.onPick(selected);
    useExercisePicker.getState().clear();
    router.back();
  };

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: picking ? request.title : 'Übungen',
          headerRight: () => (
            <IconButton
              icon="plus"
              accessibilityLabel="Eigene Übung anlegen"
              size={34}
              onPress={() => router.push('/exercises/edit')}
            />
          ),
        }}
      />
      <View style={styles.top}>
        <TextField
          value={query}
          onChangeText={setQuery}
          placeholder="Übung suchen …"
          autoCorrect={false}
          clearButtonMode="while-editing"
          right={<Icon name="magnify" size={20} color={colors.textTertiary} />}
        />
        {!query ? (
          <ChipRow>
            {hasRecent ? (
              <Chip
                label="Zuletzt"
                icon="history"
                selected={effectiveFilter === 'recent'}
                onPress={() => setFilter('recent')}
              />
            ) : null}
            <Chip label="Alle" selected={effectiveFilter === 'all'} onPress={() => setFilter('all')} />
            {usedMuscles.map((m) => (
              <Chip key={m} label={MUSCLE_LABELS[m]} selected={effectiveFilter === m} onPress={() => setFilter(m)} />
            ))}
          </ChipRow>
        ) : null}
      </View>
      <FlatList
        data={items}
        keyExtractor={(e) => e.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingBottom: (picking && request?.multi ? 100 : 24) + insets.bottom }}
        ListEmptyComponent={
          exercises.data ? (
            <EmptyState
              icon="magnify"
              title="Keine Übung gefunden"
              message="Lege sie einfach als eigene Übung an."
              action={{
                label: 'Übung anlegen',
                icon: 'plus',
                onPress: () => router.push({ pathname: '/exercises/edit', params: { name: query } }),
              }}
            />
          ) : null
        }
        renderItem={({ item }) => {
          const used = usage.data?.get(item.id);
          const isSelected = selected.includes(item.id);
          return (
            <Pressable
              onPress={() => onPress(item)}
              accessibilityRole={picking ? 'checkbox' : 'button'}
              accessibilityState={picking ? { checked: isSelected } : undefined}
              style={({ pressed }) => [styles.row, { backgroundColor: pressed ? colors.surfaceAlt : 'transparent' }]}
            >
              <View style={[styles.initial, { backgroundColor: colors.surfaceAlt }]}>
                <Txt variant="headline" color="primary">
                  {item.name.charAt(0).toUpperCase()}
                </Txt>
              </View>
              <View style={styles.flex}>
                <Txt variant="body" weight="600" numberOfLines={1}>
                  {item.name}
                </Txt>
                <Txt variant="footnote" color="textSecondary" numberOfLines={1}>
                  {MUSCLE_LABELS[item.muscle]} · {EQUIPMENT_LABELS[item.equipment]}
                  {used ? ` · ${used.sessions}× · ${formatAgo(toDateKey(used.lastAt))}` : ''}
                  {item.isCustom ? ' · eigene' : ''}
                </Txt>
              </View>
              {picking && request?.multi ? (
                <Icon
                  name={isSelected ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                  size={26}
                  color={isSelected ? colors.primary : colors.textTertiary}
                />
              ) : (
                <Icon name="chevron-right" size={20} color={colors.textTertiary} />
              )}
            </Pressable>
          );
        }}
      />
      {picking && request?.multi ? (
        <View
          style={[
            styles.footer,
            {
              paddingBottom: Math.max(insets.bottom, spacing.md),
              backgroundColor: colors.background,
              borderTopColor: colors.border,
            },
          ]}
        >
          <Button
            label={
              selected.length > 0
                ? `${selected.length} ${selected.length === 1 ? 'Übung' : 'Übungen'} hinzufügen`
                : 'Übungen auswählen'
            }
            icon="plus"
            size="lg"
            full
            disabled={selected.length === 0}
            onPress={confirmSelection}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { padding: spacing.lg, paddingBottom: spacing.sm, gap: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md - 2,
  },
  initial: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
