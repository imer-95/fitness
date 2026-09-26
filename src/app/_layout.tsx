import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Font from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type Theme as NavTheme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initializeDatabase } from '@/db/init';
import { openDatabase } from '@/db/open';
import { registerDemoData } from '@/dev/registerDemo';
import { configureNotifications } from '@/services/notifications';
import { useActiveWorkout } from '@/state/activeWorkout';
import { useSettings } from '@/state/settings';
import { Button } from '@/ui/Button';
import { DialogHost } from '@/ui/dialogs';
import { KeyboardDoneBar } from '@/ui/Fields';
import { Txt } from '@/ui/Text';
import { ToastHost } from '@/ui/Toast';
import { spacing, useTheme } from '@/ui/theme';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

let startup: Promise<void> | null = null;

/** Opens the database, runs migrations and loads the persisted state (once). */
function startApp(): Promise<void> {
  startup ??= (async () => {
    // Load the icon font up front so icons never render as empty boxes.
    await Font.loadAsync(MaterialCommunityIcons.font).catch(() => undefined);
    const database = await openDatabase();
    await initializeDatabase(database);
    await useSettings.getState().hydrate();
    await useActiveWorkout.getState().hydrate();
    configureNotifications();
    registerDemoData();
  })();
  return startup;
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    startApp()
      .then(() => !cancelled && setReady(true))
      .catch((e: unknown) => {
        startup = null;
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        void SplashScreen.hideAsync().catch(() => undefined);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        {error ? (
          <StartupError
            message={error}
            onRetry={() => {
              setError(null);
              startApp()
                .then(() => setReady(true))
                .catch((e: unknown) => setError(String(e)));
            }}
          />
        ) : ready ? (
          <AppNavigator />
        ) : null}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppNavigator() {
  const theme = useTheme();
  const { colors } = theme;
  const navTheme = useMemo<NavTheme>(() => {
    const base = theme.dark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.background,
        text: colors.text,
        border: colors.border,
        notification: colors.primary,
      },
    };
  }, [theme, colors]);

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.primary,
            headerTitleStyle: { color: colors.text, fontWeight: '700' },
            headerShadowVisible: false,
            headerBackTitle: 'Zurück',
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Übersicht' }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen
            name="workout/active"
            options={{ headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false }}
          />
          <Stack.Screen
            name="workout/summary"
            options={{ headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false }}
          />
          <Stack.Screen name="workout/[id]" options={{ title: 'Training' }} />
          <Stack.Screen name="workout/history" options={{ title: 'Verlauf' }} />
          <Stack.Screen name="workout/import" options={{ title: 'Aus Notizen importieren', presentation: 'modal' }} />
          <Stack.Screen name="exercises/index" options={{ title: 'Übungen' }} />
          <Stack.Screen name="exercises/[id]" options={{ title: 'Übung' }} />
          <Stack.Screen name="exercises/edit" options={{ title: 'Übung', presentation: 'modal' }} />
          <Stack.Screen name="templates/edit" options={{ title: 'Trainingsplan', presentation: 'modal' }} />
          <Stack.Screen name="cardio/edit" options={{ title: 'Cardio', presentation: 'modal' }} />
          <Stack.Screen name="body/weight" options={{ title: 'Körpergewicht' }} />
          <Stack.Screen name="body/measurements" options={{ title: 'Körpermaße' }} />
          <Stack.Screen name="nutrition/add" options={{ title: 'Lebensmittel hinzufügen', presentation: 'modal' }} />
          <Stack.Screen name="nutrition/food" options={{ title: 'Menge', presentation: 'modal' }} />
          <Stack.Screen name="nutrition/food-edit" options={{ title: 'Eigenes Lebensmittel', presentation: 'modal' }} />
          <Stack.Screen
            name="nutrition/scan"
            options={{ title: 'Barcode scannen', presentation: 'fullScreenModal', headerShown: false }}
          />
          <Stack.Screen name="nutrition/quick" options={{ title: 'Schnell eintragen', presentation: 'modal' }} />
          <Stack.Screen name="settings/profile" options={{ title: 'Profil & Ziele' }} />
          <Stack.Screen name="settings/data" options={{ title: 'Daten & Backup' }} />
          <Stack.Screen name="tools/one-rep-max" options={{ title: '1RM-Rechner' }} />
          <Stack.Screen name="tools/plates" options={{ title: 'Scheibenrechner' }} />
        </Stack>
        <ToastHost />
        <DialogHost />
        <KeyboardDoneBar />
      </View>
    </ThemeProvider>
  );
}

function StartupError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.flex, styles.center, { backgroundColor: colors.background }]}>
      <Txt variant="title2" align="center">
        Die App konnte nicht starten
      </Txt>
      <Txt variant="footnote" color="textSecondary" align="center">
        {message}
      </Txt>
      <Button label="Erneut versuchen" icon="refresh" onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.md },
});
