// High-level data access on top of the storage adapter. Knows the key scheme:
//   entry:YYYY-MM-DD   one record per day
//   food:<slug>        reusable food-library item with reference macros
//   exercise:<slug>    autocomplete + recent-session history per exercise
//   settings           single targets/phase record

import { storage, getAll } from './storage.js'
import { DEFAULT_SETTINGS, emptyEntry } from './constants.js'
import { slugify } from './calc.js'

/* ---------- Entries ---------- */

export async function loadEntry(dateKey) {
  const stored = await storage.get(`entry:${dateKey}`)
  // Merge over a fresh template so older records gain any newer fields.
  return stored ? { ...emptyEntry(dateKey), ...stored } : emptyEntry(dateKey)
}

export async function saveEntry(entry) {
  await storage.set(`entry:${entry.date}`, entry)
}

export async function loadAllEntries() {
  const rows = await getAll('entry:')
  return rows
    .map((r) => r.value)
    .filter((e) => e && e.date)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
}

/* ---------- Settings ---------- */

export async function loadSettings() {
  const stored = await storage.get('settings')
  return { ...DEFAULT_SETTINGS, ...(stored || {}) }
}

export async function saveSettings(settings) {
  await storage.set('settings', settings)
}

/* ---------- Food library ---------- */

export async function loadFoods() {
  const rows = await getAll('food:')
  return rows.map((r) => r.value).sort((a, b) => a.name.localeCompare(b.name))
}

export async function saveFood(food) {
  const slug = slugify(food.name)
  if (!slug) return null
  const record = { ...food, slug }
  await storage.set(`food:${slug}`, record)
  return record
}

export async function deleteFood(slug) {
  await storage.delete(`food:${slug}`)
}

/* ---------- Exercise library (autocomplete + last-time lookup) ---------- */

export async function loadExercises() {
  const rows = await getAll('exercise:')
  return rows.map((r) => r.value)
}

// Upsert today's session into an exercise's recent history (most recent first,
// capped). Used so "last time you did this" is instant without scanning entries.
export async function recordExerciseSession(name, dateKey, sets) {
  const slug = slugify(name)
  if (!slug || !sets || !sets.length) return
  const existing = (await storage.get(`exercise:${slug}`)) || {
    slug,
    name,
    sessions: [],
  }
  const sessions = existing.sessions.filter((s) => s.date !== dateKey)
  sessions.push({ date: dateKey, sets })
  sessions.sort((a, b) => (a.date < b.date ? 1 : -1))
  await storage.set(`exercise:${slug}`, {
    slug,
    name,
    sessions: sessions.slice(0, 12),
  })
}

// Most recent logged session strictly before beforeDate.
export function previousSession(exerciseLib, name, beforeDate) {
  const slug = slugify(name)
  const rec = exerciseLib.find((e) => e.slug === slug)
  if (!rec) return null
  return rec.sessions.find((s) => s.date < beforeDate) || null
}
