import { isValidBarcode, mapOffProduct } from '@/domain/openFoodFacts';

describe('Open Food Facts mapping', () => {
  test('maps a typical product', () => {
    const food = mapOffProduct({
      code: '3017620422003',
      product_name: 'Nutella',
      brands: 'Ferrero, Nutella',
      quantity: '400 g',
      serving_size: '15 g',
      serving_quantity: 15,
      nutriments: {
        'energy-kcal_100g': 539,
        proteins_100g: 6.3,
        carbohydrates_100g: 57.5,
        fat_100g: 30.9,
        sugars_100g: 56.3,
        salt_100g: 0.107,
      },
    });
    expect(food).toEqual({
      barcode: '3017620422003',
      name: 'Nutella',
      brand: 'Ferrero',
      unit: 'g',
      kcal: 539,
      protein: 6.3,
      carbs: 57.5,
      fat: 30.9,
      fiber: null,
      sugar: 56.3,
      salt: 0.11,
      servingSize: 15,
      servingLabel: '15 g',
    });
  });

  test('prefers German names, converts kJ and detects ml', () => {
    const food = mapOffProduct(
      {
        product_name: 'Milk',
        product_name_de: 'Frische Vollmilch',
        quantity: '1 l',
        nutriments: { energy_100g: '268', proteins_100g: '3,4', fat_100g: 3.5 },
      },
      '4000000000000',
    );
    expect(food?.name).toBe('Frische Vollmilch');
    expect(food?.kcal).toBe(64);
    expect(food?.protein).toBe(3.4);
    expect(food?.unit).toBe('ml');
    expect(food?.barcode).toBe('4000000000000');
    expect(food?.carbs).toBe(0);
  });

  test('rejects products without name or energy', () => {
    expect(mapOffProduct({ product_name: '', nutriments: { 'energy-kcal_100g': 100 } })).toBeNull();
    expect(mapOffProduct({ product_name: 'X', nutriments: {} })).toBeNull();
    expect(mapOffProduct(undefined)).toBeNull();
  });

  test('validates EAN check digits', () => {
    expect(isValidBarcode('3017620422003')).toBe(true);
    expect(isValidBarcode('3017620422004')).toBe(false);
    expect(isValidBarcode('96385074')).toBe(true);
    expect(isValidBarcode('12345')).toBe(false);
  });
});
