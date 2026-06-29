// Cloud sync engine. Mirrors the local storage adapter to Firestore so data
// survives cache clears and follows the user across devices.
//
// Data model:  users/{uid}/items/{encodedKey}  ->  { json, updatedAt }
//   - one doc per storage key (entry:DATE, food:slug, exercise:slug, settings)
//   - value is stored as a JSON string in `json` to sidestep Firestore's nested
//     type rules entirely.
//
// Sync model:
//   - sign in with Google (popup, redirect fallback for mobile)
//   - on sign-in: merge cloud + local (union — no local day is ever lost; on a
//     key conflict the cloud copy wins), then tell the app to reload
//   - after that: every storage.set/delete is mirrored straight to the cloud

import {
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut,
  onAuthStateChanged,
} from 'firebase/auth'
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore'

import { auth, db, provider, cloudEnabled } from './firebase.js'
import { storage, setLocal, setMirror } from './storage.js'

export { cloudEnabled }

let currentUser = null

export function currentCloudUser() {
  return currentUser
}

const itemsCol = (uid) => collection(db, 'users', uid, 'items')
// Storage keys contain ':' — encode so they're always valid Firestore doc ids.
const encodeKey = (key) => encodeURIComponent(key)
const decodeKey = (id) => decodeURIComponent(id)

async function cloudPushItem(key, value) {
  if (!currentUser) return
  await setDoc(doc(itemsCol(currentUser.uid), encodeKey(key)), {
    json: JSON.stringify(value),
    updatedAt: serverTimestamp(),
  })
}

async function cloudDeleteItem(key) {
  if (!currentUser) return
  await deleteDoc(doc(itemsCol(currentUser.uid), encodeKey(key)))
}

// Reconcile cloud + local on sign-in. Union of keys: cloud-only downloads,
// local-only uploads, conflicts resolve to the cloud copy.
async function pullAndMerge() {
  const snap = await getDocs(itemsCol(currentUser.uid))
  const cloud = new Map()
  snap.forEach((d) => cloud.set(decodeKey(d.id), d.data()))

  const localKeys = await storage.list('')

  // Download cloud entries to this device (cloud wins on conflict).
  for (const [key, rec] of cloud) {
    try {
      await setLocal(key, JSON.parse(rec.json))
    } catch (e) {
      console.warn('[trackfit] could not apply cloud record', key, e)
    }
  }

  // Upload anything that exists only locally so the first device's history is
  // preserved in the cloud.
  for (const key of localKeys) {
    if (!cloud.has(key)) {
      const value = await storage.get(key)
      if (value != null) await cloudPushItem(key, value)
    }
  }

  return { downloaded: cloud.size, uploaded: localKeys.filter((k) => !cloud.has(k)).length }
}

// Wire everything up. Safe to call when cloud is disabled (does nothing).
export function initCloud() {
  if (!cloudEnabled) return

  // Every local write now also goes to the cloud (once signed in).
  setMirror({ set: cloudPushItem, delete: cloudDeleteItem })

  onAuthStateChanged(auth, async (user) => {
    currentUser = user || null
    if (user) {
      try {
        await pullAndMerge()
      } catch (e) {
        console.warn('[trackfit] cloud merge failed:', e)
      }
      // Tell the app to reload state from the now-merged local store.
      window.dispatchEvent(new Event('trackfit:synced'))
    }
    window.dispatchEvent(
      new CustomEvent('trackfit:auth', {
        detail: {
          user: user
            ? {
                uid: user.uid,
                email: user.email,
                name: user.displayName,
                photo: user.photoURL,
              }
            : null,
        },
      })
    )
  })
}

export async function cloudSignIn() {
  try {
    await signInWithPopup(auth, provider)
  } catch (e) {
    // Popups are unreliable in some mobile/in-app browsers — fall back to a
    // full-page redirect, which onAuthStateChanged picks up on return.
    if (
      e?.code === 'auth/popup-blocked' ||
      e?.code === 'auth/cancelled-popup-request' ||
      e?.code === 'auth/popup-closed-by-user' ||
      e?.code === 'auth/operation-not-supported-in-this-environment'
    ) {
      await signInWithRedirect(auth, provider)
    } else {
      throw e
    }
  }
}

export async function cloudSignOut() {
  await fbSignOut(auth)
}
