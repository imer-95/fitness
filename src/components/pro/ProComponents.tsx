import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { PRO_FEATURES, proFeatureInfo, type ProFeature } from '@/domain/pro';
import { openPaywall } from '@/features/pro';
import { usePro } from '@/state/pro';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Icon, type IconName } from '@/ui/Icon';
import { Txt } from '@/ui/Text';
import { radius, spacing, useTheme, withAlpha } from '@/ui/theme';

export const PRO_FEATURE_ICONS: Record<ProFeature, IconName> = {
  stats: 'chart-box-outline',
  exerciseCharts: 'chart-line',
  longTermWeight: 'scale-bathroom',
  progressionHints: 'lightbulb-on-outline',
  unlimitedPlans: 'clipboard-list-outline',
  csvExport: 'file-delimited-outline',
};

/** Small "PRO" label for locked features. */
export function ProBadge({ small }: { small?: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.badge, small && styles.badgeSmall, { backgroundColor: withAlpha(colors.gold, 0.18) }]}
      accessibilityLabel="Pro-Funktion"
    >
      <Icon name="crown" size={small ? 11 : 13} color={colors.gold} />
      <Txt variant="caption" color={colors.gold} weight="800" style={small ? styles.badgeTextSmall : undefined}>
        PRO
      </Txt>
    </View>
  );
}

/** Replaces a Pro-only area for free users and leads to the paywall. */
export function ProTeaser({ feature, compact, points }: { feature: ProFeature; compact?: boolean; points?: string[] }) {
  const { colors } = useTheme();
  const info = proFeatureInfo(feature);
  if (!info) return null;
  return (
    <Card tint={withAlpha(colors.gold, 0.1)} style={styles.teaser}>
      <View style={styles.teaserHeader}>
        <View style={[styles.teaserIcon, { backgroundColor: withAlpha(colors.gold, 0.18) }]}>
          <Icon name={PRO_FEATURE_ICONS[feature]} size={22} color={colors.gold} />
        </View>
        <View style={styles.flex}>
          <Txt variant="headline">{info.title}</Txt>
          {!compact && !points?.length ? (
            <Txt variant="footnote" color="textSecondary">
              {info.description}
            </Txt>
          ) : null}
        </View>
        <ProBadge />
      </View>
      {points?.length ? (
        <View style={styles.points}>
          {points.map((point) => (
            <View key={point} style={styles.point}>
              <Icon name="check-circle" size={18} color={colors.gold} />
              <Txt variant="callout" style={styles.flex}>
                {point}
              </Txt>
            </View>
          ))}
        </View>
      ) : null}
      <Button
        label="Mit Pro freischalten"
        icon="crown"
        variant="tinted"
        color={colors.gold}
        onPress={() => openPaywall(feature)}
        full
      />
    </Card>
  );
}

/** All Pro features with icon, title and description (paywall). */
export function ProFeatureList({ highlight }: { highlight?: ProFeature | null }) {
  const { colors } = useTheme();
  return (
    <View style={styles.list}>
      {PRO_FEATURES.map((f) => {
        const active = f.id === highlight;
        return (
          <View
            key={f.id}
            style={[
              styles.feature,
              active && { backgroundColor: withAlpha(colors.gold, 0.12), borderColor: withAlpha(colors.gold, 0.5) },
            ]}
          >
            <View style={[styles.featureIcon, { backgroundColor: withAlpha(colors.primary, 0.12) }]}>
              <Icon name={PRO_FEATURE_ICONS[f.id]} size={20} color={colors.primary} />
            </View>
            <View style={styles.flex}>
              <Txt variant="headline">{f.title}</Txt>
              <Txt variant="footnote" color="textSecondary">
                {f.description}
              </Txt>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** Entry point in the profile: upgrade or subscription status. */
export function ProProfileCard() {
  const { colors } = useTheme();
  const isPro = usePro((s) => s.isPro);
  const source = usePro((s) => s.source);
  if (isPro) {
    return (
      <Card
        tint={withAlpha(colors.gold, 0.12)}
        onPress={() => router.push('/pro')}
        accessibilityLabel="Formkurve Pro verwalten"
      >
        <View style={styles.teaserHeader}>
          <View style={[styles.teaserIcon, { backgroundColor: withAlpha(colors.gold, 0.2) }]}>
            <Icon name="crown" size={22} color={colors.gold} />
          </View>
          <View style={styles.flex}>
            <Txt variant="headline">Formkurve Pro ist aktiv</Txt>
            <Txt variant="footnote" color="textSecondary">
              {source === 'unlocked'
                ? 'Persönliche Version – alles freigeschaltet'
                : source === 'simulated'
                  ? 'Simuliert (nur zum Testen)'
                  : 'Danke für deine Unterstützung!'}
            </Txt>
          </View>
          <Icon name="chevron-right" size={20} color={colors.textTertiary} />
        </View>
      </Card>
    );
  }
  return (
    <Card onPress={() => router.push('/pro')} accessibilityLabel="Formkurve Pro entdecken" style={styles.upsell}>
      <View style={styles.teaserHeader}>
        <View style={[styles.teaserIcon, { backgroundColor: withAlpha(colors.gold, 0.18) }]}>
          <Icon name="crown" size={22} color={colors.gold} />
        </View>
        <View style={styles.flex}>
          <Txt variant="headline">Formkurve Pro</Txt>
          <Txt variant="footnote" color="textSecondary">
            Erweiterte Statistiken, Übungsverläufe, unbegrenzt Pläne und mehr.
          </Txt>
        </View>
        <Icon name="chevron-right" size={20} color={colors.textTertiary} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  badgeSmall: { paddingHorizontal: 6, paddingVertical: 1, gap: 2 },
  badgeTextSmall: { fontSize: 10, lineHeight: 13 },
  teaser: { gap: spacing.md },
  teaserHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  teaserIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  points: { gap: spacing.sm },
  point: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  list: { gap: spacing.sm },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  featureIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  upsell: { gap: spacing.md },
});
