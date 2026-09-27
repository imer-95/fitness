import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProFeatureList } from '@/components/pro/ProComponents';
import { formatCurrency } from '@/domain/format';
import {
  monthlyEquivalent,
  periodDuration,
  periodLabel,
  planName,
  proFeatureInfo,
  yearlySavingsPercent,
  type ProPlan,
} from '@/domain/pro';
import { billingAvailable, STORE_NAME } from '@/services/billing';
import { CAN_SIMULATE_PRO, PRO_UNLOCKED_BUILD, usePro } from '@/state/pro';
import { Button, IconButton } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Badge, Loading } from '@/ui/Feedback';
import { Icon } from '@/ui/Icon';
import { Txt } from '@/ui/Text';
import { Toggle } from '@/ui/Toggle';
import { radius, spacing, useTheme, withAlpha } from '@/ui/theme';

/** Terms shown directly above the purchase button (required by the stores). */
function subscriptionTerms(plan: ProPlan): string {
  const parts: string[] = [];
  if (plan.trialDays) {
    parts.push(
      `Die ersten ${plan.trialDays} Tage sind kostenlos, danach ${plan.priceText} pro ${periodLabel(plan.period)}. ` +
        'Kündigst du vor Ende des Testzeitraums, wird nichts berechnet.',
    );
  }
  const deadline = Platform.OS === 'ios' ? 'mindestens 24 Stunden vor Ablauf' : 'vor Ablauf';
  parts.push(
    `Das Abo verlängert sich automatisch um ${periodDuration(plan.period)}, wenn du es nicht ${deadline} kündigst. ` +
      `Kündigen kannst du jederzeit in ${STORE_NAME} unter „Abos“ – Pro bleibt bis zum Ende des bezahlten Zeitraums aktiv. ` +
      `Die Zahlung erfolgt über dein Konto bei ${STORE_NAME}. Alle Preise inkl. MwSt.`,
  );
  return parts.join(' ');
}

export default function ProScreen() {
  const { feature } = useLocalSearchParams<{ feature?: string }>();
  const highlight = proFeatureInfo(feature);
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const isPro = usePro((s) => s.isPro);
  const source = usePro((s) => s.source);
  const plans = usePro((s) => s.plans);
  const plansStatus = usePro((s) => s.plansStatus);
  const plansError = usePro((s) => s.plansError);
  const purchasing = usePro((s) => s.purchasing);
  const restoring = usePro((s) => s.restoring);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isPro) void usePro.getState().loadPlans();
  }, [isPro]);

  const selected = plans.find((p) => p.id === selectedId) ?? plans[0] ?? null;
  const savings = yearlySavingsPercent(plans);
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const retry = () => void usePro.getState().loadPlans();
  const showPurchase = !isPro && plansStatus === 'ready' && selected != null;

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={[colors.primary, '#FF8A3D']}
          style={[styles.hero, { paddingTop: insets.top + spacing.md }]}
        >
          <View style={styles.heroTop}>
            <IconButton
              icon="close"
              color="#FFFFFF"
              background="rgba(255,255,255,0.2)"
              accessibilityLabel="Schließen"
              onPress={close}
            />
          </View>
          <View style={styles.crown}>
            <Icon name="crown" size={34} color="#FFFFFF" />
          </View>
          <Txt variant="title1" color="#FFFFFF">
            Formkurve Pro
          </Txt>
          <Txt variant="callout" color="#FFFFFF" style={styles.heroText}>
            Mehr Auswertungen, mehr Motivation – und du unterstützt die Weiterentwicklung der App.
          </Txt>
          {highlight && !isPro ? (
            <View style={styles.highlight}>
              <Icon name="lock-open-variant-outline" size={16} color="#FFFFFF" />
              <Txt variant="subhead" color="#FFFFFF" weight="700" style={styles.flexShrink}>
                „{highlight.title}“ ist Teil von Pro
              </Txt>
            </View>
          ) : null}
        </LinearGradient>

        <View style={styles.body}>
          {isPro ? (
            <Card tint={withAlpha(colors.gold, 0.12)} style={styles.gap}>
              <View style={styles.row}>
                <Icon name="check-decagram" size={26} color={colors.gold} />
                <Txt variant="title3" style={styles.flex}>
                  Du nutzt Formkurve Pro
                </Txt>
              </View>
              <Txt variant="footnote" color="textSecondary">
                {source === 'unlocked'
                  ? 'Das ist deine persönliche Version – alle Funktionen sind dauerhaft freigeschaltet.'
                  : source === 'simulated'
                    ? 'Pro ist nur simuliert (Entwicklung/Web-Vorschau). Es wurde nichts gekauft.'
                    : `Danke für deine Unterstützung! Dein Abo verwaltest oder kündigst du in ${STORE_NAME}.`}
              </Txt>
              {source === 'store' || source === 'cache' ? (
                <Button
                  label="Abo verwalten"
                  icon="cog-outline"
                  variant="secondary"
                  onPress={() => void usePro.getState().manageSubscription()}
                />
              ) : null}
            </Card>
          ) : null}

          <Txt variant="title3">{isPro ? 'Deine Pro-Funktionen' : 'Das bekommst du mit Pro'}</Txt>
          <ProFeatureList highlight={isPro ? null : (highlight?.id ?? null)} />

          {!isPro ? (
            <View style={styles.gap}>
              <Txt variant="title3">Wähle deinen Plan</Txt>
              {plansStatus === 'idle' || plansStatus === 'loading' ? (
                <Loading label="Preise werden geladen …" />
              ) : plansStatus === 'error' ? (
                <Card style={styles.gap}>
                  <View style={styles.row}>
                    <Icon name="store-alert-outline" size={24} color={colors.textSecondary} />
                    <Txt variant="callout" color="textSecondary" style={styles.flex}>
                      {plansError}
                    </Txt>
                  </View>
                  {billingAvailable ? (
                    <Button label="Erneut versuchen" icon="refresh" variant="secondary" onPress={retry} />
                  ) : null}
                </Card>
              ) : plans.length === 0 ? (
                <Card style={styles.gap}>
                  <Txt variant="callout" color="textSecondary">
                    Das Abo ist gerade nicht verfügbar. Bitte versuche es später erneut.
                  </Txt>
                  <Button label="Erneut versuchen" icon="refresh" variant="secondary" onPress={retry} />
                </Card>
              ) : (
                plans.map((plan) => (
                  <PlanOption
                    key={plan.id}
                    plan={plan}
                    selected={plan.id === selected?.id}
                    savings={plan.period.unit === 'year' ? savings : null}
                    onPress={() => setSelectedId(plan.id)}
                  />
                ))
              )}
            </View>
          ) : null}

          {showPurchase ? (
            <Txt variant="caption" color="textSecondary" style={styles.terms}>
              {subscriptionTerms(selected)}
            </Txt>
          ) : null}

          <View style={styles.links}>
            {!isPro ? (
              <LinkText
                label={restoring ? 'Wird geprüft …' : 'Käufe wiederherstellen'}
                onPress={() => void usePro.getState().restore()}
              />
            ) : null}
            <LinkText label="Nutzungsbedingungen" onPress={() => router.push('/legal/nutzungsbedingungen')} />
            <LinkText label="Datenschutz" onPress={() => router.push('/legal/datenschutz')} />
            <LinkText label="Impressum" onPress={() => router.push('/legal/impressum')} />
          </View>

          {CAN_SIMULATE_PRO && !PRO_UNLOCKED_BUILD ? (
            <Card style={styles.gap}>
              <View style={styles.row}>
                <Icon name="flask-outline" size={22} color={colors.textSecondary} />
                <View style={styles.flex}>
                  <Txt variant="headline">Pro simulieren</Txt>
                  <Txt variant="caption" color="textSecondary">
                    Nur in Entwicklungs-Builds und in der Web-Vorschau sichtbar – zum Testen der Pro-Funktionen.
                  </Txt>
                </View>
                <Toggle
                  value={source === 'simulated'}
                  onValueChange={(on) => void usePro.getState().simulate(on)}
                  accessibilityLabel="Pro simulieren"
                />
              </View>
            </Card>
          ) : null}
        </View>
      </ScrollView>

      {showPurchase ? (
        <View
          style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md), borderTopColor: colors.border }]}
        >
          <Button
            label={selected.trialDays ? `${selected.trialDays} Tage kostenlos testen` : 'Pro abonnieren'}
            icon="crown"
            size="lg"
            full
            loading={purchasing}
            onPress={() => void usePro.getState().purchase(selected)}
          />
          <Txt variant="caption" color="textSecondary" align="center">
            {selected.trialDays ? 'Danach ' : ''}
            {selected.priceText} pro {periodLabel(selected.period)} · jederzeit kündbar
          </Txt>
        </View>
      ) : null}
    </View>
  );
}

function PlanOption({
  plan,
  selected,
  savings,
  onPress,
}: {
  plan: ProPlan;
  selected: boolean;
  savings: number | null;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const equivalent = monthlyEquivalent(plan);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${planName(plan.period)}, ${plan.priceText} pro ${periodLabel(plan.period)}`}
      style={[
        styles.plan,
        {
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: selected ? withAlpha(colors.primary, 0.07) : colors.surface,
        },
      ]}
    >
      <View style={[styles.radio, { borderColor: selected ? colors.primary : colors.borderStrong }]}>
        {selected ? <View style={[styles.radioDot, { backgroundColor: colors.primary }]} /> : null}
      </View>
      <View style={[styles.flex, styles.planText]}>
        <View style={styles.planTitle}>
          <Txt variant="headline">{planName(plan.period)}</Txt>
          {plan.trialDays ? <Badge label={`${plan.trialDays} Tage gratis`} color={colors.success} /> : null}
          {savings ? <Badge label={`Spare ${savings} %`} color={colors.gold} /> : null}
        </View>
        {equivalent != null ? (
          <Txt variant="footnote" color="textSecondary">
            entspricht {formatCurrency(equivalent, plan.currency)} im Monat
          </Txt>
        ) : null}
      </View>
      <View style={styles.planPrice}>
        <Txt variant="title3" tabular>
          {plan.priceText}
        </Txt>
        <Txt variant="caption" color="textSecondary">
          pro {periodLabel(plan.period)}
        </Txt>
      </View>
    </Pressable>
  );
}

function LinkText({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="link">
      <Txt variant="footnote" color="primary" weight="600">
        {label}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1 },
  scroll: { paddingBottom: spacing.xxxl },
  hero: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'flex-end' },
  heroText: { opacity: 0.95 },
  crown: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  highlight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.16)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    marginTop: spacing.xs,
  },
  body: { padding: spacing.lg, gap: spacing.lg },
  gap: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 2,
  },
  planText: { gap: 2 },
  planTitle: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  planPrice: { alignItems: 'flex-end' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  terms: { lineHeight: 17 },
  links: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    columnGap: spacing.lg,
    rowGap: spacing.sm,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
});
