// Storage adapter.
//
// The brief mandates window.storage (get/set/delete/list) — the Claude Artifacts
// runtime API. That object does not exist in an ordinary browser, so this adapter
// uses window.storage when it is present and transparently falls back to
// localStorage otherwise. Same async interface in both cases.

const hasWindowStorage =
  typeof window !== 'undefined' &&
  window.storage &&
  typeof window.storage.get === 'function'

const PREFIX = 'trackfit:' // namespace for the localStorage fallback only

const localAdapter = {
  async get(key) {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw == null) return null
    try {
      return JSON.parse(raw)
    } catch {
      return raw
    }
  },
  async set(key, value) {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  },
  async delete(key) {
    localStorage.removeItem(PREFIX + key)
  },
  async list(prefix = '') {
    const keys = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(PREFIX)) {
        const bare = k.slice(PREFIX.length)
        if (bare.startsWith(prefix)) keys.push(bare)
      }
    }
    return keys
  },
}

// Wrap window.storage so list() always returns a plain array of key strings,
// regardless of whether the runtime returns keys or {key,value} pairs.
const windowAdapter = {
  async get(key) {
    return window.storage.get(key)
  },
  async set(key, value) {
    return window.storage.set(key, value, { shared: false })
  },
  async delete(key) {
    return window.storage.delete(key)
  },
  async list(prefix = '') {
    const res = await window.storage.list(prefix)
    if (!Array.isArray(res)) return []
    return res.map((item) => (typeof item === 'string' ? item : item.key))
  },
}

export const storage = hasWindowStorage ? windowAdapter : localAdapter

export const storageBackend = hasWindowStorage ? 'window.storage' : 'localStorage'

// Read every value under a prefix as an array of { key, value }.
export async function getAll(prefix) {
  const keys = await storage.list(prefix)
  const out = []
  for (const key of keys) {
    const value = await storage.get(key)
    if (value != null) out.push({ key, value })
  }
  return out
}
