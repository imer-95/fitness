/**
 * Formkurve Pro: which features belong to the subscription, the store product
 * configuration and the store-independent logic behind the paywall and the
 * entitlement check. Everything here is pure and unit tested.
 */

/** Number of workout plans that are included without Pro. */
export const FREE_PLAN_LIMIT = 3;

export type ProFeature =
  | 'stats'
  | 'exerciseCharts'
  | 'longTermWeight'
  | 'progressionHints'
  | 'unlimitedPlans'
  | 'csvExport';

export interface ProFeatureInfo {
  id: ProFeature;
  title: string;
  description: string;
}

/** Shown on the paywall in this order. Change this list to move features between free and Pro. */
export const PRO_FEATURES: readonly ProFeatureInfo[] = [
  {
    id: 'stats',
    title: 'Erweiterte Statistiken',
    description:
      'Kraft, Cardio und Ernährung im Detail – Volumen pro Woche, Trainingskalender, Sätze pro Muskelgruppe.',
  },
  {
    id: 'exerciseCharts',
    title: 'Entwicklung jeder Übung',
    description: 'Diagramme für geschätztes 1RM, Höchstgewicht und Volumen über alle Trainings.',
  },
  {
    id: 'longTermWeight',
    title: 'Langzeit-Gewichtsverlauf',
    description: 'Verlauf über ein Jahr und seit Beginn sowie die Prognose für dein Zielgewicht.',
  },
  {
    id: 'progressionHints',
    title: 'Steigerungs-Tipps',
    description: 'Die App zeigt dir, wann es Zeit für mehr Gewicht ist.',
  },
  {
    id: 'unlimitedPlans',
    title: 'Unbegrenzt viele Pläne',
    description: `${FREE_PLAN_LIMIT} Trainingspläne sind kostenlos, mit Pro so viele du willst.`,
  },
  {
    id: 'csvExport',
    title: 'Export für Excel',
    description: 'Trainings, Gewicht, Ernährung und Cardio als CSV-Tabelle exportieren.',
  },
];

export function proFeatureInfo(id: string | null | undefined): ProFeatureInfo | null {
  return PRO_FEATURES.find((f) => f.id === id) ?? null;
}

/**
 * Product IDs exactly as created in the Google Play Console and App Store Connect.
 * Google Play: one subscription with base plans (e.g. "monatlich", "jaehrlich").
 * App Store: one product per duration in the same subscription group.
 */
export const PRO_PRODUCTS = {
  android: 'formkurve_pro',
  ios: ['formkurve_pro_monatlich', 'formkurve_pro_jaehrlich'],
} as const;

export const ALL_PRO_PRODUCT_IDS: readonly string[] = [PRO_PRODUCTS.android, ...PRO_PRODUCTS.ios];

export function isProProduct(productId: string): boolean {
  return ALL_PRO_PRODUCT_IDS.includes(productId);
}

export function canCreatePlan(existingPlans: number, isPro: boolean): boolean {
  return isPro || existingPlans < FREE_PLAN_LIMIT;
}

/** Weight chart ranges that need Pro (see `WEIGHT_RANGES`). */
export function isProWeightRange(range: string): boolean {
  return range === '365' || range === 'all';
}

// ---------------------------------------------------------------------------
// Billing periods
// ---------------------------------------------------------------------------

export type PeriodUnit = 'day' | 'week' | 'month' | 'year';

export interface Period {
  unit: PeriodUnit;
  count: number;
}

const ISO_UNITS: Record<string, PeriodUnit> = { D: 'day', W: 'week', M: 'month', Y: 'year' };

/** Parses ISO 8601 periods as used by Google Play ("P1M", "P1Y", "P7D", "P3M"). */
export function parseIsoPeriod(iso: string | null | undefined): Period | null {
  const m = /^P(\d+)([DWMY])$/i.exec(iso?.trim() ?? '');
  if (!m) return null;
  const count = Number(m[1]);
  if (!(count > 0)) return null;
  return { unit: ISO_UNITS[m[2].toUpperCase()], count };
}

const UNIT_DAYS: Record<PeriodUnit, number> = { day: 1, week: 7, month: 30, year: 365 };

export function periodInDays(period: Period): number {
  return UNIT_DAYS[period.unit] * period.count;
}

const UNIT_SINGULAR: Record<PeriodUnit, string> = { day: 'Tag', week: 'Woche', month: 'Monat', year: 'Jahr' };
const UNIT_PLURAL: Record<PeriodUnit, string> = { day: 'Tage', week: 'Wochen', month: 'Monate', year: 'Jahre' };

/** "Monat", "3 Monate", "Jahr" – used as "4,99 € / Monat". */
export function periodLabel(period: Period): string {
  return period.count === 1 ? UNIT_SINGULAR[period.unit] : `${period.count} ${UNIT_PLURAL[period.unit]}`;
}

/** "1 Monat", "3 Monate", "1 Jahr" – e.g. "verlängert sich um 1 Monat". */
export function periodDuration(period: Period): string {
  return `${period.count} ${period.count === 1 ? UNIT_SINGULAR[period.unit] : UNIT_PLURAL[period.unit]}`;
}

/** Name of a plan: "Monatlich", "Jährlich", "Alle 3 Monate". */
export function planName(period: Period): string {
  if (period.count === 1) {
    return { day: 'Täglich', week: 'Wöchentlich', month: 'Monatlich', year: 'Jährlich' }[period.unit];
  }
  return `Alle ${period.count} ${UNIT_PLURAL[period.unit]}`;
}

// ---------------------------------------------------------------------------
// Plans shown on the paywall
// ---------------------------------------------------------------------------

/** Minimal shape of the store data (compatible with expo-iap's product types). */
export interface StorePricingPhase {
  billingPeriod: string;
  formattedPrice: string;
  priceAmountMicros: string;
  priceCurrencyCode: string;
  billingCycleCount: number;
  recurrenceMode: number;
}

export interface StoreSubscriptionOffer {
  id: string;
  basePlanIdAndroid?: string | null;
  offerTokenAndroid?: string | null;
  displayPrice: string;
  price: number;
  currency?: string | null;
  pricingPhasesAndroid?: { pricingPhaseList: StorePricingPhase[] } | null;
}

export interface StoreSubscriptionProduct {
  id: string;
  platform: 'android' | 'ios';
  displayPrice: string;
  price?: number | null;
  currency: string;
  subscriptionOffers?: StoreSubscriptionOffer[] | null;
  subscriptionPeriodUnitIOS?: string | null;
  subscriptionPeriodNumberIOS?: string | null;
}

export interface ProPlan {
  /** Stable key for lists and selection. */
  id: string;
  productId: string;
  /** Google Play base plan, `null` on iOS. */
  basePlanId: string | null;
  /** Google Play offer token that must be passed to the purchase. */
  offerToken: string | null;
  period: Period;
  /** Regular recurring price in major units (e.g. 4.99). */
  price: number | null;
  /** Regular price formatted by the store, e.g. "4,99 €". */
  priceText: string;
  currency: string | null;
  /** Length of a free trial in days, `null` without trial. */
  trialDays: number | null;
}

/** Google Play recurrence mode of the regular, endlessly renewing phase. */
const INFINITE_RECURRING = 1;

function planFromAndroidOffer(product: StoreSubscriptionProduct, offer: StoreSubscriptionOffer): ProPlan | null {
  const phases = offer.pricingPhasesAndroid?.pricingPhaseList ?? [];
  const regular = phases.find((p) => p.recurrenceMode === INFINITE_RECURRING) ?? phases[phases.length - 1];
  if (!regular) return null;
  const period = parseIsoPeriod(regular.billingPeriod);
  if (!period) return null;
  let trialDays: number | null = null;
  for (const phase of phases) {
    if (phase === regular || Number(phase.priceAmountMicros) !== 0) continue;
    const p = parseIsoPeriod(phase.billingPeriod);
    if (p) trialDays = (trialDays ?? 0) + periodInDays(p) * Math.max(1, phase.billingCycleCount);
  }
  const micros = Number(regular.priceAmountMicros);
  return {
    id: `${product.id}:${offer.basePlanIdAndroid ?? ''}:${offer.id}`,
    productId: product.id,
    basePlanId: offer.basePlanIdAndroid ?? null,
    offerToken: offer.offerTokenAndroid ?? null,
    period,
    price: Number.isFinite(micros) ? micros / 1_000_000 : null,
    priceText: regular.formattedPrice,
    currency: regular.priceCurrencyCode || null,
    trialDays,
  };
}

function planFromIosProduct(product: StoreSubscriptionProduct): ProPlan | null {
  const unit = product.subscriptionPeriodUnitIOS;
  if (unit !== 'day' && unit !== 'week' && unit !== 'month' && unit !== 'year') return null;
  const count = Number(product.subscriptionPeriodNumberIOS ?? 1) || 1;
  return {
    id: product.id,
    productId: product.id,
    basePlanId: null,
    offerToken: null,
    period: { unit, count },
    price: product.price ?? null,
    priceText: product.displayPrice,
    currency: product.currency || null,
    // The App Store shows introductory offers in its own purchase sheet.
    trialDays: null,
  };
}

/**
 * Turns the subscription products of the store into the plans of the paywall:
 * one plan per Google Play base plan (preferring an offer with a free trial)
 * or per App Store product, sorted from the shortest to the longest period.
 */
export function plansFromProducts(products: readonly StoreSubscriptionProduct[]): ProPlan[] {
  const plans: ProPlan[] = [];
  for (const product of products) {
    if (!isProProduct(product.id)) continue;
    if (product.platform === 'ios') {
      const plan = planFromIosProduct(product);
      if (plan) plans.push(plan);
      continue;
    }
    const byBasePlan = new Map<string, ProPlan>();
    for (const offer of product.subscriptionOffers ?? []) {
      const plan = planFromAndroidOffer(product, offer);
      if (!plan) continue;
      const key = plan.basePlanId ?? plan.id;
      const current = byBasePlan.get(key);
      if (!current || (plan.trialDays ?? 0) > (current.trialDays ?? 0)) byBasePlan.set(key, plan);
    }
    plans.push(...byBasePlan.values());
  }
  return plans.sort((a, b) => periodInDays(a.period) - periodInDays(b.period));
}

/** Savings of a yearly plan compared to twelve monthly payments (whole percent), or `null`. */
export function yearlySavingsPercent(plans: readonly ProPlan[]): number | null {
  const monthly = plans.find((p) => p.period.unit === 'month' && p.period.count === 1 && p.price);
  const yearly = plans.find((p) => p.period.unit === 'year' && p.period.count === 1 && p.price);
  if (!monthly?.price || !yearly?.price) return null;
  const percent = Math.round((1 - yearly.price / (monthly.price * 12)) * 100);
  return percent >= 5 ? percent : null;
}

/** Price per month of a plan (for "entspricht 3,33 € im Monat"), `null` for monthly plans. */
export function monthlyEquivalent(plan: ProPlan): number | null {
  if (plan.price == null) return null;
  const months =
    plan.period.unit === 'year' ? plan.period.count * 12 : plan.period.unit === 'month' ? plan.period.count : 0;
  if (months <= 1) return null;
  return Math.round((plan.price / months) * 100) / 100;
}

// ---------------------------------------------------------------------------
// Entitlement
// ---------------------------------------------------------------------------

/** Minimal shape of a store purchase (compatible with expo-iap's `Purchase`). */
export interface StorePurchase {
  productId: string;
  purchaseState: string;
  isAcknowledgedAndroid?: boolean | null;
  isSuspendedAndroid?: boolean | null;
  expirationDateIOS?: number | null;
  revocationDateIOS?: number | null;
}

/** Purchases that unlock Pro right now (paid, not suspended, not revoked, not expired). */
export function activeProPurchases<T extends StorePurchase>(purchases: readonly T[], now: number): T[] {
  return purchases.filter(
    (p) =>
      isProProduct(p.productId) &&
      p.purchaseState === 'purchased' &&
      !p.isSuspendedAndroid &&
      !p.revocationDateIOS &&
      (p.expirationDateIOS == null || p.expirationDateIOS > now),
  );
}

export function hasProEntitlement(purchases: readonly StorePurchase[], now: number): boolean {
  return activeProPurchases(purchases, now).length > 0;
}

/**
 * Last known subscription status. It keeps Pro available offline and while the
 * store connection starts; the store result always wins once it is available.
 */
export interface ProCache {
  active: boolean;
  checkedAt: number;
}

/** A monthly period plus buffer: without any store answer Pro expires after this time. */
export const PRO_CACHE_MAX_AGE_MS = 35 * 24 * 60 * 60 * 1000;

export function isProCacheValid(cache: ProCache | null | undefined, now: number): boolean {
  if (!cache?.active) return false;
  const age = now - cache.checkedAt;
  // A timestamp in the future means the clock was changed – do not trust it.
  return age >= -5 * 60 * 1000 && age <= PRO_CACHE_MAX_AGE_MS;
}
