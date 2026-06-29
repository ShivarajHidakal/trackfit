// Firebase initialization. Cloud sync is optional: if firebase-config.js has no
// apiKey, cloudEnabled is false and the whole app runs local-only as before.
import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { firebaseConfig } from './firebase-config.js'

export const cloudEnabled = !!firebaseConfig.apiKey

let app = null
let auth = null
let db = null
let provider = null

if (cloudEnabled) {
  app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  db = getFirestore(app)
  provider = new GoogleAuthProvider()
}

export { app, auth, db, provider }
