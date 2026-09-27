import { AppState, Platform } from 'react-native';
import { create } from 'zustand';

import { kvGet, kvSet, PRO_STATUS_KEY } from '@/db/repos/kv';
import { activeProPurchases, isProCacheValid, isProProduct, type ProCache, type ProPlan } from '@/domain/pro';
import {
  billingAvailable,
  billingErrorMessage,
  BILLING_UNAVAILABLE_MESSAGE,
  completePurchase,
  listenToPurchases,
  loadPlans,
  needsAcknowledgement,
  openSubscriptionSettings,
  queryProPurchases,
  restoreProPurchases,
  startPurchase,
  type BillingPurchase,
} from '@/services/billing';

import { useToast } from './ui';

/**
 * Builds for your own phone (EAS profile "personal") unlock Pro without a
 * purchase. The value is fixed at build time – store builds never contain it.
 */
export const PRO_UNLOCKED_BUILD = process.env.EXPO_PUBLIC_PRO_UNLOCKED === '1';

/** Development builds and the web preview can simulate Pro to test the app. */
export const CAN_SIMULATE_PRO = __DEV__ || Platform.OS === 'web';

export type ProSource = 'store' | 'cache' | 'unlocked' | 'simulated';
export type PlansStatus = 'idle' | 'loading' | 'ready' | 'error';

interface StoredStatus extends ProCache {
  simulated?: boolean;
}

interface ProState {
  isPro: boolean;
  source: ProSource | null;
  hydrated: boolean;
  plans: ProPlan[];
  plansStatus: PlansStatus;
  plansError: string | null;
  purchasing: boolean;
  restoring: boolean;
  /** Reads the last known status (instant, works offline). */
  hydrate: () => Promise<void>;
  /** Connects to the store, listens for purchases and checks the subscription. */
  start: () => void;
  /** Asks the store which subscriptions are active. */
  refresh: () => Promise<void>;
  loadPlans: () => Promise<void>;
  purchase: (plan: ProPlan) => Promise<void>;
  restore: () => Promise<'restored' | 'none' | 'error'>;
  manageSubscription: () => Promise<void>;
  simulate: (on: boolean) => Promise<void>;
}

let started = false;
let lastRefresh = 0;
let purchaseTimer: ReturnType<typeof setTimeout> | null = null;

const REFRESH_INTERVAL_MS = 10 * 60 * 1000;

function toast(title: string, message?: string, kind: 'success' | 'info' | 'error' = 'info') {
  useToast.getState().show({ title, message, kind, icon: kind === 'success' ? 'crown' : undefined }, 3600);
}

export const usePro = create<ProState>((set, get) => {
  const fixedSource = () => get().source === 'unlocked' || get().source === 'simulated';

  const setStoreResult = async (active: boolean) => {
    if (fixedSource()) return;
    set({ isPro: active, source: active ? 'store' : null });
    const status: StoredStatus = { active, checkedAt: Date.now() };
    await kvSet(PRO_STATUS_KEY, status).catch(() => undefined);
  };

  const stopPurchasing = () => {
    if (purchaseTimer) clearTimeout(purchaseTimer);
    purchaseTimer = null;
    set({ purchasing: false });
  };

  const handlePurchase = async (purchase: BillingPurchase) => {
    if (!isProProduct(purchase.productId)) return;
    if (purchase.purchaseState === 'pending') {
      stopPurchasing();
      toast('Zahlung ausstehend', 'Pro wird freigeschaltet, sobald die Zahlung bestätigt ist.');
      return;
    }
    if (purchase.purchaseState !== 'purchased') return;
    try {
      await completePurchase(purchase);
    } catch {
      // Acknowledged again on the next refresh (Google allows three days).
    }
    const wasPro = get().isPro;
    await setStoreResult(true);
    stopPurchasing();
    if (!wasPro) toast('Willkommen bei Pro!', 'Alle Funktionen sind jetzt freigeschaltet.', 'success');
  };

  return {
    isPro: false,
    source: null,
    hydrated: false,
    plans: [],
    plansStatus: 'idle',
    plansError: null,
    purchasing: false,
    restoring: false,

    async hydrate() {
      if (PRO_UNLOCKED_BUILD) {
        set({ isPro: true, source: 'unlocked', hydrated: true });
        return;
      }
      const stored = await kvGet<StoredStatus>(PRO_STATUS_KEY).catch(() => null);
      if (stored?.simulated && CAN_SIMULATE_PRO) set({ isPro: true, source: 'simulated' });
      else if (isProCacheValid(stored, Date.now())) set({ isPro: true, source: 'cache' });
      set({ hydrated: true });
    },

    start() {
      if (started || !billingAvailable) return;
      started = true;
      listenToPurchases({
        onPurchase: (purchase) => void handlePurchase(purchase),
        onError: (message) => {
          stopPurchasing();
          if (message) toast('Kauf nicht abgeschlossen', message, 'error');
        },
      });
      AppState.addEventListener('change', (state) => {
        if (state === 'active' && Date.now() - lastRefresh > REFRESH_INTERVAL_MS) void get().refresh();
      });
      void get().refresh();
    },

    async refresh() {
      if (!billingAvailable || fixedSource()) return;
      lastRefresh = Date.now();
      try {
        const purchases = await queryProPurchases();
        const active = activeProPurchases(purchases, Date.now());
        for (const purchase of active) {
          if (needsAcknowledgement(purchase)) await completePurchase(purchase).catch(() => undefined);
        }
        await setStoreResult(active.length > 0);
      } catch {
        // Offline or store unavailable: keep the last known status.
      }
    },

    async loadPlans() {
      if (!billingAvailable) {
        set({ plansStatus: 'error', plansError: BILLING_UNAVAILABLE_MESSAGE });
        return;
      }
      set({ plansStatus: 'loading', plansError: null });
      try {
        const plans = await loadPlans();
        set({ plans, plansStatus: 'ready' });
      } catch (error) {
        set({ plansStatus: 'error', plansError: billingErrorMessage(error) });
      }
    },

    async purchase(plan) {
      if (get().purchasing) return;
      set({ purchasing: true });
      // The store reports the result through the listener; never block the button forever.
      purchaseTimer = setTimeout(stopPurchasing, 120_000);
      try {
        await startPurchase(plan);
      } catch (error) {
        stopPurchasing();
        toast('Kauf nicht möglich', billingErrorMessage(error), 'error');
      }
    },

    async restore() {
      if (!billingAvailable) {
        toast('Nicht verfügbar', BILLING_UNAVAILABLE_MESSAGE, 'error');
        return 'error';
      }
      set({ restoring: true });
      try {
        const purchases = await restoreProPurchases();
        const active = activeProPurchases(purchases, Date.now()).length > 0;
        await setStoreResult(active);
        toast(
          active ? 'Pro wiederhergestellt' : 'Kein aktives Abo gefunden',
          active ? undefined : 'Mit diesem Store-Konto wurde kein aktives Pro-Abo gefunden.',
          active ? 'success' : 'info',
        );
        return active ? 'restored' : 'none';
      } catch (error) {
        toast('Wiederherstellen fehlgeschlagen', billingErrorMessage(error), 'error');
        return 'error';
      } finally {
        set({ restoring: false });
      }
    },

    async manageSubscription() {
      await openSubscriptionSettings().catch(() => undefined);
    },

    async simulate(on) {
      if (!CAN_SIMULATE_PRO || PRO_UNLOCKED_BUILD) return;
      set({ isPro: on, source: on ? 'simulated' : null });
      const status: StoredStatus = { active: false, checkedAt: Date.now(), simulated: on };
      await kvSet(PRO_STATUS_KEY, status).catch(() => undefined);
      if (!on) void get().refresh();
    },
  };
});

/** Non-reactive access, e.g. in event handlers. */
export const getPro = () => usePro.getState();

export function useIsPro(): boolean {
  return usePro((s) => s.isPro);
}
