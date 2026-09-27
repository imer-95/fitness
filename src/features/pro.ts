import { router } from 'expo-router';

import { countTemplates } from '@/db/repos/templates';
import { canCreatePlan, type ProFeature } from '@/domain/pro';
import { getPro } from '@/state/pro';

/** Opens the paywall, optionally highlighting the feature the user tried to use. */
export function openPaywall(feature?: ProFeature): void {
  router.push(feature ? { pathname: '/pro', params: { feature } } : '/pro');
}

/** For event handlers: `true` with Pro, otherwise opens the paywall and returns `false`. */
export function requirePro(feature: ProFeature): boolean {
  if (getPro().isPro) return true;
  openPaywall(feature);
  return false;
}

/** Checks the plan limit of the free version before a new plan is created. */
export async function requirePlanSlot(): Promise<boolean> {
  if (getPro().isPro) return true;
  if (canCreatePlan(await countTemplates(), false)) return true;
  openPaywall('unlimitedPlans');
  return false;
}
