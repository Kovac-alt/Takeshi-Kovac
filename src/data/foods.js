// Built-in foods. Figures are typical values per 100 g (per 100 ml for liquids).
// Row: [id, name, category, kcal, protein, carbs, fat, serving label, serving grams, flags]
// flags: 'l' liquid, 'm' meat/poultry, 'f' fish/seafood, 'a' other animal product (dairy, egg, honey)

const ROWS = [
  // meat, fish, eggs
  ['chicken-breast', 'Chicken breast, raw', 'protein', 120, 22.5, 0, 2.6, '1 breast', 170, 'm'],
  ['chicken-breast-cooked', 'Chicken breast, cooked', 'protein', 165, 31, 0, 3.6, '1 breast', 130, 'm'],
  ['chicken-thigh', 'Chicken thigh, skinless, raw', 'protein', 121, 19.5, 0, 4.5, '1 thigh', 95, 'm'],
  ['turkey-mince', 'Turkey mince, lean, raw', 'protein', 150, 20, 0, 8, '1 pack', 500, 'm'],
  ['beef-mince-lean', 'Beef mince 5% fat, raw', 'protein', 137, 21.4, 0, 5, '1 pack', 500, 'm'],
  ['sirloin-steak', 'Sirloin steak, raw', 'protein', 158, 21.5, 0, 8, '1 steak', 200, 'm'],
  ['pork-tenderloin', 'Pork tenderloin, raw', 'protein', 120, 21, 0, 3.5, '1 portion', 150, 'm'],
  ['ham', 'Ham, lean sliced', 'protein', 107, 18, 1.5, 3, '2 slices', 50, 'm'],
  ['salmon', 'Salmon fillet, raw', 'protein', 208, 20, 0, 13, '1 fillet', 140, 'f'],
  ['smoked-salmon', 'Smoked salmon', 'protein', 117, 18.3, 0, 4.3, '2 slices', 60, 'f'],
  ['cod', 'Cod fillet, raw', 'protein', 82, 18, 0, 0.7, '1 fillet', 150, 'f'],
  ['tuna-canned', 'Tuna in water, drained', 'protein', 116, 26, 0, 1, '1 can', 120, 'f'],
  ['prawns', 'Prawns, raw', 'protein', 85, 20, 0, 0.5, '1 portion', 150, 'f'],
  ['egg', 'Egg', 'protein', 143, 12.6, 0.7, 9.5, '1 large', 50, 'a'],
  ['egg-whites', 'Egg whites', 'protein', 52, 10.9, 0.7, 0.2, '3 whites', 100, 'a'],
  ['tofu', 'Tofu, firm', 'protein', 144, 17, 2.8, 8.7, '1/2 block', 200, ''],
  ['tempeh', 'Tempeh', 'protein', 192, 20, 7.6, 10.8, '1/2 pack', 100, ''],
  // dairy
  ['greek-yogurt', 'Greek yogurt, 0% fat', 'dairy', 59, 10.3, 3.6, 0.4, '1 pot', 170, 'a'],
  ['greek-yogurt-2', 'Greek yogurt, 2% fat', 'dairy', 73, 9.9, 3.9, 1.9, '1 pot', 170, 'a'],
  ['skyr', 'Skyr', 'dairy', 63, 11, 4, 0.2, '1 pot', 150, 'a'],
  ['cottage-cheese', 'Cottage cheese, low fat', 'dairy', 84, 11, 4.3, 2.3, '1/2 tub', 150, 'a'],
  ['milk', 'Milk, semi-skimmed', 'dairy', 50, 3.4, 4.8, 1.8, '1 glass', 250, 'la'],
  ['milk-whole', 'Milk, whole', 'dairy', 61, 3.2, 4.8, 3.3, '1 glass', 250, 'la'],
  ['soy-milk', 'Soy milk, unsweetened', 'dairy', 33, 3.3, 0.6, 1.8, '1 glass', 250, 'l'],
  ['almond-milk', 'Almond milk, unsweetened', 'dairy', 15, 0.5, 0.3, 1.2, '1 glass', 250, 'l'],
  ['cheddar', 'Cheddar', 'dairy', 403, 25, 1.3, 33, '1 slice', 25, 'a'],
  ['mozzarella', 'Mozzarella', 'dairy', 280, 22, 2.2, 20, '1/2 ball', 60, 'a'],
  ['feta', 'Feta', 'dairy', 264, 14, 4, 21, '1 portion', 30, 'a'],
  ['parmesan', 'Parmesan', 'dairy', 431, 38, 4, 29, '1 tbsp grated', 10, 'a'],
  ['cream-cheese-light', 'Cream cheese, light', 'dairy', 160, 8, 5, 12, '1 tbsp', 30, 'a'],
  ['butter', 'Butter', 'fats', 717, 0.9, 0.1, 81, '1 tsp', 5, 'a'],
  // grains and starches
  ['oats', 'Rolled oats', 'grains', 379, 13.2, 67.7, 6.5, '1/2 cup', 40, ''],
  ['rice', 'White rice, dry', 'grains', 365, 7.1, 80, 0.7, '1 portion', 75, ''],
  ['rice-cooked', 'White rice, cooked', 'grains', 130, 2.7, 28, 0.3, '1 cup', 160, ''],
  ['brown-rice-cooked', 'Brown rice, cooked', 'grains', 123, 2.7, 25.6, 1, '1 cup', 195, ''],
  ['pasta', 'Pasta, dry', 'grains', 371, 13, 75, 1.5, '1 portion', 85, ''],
  ['pasta-cooked', 'Pasta, cooked', 'grains', 158, 5.8, 31, 0.9, '1 cup', 140, ''],
  ['egg-noodles', 'Egg noodles, dry', 'grains', 384, 14, 71, 4.4, '1 nest', 65, 'a'],
  ['quinoa', 'Quinoa, dry', 'grains', 368, 14, 64, 6, '1 portion', 60, ''],
  ['couscous', 'Couscous, dry', 'grains', 376, 12.8, 77, 0.6, '1 portion', 70, ''],
  ['bread-wholemeal', 'Wholemeal bread', 'grains', 247, 13, 41, 3.4, '1 slice', 40, ''],
  ['bread-white', 'White bread', 'grains', 265, 9, 49, 3.2, '1 slice', 40, ''],
  ['tortilla', 'Flour tortilla wrap', 'grains', 310, 8.5, 51, 7.5, '1 wrap', 60, ''],
  ['bagel', 'Bagel', 'grains', 257, 10, 50, 1.6, '1 bagel', 95, ''],
  ['rice-cakes', 'Rice cakes', 'grains', 387, 8, 82, 2.8, '1 cake', 9, ''],
  ['granola', 'Granola', 'grains', 471, 10, 64, 20, '1 portion', 45, ''],
  ['potato', 'Potato, raw', 'vegetables', 77, 2, 17, 0.1, '1 medium', 200, ''],
  ['sweet-potato', 'Sweet potato, raw', 'vegetables', 86, 1.6, 20, 0.1, '1 medium', 200, ''],
  // fruit
  ['banana', 'Banana', 'fruit', 89, 1.1, 23, 0.3, '1 medium', 118, ''],
  ['apple', 'Apple', 'fruit', 52, 0.3, 14, 0.2, '1 medium', 182, ''],
  ['orange', 'Orange', 'fruit', 47, 0.9, 12, 0.1, '1 medium', 131, ''],
  ['blueberries', 'Blueberries', 'fruit', 57, 0.7, 14.5, 0.3, '1 handful', 80, ''],
  ['strawberries', 'Strawberries', 'fruit', 32, 0.7, 7.7, 0.3, '1 cup', 150, ''],
  ['mixed-berries', 'Mixed berries, frozen', 'fruit', 50, 0.9, 11, 0.4, '1 handful', 80, ''],
  ['pineapple', 'Pineapple', 'fruit', 50, 0.5, 13, 0.1, '1 cup', 165, ''],
  ['mango', 'Mango', 'fruit', 60, 0.8, 15, 0.4, '1/2 mango', 150, ''],
  ['grapes', 'Grapes', 'fruit', 69, 0.7, 18, 0.2, '1 cup', 150, ''],
  ['dates', 'Dates', 'fruit', 282, 2.5, 75, 0.4, '2 dates', 30, ''],
  ['avocado', 'Avocado', 'fruit', 160, 2, 8.5, 14.7, '1/2 avocado', 70, ''],
  // vegetables
  ['broccoli', 'Broccoli', 'vegetables', 34, 2.8, 7, 0.4, '1 cup', 90, ''],
  ['spinach', 'Spinach', 'vegetables', 23, 2.9, 3.6, 0.4, '1 handful', 30, ''],
  ['bell-pepper', 'Bell pepper', 'vegetables', 31, 1, 6, 0.3, '1 pepper', 150, ''],
  ['onion', 'Onion', 'vegetables', 40, 1.1, 9.3, 0.1, '1 medium', 150, ''],
  ['garlic', 'Garlic', 'vegetables', 149, 6.4, 33, 0.5, '1 clove', 3, ''],
  ['tomato', 'Tomato', 'vegetables', 18, 0.9, 3.9, 0.2, '1 medium', 120, ''],
  ['canned-tomatoes', 'Chopped tomatoes, canned', 'vegetables', 24, 1.2, 4, 0.2, '1 can', 400, ''],
  ['passata', 'Tomato passata', 'vegetables', 32, 1.4, 5.5, 0.2, '1/2 jar', 250, ''],
  ['cucumber', 'Cucumber', 'vegetables', 15, 0.7, 3.6, 0.1, '1/4 cucumber', 80, ''],
  ['carrot', 'Carrot', 'vegetables', 41, 0.9, 9.6, 0.2, '1 medium', 60, ''],
  ['zucchini', 'Courgette', 'vegetables', 17, 1.2, 3.1, 0.3, '1 medium', 200, ''],
  ['mushrooms', 'Mushrooms', 'vegetables', 22, 3.1, 3.3, 0.3, '1 cup', 70, ''],
  ['green-beans', 'Green beans', 'vegetables', 31, 1.8, 7, 0.2, '1 cup', 110, ''],
  ['asparagus', 'Asparagus', 'vegetables', 20, 2.2, 3.9, 0.1, '6 spears', 100, ''],
  ['cauliflower', 'Cauliflower', 'vegetables', 25, 1.9, 5, 0.3, '1 cup', 100, ''],
  ['mixed-salad', 'Mixed salad leaves', 'vegetables', 17, 1.3, 3.2, 0.2, '1 bowl', 50, ''],
  ['sweetcorn', 'Sweetcorn', 'vegetables', 86, 3.2, 19, 1.2, '3 tbsp', 80, ''],
  ['peas', 'Peas, frozen', 'vegetables', 77, 5.2, 13.6, 0.4, '3 tbsp', 80, ''],
  // beans and lentils
  ['black-beans', 'Black beans, canned, drained', 'legumes', 118, 7.5, 20, 0.5, '1/2 can', 120, ''],
  ['kidney-beans', 'Kidney beans, canned, drained', 'legumes', 110, 7.5, 19, 0.5, '1/2 can', 120, ''],
  ['chickpeas', 'Chickpeas, canned, drained', 'legumes', 128, 7, 20, 2.4, '1/2 can', 120, ''],
  ['lentils-cooked', 'Lentils, cooked', 'legumes', 116, 9, 20, 0.4, '1 cup', 200, ''],
  ['red-lentils', 'Red lentils, dry', 'legumes', 358, 24, 63, 2.2, '1 portion', 60, ''],
  ['edamame', 'Edamame beans, shelled', 'legumes', 121, 11.9, 8.9, 5.2, '1 portion', 80, ''],
  ['hummus', 'Hummus', 'legumes', 166, 7.9, 14.3, 9.6, '2 tbsp', 40, ''],
  // nuts, seeds, fats
  ['peanut-butter', 'Peanut butter', 'nuts', 588, 25, 20, 50, '1 tbsp', 16, ''],
  ['almonds', 'Almonds', 'nuts', 579, 21, 22, 50, '1 handful', 25, ''],
  ['walnuts', 'Walnuts', 'nuts', 654, 15, 14, 65, '1 handful', 25, ''],
  ['cashews', 'Cashews', 'nuts', 553, 18, 30, 44, '1 handful', 25, ''],
  ['mixed-nuts', 'Mixed nuts', 'nuts', 607, 20, 21, 54, '1 handful', 30, ''],
  ['chia-seeds', 'Chia seeds', 'nuts', 486, 16.5, 42, 30.7, '1 tbsp', 10, ''],
  ['olive-oil', 'Olive oil', 'fats', 884, 0, 0, 100, '1 tbsp', 14, ''],
  ['coconut-milk-light', 'Coconut milk, light', 'fats', 73, 0.8, 2.5, 6.8, '1/2 can', 200, 'l'],
  ['pesto', 'Pesto', 'fats', 430, 5, 5, 43, '1 tbsp', 15, 'a'],
  // sauces and sweet things
  ['soy-sauce', 'Soy sauce', 'other', 53, 8, 4.9, 0.6, '1 tbsp', 15, 'l'],
  ['salsa', 'Tomato salsa', 'other', 36, 1.5, 7, 0.2, '2 tbsp', 40, ''],
  ['curry-paste', 'Curry paste', 'other', 130, 2.5, 12, 8, '1 tbsp', 20, ''],
  ['honey', 'Honey', 'snacks', 304, 0.3, 82, 0, '1 tsp', 7, 'a'],
  ['maple-syrup', 'Maple syrup', 'snacks', 260, 0, 67, 0, '1 tbsp', 15, ''],
  ['dark-chocolate', 'Dark chocolate, 70%', 'snacks', 598, 7.8, 46, 43, '2 squares', 20, ''],
  ['protein-bar', 'Protein bar', 'snacks', 350, 33, 33, 11, '1 bar', 60, 'a'],
  ['crisps', 'Crisps', 'snacks', 536, 7, 53, 35, '1 small bag', 25, ''],
  ['ice-cream', 'Ice cream, vanilla', 'snacks', 207, 3.5, 24, 11, '2 scoops', 100, 'a'],
  ['biscuit', 'Digestive biscuit', 'snacks', 480, 7, 63, 21, '1 biscuit', 15, 'a'],
  // drinks
  ['orange-juice', 'Orange juice', 'drinks', 45, 0.7, 10.4, 0.2, '1 glass', 250, 'l'],
  ['cola', 'Cola', 'drinks', 42, 0, 10.6, 0, '1 can', 330, 'l'],
  ['beer', 'Beer, lager', 'drinks', 43, 0.5, 3.6, 0, '1 pint', 568, 'l'],
  ['wine', 'Wine, red', 'drinks', 85, 0.1, 2.6, 0, '1 glass', 175, 'l'],
  ['latte', 'Latte, semi-skimmed milk', 'drinks', 43, 2.9, 4.2, 1.6, '1 medium', 350, 'la'],
  // ready meals and takeaway
  ['pizza-margherita', 'Pizza, margherita', 'meals', 266, 11, 33, 10, '1 slice', 107, 'a'],
  ['cheeseburger', 'Cheeseburger', 'meals', 263, 13, 27, 12, '1 burger', 120, 'm'],
  ['fries', 'Fries', 'meals', 312, 3.4, 41, 15, '1 medium', 115, ''],
  ['chicken-burrito', 'Chicken burrito', 'meals', 165, 9, 20, 5.5, '1 burrito', 400, 'm'],
  ['sushi', 'Sushi, salmon nigiri and rolls', 'meals', 150, 6, 27, 1.8, '8 pieces', 240, 'f'],
  ['kebab', 'Chicken kebab wrap', 'meals', 180, 12, 18, 6.5, '1 wrap', 350, 'm'],
  // supplements
  ['whey', 'Whey protein powder', 'supplements', 400, 80, 7, 6, '1 scoop', 30, 'a'],
  ['vegan-protein', 'Vegan protein powder', 'supplements', 390, 75, 8, 7, '1 scoop', 30, ''],
  ['creatine', 'Creatine monohydrate', 'supplements', 0, 0, 0, 0, '1 serving', 5, ''],
];

/** @type {import('../core/model.js').Food[]} */
export const FOODS = ROWS.map(([id, name, category, kcal, protein, carbs, fat, label, grams, flags]) => ({
  id, name, category,
  per100: { kcal, protein, carbs, fat },
  perServing: null,
  servings: [{ label, grams }],
  liquid: flags.includes('l'),
  diet: flags.includes('m') ? 'meat' : flags.includes('f') ? 'fish' : flags.includes('a') ? 'animal' : 'plant',
}));

const BY_ID = new Map(FOODS.map((f) => [f.id, f]));

export function getFood(id, own = []) {
  return BY_ID.get(id) || own.find((f) => f.id === id) || null;
}

/** Macros for an amount of a food. `grams` wins; otherwise `servings` of the default serving. */
export function foodMacros(food, { grams = null, servings = 1 } = {}) {
  let k;
  let base;
  if (food.per100 && grams != null) {
    base = food.per100;
    k = grams / 100;
  } else if (food.per100) {
    base = food.per100;
    k = ((food.servings[0] && food.servings[0].grams) || 100) * servings / 100;
  } else {
    base = food.perServing || { kcal: 0, protein: 0, carbs: 0, fat: 0 };
    const sg = food.servings[0] && food.servings[0].grams;
    k = grams != null && sg ? grams / sg : servings;
  }
  const r = (v) => (v == null ? null : Math.round(v * k * 10) / 10);
  return { kcal: Math.round(base.kcal * k), protein: r(base.protein), carbs: r(base.carbs), fat: r(base.fat) };
}
