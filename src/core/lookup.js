// Lookups that include the user's own exercises and foods.
import { getExercise, EXERCISES } from '../data/exercises.js';
import { getFood, FOODS } from '../data/foods.js';
import { state } from './store.js';

export const customExercises = () => state.mine.exercises || [];
export const exById = (id) => getExercise(id, customExercises());
export const allExercises = () => [...customExercises(), ...EXERCISES];
export const foodById = (id) => getFood(id, state.mine.foods || []);
export const allFoods = () => [...(state.mine.foods || []), ...FOODS];
