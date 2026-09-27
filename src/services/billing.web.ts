import type { ProPlan, StorePurchase } from '@/domain/pro';

/**
 * Web preview: there is no app store in the browser. The paywall explains that
 * purchases are only possible in the installed app (see billing.ts).
 */

export type BillingPurchase = StorePurchase;

export const billingAvailable = false;

export const STORE_NAME = 'Google Play';

export const BILLING_UNAVAILABLE_MESSAGE =
  'In der Web-Vorschau sind keine Käufe möglich. Installiere Formkurve aus dem Play Store bzw. App Store.';

export function billingErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : BILLING_UNAVAILABLE_MESSAGE;
}

export function connectBilling(): Promise<void> {
  return Promise.reject(new Error(BILLING_UNAVAILABLE_MESSAGE));
}

export function listenToPurchases(): () => void {
  return () => undefined;
}

export async function loadPlans(): Promise<ProPlan[]> {
  throw new Error(BILLING_UNAVAILABLE_MESSAGE);
}

export async function queryProPurchases(): Promise<BillingPurchase[]> {
  return [];
}

export async function startPurchase(): Promise<void> {
  throw new Error(BILLING_UNAVAILABLE_MESSAGE);
}

export async function completePurchase(): Promise<void> {}

export function needsAcknowledgement(): boolean {
  return false;
}

export async function restoreProPurchases(): Promise<BillingPurchase[]> {
  return [];
}

export async function openSubscriptionSettings(): Promise<void> {
  window.open('https://play.google.com/store/account/subscriptions', '_blank', 'noopener');
}
