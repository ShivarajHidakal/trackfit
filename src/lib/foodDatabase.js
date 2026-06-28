// Offline food database + quantity parser.
//
// This is NOT an external API — it's a built-in lookup table of common foods so
// that typing "150g chicken breast" or "2 eggs" auto-fills macros. Calories are
// always derived from macros via Atwater (see calc.atwater), so the user never
// types kcal.
//
// unit 'g'  -> macros are per 100 g (also used for ml). defaultPortion in grams.
// unit 'pc' -> macros are per 1 piece. gramsPerPiece lets weight inputs convert.

import { num, slugify, atwater } from './calc.js'

export const FOOD_DB = [
  // ---- Proteins ----
  food('Chicken breast', 'g', { kcal: 165, p: 31, c: 0, f: 3.6 }, ['chicken'], 150),
  food('Chicken thigh', 'g', { kcal: 209, p: 26, c: 0, f: 11 }, [], 150),
  food('Turkey breast', 'g', { kcal: 135, p: 30, c: 0, f: 1 }, ['turkey'], 150),
  food('Lean beef mince 5%', 'g', { kcal: 137, p: 21, c: 0, f: 5 }, ['beef mince', 'mince', 'ground beef'], 150),
  food('Beef steak (sirloin)', 'g', { kcal: 206, p: 27, c: 0, f: 10 }, ['steak', 'beef'], 150),
  food('Salmon', 'g', { kcal: 208, p: 20, c: 0, f: 13 }, [], 150),
  food('Cod', 'g', { kcal: 82, p: 18, c: 0, f: 0.7 }, ['white fish', 'fish'], 150),
  food('Tuna (canned in water)', 'g', { kcal: 116, p: 26, c: 0, f: 1 }, ['tuna'], 100),
  food('Prawns', 'g', { kcal: 99, p: 24, c: 0.2, f: 0.3 }, ['shrimp'], 100),
  food('Tofu', 'g', { kcal: 76, p: 8, c: 1.9, f: 4.8 }, [], 150),
  food('Paneer', 'g', { kcal: 265, p: 18, c: 1.2, f: 21 }, [], 100),
  food('Greek yogurt (0%)', 'g', { kcal: 59, p: 10, c: 3.6, f: 0.4 }, ['greek yoghurt', 'yogurt', 'yoghurt'], 170),
  food('Cottage cheese', 'g', { kcal: 98, p: 11, c: 3.4, f: 4.3 }, [], 150),
  food('Whey protein', 'pc', { kcal: 120, p: 24, c: 3, f: 1.5 }, ['whey', 'protein shake', 'protein scoop', 'scoop'], 1),
  food('Pea protein', 'pc', { kcal: 120, p: 24, c: 2, f: 2 }, ['pea protein', 'pea protein scoop'], 1),
  food('Egg (whole)', 'pc', { kcal: 78, p: 6.3, c: 0.6, f: 5.3 }, ['egg', 'eggs'], 1, 50),
  food('Egg white', 'pc', { kcal: 17, p: 3.6, c: 0.2, f: 0.1 }, ['egg whites', 'whites'], 1, 33),

  // ---- Carbs / grains ----
  food('White rice (cooked)', 'g', { kcal: 130, p: 2.7, c: 28, f: 0.3 }, ['rice'], 200),
  food('Brown rice (cooked)', 'g', { kcal: 123, p: 2.6, c: 26, f: 1 }, [], 200),
  food('Oats (dry)', 'g', { kcal: 389, p: 17, c: 66, f: 7 }, ['oat', 'oatmeal', 'porridge'], 60),
  food('Pasta (cooked)', 'g', { kcal: 131, p: 5, c: 25, f: 1.1 }, ['spaghetti'], 200),
  food('Sweet potato', 'g', { kcal: 86, p: 1.6, c: 20, f: 0.1 }, [], 200),
  food('Potato', 'g', { kcal: 77, p: 2, c: 17, f: 0.1 }, ['potatoes'], 200),
  food('Quinoa (cooked)', 'g', { kcal: 120, p: 4.4, c: 21, f: 1.9 }, [], 150),
  food('Bread slice', 'pc', { kcal: 80, p: 3, c: 14, f: 1 }, ['bread', 'toast'], 1),
  food('Roti / chapati', 'pc', { kcal: 120, p: 3, c: 18, f: 3.7 }, ['roti', 'chapati', 'chapatti'], 1),

  // ---- Fruit ----
  food('Banana', 'pc', { kcal: 105, p: 1.3, c: 27, f: 0.4 }, ['bananas'], 1, 118),
  food('Apple', 'pc', { kcal: 95, p: 0.5, c: 25, f: 0.3 }, ['apples'], 1, 182),
  food('Blueberries', 'g', { kcal: 57, p: 0.7, c: 14, f: 0.3 }, ['berries'], 100),
  food('Dates', 'pc', { kcal: 20, p: 0.2, c: 5.3, f: 0 }, ['date'], 1, 7),

  // ---- Fats / nuts ----
  food('Almonds', 'g', { kcal: 579, p: 21, c: 22, f: 50 }, ['almond', 'nuts'], 30),
  food('Peanut butter', 'g', { kcal: 588, p: 25, c: 20, f: 50 }, ['pb'], 32),
  food('Olive oil', 'g', { kcal: 884, p: 0, c: 0, f: 100 }, ['oil'], 14),
  food('Avocado', 'pc', { kcal: 240, p: 3, c: 12, f: 22 }, [], 1, 150),
  food('Cheddar cheese', 'g', { kcal: 402, p: 25, c: 1.3, f: 33 }, ['cheese'], 30),

  // ---- Dairy / liquids ----
  food('Whole milk', 'g', { kcal: 61, p: 3.2, c: 4.8, f: 3.3 }, ['milk'], 250),
  food('Skim milk', 'g', { kcal: 34, p: 3.4, c: 5, f: 0.1 }, ['skimmed milk'], 250),

  // ---- Veg ----
  food('Broccoli', 'g', { kcal: 34, p: 2.8, c: 7, f: 0.4 }, [], 100),

  // ---- Sweeteners ----
  food('Honey', 'g', { kcal: 304, p: 0.3, c: 82, f: 0 }, [], 21),
]

// Multi-ingredient recipes that expand into their components on selection.
export const FOOD_PRESETS = [
  {
    slug: 'smoothie-standard',
    name: 'Smoothie',
    recipe: '250ml lactose free milk, 30gm peanut butter, 60gm oats, one scoop pea protein',
  },
]

function food(name, unit, m, aliases = [], defaultPortion = unit === 'g' ? 100 : 1, gramsPerPiece = null) {
  return {
    slug: slugify(name),
    name,
    unit,
    kcal: m.kcal,
    p: m.p,
    c: m.c,
    f: m.f,
    aliases: [name.toLowerCase(), ...aliases],
    defaultPortion,
    gramsPerPiece,
  }
}

const WEIGHT_UNITS = { g: 1, gram: 1, grams: 1, gm: 1, kg: 1000, ml: 1, l: 1000, oz: 28.35 }

// Parse a free-text description into { grams, pieces, name }.
export function parseQuantity(text) {
  const raw = (text || '').trim()
  const m = raw.match(/(\d+(?:\.\d+)?)\s*(kg|kilograms?|g|grams?|gm|ml|millilitres?|l|litres?|oz|ounces?)?/i)
  if (!m) return { grams: null, pieces: null, name: raw }
  const qty = parseFloat(m[1])
  const unitRaw = (m[2] || '').toLowerCase()
  const name = raw.replace(m[0], ' ').replace(/\s+/g, ' ').trim()
  const unitKey = unitRaw.replace(/s$/, '').replace('kilogram', 'kg').replace('millilitre', 'ml').replace('litre', 'l').replace('ounce', 'oz').replace('gram', 'g')
  if (unitRaw && WEIGHT_UNITS[unitKey] != null) {
    return { grams: qty * WEIGHT_UNITS[unitKey], pieces: null, name }
  }
  // a bare leading number means a count of pieces ("2 eggs", "1 banana")
  return { grams: null, pieces: qty, name }
}

// Find the best matching DB food for a (cleaned) name.
export function findFood(name) {
  const q = (name || '').toLowerCase().trim()
  if (!q) return null
  let best = null
  let bestScore = 0
  for (const fd of FOOD_DB) {
    for (const alias of fd.aliases) {
      let score = 0
      if (q === alias) score = 100
      else if (q.includes(alias)) score = 60 + alias.length
      else if (alias.includes(q) && q.length >= 3) score = 30 + q.length
      if (score > bestScore) {
        bestScore = score
        best = fd
      }
    }
  }
  return best
}

// Estimate macros for a typed description. Returns null when nothing matches.
export function estimateFromText(text) {
  const { grams, pieces, name } = parseQuantity(text)
  const fd = findFood(name) || findFood(text)
  if (!fd) return null

  let qty // in the food's unit (grams for 'g', pieces for 'pc')
  let perUnit // macros for a single unit, for proportional scaling
  if (fd.unit === 'pc') {
    let count = pieces ?? 1
    if (grams != null && fd.gramsPerPiece) count = grams / fd.gramsPerPiece
    qty = trim(count)
    perUnit = { p: fd.p, c: fd.c, f: fd.f }
  } else {
    qty = trim(grams ?? fd.defaultPortion)
    perUnit = { p: fd.p / 100, c: fd.c / 100, f: fd.f / 100 }
  }

  return {
    food: fd,
    unit: fd.unit,
    qty,
    perUnit,
    qtyLabel: fd.unit === 'pc' ? `${qty} ${qty === 1 ? 'pc' : 'pcs'}` : `${qty} g`,
    protein: round1(perUnit.p * qty),
    carbs: round1(perUnit.c * qty),
    fat: round1(perUnit.f * qty),
  }
}

// Split a compound description into its food components.
// "2 eggs, 10ml mustard oil and 300gm cooked rice" -> three parts.
export function splitComponents(text) {
  return (text || '')
    .split(/\s*(?:,|;|\+|&|\band\b|\bwith\b|\bplus\b)\s*/i)
    .map((s) => s.trim())
    .filter(Boolean)
}

// Estimate a whole meal that may contain several foods in one string.
// Returns summed macros plus a per-component breakdown.
export function estimateMeal(text) {
  const parts = splitComponents(text)

  // Single component: keep quantity-scaling info so the Qty field still works.
  if (parts.length <= 1) {
    const est = estimateFromText(text)
    if (!est) {
      return { single: true, items: [], matchedCount: 0, totalCount: parts.length, protein: 0, carbs: 0, fat: 0 }
    }
    return {
      single: true,
      items: [
        {
          raw: text.trim(),
          matched: true,
          name: est.food.name,
          label: est.qtyLabel,
          calories: atwater(est.protein, est.carbs, est.fat),
          protein: est.protein,
          carbs: est.carbs,
          fat: est.fat,
        },
      ],
      matchedCount: 1,
      totalCount: 1,
      protein: est.protein,
      carbs: est.carbs,
      fat: est.fat,
      qty: est.qty,
      unit: est.unit,
      perUnit: est.perUnit,
    }
  }

  // Multiple components: estimate and sum each, tracking what matched.
  let p = 0, c = 0, f = 0, matched = 0
  const items = parts.map((part) => {
    const est = estimateFromText(part)
    if (est) {
      matched++
      p += est.protein
      c += est.carbs
      f += est.fat
      return {
        raw: part,
        matched: true,
        name: est.food.name,
        label: est.qtyLabel,
        calories: atwater(est.protein, est.carbs, est.fat),
        protein: est.protein,
        carbs: est.carbs,
        fat: est.fat,
      }
    }
    return { raw: part, matched: false }
  })

  return {
    single: false,
    items,
    matchedCount: matched,
    totalCount: parts.length,
    protein: round1(p),
    carbs: round1(c),
    fat: round1(f),
  }
}

function trim(n) {
  return Math.round(n * 10) / 10
}
function round1(n) {
  return Math.round(num(n) * 10) / 10
}
