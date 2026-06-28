// Export / import the entire local dataset as a JSON file, so months of prep
// data survive a cleared browser, a new phone, or a switch of device.

import { storage, getAll } from './storage.js'

// Collect every stored key/value into one portable object.
export async function buildBackup() {
  const rows = await getAll('') // all keys, no prefix filter
  const data = {}
  rows.forEach((r) => {
    data[r.key] = r.value
  })
  return {
    app: 'TrackFIT',
    version: 1,
    exportedAt: new Date().toISOString(),
    count: rows.length,
    data,
  }
}

// Trigger a file download of the current backup.
export async function downloadBackup() {
  const payload = await buildBackup()
  const stamp = new Date().toISOString().slice(0, 10)
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `trackfit-backup-${stamp}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  return payload.count
}

// Restore from a parsed backup object. Writes every key back into storage.
export async function restoreBackup(payload) {
  if (!payload || payload.app !== 'TrackFIT' || !payload.data) {
    throw new Error('Not a valid TrackFIT backup file.')
  }
  const entries = Object.entries(payload.data)
  for (const [key, value] of entries) {
    await storage.set(key, value)
  }
  return entries.length
}

// Read a File object (from an <input type=file>) and restore it.
export async function importBackupFile(file) {
  const text = await file.text()
  let payload
  try {
    payload = JSON.parse(text)
  } catch {
    throw new Error('That file isn’t valid JSON.')
  }
  return restoreBackup(payload)
}
