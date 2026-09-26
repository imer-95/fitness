import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFoodByBarcode, upsertOffFood } from '@/db/repos/nutrition';
import { todayKey } from '@/domain/dates';
import { isValidBarcode } from '@/domain/openFoodFacts';
import type { Meal } from '@/domain/types';
import { haptics } from '@/services/haptics';
import { fetchProductByBarcode } from '@/services/openFoodFacts';
import { Button, IconButton } from '@/ui/Button';
import { choose } from '@/ui/dialogs';
import { TextField } from '@/ui/Fields';
import { Icon } from '@/ui/Icon';
import { Txt } from '@/ui/Text';
import { radius, spacing, useTheme } from '@/ui/theme';

export default function ScanScreen() {
  const params = useLocalSearchParams<{ date?: string; meal?: Meal }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [manual, setManual] = useState('');
  const handled = useRef(false);
  const date = params.date ?? todayKey();

  const openFood = (foodId: string) =>
    router.replace({ pathname: '/nutrition/food', params: { foodId, date, meal: params.meal } });

  const lookup = async (code: string) => {
    setBusy(true);
    setStatus(`Suche ${code} …`);
    try {
      const local = await getFoodByBarcode(code);
      if (local && !local.archived) {
        openFood(local.id);
        return;
      }
      const product = await fetchProductByBarcode(code);
      if (product) {
        const food = await upsertOffFood(product);
        openFood(food.id);
        return;
      }
      const choice = await choose(
        'Produkt nicht gefunden',
        `Zum Barcode ${code} gibt es keine Nährwerte in Open Food Facts.`,
        [
          { label: 'Selbst anlegen', value: 'create' as const },
          { label: 'Erneut scannen', value: 'retry' as const, style: 'cancel' },
        ],
      );
      if (choice === 'create') {
        router.replace({ pathname: '/nutrition/food-edit', params: { barcode: code, date, meal: params.meal } });
        return;
      }
    } catch (e) {
      await choose('Fehler bei der Suche', e instanceof Error ? e.message : String(e), [{ label: 'OK', value: true }]);
    }
    setBusy(false);
    setStatus(null);
    handled.current = false;
  };

  const onScanned = (result: BarcodeScanningResult) => {
    if (handled.current) return;
    const code = result.data.replace(/\D/g, '');
    if (!code) return;
    handled.current = true;
    haptics.success();
    void lookup(code);
  };

  const submitManual = () => {
    const code = manual.replace(/\D/g, '');
    if (!code) return;
    if (!isValidBarcode(code)) {
      setStatus('Der Barcode scheint ungültig – trotzdem wird gesucht.');
    }
    handled.current = true;
    void lookup(code);
  };

  const granted = permission?.granted ?? false;

  return (
    <View style={[styles.flex, { backgroundColor: '#000' }]}>
      {granted ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
          onBarcodeScanned={busy ? undefined : onScanned}
        />
      ) : null}

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.top, { paddingTop: insets.top + spacing.sm }]}>
          <IconButton
            icon="close"
            accessibilityLabel="Schließen"
            background="rgba(0,0,0,0.45)"
            color="#FFFFFF"
            onPress={() => router.back()}
          />
          <Txt variant="headline" color="#FFFFFF" style={styles.flex} align="center">
            Barcode scannen
          </Txt>
          {granted ? (
            <IconButton
              icon={torch ? 'flashlight' : 'flashlight-off'}
              accessibilityLabel="Taschenlampe"
              background="rgba(0,0,0,0.45)"
              color="#FFFFFF"
              onPress={() => setTorch((t) => !t)}
            />
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>

        <View style={styles.center}>
          {granted ? (
            <View style={[styles.frame, { borderColor: busy ? colors.success : '#FFFFFF' }]}>
              {busy ? <ActivityIndicator color="#FFFFFF" size="large" /> : null}
            </View>
          ) : (
            <View style={[styles.permission, { backgroundColor: colors.surface }]}>
              <Icon name="camera" size={40} color={colors.primary} />
              <Txt variant="title3" align="center">
                Kamera-Zugriff
              </Txt>
              <Txt variant="footnote" color="textSecondary" align="center">
                Um Barcodes von Lebensmitteln zu scannen, braucht Formkurve Zugriff auf die Kamera. Die Bilder werden
                nicht gespeichert.
              </Txt>
              {permission && !permission.canAskAgain ? (
                <Txt variant="footnote" color="warning" align="center">
                  Bitte erlaube den Zugriff in den Systemeinstellungen.
                </Txt>
              ) : (
                <Button label="Kamera erlauben" icon="camera" onPress={() => void requestPermission()} />
              )}
            </View>
          )}
          {status ? (
            <Txt variant="subhead" color="#FFFFFF" align="center" style={styles.status}>
              {status}
            </Txt>
          ) : granted ? (
            <Txt variant="subhead" color="#FFFFFF" align="center" style={styles.status}>
              Halte den Barcode in den Rahmen
            </Txt>
          ) : null}
        </View>

        <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.md, backgroundColor: colors.surface }]}>
          <TextField
            value={manual}
            onChangeText={(t) => setManual(t.replace(/\D/g, ''))}
            placeholder="Barcode manuell eingeben"
            keyboardType="number-pad"
            returnKeyType="search"
            onSubmitEditing={submitManual}
            containerStyle={styles.flex}
          />
          <Button label="Suchen" onPress={submitManual} disabled={!manual || busy} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg },
  placeholder: { width: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  frame: {
    width: 270,
    height: 170,
    borderWidth: 3,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  status: { textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 6 },
  permission: { borderRadius: radius.xl, padding: spacing.xl, gap: spacing.md, alignItems: 'center', maxWidth: 360 },
  bottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
});
