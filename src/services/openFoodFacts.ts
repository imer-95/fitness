import Constants from 'expo-constants';

import { mapOffProduct, OFF_FIELDS, type OffFood, type OffProduct } from '@/domain/openFoodFacts';

/**
 * Open Food Facts — free, open food database with very good coverage of
 * German supermarket products. https://world.openfoodfacts.org
 */

const BASE = 'https://world.openfoodfacts.org';
const TIMEOUT_MS = 12_000;

function userAgent(): string {
  const version = Constants.expoConfig?.version ?? '1.0.0';
  return `Formkurve/${version} (private fitness app)`;
}

async function getJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'User-Agent': userAgent() },
    });
    if (response.status === 404) return {} as T;
    if (!response.ok) throw new Error(`Open Food Facts antwortet mit Status ${response.status}.`);
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Zeitüberschreitung – bitte Internetverbindung prüfen.');
    }
    if (error instanceof TypeError) {
      throw new Error('Keine Verbindung zu Open Food Facts – bitte Internetverbindung prüfen.');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/** Product by EAN/UPC barcode, `null` if unknown or without nutrition data. */
export async function fetchProductByBarcode(barcode: string): Promise<OffFood | null> {
  const data = await getJson<{ status?: number | string; product?: OffProduct }>(
    `${BASE}/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${OFF_FIELDS}`,
  );
  if (!data.product) return null;
  return mapOffProduct(data.product, barcode);
}

/** Full-text search (German products first). */
export async function searchProducts(query: string): Promise<OffFood[]> {
  const params = [
    `search_terms=${encodeURIComponent(query)}`,
    'search_simple=1',
    'action=process',
    'json=1',
    'page_size=30',
    'sort_by=unique_scans_n',
    'lc=de',
    'cc=de',
    `fields=${OFF_FIELDS}`,
  ].join('&');
  const data = await getJson<{ products?: OffProduct[] }>(`${BASE}/cgi/search.pl?${params}`);
  return (data.products ?? []).map((p) => mapOffProduct(p)).filter((p): p is OffFood => p != null);
}
