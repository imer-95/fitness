import { requireOptionalNativeModule } from 'expo';
import Constants from 'expo-constants';
import {
  deepLinkToSubscriptions,
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  isUserCancelledError,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  restorePurchases,
  type Purchase,
} from 'expo-iap';
import { Linking, Platform } from 'react-native';

import { isProProduct, plansFromProducts, PRO_PRODUCTS, type ProPlan } from '@/domain/pro';

/**
 * In-app subscriptions via Google Play Billing (Android) and StoreKit (iOS).
 * No server is involved: the store tells the app which subscriptions are active.
 * Expo Go and the web preview contain no store module (see billing.web.ts).
 */

export type BillingPurchase = Purchase;

export const billingAvailable =
  (Platform.OS === 'android' || Platform.OS === 'ios') && requireOptionalNativeModule('ExpoIap') != null;

export const STORE_NAME = Platform.OS === 'ios' ? 'App Store' : 'Google Play';

export const BILLING_UNAVAILABLE_MESSAGE =
  'In dieser Version der App sind keine Käufe möglich. Installiere Formkurve aus dem Play Store bzw. App Store.';

const ERROR_MESSAGES: Record<string, string> = {
  'network-error': 'Keine Verbindung zum Store. Bitte prüfe deine Internetverbindung.',
  'service-timeout': 'Der Store antwortet gerade nicht. Bitte versuche es gleich noch einmal.',
  'service-disconnected': 'Die Verbindung zum Store wurde unterbrochen. Bitte versuche es erneut.',
  'service-error': 'Der Store ist gerade nicht erreichbar. Bitte versuche es später erneut.',
  'remote-error': 'Der Store ist gerade nicht erreichbar. Bitte versuche es später erneut.',
  'billing-unavailable': `Käufe sind auf diesem Gerät nicht möglich. Bitte prüfe, ob du in ${STORE_NAME} angemeldet bist.`,
  'iap-not-available': `Käufe sind auf diesem Gerät nicht möglich. Bitte prüfe, ob du in ${STORE_NAME} angemeldet bist.`,
  'already-owned': 'Du hast Pro bereits. Tippe auf „Käufe wiederherstellen“.',
  'item-unavailable': 'Das Abo ist derzeit nicht verfügbar.',
  'sku-not-found': 'Das Abo ist derzeit nicht verfügbar.',
  'developer-error': 'Das Abo ist im Store noch nicht vollständig eingerichtet.',
  pending: 'Die Zahlung ist noch nicht abgeschlossen. Pro wird freigeschaltet, sobald sie bestätigt ist.',
  'deferred-payment': 'Der Kauf wartet auf eine Bestätigung. Pro wird danach automatisch freigeschaltet.',
};

/** German, user-facing message for a store error. */
export function billingErrorMessage(error: unknown): string {
  const code = error && typeof error === 'object' && 'code' in error ? String((error as { code: unknown }).code) : '';
  if (ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  if (error instanceof Error && error.message === BILLING_UNAVAILABLE_MESSAGE) return error.message;
  return 'Der Kauf konnte nicht abgeschlossen werden. Bitte versuche es später erneut.';
}

let connection: Promise<void> | null = null;

export function connectBilling(): Promise<void> {
  if (!billingAvailable) return Promise.reject(new Error(BILLING_UNAVAILABLE_MESSAGE));
  connection ??= initConnection()
    .then((connected) => {
      if (!connected) throw new Error(ERROR_MESSAGES['billing-unavailable']);
    })
    .catch((error: unknown) => {
      // Allow a new attempt later (e.g. after signing in to the store).
      connection = null;
      throw error;
    });
  return connection;
}

/** Purchases and errors of the purchase flow arrive asynchronously through these listeners. */
export function listenToPurchases(handlers: {
  onPurchase: (purchase: BillingPurchase) => void;
  /** `null` when the user cancelled the purchase. */
  onError: (message: string | null) => void;
}): () => void {
  if (!billingAvailable) return () => undefined;
  const updated = purchaseUpdatedListener((purchase) => handlers.onPurchase(purchase));
  const failed = purchaseErrorListener((error) =>
    handlers.onError(isUserCancelledError(error) ? null : billingErrorMessage(error)),
  );
  return () => {
    updated.remove();
    failed.remove();
  };
}

/** The Pro plans with prices from the store (localized, incl. VAT). */
export async function loadPlans(): Promise<ProPlan[]> {
  await connectBilling();
  const skus = Platform.OS === 'ios' ? [...PRO_PRODUCTS.ios] : [PRO_PRODUCTS.android];
  const products = (await fetchProducts({ skus, type: 'subs' })) ?? [];
  return plansFromProducts(products);
}

/** Pro purchases the store currently knows for the signed-in account. */
export async function queryProPurchases(): Promise<BillingPurchase[]> {
  await connectBilling();
  const purchases = await getAvailablePurchases({ onlyIncludeActiveItemsIOS: true });
  return purchases.filter((p) => isProProduct(p.productId));
}

/** Opens the purchase sheet of the store. The result arrives via `listenToPurchases`. */
export async function startPurchase(plan: ProPlan): Promise<void> {
  await connectBilling();
  if (Platform.OS === 'ios') {
    await requestPurchase({ type: 'subs', request: { apple: { sku: plan.productId } } });
    return;
  }
  if (!plan.offerToken) throw new Error(ERROR_MESSAGES['item-unavailable']);
  await requestPurchase({
    type: 'subs',
    request: {
      google: { skus: [plan.productId], subscriptionOffers: [{ sku: plan.productId, offerToken: plan.offerToken }] },
    },
  });
}

/**
 * Confirms a purchase to the store. Google refunds subscriptions that are not
 * acknowledged within three days; the App Store otherwise replays the transaction.
 */
export async function completePurchase(purchase: BillingPurchase): Promise<void> {
  await finishTransaction({ purchase, isConsumable: false });
}

export function needsAcknowledgement(purchase: BillingPurchase): boolean {
  return purchase.store === 'google' && 'isAcknowledgedAndroid' in purchase && purchase.isAcknowledgedAndroid === false;
}

export async function restoreProPurchases(): Promise<BillingPurchase[]> {
  await connectBilling();
  await restorePurchases();
  return queryProPurchases();
}

/** Opens the subscription settings of the store (change plan, cancel, payment method). */
export async function openSubscriptionSettings(): Promise<void> {
  const packageName = Constants.expoConfig?.android?.package ?? 'com.imer95.formkurve';
  if (billingAvailable) {
    try {
      await deepLinkToSubscriptions({ skuAndroid: PRO_PRODUCTS.android, packageNameAndroid: packageName });
      return;
    } catch {
      // fall back to the web page of the store
    }
  }
  await Linking.openURL(
    Platform.OS === 'ios'
      ? 'https://apps.apple.com/account/subscriptions'
      : `https://play.google.com/store/account/subscriptions?sku=${PRO_PRODUCTS.android}&package=${packageName}`,
  );
}
