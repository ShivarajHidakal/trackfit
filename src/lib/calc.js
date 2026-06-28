// Pure calculation helpers — macro totals, set volume, averages.

export function mealTotals(meals = []) {
  return meals.reduce(
    (t, m) => ({
      calories: t.calories + num(m.calories),
      protein: t.protein + num(m.protein),
      carbs: t.carbs + num(m.carbs),
      fat: t.fat + num(m.fat),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )
}

// Estimated volume for one exercise = sum over sets of weight × reps.
export function exerciseVolume(exercise) {
  return (exercise.sets || []).reduce(
    (v, s) => v + num(s.weight) * num(s.reps),
    0
  )
}

export function totalSets(exercise) {
  return (exercise.sets || []).length
}

// Rolling average of a numeric field over a window of entries (nulls skipped).
export function average(values) {
  const valid = values.filter((v) => v != null && !Number.isNaN(v))
  if (!valid.length) return null
  return valid.reduce((a, b) => a + b, 0) / valid.length
}

// Atwater calorie estimate from macros — the single source for kcal so the user
// never types calories manually.
export function atwater(protein, carbs, fat) {
  return Math.round(num(protein) * 4 + num(carbs) * 4 + num(fat) * 9)
}

export function round1(n) {
  if (n == null || Number.isNaN(n)) return null
  return Math.round(n * 10) / 10
}

export function num(v) {
  const n = typeof v === 'number' ? v : parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

// Reel posting streak. entries: array with {date, reel:{status}}. anchor: today key.
export function reelStats(entries, anchor) {
  const posted = new Set(
    entries.filter((e) => e.reel && e.reel.status === 'Posted').map((e) => e.date)
  )
  // current streak: consecutive posted days ending at anchor (or anchor-1 if today
  // isn't posted yet — so a not-yet-posted today doesn't reset the streak to 0).
  let streak = 0
  let start = posted.has(anchor) ? anchor : shiftKey(anchor, -1)
  let cursor = start
  while (posted.has(cursor)) {
    streak++
    cursor = shiftKey(cursor, -1)
  }
  // days since last post
  let since = null
  let c = anchor
  for (let i = 0; i < 400; i++) {
    if (posted.has(c)) {
      since = i
      break
    }
    c = shiftKey(c, -1)
  }
  return { streak, daysSincePost: since, totalPosted: posted.size }
}

function shiftKey(key, n) {
  const [y, m, d] = key.split('-').map(Number)
  const dt = new Date(y, m - 1, d + n)
  const yy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

export function slugify(name) {
  return String(name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
