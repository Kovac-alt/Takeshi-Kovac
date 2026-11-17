// Built-in recipes. Ingredients point at foods (grams, or ml for liquids), so every
// recipe's macros are worked out from the same food table the calorie log uses.
// Amounts are for the whole recipe; `serves` says how many portions that makes.
import { getFood } from './foods.js';

const R = (id, name, meals, minutes, serves, ings, extras, steps) => ({ id, name, meals, minutes, serves, ings, extras, steps });

const RAW = [
  // ---- breakfast ----
  R('protein-oats', 'Peanut butter protein oats', ['breakfast'], 8, 1,
    [['oats', 80], ['milk', 250], ['whey', 30], ['banana', 118], ['peanut-butter', 15]],
    ['Pinch of salt', 'Cinnamon'],
    ['Simmer the oats in the milk with a pinch of salt for 4 to 5 minutes, stirring.', 'Take off the heat and let it cool for a minute, then stir in the protein powder. Add a splash of water if it gets thick.', 'Top with sliced banana, the peanut butter and cinnamon.']),
  R('overnight-oats', 'Blueberry overnight oats', ['breakfast'], 5, 1,
    [['oats', 60], ['greek-yogurt', 150], ['milk', 150], ['chia-seeds', 10], ['blueberries', 80], ['honey', 10]],
    [],
    ['Stir the oats, yogurt, milk and chia seeds together in a jar.', 'Leave in the fridge overnight, or at least 2 hours.', 'Top with the blueberries and honey before eating.']),
  R('scrambled-eggs-toast', 'Scrambled eggs on toast', ['breakfast'], 10, 1,
    [['egg', 150], ['egg-whites', 100], ['bread-wholemeal', 80], ['spinach', 50], ['butter', 5]],
    ['Salt and pepper'],
    ['Whisk the eggs and whites with salt and pepper.', 'Melt the butter in a non-stick pan over low heat. Wilt the spinach, then pour in the eggs.', 'Stir slowly until just set and serve over the toast.']),
  R('yogurt-bowl', 'Greek yogurt, berry and granola bowl', ['breakfast', 'snack'], 3, 1,
    [['greek-yogurt', 300], ['granola', 40], ['mixed-berries', 100], ['almonds', 15], ['honey', 10]],
    [],
    ['Spoon the yogurt into a bowl.', 'Top with berries, granola, chopped almonds and the honey.']),
  R('breakfast-burrito', 'Egg and black bean breakfast burrito', ['breakfast', 'lunch'], 12, 1,
    [['tortilla', 60], ['egg', 100], ['egg-whites', 100], ['black-beans', 60], ['bell-pepper', 50], ['cheddar', 20], ['salsa', 40]],
    ['Pinch of cumin'],
    ['Soften the diced pepper in a dry non-stick pan for 2 minutes, add the beans and cumin and warm through.', 'Pour in the whisked eggs and whites and scramble until set.', 'Pile onto the warm tortilla with the cheese and salsa, fold and roll.']),
  R('protein-pancakes', 'Banana protein pancakes', ['breakfast'], 15, 1,
    [['oats', 60], ['banana', 100], ['egg', 100], ['whey', 30], ['blueberries', 50], ['maple-syrup', 15]],
    ['1 tsp baking powder'],
    ['Blend the oats, banana, eggs, protein powder and baking powder to a thick batter.', 'Cook small pancakes in a non-stick pan over medium heat, about 2 minutes a side.', 'Stack and top with the blueberries and syrup.']),
  R('tofu-scramble', 'Tofu scramble on toast', ['breakfast', 'lunch'], 12, 1,
    [['tofu', 200], ['bread-wholemeal', 80], ['spinach', 60], ['tomato', 100], ['avocado', 50], ['olive-oil', 5]],
    ['1/2 tsp turmeric', 'Salt and pepper'],
    ['Crumble the tofu into a pan with the oil, turmeric, salt and pepper. Fry for 4 to 5 minutes.', 'Add the chopped tomato and spinach and cook until the spinach wilts.', 'Serve on the toast with sliced avocado.']),
  R('salmon-bagel', 'Smoked salmon and egg bagel', ['breakfast', 'lunch'], 8, 1,
    [['bagel', 95], ['smoked-salmon', 80], ['cream-cheese-light', 30], ['egg', 50], ['cucumber', 40]],
    ['Squeeze of lemon', 'Black pepper'],
    ['Boil the egg for 8 minutes, then cool, peel and slice.', 'Toast the bagel and spread with the cream cheese.', 'Layer on the salmon, cucumber and egg. Finish with lemon and pepper.']),
  R('vegan-pb-oats', 'Peanut butter banana oats', ['breakfast'], 8, 1,
    [['oats', 80], ['soy-milk', 300], ['banana', 118], ['peanut-butter', 20], ['chia-seeds', 10]],
    ['Cinnamon'],
    ['Simmer the oats and chia in the soy milk for 4 to 5 minutes.', 'Top with sliced banana, peanut butter and cinnamon.']),
  R('egg-avocado-toast', 'Egg and avocado toast', ['breakfast', 'lunch'], 10, 1,
    [['bread-wholemeal', 80], ['egg', 100], ['avocado', 70], ['tomato', 80]],
    ['Chilli flakes', 'Salt and pepper'],
    ['Poach or fry the eggs.', 'Mash the avocado onto the toast and season.', 'Top with the eggs, sliced tomato and chilli flakes.']),

  // ---- lunch and dinner ----
  R('chicken-rice-broccoli', 'Chicken, rice and broccoli', ['lunch', 'dinner'], 25, 1,
    [['chicken-breast', 180], ['rice', 80], ['broccoli', 150], ['olive-oil', 7], ['soy-sauce', 10]],
    ['Garlic powder, paprika, salt'],
    ['Cook the rice according to the pack.', 'Season the chicken with garlic powder, paprika and salt. Pan-fry in the oil for 6 to 7 minutes a side until cooked through, then rest and slice.', 'Steam the broccoli for 4 minutes.', 'Serve together with the soy sauce over the top.']),
  R('turkey-chili', 'Turkey chili with rice', ['lunch', 'dinner'], 40, 4,
    [['turkey-mince', 500], ['kidney-beans', 240], ['canned-tomatoes', 400], ['onion', 150], ['bell-pepper', 150], ['garlic', 6], ['olive-oil', 10], ['rice', 280]],
    ['2 tsp chilli powder', '2 tsp cumin', '1 tsp smoked paprika', 'Salt'],
    ['Soften the diced onion and pepper in the oil for 5 minutes. Add the garlic and spices for 1 minute.', 'Add the turkey and brown it, breaking it up.', 'Stir in the tomatoes and beans with half a can of water. Simmer for 25 minutes.', 'Cook the rice and serve the chili over it. Keeps 4 days in the fridge and freezes well.']),
  R('beef-burrito-bowl', 'Beef burrito bowl', ['lunch', 'dinner'], 25, 1,
    [['beef-mince-lean', 150], ['rice', 70], ['black-beans', 80], ['sweetcorn', 50], ['salsa', 50], ['avocado', 40], ['mixed-salad', 40]],
    ['1 tsp cumin', '1 tsp smoked paprika', 'Lime juice'],
    ['Cook the rice.', 'Brown the beef with the cumin and paprika, then stir in the beans and corn to warm through.', 'Build the bowl: rice, beef and beans, salad, salsa and avocado. Squeeze over lime.']),
  R('salmon-potatoes-greens', 'Salmon with potatoes and asparagus', ['dinner'], 30, 1,
    [['salmon', 150], ['potato', 300], ['asparagus', 150], ['olive-oil', 5]],
    ['Lemon', 'Salt and pepper'],
    ['Heat the oven to 200°C. Cut the potatoes into chunks, toss in the oil, season and roast for 15 minutes.', 'Add the salmon and asparagus to the tray and roast for 12 more minutes.', 'Serve with lemon.']),
  R('chicken-stir-fry', 'Chicken noodle stir-fry', ['lunch', 'dinner'], 20, 1,
    [['chicken-breast', 170], ['egg-noodles', 75], ['bell-pepper', 100], ['broccoli', 100], ['carrot', 60], ['soy-sauce', 20], ['olive-oil', 7], ['garlic', 3]],
    ['Thumb of ginger, grated', 'Chilli flakes'],
    ['Cook the noodles and drain.', 'Stir-fry the sliced chicken in the oil over high heat for 5 minutes.', 'Add the vegetables, garlic and ginger and cook for 3 to 4 minutes.', 'Toss in the noodles and soy sauce and heat through.']),
  R('tuna-pasta', 'Tuna and tomato pasta', ['lunch', 'dinner'], 18, 1,
    [['pasta', 90], ['tuna-canned', 120], ['passata', 150], ['onion', 50], ['spinach', 50], ['olive-oil', 5], ['parmesan', 10]],
    ['Dried oregano', 'Chilli flakes'],
    ['Boil the pasta.', 'Soften the onion in the oil, add the passata and oregano and simmer for 5 minutes.', 'Stir in the tuna, spinach and drained pasta. Top with parmesan.']),
  R('steak-sweet-potato', 'Steak, sweet potato and green beans', ['dinner'], 30, 1,
    [['sirloin-steak', 180], ['sweet-potato', 300], ['green-beans', 150], ['olive-oil', 5]],
    ['Salt and pepper'],
    ['Cut the sweet potato into wedges, toss in the oil and roast at 200°C for 25 minutes.', 'Season the steak and sear in a very hot pan, 2 to 3 minutes a side for medium rare. Rest for 5 minutes.', 'Boil the green beans for 4 minutes and serve.']),
  R('chicken-wrap', 'Chicken salad wraps', ['lunch'], 15, 1,
    [['tortilla', 120], ['chicken-breast', 150], ['mixed-salad', 40], ['tomato', 80], ['greek-yogurt', 40], ['cheddar', 20]],
    ['Paprika, garlic powder', 'Hot sauce, optional'],
    ['Season the chicken and pan-fry for 6 minutes a side, then slice.', 'Spread the yogurt over the wraps.', 'Fill with the chicken, salad, tomato and cheese and roll up.']),
  R('prawn-fried-rice', 'Prawn fried rice', ['lunch', 'dinner'], 20, 1,
    [['prawns', 180], ['rice', 80], ['egg', 50], ['peas', 80], ['carrot', 50], ['soy-sauce', 15], ['olive-oil', 7]],
    ['Spring onion', 'Garlic'],
    ['Cook the rice ahead and let it cool. Day-old rice works best.', 'Stir-fry the prawns in half the oil until pink and set aside.', 'Fry the carrot and peas, push to one side and scramble the egg in the space.', 'Add the rice, prawns and soy sauce and fry until hot.']),
  R('chickpea-curry', 'Chickpea and spinach curry', ['lunch', 'dinner'], 30, 2,
    [['chickpeas', 400], ['coconut-milk-light', 200], ['canned-tomatoes', 400], ['spinach', 150], ['onion', 150], ['curry-paste', 40], ['rice', 150]],
    ['Salt', 'Fresh coriander'],
    ['Soften the onion in a splash of water, then fry the curry paste for 1 minute.', 'Add the tomatoes, coconut milk and chickpeas. Simmer for 15 minutes.', 'Stir in the spinach until wilted.', 'Serve over the cooked rice.']),
  R('lentil-bolognese', 'Lentil bolognese', ['lunch', 'dinner'], 35, 3,
    [['red-lentils', 180], ['pasta', 240], ['passata', 500], ['onion', 150], ['carrot', 100], ['garlic', 6], ['olive-oil', 10]],
    ['Dried oregano and basil', 'Salt and pepper'],
    ['Soften the diced onion and carrot in the oil for 6 minutes. Add the garlic and herbs.', 'Add the lentils, passata and 400 ml water. Simmer for 20 minutes until thick.', 'Boil the pasta and serve with the sauce.']),
  R('tofu-stir-fry', 'Tofu and edamame stir-fry', ['lunch', 'dinner'], 25, 1,
    [['tofu', 200], ['rice', 75], ['broccoli', 120], ['bell-pepper', 100], ['edamame', 60], ['soy-sauce', 20], ['olive-oil', 7]],
    ['Garlic and ginger', 'Sesame seeds'],
    ['Cook the rice.', 'Press the tofu dry, cube it and fry in the oil until golden on all sides.', 'Add the vegetables, garlic and ginger and stir-fry for 4 minutes.', 'Add the soy sauce and serve over the rice.']),
  R('cod-traybake', 'Cod and potato traybake', ['dinner'], 35, 1,
    [['cod', 200], ['potato', 300], ['zucchini', 150], ['tomato', 150], ['olive-oil', 10]],
    ['Lemon', 'Dried herbs', 'Salt and pepper'],
    ['Roast the cubed potatoes in half the oil at 200°C for 15 minutes.', 'Add the courgette, tomatoes and cod, drizzle with the rest of the oil and season.', 'Roast for 12 to 15 minutes until the fish flakes.']),
  R('turkey-meatball-pasta', 'Turkey meatball pasta', ['lunch', 'dinner'], 30, 2,
    [['turkey-mince', 300], ['pasta', 160], ['passata', 300], ['onion', 80], ['parmesan', 20], ['olive-oil', 5]],
    ['Dried oregano', 'Garlic powder', 'Salt and pepper'],
    ['Mix the mince with oregano, garlic powder, salt and pepper and roll into 12 meatballs.', 'Brown them in the oil, add the onion, then the passata. Simmer for 12 minutes.', 'Boil the pasta and serve with the meatballs and parmesan.']),
  R('chicken-quinoa-salad', 'Chicken and quinoa salad', ['lunch'], 25, 1,
    [['chicken-breast', 150], ['quinoa', 60], ['cucumber', 100], ['tomato', 100], ['feta', 30], ['mixed-salad', 50], ['olive-oil', 7]],
    ['Lemon juice', 'Salt and pepper'],
    ['Simmer the quinoa for 12 minutes and drain.', 'Grill or pan-fry the chicken and slice.', 'Toss everything together with the oil and lemon juice.']),
  R('chicken-curry', 'Chicken curry with rice', ['dinner'], 35, 2,
    [['chicken-thigh', 350], ['coconut-milk-light', 200], ['curry-paste', 40], ['onion', 150], ['bell-pepper', 150], ['spinach', 100], ['rice', 150]],
    ['Salt', 'Fresh coriander'],
    ['Brown the diced chicken, then add the onion and pepper for 4 minutes.', 'Stir in the curry paste, then the coconut milk and 100 ml water. Simmer for 15 minutes.', 'Add the spinach and serve over the cooked rice.']),
  R('beef-bolognese', 'Beef bolognese', ['lunch', 'dinner'], 35, 2,
    [['beef-mince-lean', 300], ['pasta', 170], ['passata', 300], ['onion', 100], ['carrot', 80], ['olive-oil', 5], ['parmesan', 15]],
    ['Garlic', 'Dried oregano', 'Salt and pepper'],
    ['Soften the diced onion and carrot in the oil. Add the beef and brown it.', 'Add the passata and oregano and simmer for 20 minutes.', 'Serve over the pasta with parmesan.']),
  R('bean-quesadilla', 'Black bean quesadilla', ['lunch', 'dinner'], 15, 1,
    [['tortilla', 120], ['black-beans', 120], ['cheddar', 50], ['bell-pepper', 60], ['sweetcorn', 40], ['salsa', 50], ['greek-yogurt', 40]],
    ['Pinch of cumin'],
    ['Roughly mash the beans with the cumin and spread over one tortilla.', 'Scatter over the pepper, corn and cheese and top with the second tortilla.', 'Toast in a dry pan for 3 minutes a side. Serve with salsa and yogurt.']),
  R('pesto-chicken-pasta', 'Pesto chicken pasta', ['lunch', 'dinner'], 20, 1,
    [['chicken-breast', 150], ['pasta', 85], ['pesto', 20], ['tomato', 100], ['spinach', 50]],
    ['Salt and pepper'],
    ['Boil the pasta.', 'Pan-fry the diced chicken for 7 to 8 minutes.', 'Stir the pesto, tomatoes, spinach and drained pasta into the chicken.']),
  R('salmon-rice-bowl', 'Salmon rice bowl', ['lunch', 'dinner'], 22, 1,
    [['salmon', 140], ['rice', 75], ['edamame', 60], ['cucumber', 80], ['avocado', 40], ['soy-sauce', 15]],
    ['Sesame seeds', 'Rice vinegar, optional'],
    ['Cook the rice.', 'Bake the salmon at 200°C for 12 minutes, or pan-fry skin side down.', 'Flake the salmon over the rice with the edamame, cucumber and avocado. Dress with soy sauce.']),
  R('bean-chili', 'Three bean chili with rice', ['lunch', 'dinner'], 35, 3,
    [['kidney-beans', 240], ['black-beans', 240], ['sweetcorn', 150], ['canned-tomatoes', 400], ['onion', 150], ['bell-pepper', 150], ['olive-oil', 10], ['rice', 225]],
    ['2 tsp chilli powder', '2 tsp cumin', 'Salt'],
    ['Soften the onion and pepper in the oil, then add the spices.', 'Add the beans, corn and tomatoes with half a can of water. Simmer for 20 minutes.', 'Serve over the cooked rice.']),
  R('tuna-jacket-potato', 'Tuna and cottage cheese jacket potato', ['lunch'], 12, 1,
    [['potato', 350], ['tuna-canned', 120], ['cottage-cheese', 100], ['sweetcorn', 40], ['mixed-salad', 50]],
    ['Black pepper'],
    ['Prick the potato and microwave for 8 to 10 minutes, turning once, until soft.', 'Mix the tuna, cottage cheese and corn.', 'Split the potato, fill it and serve with the salad.']),
  R('chicken-avocado-sandwich', 'Chicken and avocado sandwich', ['lunch'], 8, 1,
    [['bread-wholemeal', 80], ['chicken-breast-cooked', 100], ['avocado', 50], ['tomato', 50], ['mixed-salad', 20]],
    ['Salt and pepper'],
    ['Mash the avocado onto one slice of bread and season.', 'Layer on the chicken, tomato and salad and close the sandwich.']),
  R('chickpea-caprese-salad', 'Chickpea and mozzarella salad', ['lunch'], 8, 1,
    [['chickpeas', 200], ['mozzarella', 60], ['tomato', 150], ['cucumber', 100], ['mixed-salad', 50], ['olive-oil', 10]],
    ['Balsamic vinegar', 'Fresh basil'],
    ['Chop the tomato and cucumber and tear the mozzarella.', 'Toss everything with the oil and vinegar.']),
  R('hummus-wrap', 'Hummus and chickpea wraps', ['lunch'], 8, 1,
    [['tortilla', 120], ['hummus', 80], ['chickpeas', 100], ['bell-pepper', 60], ['cucumber', 60], ['spinach', 30]],
    ['Smoked paprika', 'Lemon juice'],
    ['Spread the hummus over the wraps.', 'Toss the chickpeas with paprika and lemon and scatter over.', 'Add the vegetables and roll up.']),
  R('tempeh-rice-bowl', 'Sticky tempeh rice bowl', ['lunch', 'dinner'], 25, 1,
    [['tempeh', 150], ['rice', 75], ['broccoli', 120], ['carrot', 60], ['soy-sauce', 20], ['maple-syrup', 10], ['olive-oil', 5]],
    ['Garlic', 'Sesame seeds'],
    ['Cook the rice and steam the broccoli and carrot.', 'Fry the sliced tempeh in the oil until golden.', 'Add the soy sauce, maple syrup and garlic and let it bubble until sticky.', 'Serve over the rice and vegetables.']),

  // ---- snacks ----
  R('protein-shake', 'Banana protein shake', ['snack'], 3, 1,
    [['whey', 30], ['milk', 300], ['banana', 118]],
    ['Ice'],
    ['Blend everything until smooth.']),
  R('gainer-smoothie', 'Oat and peanut butter gainer smoothie', ['snack'], 4, 1,
    [['oats', 50], ['whey', 30], ['milk', 350], ['peanut-butter', 25], ['banana', 118]],
    ['Ice'],
    ['Blend the oats to a powder first.', 'Add everything else and blend until smooth.']),
  R('cottage-cheese-pineapple', 'Cottage cheese with pineapple', ['snack'], 2, 1,
    [['cottage-cheese', 200], ['pineapple', 100], ['almonds', 15]],
    [],
    ['Top the cottage cheese with the pineapple and chopped almonds.']),
  R('rice-cakes-pb', 'Rice cakes with peanut butter and banana', ['snack'], 3, 1,
    [['rice-cakes', 27], ['peanut-butter', 20], ['banana', 60]],
    [],
    ['Spread the peanut butter over three rice cakes and top with sliced banana.']),
  R('apple-pb', 'Apple and peanut butter', ['snack'], 2, 1,
    [['apple', 182], ['peanut-butter', 25]],
    [],
    ['Slice the apple and dip it in the peanut butter.']),
  R('protein-skyr', 'Protein skyr with berries', ['snack'], 3, 1,
    [['skyr', 200], ['whey', 15], ['mixed-berries', 80]],
    [],
    ['Stir the protein powder into the skyr until smooth.', 'Top with the berries.']),
  R('trail-mix', 'Nut, date and chocolate trail mix', ['snack'], 1, 1,
    [['mixed-nuts', 30], ['dates', 30], ['dark-chocolate', 10]],
    [],
    ['Chop the dates and chocolate and mix with the nuts.']),
  R('edamame-bowl', 'Salted edamame', ['snack'], 5, 1,
    [['edamame', 150], ['soy-sauce', 5]],
    ['Sea salt', 'Chilli flakes'],
    ['Boil the edamame for 3 minutes and drain.', 'Toss with the soy sauce, salt and chilli.']),
  R('eggs-and-fruit', 'Boiled eggs and an orange', ['snack'], 10, 1,
    [['egg', 100], ['orange', 131]],
    ['Salt and pepper'],
    ['Boil the eggs for 8 minutes, cool and peel.', 'Eat with the orange.']),
  R('vegan-protein-shake', 'Soy and berry protein shake', ['snack'], 3, 1,
    [['vegan-protein', 30], ['soy-milk', 300], ['mixed-berries', 100], ['banana', 60]],
    ['Ice'],
    ['Blend everything until smooth.']),
];

const DIET_RANK = { plant: 0, animal: 1, fish: 2, meat: 3 };
const DIET_OF_RANK = ['vegan', 'vegetarian', 'pescatarian', 'any'];

function finish(r) {
  const total = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  let rank = 0;
  for (const [foodId, grams] of r.ings) {
    const f = getFood(foodId);
    if (!f) throw new Error(`recipe ${r.id}: unknown food ${foodId}`);
    for (const k of Object.keys(total)) total[k] += (f.per100[k] * grams) / 100;
    rank = Math.max(rank, DIET_RANK[f.diet]);
  }
  const per = {
    kcal: Math.round(total.kcal / r.serves),
    protein: Math.round(total.protein / r.serves),
    carbs: Math.round(total.carbs / r.serves),
    fat: Math.round(total.fat / r.serves),
  };
  return { ...r, per, diet: DIET_OF_RANK[rank], highProtein: (per.protein * 4) / per.kcal >= 0.27 };
}

/**
 * @typedef {Object} Recipe
 * @property {string} id
 * @property {string} name
 * @property {string[]} meals      which meals it suits
 * @property {number} minutes
 * @property {number} serves       portions the listed amounts make
 * @property {[string, number][]} ings  [foodId, grams]
 * @property {string[]} extras     seasonings that carry no meaningful calories
 * @property {string[]} steps
 * @property {{kcal:number, protein:number, carbs:number, fat:number}} per  per portion
 * @property {'vegan'|'vegetarian'|'pescatarian'|'any'} diet  the strictest diet it fits
 * @property {boolean} highProtein  27% or more of calories from protein
 */
/** @type {Recipe[]} */
export const RECIPES = RAW.map(finish);

const BY_ID = new Map(RECIPES.map((r) => [r.id, r]));
export const getRecipe = (id) => BY_ID.get(id) || null;

/** Which recipe diets each eating preference allows. */
export const DIET_ALLOWS = {
  any: ['vegan', 'vegetarian', 'pescatarian', 'any'],
  pescatarian: ['vegan', 'vegetarian', 'pescatarian'],
  vegetarian: ['vegan', 'vegetarian'],
  vegan: ['vegan'],
};
