// Shared vocabulary and defaults for the prep tracker.

import { atwater } from './calc.js'
import { estimateMeal } from './foodDatabase.js'

export const DAY_TYPES = ['Push', 'Pull', 'Legs', 'Rest', 'Cardio Only']

export const WEEKDAY_KEYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Back and rear delts are deliberately split out — lat width/thickness and rear
// delts are tracked weak-point priorities and must not be lumped under generic
// "Back" or "Shoulders".
export const MUSCLE_GROUPS = [
  'Chest',
  'Shoulders',
  'Triceps',
  'Biceps',
  'Back (Width)',
  'Back (Thickness)',
  'Rear Delts',
  'Quads',
  'Hamstrings',
  'Glutes',
  'Calves',
  'Core',
]

// Weak-point groups to highlight in the weekly volume summary.
export const PRIORITY_GROUPS = [
  'Back (Width)',
  'Back (Thickness)',
  'Rear Delts',
  'Hamstrings',
  'Glutes',
]

export const CARDIO_TYPES = ['Incline Treadmill', 'Brisk Walking', 'Other']

export const REEL_STATUSES = ['Not Filmed', 'Filmed', 'Edited', 'Posted', 'Skipped']

export const PHASES = ['Lean Bulk', 'Maintenance', 'Contest Prep']

// Meals repeated most days — resolved through the same food-matching engine
// as the manual add-meal box, so macros stay consistent with the database.
const MEAL_DESCRIPTIONS = [
  '60gm oats, 250ml lactose free milk, 30gm peanut butter, one scoop pea protein',
  '60gm oats, 250ml lactose free milk, 30gm peanut butter, one scoop pea protein',
  '150gm cooked chicken breast, 300gm rice',
  '3 chapati, 200gm rice, sabji, dal',
]

function defaultMealPlan() {
  return MEAL_DESCRIPTIONS.map((desc) => {
    const est = estimateMeal(desc)
    return {
      desc,
      calories: atwater(est.protein, est.carbs, est.fat),
      protein: est.protein,
      carbs: est.carbs,
      fat: est.fat,
    }
  })
}

export const DEFAULT_SETTINGS = {
  calorieTarget: 2800,
  proteinTarget: 200,
  carbTarget: 320,
  fatTarget: 70,
  phase: 'Lean Bulk',
  targetBodyWeight: null, // lean bulk has no target weight the way a cut does
  cardioTarget: 4, // sessions per week
  maintenanceCalories: 2500, // TDEE — the reference for surplus/deficit
  // Push/Pull/Legs repeats twice a week, Sunday off.
  weeklySplit: { Mon: 'Push', Tue: 'Pull', Wed: 'Legs', Thu: 'Push', Fri: 'Pull', Sat: 'Legs', Sun: 'Rest' },
  mealPlan: defaultMealPlan(),
  workoutPlan: { Push: [], Pull: [], Legs: [] },
}

export function emptyEntry(date) {
  return {
    date,
    bodyWeight: null,
    meals: [],
    skinCheck: { brokeOut: false, notes: '' },
    training: { type: 'Rest', exercises: [], completed: false, progressiveOverload: false },
    cardio: { done: false, type: 'Incline Treadmill', duration: 0 },
    reel: { status: 'Not Filmed', remarks: '' },
  }
}
