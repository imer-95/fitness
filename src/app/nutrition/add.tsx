import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FoodRow } from '@/components/nutrition/FoodRow';
import { listCustomFoods, listFavoriteFoods, listRecentFoods, searchFoods, upsertOffFood } from '@/db/repos/nutrition';
import { useQuery } from '@/db/useQuery';
import { todayKey } from '@/domain/dates';
import { MEAL_LABELS, MEAL_ORDER, mealForHour } from '@/domain/labels';
import type { OffFood } from '@/domain/openFoodFacts';
import type { Food, Meal } from '@/domain/types';
import { searchProducts } from '@/services/openFoodFacts';
import { Button } from '@/ui/Button';
import { Chip, ChipRow, Segmented } from '@/ui/Chips';
import { TextField } from '@/ui/Fields';
import { EmptyState, Loading } from '@/ui/Feedback';
import { Icon } from '@/ui/Icon';
import { ListGroup } from '@/ui/List';
import { Screen } from '@/ui/Screen';
import { Txt } from '@/ui/Text';
import { spacing, useTheme } from '@/ui/theme';

type Tab = 'recent' | 'favorites' | 'mine';

export default function AddFoodScreen() {
  const params = useLocalSearchParams<{ date?: string; meal?: Meal }>();
  const { colors } = useTheme();
  const date = params.date ?? todayKey();
  const [meal, setMeal] = useState<Meal>(params.meal ?? mealForHour(new Date().getHours()));
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('recent');
  const [online, setOnline] = useState<{ query: string; results: OffFood[] } | null>(null);
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [onlineError, setOnlineError] = useState<string | null>(null);

  const trimmed = query.trim();
  const local = useQuery(
    async (): Promise<Food[]> => {
      if (trimmed) return searchFoods(trimmed);
      if (tab === 'favorites') return listFavoriteFoods();
      if (tab === 'mine') return listCustomFoods();
      return listRecentFoods();
    },
    [trimmed, tab],
    ['foods'],
  );

  const openFood = (foodId: string) => router.push({ pathname: '/nutrition/food', params: { foodId, date, meal } });

  const searchOnline = async () => {
    if (!trimmed) return;
    setOnlineLoading(true);
    setOnlineError(null);
    try {
      setOnline({ query: trimmed, results: await searchProducts(trimmed) });
    } catch (e) {
      setOnlineError(e instanceof Error ? e.message : String(e));
    } finally {
      setOnlineLoading(false);
    }
  };

  const pickOnline = async (product: OffFood) => {
    const food = await upsertOffFood(product);
    openFood(food.id);
  };

  const items = local.data ?? [];
  const showOnline = online && online.query === trimmed;

  return (
    <Screen keyboard>
      <Stack.Screen options={{ title: MEAL_LABELS[meal] }} />
      <ChipRow>
        {MEAL_ORDER.map((m) => (
          <Chip key={m} label={MEAL_LABELS[m]} selected={meal === m} onPress={() => setMeal(m)} small />
        ))}
      </ChipRow>
      <TextField
        value={query}
        onChangeText={setQuery}
        placeholder="Lebensmittel suchen …"
        autoFocus
        autoCorrect={false}
        returnKeyType="search"
        onSubmitEditing={() => (items.length === 0 ? void searchOnline() : undefined)}
        right={<Icon name="magnify" size={20} color={colors.textTertiary} />}
      />
      <View style={styles.actions}>
        <Button
          label="Scannen"
          icon="barcode-scan"
          size="sm"
          variant="secondary"
          style={styles.flex}
          onPress={() => router.push({ pathname: '/nutrition/scan', params: { date, meal } })}
        />
        <Button
          label="Schnell"
          icon="lightning-bolt"
          size="sm"
          variant="secondary"
          style={styles.flex}
          onPress={() => router.push({ pathname: '/nutrition/quick', params: { date, meal } })}
        />
        <Button
          label="Eigenes"
          icon="plus"
          size="sm"
          variant="secondary"
          style={styles.flex}
          onPress={() => router.push({ pathname: '/nutrition/food-edit', params: { date, meal, name: trimmed } })}
        />
      </View>

      {!trimmed ? (
        <Segmented<Tab>
          options={[
            { value: 'recent', label: 'Zuletzt' },
            { value: 'favorites', label: 'Favoriten' },
            { value: 'mine', label: 'Eigene & Gescannte' },
          ]}
          value={tab}
          onChange={setTab}
        />
      ) : null}

      {local.loading && !local.data ? <Loading /> : null}
      {items.length > 0 ? (
        <ListGroup>
          {items.map((f) => (
            <FoodRow key={f.id} food={f} onPress={() => openFood(f.id)} />
          ))}
        </ListGroup>
      ) : local.data ? (
        <EmptyState
          compact
          icon={trimmed ? 'magnify' : tab === 'favorites' ? 'star-outline' : 'history'}
          title={
            trimmed
              ? 'Nicht in deiner Datenbank'
              : tab === 'favorites'
                ? 'Noch keine Favoriten'
                : tab === 'mine'
                  ? 'Noch nichts angelegt'
                  : 'Noch nichts eingetragen'
          }
          message={
            trimmed
              ? 'Suche online in Open Food Facts oder lege das Lebensmittel selbst an.'
              : tab === 'favorites'
                ? 'Markiere Lebensmittel mit dem Stern, um sie hier schnell zu finden.'
                : 'Suche nach Lebensmitteln wie „Haferflocken“, „Skyr“ oder scanne einen Barcode.'
          }
        />
      ) : null}

      {trimmed ? (
        <View style={styles.gap}>
          <Button
            label={`Online suchen: „${trimmed}“`}
            icon="earth"
            variant="tinted"
            full
            loading={onlineLoading}
            onPress={searchOnline}
          />
          {onlineError ? (
            <Txt variant="footnote" color="danger" align="center">
              {onlineError}
            </Txt>
          ) : null}
          {showOnline ? (
            online.results.length > 0 ? (
              <>
                <Txt variant="overline" color="textSecondary">
                  Open Food Facts · {online.results.length} Treffer
                </Txt>
                <ListGroup>
                  {online.results.map((p, i) => (
                    <FoodRow
                      key={`${p.barcode ?? p.name}-${i}`}
                      food={{ ...p, source: 'off' }}
                      onPress={() => void pickOnline(p)}
                    />
                  ))}
                </ListGroup>
              </>
            ) : (
              <Txt variant="footnote" color="textSecondary" align="center">
                Keine Produkte mit Nährwerten gefunden.
              </Txt>
            )
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm },
});
