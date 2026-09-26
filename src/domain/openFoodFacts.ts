import { tidy } from './format';
import type { FoodUnit } from './types';

/**
 * Mapping of Open Food Facts (https://world.openfoodfacts.org) product data
 * to the app's food model. Values are per 100 g / 100 ml.
 */

export interface OffNutriments {
  'energy-kcal_100g'?: number | string;
  'energy-kj_100g'?: number | string;
  energy_100g?: number | string;
  proteins_100g?: number | string;
  carbohydrates_100g?: number | string;
  fat_100g?: number | string;
  fiber_100g?: number | string;
  sugars_100g?: number | string;
  salt_100g?: number | string;
}

export interface OffProduct {
  code?: string;
  product_name?: string;
  product_name_de?: string;
  generic_name_de?: string;
  brands?: string;
  quantity?: string;
  serving_size?: string;
  serving_quantity?: number | string;
  nutriments?: OffNutriments;
}

export interface OffFood {
  barcode: string | null;
  name: string;
  brand: string | null;
  unit: FoodUnit;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  sugar: number | null;
  salt: number | null;
  servingSize: number | null;
  servingLabel: string | null;
}

export const OFF_FIELDS = [
  'code',
  'product_name',
  'product_name_de',
  'generic_name_de',
  'brands',
  'quantity',
  'serving_size',
  'serving_quantity',
  'nutriments',
].join(',');

function num(value: number | string | undefined): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function firstBrand(brands: string | undefined): string | null {
  if (!brands) return null;
  const first = brands.split(',')[0]?.trim();
  return first ? first : null;
}

function detectUnit(product: OffProduct): FoodUnit {
  const text = `${product.quantity ?? ''} ${product.serving_size ?? ''}`.toLowerCase();
  return /\d\s*(ml|cl|l)\b/.test(text) ? 'ml' : 'g';
}

/** Returns `null` if the product has no usable name or energy value. */
export function mapOffProduct(product: OffProduct | null | undefined, barcode?: string): OffFood | null {
  if (!product) return null;
  const name = (product.product_name_de || product.product_name || product.generic_name_de || '').trim();
  if (!name) return null;
  const n = product.nutriments ?? {};
  let kcal = num(n['energy-kcal_100g']);
  if (kcal == null) {
    const kj = num(n['energy-kj_100g']) ?? num(n.energy_100g);
    if (kj != null) kcal = kj / 4.184;
  }
  if (kcal == null) return null;
  const servingSize = num(product.serving_quantity);
  return {
    barcode: product.code ?? barcode ?? null,
    name,
    brand: firstBrand(product.brands),
    unit: detectUnit(product),
    kcal: Math.round(kcal),
    protein: tidy(num(n.proteins_100g) ?? 0, 1),
    carbs: tidy(num(n.carbohydrates_100g) ?? 0, 1),
    fat: tidy(num(n.fat_100g) ?? 0, 1),
    fiber: num(n.fiber_100g) != null ? tidy(num(n.fiber_100g)!, 1) : null,
    sugar: num(n.sugars_100g) != null ? tidy(num(n.sugars_100g)!, 1) : null,
    salt: num(n.salt_100g) != null ? tidy(num(n.salt_100g)!, 2) : null,
    servingSize: servingSize && servingSize > 0 ? servingSize : null,
    servingLabel: product.serving_size?.trim() || null,
  };
}

/** Valid EAN-8 / EAN-13 / UPC-A check digit. */
export function isValidBarcode(code: string): boolean {
  if (!/^\d{8}$|^\d{12,14}$/.test(code)) return false;
  const digits = code.split('').map(Number);
  const check = digits.pop()!;
  let total = 0;
  digits.reverse().forEach((d, i) => {
    total += i % 2 === 0 ? d * 3 : d;
  });
  return (10 - (total % 10)) % 10 === check;
}
