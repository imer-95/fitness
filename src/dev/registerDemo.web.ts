import type { ProPlan } from '@/domain/pro';
import { usePro } from '@/state/pro';

import { seedDemoData } from './demoData';

/** Example plans as Google Play would deliver them (for screenshots of the paywall). */
const DEMO_PLANS: ProPlan[] = [
  {
    id: 'demo-monthly',
    productId: 'formkurve_pro',
    basePlanId: 'monatlich',
    offerToken: 'demo',
    period: { unit: 'month', count: 1 },
    price: 4.99,
    priceText: '4,99 €',
    currency: 'EUR',
    trialDays: 7,
  },
  {
    id: 'demo-yearly',
    productId: 'formkurve_pro',
    basePlanId: 'jaehrlich',
    offerToken: 'demo',
    period: { unit: 'year', count: 1 },
    price: 39.99,
    priceText: '39,99 €',
    currency: 'EUR',
    trialDays: null,
  },
];

/**
 * Web preview only: exposes helpers for screenshots and trying out the UI.
 *   window.__formkurveDemo()       fills the database with sample data
 *   window.__formkurveDemoPlans()  shows example prices on the paywall
 */
export function registerDemoData(): void {
  const global = globalThis as { __formkurveDemo?: () => Promise<void>; __formkurveDemoPlans?: () => void };
  global.__formkurveDemo = seedDemoData;
  global.__formkurveDemoPlans = () => {
    usePro.setState({ plans: DEMO_PLANS, plansStatus: 'ready', plansError: null });
  };
}
