// Local-date helpers. All keys use YYYY-MM-DD in the user's local timezone so a
// morning weigh-in lands on the right calendar day regardless of UTC offset.

export function toKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayKey() {
  return toKey(new Date())
}

export function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(key, n) {
  const d = parseKey(key)
  d.setDate(d.getDate() + n)
  return toKey(d)
}

export function daysBetween(aKey, bKey) {
  const a = parseKey(aKey)
  const b = parseKey(bKey)
  return Math.round((b - a) / 86400000)
}

// Human-friendly label, e.g. "Sun 28 Jun".
export function prettyDate(key) {
  const d = parseKey(key)
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export function isToday(key) {
  return key === todayKey()
}

// Current local time as HH:MM, for default meal timestamps.
export function nowTime() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// The last N day keys ending at (and including) endKey, oldest first.
export function lastNDays(endKey, n) {
  const out = []
  for (let i = n - 1; i >= 0; i--) out.push(addDays(endKey, -i))
  return out
}
