import { useEffect, useMemo, useRef, useState } from 'react'
import {
  loadSettings,
  saveSettings,
  loadFoods,
  saveFood,
  deleteFood,
  loadExercises,
  loadAllEntries,
  saveEntry,
  recordExerciseSession,
} from './lib/db.js'
import { emptyEntry } from './lib/constants.js'
import { todayKey, addDays, prettyDate, isToday } from './lib/dates.js'
import { num } from './lib/calc.js'

import DietSection from './components/DietSection.jsx'
import TrainingSection from './components/TrainingSection.jsx'
import BodyCardioSection from './components/BodyCardioSection.jsx'
import ReelSection from './components/ReelSection.jsx'
import Dashboard from './components/Dashboard.jsx'
import Settings from './components/Settings.jsx'
import { SaveHint } from './components/ui.jsx'

const TABS = [
  { id: 'today', label: 'Today', ic: '📓' },
  { id: 'dashboard', label: 'Dashboard', ic: '📊' },
  { id: 'settings', label: 'Settings', ic: '⚙' },
]

export default function App() {
  const [ready, setReady] = useState(false)
  const [tab, setTab] = useState('today')
  const [date, setDate] = useState(todayKey())

  const [settings, setSettings] = useState(null)
  const [foods, setFoods] = useState([])
  const [exerciseLib, setExerciseLib] = useState([])
  const [entries, setEntries] = useState({}) // keyed by date
  const [entry, setEntry] = useState(null)

  const [saved, setSaved] = useState(false)
  const saveTimer = useRef(null)
  const skipSave = useRef(true)
  const savedTimer = useRef(null)

  // Initial load
  useEffect(() => {
    ;(async () => {
      const [s, f, ex, all] = await Promise.all([
        loadSettings(),
        loadFoods(),
        loadExercises(),
        loadAllEntries(),
      ])
      setSettings(s)
      setFoods(f)
      setExerciseLib(ex)
      const map = Object.fromEntries(all.map((e) => [e.date, e]))
      setEntries(map)
      setEntry(map[date] || emptyEntry(date))
      setReady(true)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Switch active entry when the date changes
  useEffect(() => {
    if (!ready) return
    skipSave.current = true
    setEntry(entries[date] || emptyEntry(date))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  // Debounced autosave whenever the active entry changes
  useEffect(() => {
    if (!ready || !entry) return
    if (skipSave.current) {
      skipSave.current = false
      return
    }
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      await saveEntry(entry)
      // Keep the in-memory map in sync for dashboard/streak.
      setEntries((m) => ({ ...m, [entry.date]: entry }))
      // Update exercise library so "last time" + autocomplete stay current.
      const exs = entry.training?.exercises || []
      let touched = false
      for (const ex of exs) {
        const usable = (ex.sets || []).filter((s) => num(s.weight) > 0 || num(s.reps) > 0)
        if (ex.exercise && ex.exercise.trim() && usable.length) {
          await recordExerciseSession(ex.exercise.trim(), entry.date, usable)
          touched = true
        }
      }
      if (touched) setExerciseLib(await loadExercises())
      flashSaved()
    }, 600)
    return () => clearTimeout(saveTimer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry])

  const flashSaved = () => {
    setSaved(true)
    clearTimeout(savedTimer.current)
    savedTimer.current = setTimeout(() => setSaved(false), 1400)
  }

  const updateEntry = (patch) => setEntry((e) => ({ ...e, ...patch }))

  const handleSaveFood = async (food) => {
    const rec = await saveFood(food)
    if (rec) setFoods(await loadFoods())
  }
  const handleDeleteFood = async (slug) => {
    await deleteFood(slug)
    setFoods(await loadFoods())
  }
  const handleSettings = async (next) => {
    setSettings(next)
    await saveSettings(next)
    flashSaved()
  }

  const allEntriesArr = useMemo(
    () => Object.values(entries).sort((a, b) => (a.date < b.date ? -1 : 1)),
    [entries]
  )

  if (!ready || !entry || !settings) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-row">
          <div className="brand">
            <span className="mark">
              TRACK<b>FIT</b>
            </span>
          </div>
          <span className="phase">{settings.phase}</span>
        </div>
        {tab === 'today' && (
          <div className="datenav">
            <button className="arrow" aria-label="previous day" onClick={() => setDate((d) => addDays(d, -1))}>
              ‹
            </button>
            <div className="current">
              {isToday(date) ? 'Today' : prettyDate(date)}
              <small>{date}</small>
            </div>
            <button
              className="arrow"
              aria-label="next day"
              onClick={() => setDate((d) => addDays(d, 1))}
              disabled={date >= todayKey()}
              style={date >= todayKey() ? { opacity: 0.35 } : undefined}
            >
              ›
            </button>
            <button className="today-btn" onClick={() => setDate(todayKey())} disabled={isToday(date)}>
              Today
            </button>
          </div>
        )}
      </header>

      <main>
        {tab === 'today' && (
          <div className="stack">
            <BodyCardioSection entry={entry} settings={settings} onUpdate={updateEntry} />
            <DietSection
              entry={entry}
              settings={settings}
              foods={foods}
              onUpdate={updateEntry}
              onSaveFood={handleSaveFood}
            />
            <TrainingSection entry={entry} exerciseLib={exerciseLib} onUpdate={updateEntry} />
            <ReelSection entry={entry} allEntries={allEntriesArr} onUpdate={updateEntry} />
          </div>
        )}

        {tab === 'dashboard' && <Dashboard allEntries={allEntriesArr} settings={settings} />}

        {tab === 'settings' && (
          <Settings
            settings={settings}
            foods={foods}
            onChange={handleSettings}
            onDeleteFood={handleDeleteFood}
          />
        )}
      </main>

      <SaveHint show={saved} />

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            <span className="ic">{t.ic}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
