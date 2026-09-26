import type { FoodUnit } from '@/domain/types';

export interface SeedFood {
  id: string;
  name: string;
  category: string;
  unit: FoodUnit;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize?: number;
  servingLabel?: string;
}

type Row = [
  id: string,
  name: string,
  unit: FoodUnit,
  kcal: number,
  protein: number,
  carbs: number,
  fat: number,
  servingSize?: number,
  servingLabel?: string,
];

/**
 * Built-in basic foods with typical average values per 100 g / 100 ml
 * (rounded reference values, e.g. from the German nutrient tables).
 * Branded products come from the barcode scanner / Open Food Facts.
 */
const CATEGORIES: Record<string, Row[]> = {
  'Getreide & Beilagen': [
    ['food-oats', 'Haferflocken', 'g', 372, 13.5, 58.7, 7, 50, 'Portion'],
    ['food-wholegrain-bread', 'Vollkornbrot', 'g', 220, 7.3, 38, 1.9, 50, 'Scheibe'],
    ['food-mixed-bread', 'Mischbrot', 'g', 230, 6.8, 45, 1.3, 45, 'Scheibe'],
    ['food-toast', 'Toastbrot', 'g', 260, 8, 48, 3.5, 25, 'Scheibe'],
    ['food-roll', 'Brötchen (Weizen)', 'g', 270, 8.5, 54, 1.5, 55, 'Stück'],
    ['food-wholegrain-roll', 'Vollkornbrötchen', 'g', 240, 9, 43, 2.5, 60, 'Stück'],
    ['food-crispbread', 'Knäckebrot', 'g', 330, 9.5, 62, 1.5, 10, 'Scheibe'],
    ['food-rice-cake', 'Reiswaffel', 'g', 390, 8, 81, 3, 8, 'Stück'],
    ['food-wrap', 'Tortilla-Wrap (Weizen)', 'g', 300, 8.5, 50, 7, 60, 'Wrap'],
    ['food-rice-raw', 'Reis (roh)', 'g', 350, 7, 78, 0.6, 75, 'Portion roh'],
    ['food-rice-cooked', 'Reis (gekocht)', 'g', 130, 2.7, 28, 0.3, 200, 'Portion'],
    ['food-pasta-raw', 'Nudeln (roh)', 'g', 355, 12.5, 71, 1.5, 100, 'Portion roh'],
    ['food-pasta-cooked', 'Nudeln (gekocht)', 'g', 150, 5.3, 30, 0.9, 250, 'Portion'],
    ['food-wholegrain-pasta', 'Vollkornnudeln (roh)', 'g', 340, 13.5, 64, 2.5, 100, 'Portion roh'],
    ['food-potatoes', 'Kartoffeln (gekocht)', 'g', 72, 2, 15, 0.1, 200, 'Portion'],
    ['food-sweet-potato', 'Süßkartoffel', 'g', 86, 1.6, 20, 0.1, 200, 'Portion'],
    ['food-fries', 'Pommes frites (zubereitet)', 'g', 290, 3.4, 36, 15, 150, 'Portion'],
    ['food-couscous', 'Couscous (roh)', 'g', 360, 12.5, 72, 1, 70, 'Portion roh'],
    ['food-quinoa', 'Quinoa (roh)', 'g', 368, 14, 64, 6, 70, 'Portion roh'],
    ['food-cornflakes', 'Cornflakes', 'g', 380, 7, 84, 0.9, 40, 'Portion'],
    ['food-muesli', 'Müsli (ungesüßt)', 'g', 360, 10, 60, 7, 60, 'Portion'],
    ['food-granola', 'Knuspermüsli', 'g', 450, 9, 62, 17, 50, 'Portion'],
  ],
  'Fleisch & Fisch': [
    ['food-chicken-breast', 'Hähnchenbrust (roh)', 'g', 105, 23.5, 0, 1.2, 150, 'Filet'],
    ['food-chicken-breast-cooked', 'Hähnchenbrust (gebraten)', 'g', 160, 30, 0, 3.5, 120, 'Filet'],
    ['food-turkey-breast', 'Putenbrust (roh)', 'g', 105, 24, 0, 1, 150, 'Filet'],
    ['food-beef-mince-lean', 'Rinderhack mager (5 %)', 'g', 129, 21, 0, 5, 125, 'Portion'],
    ['food-beef-mince', 'Rinderhackfleisch', 'g', 243, 18, 0, 19, 125, 'Portion'],
    ['food-mixed-mince', 'Hackfleisch gemischt', 'g', 261, 18, 0, 21, 125, 'Portion'],
    ['food-steak', 'Rindersteak (Hüfte)', 'g', 124, 22, 0, 4, 200, 'Steak'],
    ['food-pork-fillet', 'Schweinefilet', 'g', 105, 21, 0, 2, 150, 'Portion'],
    ['food-ham', 'Kochschinken', 'g', 110, 19.5, 1, 3.3, 20, 'Scheibe'],
    ['food-turkey-cold-cuts', 'Putenbrust-Aufschnitt', 'g', 100, 21, 1.5, 1, 20, 'Scheibe'],
    ['food-salami', 'Salami', 'g', 380, 21, 0.5, 33, 10, 'Scheibe'],
    ['food-salmon', 'Lachs (roh)', 'g', 200, 20, 0, 13.5, 125, 'Filet'],
    ['food-tuna-can', 'Thunfisch (Dose, eigener Saft)', 'g', 110, 25, 0, 1, 150, 'Dose (abgetropft)'],
    ['food-cod', 'Seelachs / Kabeljau', 'g', 75, 17, 0, 0.7, 150, 'Filet'],
    ['food-shrimp', 'Garnelen', 'g', 85, 18.5, 0, 1, 100, 'Portion'],
  ],
  'Milch & Eier': [
    ['food-egg', 'Ei (Hühnerei)', 'g', 150, 12.5, 0.7, 10.5, 60, 'Ei (M)'],
    ['food-egg-white', 'Eiklar', 'g', 50, 11, 0.7, 0.2, 35, 'Eiweiß von 1 Ei'],
    ['food-milk-15', 'Milch 1,5 %', 'ml', 47, 3.4, 4.9, 1.5, 250, 'Glas'],
    ['food-milk-35', 'Milch 3,5 %', 'ml', 64, 3.3, 4.8, 3.5, 250, 'Glas'],
    ['food-oat-drink', 'Haferdrink', 'ml', 50, 1, 6.5, 2, 250, 'Glas'],
    ['food-soy-drink', 'Sojadrink', 'ml', 39, 3, 2.5, 1.8, 250, 'Glas'],
    ['food-low-fat-quark', 'Magerquark', 'g', 67, 12, 4, 0.3, 250, 'Becher'],
    ['food-quark-20', 'Speisequark 20 %', 'g', 110, 12.5, 3, 5, 250, 'Becher'],
    ['food-skyr', 'Skyr (natur)', 'g', 63, 11, 4, 0.2, 150, 'Becher'],
    ['food-greek-yoghurt', 'Griechischer Joghurt 10 %', 'g', 122, 4, 4, 10, 150, 'Portion'],
    ['food-yoghurt-15', 'Naturjoghurt 1,5 %', 'g', 47, 4, 5, 1.5, 150, 'Becher'],
    ['food-yoghurt-35', 'Naturjoghurt 3,5 %', 'g', 64, 3.9, 4.6, 3.5, 150, 'Becher'],
    ['food-cottage-cheese', 'Körniger Frischkäse', 'g', 99, 12.5, 2.5, 4.3, 200, 'Becher'],
    ['food-gouda', 'Gouda (45 %)', 'g', 360, 25, 0, 29, 25, 'Scheibe'],
    ['food-mozzarella', 'Mozzarella', 'g', 250, 18.5, 1, 19, 125, 'Kugel'],
    ['food-feta', 'Feta', 'g', 260, 17, 0.7, 21, 50, 'Portion'],
    ['food-parmesan', 'Parmesan', 'g', 400, 35, 0, 29, 10, 'EL gerieben'],
    ['food-cream-cheese', 'Frischkäse (natur)', 'g', 225, 5.5, 4, 21, 30, 'Portion'],
    ['food-butter', 'Butter', 'g', 741, 0.7, 0.6, 83, 10, 'Portion'],
    ['food-cream', 'Sahne 30 %', 'ml', 290, 2.4, 3.2, 30, 20, 'Schuss'],
    ['food-whey', 'Whey Protein (Pulver)', 'g', 385, 75, 8, 6, 30, 'Messlöffel'],
    ['food-protein-bar', 'Proteinriegel', 'g', 350, 32, 35, 9, 60, 'Riegel'],
  ],
  Obst: [
    ['food-apple', 'Apfel', 'g', 54, 0.3, 12, 0.2, 150, 'Stück'],
    ['food-banana', 'Banane', 'g', 93, 1.1, 20, 0.2, 120, 'Stück (geschält)'],
    ['food-orange', 'Orange', 'g', 47, 1, 9, 0.2, 180, 'Stück (geschält)'],
    ['food-pear', 'Birne', 'g', 55, 0.4, 12.4, 0.3, 160, 'Stück'],
    ['food-strawberries', 'Erdbeeren', 'g', 32, 0.8, 5.5, 0.4, 150, 'Schale'],
    ['food-blueberries', 'Heidelbeeren', 'g', 42, 0.6, 7.4, 0.6, 125, 'Schale'],
    ['food-raspberries', 'Himbeeren', 'g', 36, 1.3, 4.8, 0.3, 125, 'Schale'],
    ['food-grapes', 'Weintrauben', 'g', 70, 0.7, 16, 0.3, 125, 'Portion'],
    ['food-kiwi', 'Kiwi', 'g', 55, 1, 10, 0.6, 75, 'Stück'],
    ['food-mango', 'Mango', 'g', 60, 0.6, 13, 0.4, 150, 'Portion'],
    ['food-pineapple', 'Ananas', 'g', 55, 0.5, 12, 0.2, 150, 'Portion'],
    ['food-watermelon', 'Wassermelone', 'g', 30, 0.6, 7, 0.2, 250, 'Stück'],
    ['food-avocado', 'Avocado', 'g', 160, 2, 2, 15, 80, 'halbe Avocado'],
    ['food-dates', 'Datteln (getrocknet)', 'g', 280, 2.5, 65, 0.5, 8, 'Stück'],
    ['food-raisins', 'Rosinen', 'g', 300, 2.5, 68, 0.6, 20, 'Handvoll'],
  ],
  'Gemüse & Hülsenfrüchte': [
    ['food-broccoli', 'Brokkoli', 'g', 34, 3.5, 2.7, 0.2, 200, 'Portion'],
    ['food-cauliflower', 'Blumenkohl', 'g', 25, 2, 2.3, 0.3, 200, 'Portion'],
    ['food-green-beans', 'Grüne Bohnen', 'g', 30, 2, 5, 0.2, 200, 'Portion'],
    ['food-tomato', 'Tomate', 'g', 18, 1, 3, 0.2, 100, 'Stück'],
    ['food-cucumber', 'Gurke', 'g', 12, 0.6, 1.8, 0.2, 100, 'Portion'],
    ['food-bell-pepper', 'Paprika', 'g', 31, 1, 6, 0.3, 150, 'Stück'],
    ['food-carrot', 'Karotte', 'g', 36, 0.9, 7, 0.2, 80, 'Stück'],
    ['food-lettuce', 'Blattsalat', 'g', 14, 1, 1.6, 0.2, 100, 'Portion'],
    ['food-spinach', 'Spinat', 'g', 23, 2.9, 1.4, 0.4, 150, 'Portion'],
    ['food-zucchini', 'Zucchini', 'g', 19, 1.6, 2.2, 0.4, 200, 'Stück'],
    ['food-mushrooms', 'Champignons', 'g', 22, 3.1, 0.6, 0.3, 150, 'Portion'],
    ['food-onion', 'Zwiebel', 'g', 40, 1.2, 7, 0.3, 80, 'Stück'],
    ['food-corn', 'Mais (Dose)', 'g', 85, 2.9, 15, 1.2, 140, 'kleine Dose'],
    ['food-peas', 'Erbsen (TK)', 'g', 81, 6.6, 12.3, 0.5, 150, 'Portion'],
    ['food-chickpeas', 'Kichererbsen (Dose)', 'g', 120, 7, 16, 2.5, 240, 'Dose (abgetropft)'],
    ['food-kidney-beans', 'Kidneybohnen (Dose)', 'g', 90, 6.5, 12, 0.5, 250, 'Dose (abgetropft)'],
    ['food-lentils', 'Linsen (roh)', 'g', 340, 24, 50, 1.5, 70, 'Portion roh'],
    ['food-tofu', 'Tofu (natur)', 'g', 120, 13, 1.5, 7, 100, 'Portion'],
    ['food-passata', 'Passierte Tomaten', 'g', 30, 1.4, 5, 0.2, 200, 'Portion'],
  ],
  'Nüsse & Fette': [
    ['food-almonds', 'Mandeln', 'g', 580, 21, 9.5, 50, 25, 'Handvoll'],
    ['food-walnuts', 'Walnüsse', 'g', 654, 15, 7, 65, 25, 'Handvoll'],
    ['food-peanuts', 'Erdnüsse (geröstet)', 'g', 590, 25, 12, 49, 25, 'Handvoll'],
    ['food-cashews', 'Cashewkerne', 'g', 575, 18, 30, 44, 25, 'Handvoll'],
    ['food-peanut-butter', 'Erdnussbutter', 'g', 600, 25, 13, 50, 15, 'EL'],
    ['food-olive-oil', 'Olivenöl', 'g', 884, 0, 0, 100, 10, 'EL'],
    ['food-rapeseed-oil', 'Rapsöl', 'g', 884, 0, 0, 100, 10, 'EL'],
  ],
  'Snacks & Süßes': [
    ['food-dark-chocolate', 'Zartbitterschokolade (70 %)', 'g', 550, 8, 33, 42, 20, '2 Riegel'],
    ['food-milk-chocolate', 'Vollmilchschokolade', 'g', 535, 7.5, 55, 31, 20, '2 Riegel'],
    ['food-gummy-bears', 'Fruchtgummi', 'g', 340, 6.9, 77, 0.1, 25, 'Handvoll'],
    ['food-chips', 'Kartoffelchips', 'g', 535, 6, 50, 34, 30, 'Handvoll'],
    ['food-honey', 'Honig', 'g', 304, 0.3, 76, 0, 20, 'TL (gehäuft)'],
    ['food-jam', 'Konfitüre', 'g', 250, 0.4, 60, 0.1, 20, 'Portion'],
    ['food-nut-nougat', 'Nuss-Nougat-Creme', 'g', 539, 6.3, 57.5, 30.9, 15, 'Portion'],
    ['food-sugar', 'Zucker', 'g', 400, 0, 100, 0, 5, 'TL'],
    ['food-croissant', 'Croissant', 'g', 406, 8.2, 45.8, 21, 60, 'Stück'],
    ['food-pizza', 'Pizza Margherita', 'g', 240, 10, 30, 8.5, 350, 'Pizza'],
  ],
  Getränke: [
    ['food-orange-juice', 'Orangensaft', 'ml', 43, 0.7, 9, 0.2, 200, 'Glas'],
    ['food-apple-juice', 'Apfelsaft', 'ml', 46, 0.1, 11, 0.1, 200, 'Glas'],
    ['food-apple-spritzer', 'Apfelschorle', 'ml', 23, 0, 5.5, 0, 330, 'Glas'],
    ['food-cola', 'Cola', 'ml', 42, 0, 10.6, 0, 330, 'Dose'],
    ['food-cola-zero', 'Cola Zero', 'ml', 0.3, 0, 0, 0, 330, 'Dose'],
    ['food-energy-drink', 'Energy Drink', 'ml', 45, 0, 11, 0, 250, 'Dose'],
    ['food-beer', 'Bier (Pils)', 'ml', 42, 0.5, 3, 0, 500, 'Flasche'],
    ['food-red-wine', 'Rotwein', 'ml', 85, 0.1, 2.6, 0, 200, 'Glas'],
    ['food-coffee', 'Kaffee (schwarz)', 'ml', 2, 0.2, 0.3, 0, 200, 'Tasse'],
  ],
  Sonstiges: [
    ['food-hummus', 'Hummus', 'g', 170, 7.5, 9, 10.5, 50, 'Portion'],
    ['food-ketchup', 'Ketchup', 'g', 100, 1.2, 23, 0.2, 15, 'EL'],
    ['food-mayonnaise', 'Mayonnaise', 'g', 680, 1, 2, 74, 15, 'EL'],
    ['food-pesto', 'Pesto (Basilikum)', 'g', 450, 5, 5, 45, 30, 'Portion'],
  ],
};

export const SEED_FOODS: SeedFood[] = Object.entries(CATEGORIES).flatMap(([category, rows]) =>
  rows.map(([id, name, unit, kcal, protein, carbs, fat, servingSize, servingLabel]) => ({
    id,
    name,
    category,
    unit,
    kcal,
    protein,
    carbs,
    fat,
    servingSize,
    servingLabel,
  })),
);
