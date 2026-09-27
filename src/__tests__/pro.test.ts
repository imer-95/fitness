import { formatCurrency } from '@/domain/format';
import {
  activeProPurchases,
  canCreatePlan,
  FREE_PLAN_LIMIT,
  hasProEntitlement,
  isProCacheValid,
  isProWeightRange,
  monthlyEquivalent,
  parseIsoPeriod,
  periodDuration,
  periodLabel,
  planName,
  plansFromProducts,
  PRO_CACHE_MAX_AGE_MS,
  PRO_FEATURES,
  proFeatureInfo,
  yearlySavingsPercent,
  type StorePricingPhase,
  type StoreSubscriptionProduct,
} from '@/domain/pro';

function phase(billingPeriod: string, micros: number, recurrenceMode: number, cycles = 0): StorePricingPhase {
  return {
    billingPeriod,
    formattedPrice: micros === 0 ? 'Kostenlos' : `${(micros / 1e6).toFixed(2).replace('.', ',')} €`,
    priceAmountMicros: String(micros),
    priceCurrencyCode: 'EUR',
    billingCycleCount: cycles,
    recurrenceMode,
  };
}

const ANDROID_PRODUCT: StoreSubscriptionProduct = {
  id: 'formkurve_pro',
  platform: 'android',
  displayPrice: '4,99 €',
  price: 4.99,
  currency: 'EUR',
  subscriptionOffers: [
    {
      id: 'monatlich',
      basePlanIdAndroid: 'monatlich',
      offerTokenAndroid: 'token-monthly',
      displayPrice: '4,99 €',
      price: 4.99,
      pricingPhasesAndroid: { pricingPhaseList: [phase('P1M', 4_990_000, 1)] },
    },
    {
      id: 'probewoche',
      basePlanIdAndroid: 'monatlich',
      offerTokenAndroid: 'token-trial',
      displayPrice: 'Kostenlos',
      price: 0,
      pricingPhasesAndroid: { pricingPhaseList: [phase('P1W', 0, 2, 1), phase('P1M', 4_990_000, 1)] },
    },
    {
      id: 'jaehrlich',
      basePlanIdAndroid: 'jaehrlich',
      offerTokenAndroid: 'token-yearly',
      displayPrice: '39,99 €',
      price: 39.99,
      pricingPhasesAndroid: { pricingPhaseList: [phase('P1Y', 39_990_000, 1)] },
    },
  ],
};

describe('Pro features and limits', () => {
  test('every feature has a description and can be looked up', () => {
    expect(PRO_FEATURES.length).toBeGreaterThanOrEqual(5);
    for (const f of PRO_FEATURES) {
      expect(f.title.length).toBeGreaterThan(3);
      expect(proFeatureInfo(f.id)).toBe(f);
    }
    expect(proFeatureInfo('unknown')).toBeNull();
    expect(proFeatureInfo(undefined)).toBeNull();
  });

  test('plan limit of the free version', () => {
    expect(canCreatePlan(FREE_PLAN_LIMIT - 1, false)).toBe(true);
    expect(canCreatePlan(FREE_PLAN_LIMIT, false)).toBe(false);
    expect(canCreatePlan(50, true)).toBe(true);
  });

  test('long weight ranges need Pro', () => {
    expect(isProWeightRange('30')).toBe(false);
    expect(isProWeightRange('90')).toBe(false);
    expect(isProWeightRange('365')).toBe(true);
    expect(isProWeightRange('all')).toBe(true);
  });
});

describe('billing periods', () => {
  test('parses ISO 8601 periods of Google Play', () => {
    expect(parseIsoPeriod('P1M')).toEqual({ unit: 'month', count: 1 });
    expect(parseIsoPeriod('P1Y')).toEqual({ unit: 'year', count: 1 });
    expect(parseIsoPeriod('P7D')).toEqual({ unit: 'day', count: 7 });
    expect(parseIsoPeriod('p3m')).toEqual({ unit: 'month', count: 3 });
    expect(parseIsoPeriod('P0M')).toBeNull();
    expect(parseIsoPeriod('monthly')).toBeNull();
    expect(parseIsoPeriod(null)).toBeNull();
  });

  test('labels', () => {
    expect(periodLabel({ unit: 'month', count: 1 })).toBe('Monat');
    expect(periodLabel({ unit: 'month', count: 3 })).toBe('3 Monate');
    expect(periodDuration({ unit: 'month', count: 1 })).toBe('1 Monat');
    expect(periodDuration({ unit: 'day', count: 7 })).toBe('7 Tage');
    expect(planName({ unit: 'year', count: 1 })).toBe('Jährlich');
    expect(planName({ unit: 'month', count: 1 })).toBe('Monatlich');
    expect(planName({ unit: 'month', count: 6 })).toBe('Alle 6 Monate');
  });
});

describe('paywall plans', () => {
  test('one plan per Google Play base plan, preferring the free trial offer', () => {
    const plans = plansFromProducts([ANDROID_PRODUCT]);
    expect(plans).toHaveLength(2);
    const [monthly, yearly] = plans;
    expect(monthly).toMatchObject({
      productId: 'formkurve_pro',
      basePlanId: 'monatlich',
      offerToken: 'token-trial',
      period: { unit: 'month', count: 1 },
      price: 4.99,
      priceText: '4,99 €',
      currency: 'EUR',
      trialDays: 7,
    });
    expect(yearly).toMatchObject({
      basePlanId: 'jaehrlich',
      offerToken: 'token-yearly',
      trialDays: null,
      price: 39.99,
    });
  });

  test('without a trial offer the base plan is used', () => {
    const product = { ...ANDROID_PRODUCT, subscriptionOffers: ANDROID_PRODUCT.subscriptionOffers!.slice(0, 1) };
    const [plan] = plansFromProducts([product]);
    expect(plan.offerToken).toBe('token-monthly');
    expect(plan.trialDays).toBeNull();
  });

  test('App Store products become one plan each, sorted by duration', () => {
    const ios = (id: string, unit: string, price: number): StoreSubscriptionProduct => ({
      id,
      platform: 'ios',
      displayPrice: `${price} €`,
      price,
      currency: 'EUR',
      subscriptionPeriodUnitIOS: unit,
      subscriptionPeriodNumberIOS: '1',
    });
    const plans = plansFromProducts([
      ios('formkurve_pro_jaehrlich', 'year', 39.99),
      ios('formkurve_pro_monatlich', 'month', 4.99),
      ios('something_else', 'month', 1.99),
    ]);
    expect(plans.map((p) => p.productId)).toEqual(['formkurve_pro_monatlich', 'formkurve_pro_jaehrlich']);
    expect(plans[0].offerToken).toBeNull();
  });

  test('savings and monthly equivalent of the yearly plan', () => {
    const plans = plansFromProducts([ANDROID_PRODUCT]);
    expect(yearlySavingsPercent(plans)).toBe(33);
    expect(monthlyEquivalent(plans[1])).toBe(3.33);
    expect(monthlyEquivalent(plans[0])).toBeNull();
    expect(yearlySavingsPercent(plans.slice(0, 1))).toBeNull();
    expect(formatCurrency(3.33, 'EUR')).toBe('3,33 €');
    expect(formatCurrency(1234.5, 'USD')).toBe('1.234,50 $');
  });
});

describe('entitlement', () => {
  const now = Date.UTC(2026, 8, 26);

  test('only paid, current Pro purchases unlock Pro', () => {
    const base = { productId: 'formkurve_pro', purchaseState: 'purchased' };
    expect(hasProEntitlement([base], now)).toBe(true);
    expect(hasProEntitlement([{ ...base, purchaseState: 'pending' }], now)).toBe(false);
    expect(hasProEntitlement([{ ...base, isSuspendedAndroid: true }], now)).toBe(false);
    expect(hasProEntitlement([{ ...base, productId: 'other' }], now)).toBe(false);
    expect(hasProEntitlement([], now)).toBe(false);
  });

  test('App Store expiry and revocation', () => {
    const ios = { productId: 'formkurve_pro_monatlich', purchaseState: 'purchased' };
    expect(hasProEntitlement([{ ...ios, expirationDateIOS: now + 1000 }], now)).toBe(true);
    expect(hasProEntitlement([{ ...ios, expirationDateIOS: now - 1000 }], now)).toBe(false);
    expect(hasProEntitlement([{ ...ios, revocationDateIOS: now - 5000 }], now)).toBe(false);
    expect(activeProPurchases([ios, { ...ios, purchaseState: 'unknown' }], now)).toHaveLength(1);
  });

  test('cached status keeps Pro for a limited time only', () => {
    expect(isProCacheValid({ active: true, checkedAt: now - 1000 }, now)).toBe(true);
    expect(isProCacheValid({ active: true, checkedAt: now - PRO_CACHE_MAX_AGE_MS + 1000 }, now)).toBe(true);
    expect(isProCacheValid({ active: true, checkedAt: now - PRO_CACHE_MAX_AGE_MS - 1000 }, now)).toBe(false);
    expect(isProCacheValid({ active: true, checkedAt: now + 60 * 60 * 1000 }, now)).toBe(false);
    expect(isProCacheValid({ active: false, checkedAt: now }, now)).toBe(false);
    expect(isProCacheValid(null, now)).toBe(false);
  });
});
