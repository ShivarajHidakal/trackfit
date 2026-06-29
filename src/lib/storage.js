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

const base = hasWindowStorage ? windowAdapter : localAdapter

// Optional cloud mirror, installed by cloud.js once a user signs in. Every local
// write is also pushed to the cloud; failures are logged but never block the UI.
let mirror = null
export function setMirror(m) {
  mirror = m
}

export const storage = {
  get: (key) => base.get(key),
  list: (prefix) => base.list(prefix),
  async set(key, value) {
    await base.set(key, value)
    if (mirror) {
      try {
        await mirror.set(key, value)
      } catch (e) {
        console.warn('[trackfit] cloud sync (set) failed:', e)
      }
    }
  },
  async delete(key) {
    await base.delete(key)
    if (mirror) {
      try {
        await mirror.delete(key)
      } catch (e) {
        console.warn('[trackfit] cloud sync (delete) failed:', e)
      }
    }
  },
}

// Local-only writes used by cloud.js when pulling cloud data DOWN to this device
// (so a download doesn't bounce straight back up to the cloud).
export const setLocal = (key, value) => base.set(key, value)
export const deleteLocal = (key) => base.delete(key)

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
