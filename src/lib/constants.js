// Shared vocabulary and defaults for the prep tracker.

export const DAY_TYPES = ['Push', 'Pull', 'Legs', 'Rest', 'Cardio Only']

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

export const DEFAULT_SETTINGS = {
  calorieTarget: 2800,
  proteinTarget: 200,
  carbTarget: 320,
  fatTarget: 70,
  phase: 'Lean Bulk',
  targetBodyWeight: 80,
  cardioTarget: 4, // sessions per week
  maintenanceCalories: 2500, // TDEE — the reference for surplus/deficit
}

export function emptyEntry(date) {
  return {
    date,
    bodyWeight: null,
    meals: [],
    skinCheck: { brokeOut: false, notes: '' },
    training: { type: 'Rest', exercises: [], completed: false },
    cardio: { done: false, type: 'Incline Treadmill', duration: 0 },
    reel: { status: 'Not Filmed', remarks: '' },
  }
}
