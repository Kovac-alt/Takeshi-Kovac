// Built-in foods. Figures are typical values per 100 g (per 100 ml for drinks) and are approximate.
// [name, category, kcal, protein, carbs, fat, serving label, serving grams, liquid?]
import { state } from './store.js';

const RAW = [
  ['Chicken breast, cooked', 'protein', 165, 31, 0, 3.6, '1 breast', 170], ['Chicken thigh, cooked', 'protein', 209, 26, 0, 11, '1 thigh', 115],
  ['Turkey breast, cooked', 'protein', 135, 30, 0, 1, '1 portion', 120], ['Beef mince, cooked', 'protein', 217, 26, 0, 12, '1 patty', 125],
  ['Steak, sirloin, cooked', 'protein', 206, 29, 0, 9.5, '1 steak', 200], ['Pork chop, cooked', 'protein', 231, 26, 0, 14, '1 chop', 150],
  ['Bacon, cooked', 'protein', 541, 37, 1.4, 42, '2 rashers', 16], ['Ham', 'protein', 145, 21, 1.5, 6, '2 slices', 56],
  ['Salmon, cooked', 'protein', 208, 22, 0, 13, '1 fillet', 150], ['Tuna, canned in water', 'protein', 116, 26, 0, 1, '1 can', 120],
  ['Cod, cooked', 'protein', 105, 23, 0, 0.9, '1 fillet', 150], ['Prawns, cooked', 'protein', 99, 24, 0.2, 0.3, '1 portion', 100],
  ['Egg, whole', 'protein', 143, 12.6, 0.7, 9.5, '1 large egg', 50], ['Egg white', 'protein', 52, 11, 0.7, 0.2, '1 white', 33], ['Tofu, firm', 'protein', 144, 17, 3, 9, '1 portion', 100],
  ['Milk, whole', 'dairy', 61, 3.2, 4.8, 3.3, '1 glass', 250, 1], ['Milk, semi-skimmed', 'dairy', 47, 3.4, 4.9, 1.6, '1 glass', 250, 1], ['Milk, skimmed', 'dairy', 35, 3.4, 5, 0.1, '1 glass', 250, 1],
  ['Greek yogurt, plain', 'dairy', 73, 10, 3.9, 2, '1 pot', 170], ['Yogurt, plain', 'dairy', 61, 3.5, 4.7, 3.3, '1 pot', 150], ['Skyr', 'dairy', 63, 11, 4, 0.2, '1 pot', 150],
  ['Cottage cheese', 'dairy', 98, 11, 3.4, 4.3, '1 portion', 100], ['Cheddar cheese', 'dairy', 403, 25, 1.3, 33, '1 slice', 28], ['Mozzarella', 'dairy', 280, 22, 2.2, 20, '1 portion', 30], ['Feta', 'dairy', 264, 14, 4, 21, '1 portion', 30],
  ['White rice, cooked', 'grains', 130, 2.7, 28, 0.3, '1 cup', 160], ['Brown rice, cooked', 'grains', 123, 2.7, 26, 1, '1 cup', 160], ['Pasta, cooked', 'grains', 158, 5.8, 31, 0.9, '1 plate', 200],
  ['Oats, dry', 'grains', 379, 13, 68, 6.5, '1 serving', 40], ['Bread, white', 'grains', 265, 9, 49, 3.2, '1 slice', 30], ['Bread, wholemeal', 'grains', 247, 13, 41, 3.4, '1 slice', 35],
  ['Bagel', 'grains', 257, 10, 50, 1.6, '1 bagel', 95], ['Tortilla wrap', 'grains', 310, 8, 52, 8, '1 wrap', 60], ['Quinoa, cooked', 'grains', 120, 4.4, 21, 1.9, '1 cup', 185],
  ['Couscous, cooked', 'grains', 112, 3.8, 23, 0.2, '1 portion', 150], ['Cornflakes', 'grains', 357, 7.5, 84, 0.4, '1 bowl', 30], ['Granola', 'grains', 471, 10, 64, 20, '1 serving', 45], ['Rice cake', 'grains', 387, 8, 82, 2.8, '1 cake', 9],
  ['Banana', 'fruit', 89, 1.1, 23, 0.3, '1 medium', 118], ['Apple', 'fruit', 52, 0.3, 14, 0.2, '1 medium', 182], ['Orange', 'fruit', 47, 0.9, 12, 0.1, '1 medium', 131],
  ['Strawberries', 'fruit', 32, 0.7, 7.7, 0.3, '1 cup', 150], ['Blueberries', 'fruit', 57, 0.7, 14, 0.3, '1 cup', 148], ['Grapes', 'fruit', 69, 0.7, 18, 0.2, '1 cup', 150],
  ['Pear', 'fruit', 57, 0.4, 15, 0.1, '1 medium', 178], ['Mango', 'fruit', 60, 0.8, 15, 0.4, '1 cup', 165], ['Pineapple', 'fruit', 50, 0.5, 13, 0.1, '1 cup', 165],
  ['Watermelon', 'fruit', 30, 0.6, 7.6, 0.2, '1 slice', 280], ['Avocado', 'fruit', 160, 2, 8.5, 14.7, 'half', 100], ['Dates', 'fruit', 277, 1.8, 75, 0.2, '1 date', 24], ['Raisins', 'fruit', 299, 3.1, 79, 0.5, '1 handful', 30],
  ['Potato, boiled', 'vegetables', 87, 1.9, 20, 0.1, '1 medium', 150], ['Sweet potato, baked', 'vegetables', 90, 2, 21, 0.2, '1 medium', 130], ['Broccoli', 'vegetables', 34, 2.8, 7, 0.4, '1 cup', 90],
  ['Spinach', 'vegetables', 23, 2.9, 3.6, 0.4, '1 handful', 30], ['Carrot', 'vegetables', 41, 0.9, 10, 0.2, '1 medium', 61], ['Tomato', 'vegetables', 18, 0.9, 3.9, 0.2, '1 medium', 123],
  ['Cucumber', 'vegetables', 15, 0.7, 3.6, 0.1, '1 portion', 100], ['Bell pepper', 'vegetables', 31, 1, 6, 0.3, '1 medium', 120], ['Onion', 'vegetables', 40, 1.1, 9.3, 0.1, '1 medium', 110],
  ['Mushrooms', 'vegetables', 22, 3.1, 3.3, 0.3, '1 cup', 70], ['Lettuce', 'vegetables', 15, 1.4, 2.9, 0.2, '1 portion', 50], ['Green beans', 'vegetables', 31, 1.8, 7, 0.2, '1 portion', 100],
  ['Peas', 'vegetables', 81, 5.4, 14, 0.4, '1 portion', 80], ['Sweetcorn', 'vegetables', 86, 3.2, 19, 1.2, '1 portion', 80], ['Courgette', 'vegetables', 17, 1.2, 3.1, 0.3, '1 portion', 120], ['Cauliflower', 'vegetables', 25, 1.9, 5, 0.3, '1 portion', 100],
  ['Lentils, cooked', 'legumes', 116, 9, 20, 0.4, '1 cup', 198], ['Chickpeas, cooked', 'legumes', 164, 8.9, 27, 2.6, '1 cup', 164], ['Black beans, cooked', 'legumes', 132, 8.9, 24, 0.5, '1 cup', 172],
  ['Kidney beans, cooked', 'legumes', 127, 8.7, 23, 0.5, '1 cup', 177], ['Baked beans', 'legumes', 94, 5.2, 15, 0.6, 'half a can', 200], ['Hummus', 'legumes', 166, 7.9, 14, 9.6, '2 tbsp', 30], ['Edamame', 'legumes', 121, 12, 8.9, 5.2, '1 cup', 155],
  ['Almonds', 'nuts', 579, 21, 22, 50, '1 handful', 28], ['Peanuts', 'nuts', 567, 26, 16, 49, '1 handful', 28], ['Walnuts', 'nuts', 654, 15, 14, 65, '1 handful', 28], ['Cashews', 'nuts', 553, 18, 30, 44, '1 handful', 28],
  ['Mixed nuts', 'nuts', 607, 20, 21, 54, '1 handful', 28], ['Peanut butter', 'nuts', 588, 25, 20, 50, '1 tbsp', 16], ['Chia seeds', 'nuts', 486, 17, 42, 31, '1 tbsp', 12],
  ['Olive oil', 'fats', 884, 0, 0, 100, '1 tbsp', 14], ['Butter', 'fats', 717, 0.9, 0.1, 81, '1 knob', 10], ['Mayonnaise', 'fats', 680, 1, 0.6, 75, '1 tbsp', 14],
  ['Dark chocolate', 'snacks', 546, 4.9, 61, 31, '4 squares', 40], ['Milk chocolate', 'snacks', 535, 7.7, 59, 30, '1 bar', 45], ['Crisps', 'snacks', 536, 7, 53, 35, '1 bag', 30],
  ['Digestive biscuit', 'snacks', 471, 7, 63, 21, '1 biscuit', 15], ['Ice cream, vanilla', 'snacks', 207, 3.5, 24, 11, '1 scoop', 66], ['Protein bar', 'snacks', 350, 33, 35, 10, '1 bar', 60],
  ['Popcorn', 'snacks', 387, 13, 78, 4.5, '1 bag', 30], ['Honey', 'snacks', 304, 0.3, 82, 0, '1 tbsp', 21], ['Jam', 'snacks', 250, 0.4, 65, 0.1, '1 tbsp', 20],
  ['Croissant', 'snacks', 406, 8.2, 46, 21, '1 croissant', 57], ['Blueberry muffin', 'snacks', 377, 4.5, 54, 16, '1 muffin', 113], ['Doughnut', 'snacks', 452, 4.9, 51, 25, '1 doughnut', 60],
  ['Orange juice', 'drinks', 45, 0.7, 10, 0.2, '1 glass', 250, 1], ['Cola', 'drinks', 42, 0, 10.6, 0, '1 can', 330, 1], ['Beer', 'drinks', 43, 0.5, 3.6, 0, '1 bottle', 330, 1],
  ['Red wine', 'drinks', 85, 0.1, 2.6, 0, '1 glass', 150, 1], ['Latte, whole milk', 'drinks', 54, 3, 4.5, 2.8, '1 cup', 240, 1], ['Coffee, black', 'drinks', 1, 0.1, 0, 0, '1 cup', 240, 1],
  ['Oat milk', 'drinks', 46, 1, 7, 1.5, '1 glass', 250, 1], ['Sports drink', 'drinks', 26, 0, 6.4, 0, '1 bottle', 500, 1],
  ['Pizza, margherita', 'meals', 266, 11, 33, 10, '1 slice', 107], ['Cheeseburger', 'meals', 263, 13, 28, 11, '1 burger', 120], ['French fries', 'meals', 312, 3.4, 41, 15, 'medium portion', 117],
  ['Chicken nuggets', 'meals', 296, 15, 15, 20, '6 pieces', 96], ['Sushi, salmon roll', 'meals', 150, 6, 24, 3, '6 pieces', 150], ['Chicken burrito', 'meals', 163, 9, 19, 6, '1 burrito', 300],
  ['Caesar salad with chicken', 'meals', 127, 9, 5, 8, '1 bowl', 250], ['Ham and cheese sandwich', 'meals', 241, 13, 23, 11, '1 sandwich', 150], ['Fried rice', 'meals', 163, 4.6, 24, 5.5, '1 cup', 200],
  ['Chicken curry with rice', 'meals', 140, 7.5, 16, 5, '1 plate', 400], ['Spaghetti bolognese', 'meals', 132, 7, 15, 4.5, '1 plate', 400], ['Omelette', 'meals', 154, 11, 0.6, 12, '2-egg omelette', 120],
  ['Porridge made with milk', 'meals', 110, 4.5, 15, 3.5, '1 bowl', 250], ['Doner kebab', 'meals', 215, 14, 14, 12, '1 kebab', 350],
  ['Whey protein powder', 'supplements', 400, 80, 8, 6, '1 scoop', 30], ['Creatine', 'supplements', 0, 0, 0, 0, '1 scoop', 5],
];
export const FOODS = RAW.map(([name, category, kcal, protein, carbs, fat, label, grams, liquid]) => ({
  id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''), name, category,
  per100: { kcal, protein, carbs, fat }, perServing: null, servings: [{ label, grams }], liquid: !!liquid,
}));
const BY_ID = new Map(FOODS.map((f) => [f.id, f]));
export const findFood = (id) => BY_ID.get(id) || (state.kv.foods.foods || []).find((f) => f.id === id) || null;
export function searchFoods(q, limit = 8) {
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return FOODS.filter((f) => { const n = f.name.toLowerCase(); return words.every((w) => n.includes(w)); })
    .sort((a, b) => a.name.toLowerCase().indexOf(words[0]) - b.name.toLowerCase().indexOf(words[0]) || a.name.length - b.name.length).slice(0, limit);
}
/** Macros for `grams` of a food that has per-100 figures. */
export function scaleFood(food, grams) {
  const r = (v, dp) => (v == null ? null : Math.round(v * grams / 100 * 10 ** dp) / 10 ** dp), p = food.per100;
  return { kcal: r(p.kcal, 0), protein: r(p.protein, 1), carbs: r(p.carbs, 1), fat: r(p.fat, 1) };
}
