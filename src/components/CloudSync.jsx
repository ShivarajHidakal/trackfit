import { useEffect, useState } from 'react'
import { Card } from './ui.jsx'
import { cloudEnabled, cloudSignIn, cloudSignOut, currentCloudUser } from '../lib/cloud.js'

// Cloud sync controls. Hidden entirely when Firebase isn't configured, so the
// app still works as a local-only build.
export default function CloudSync() {
  const [user, setUser] = useState(() => {
    const u = currentCloudUser()
    return u ? { email: u.email, name: u.displayName, photo: u.photoURL } : null
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  useEffect(() => {
    const onAuth = (e) => {
      setUser(e.detail?.user || null)
      setBusy(false)
    }
    window.addEventListener('trackfit:auth', onAuth)
    return () => window.removeEventListener('trackfit:auth', onAuth)
  }, [])

  if (!cloudEnabled) return null

  const signIn = async () => {
    setErr(null)
    setBusy(true)
    try {
      await cloudSignIn()
    } catch (e) {
      setErr(e?.message || 'Sign-in failed')
      setBusy(false)
    }
  }
  const signOut = async () => {
    setBusy(true)
    try {
      await cloudSignOut()
    } catch (e) {
      setErr(e?.message || 'Sign-out failed')
    }
    setBusy(false)
  }

  return (
    <Card icon="☁" title="Cloud Sync">
      {user ? (
        <>
          <div className="cloud-status">
            {user.photo ? (
              <img className="cloud-avatar" src={user.photo} alt="" referrerPolicy="no-referrer" />
            ) : (
              <span className="cloud-avatar cloud-avatar-fallback">{(user.email || '?')[0].toUpperCase()}</span>
            )}
            <div>
              <div className="cloud-on">
                <span className="dot" /> Synced to the cloud
              </div>
              <div className="tiny faint">{user.email}</div>
            </div>
          </div>
          <div className="section-note">
            Your log is saved online and syncs across devices. Clearing this browser won’t lose
            anything — just sign in again here.
          </div>
          <div className="row">
            <button className="btn" onClick={signOut} disabled={busy}>
              Sign out
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="section-note">
            Sign in with Google to back up your data online and keep it synced across your phone and
            laptop. Survives cache clears, reinstalls, and new devices.
          </div>
          <div className="row">
            <button className="btn btn-primary" onClick={signIn} disabled={busy}>
              {busy ? 'Opening…' : 'Sign in with Google'}
            </button>
          </div>
        </>
      )}
      {err && (
        <div className="match miss">
          <span className="dot" /> {err}
        </div>
      )}
    </Card>
  )
}
