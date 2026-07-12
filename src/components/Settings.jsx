import { useRef, useState } from 'react'
import { Card, Stepper, Autocomplete } from './ui.jsx'
import ExerciseList from './ExerciseList.jsx'
import { PHASES, DAY_TYPES, WEEKDAY_KEYS } from '../lib/constants.js'
import { atwater, num } from '../lib/calc.js'
import { FOOD_DB, FOOD_PRESETS, estimateMeal } from '../lib/foodDatabase.js'
import { storageBackend } from '../lib/storage.js'
import { downloadBackup, importBackupFile } from '../lib/backup.js'
import { resetLoggedData } from '../lib/db.js'
import CloudSync from './CloudSync.jsx'

export default function Settings({ settings, foods, exerciseLib, onChange, onDeleteFood }) {
  const set = (k, v) => onChange({ ...settings, [k]: v })

  const weeklySplit = settings.weeklySplit || {}
  const setSplitDay = (day, type) => set('weeklySplit', { ...weeklySplit, [day]: type })

  const mealPlan = settings.mealPlan || []
  const setMealSlot = (i, patch) =>
    set('mealPlan', mealPlan.map((m, idx) => (idx === i ? { ...m, ...patch } : m)))
  const mealSuggestions = [
    ...FOOD_PRESETS.map((p) => ({ label: `${p.name} (recipe)`, value: { __preset: true, ...p } })),
    ...foods.map((f) => ({ label: f.name, sub: '★ saved', value: { __lib: true, ...f } })),
    ...FOOD_DB.map((f) => ({ label: f.name, value: { name: f.name } })),
  ]

  // Typing free text live-estimates macros from the food database, same as
  // the Diet tab's add-meal box.
  const onMealText = (i, text) => {
    const est = estimateMeal(text)
    setMealSlot(i, {
      desc: text,
      ...(est.matchedCount > 0
        ? { calories: atwater(est.protein, est.carbs, est.fat), protein: est.protein, carbs: est.carbs, fat: est.fat }
        : {}),
    })
  }

  // Picking a suggestion resolves macros immediately: a recipe expands, a
  // saved library item uses its stored macros, a DB item re-estimates by name.
  const onMealPick = (i, picked) => {
    if (picked.__preset) {
      const est = estimateMeal(picked.recipe)
      setMealSlot(i, {
        desc: picked.name,
        calories: atwater(est.protein, est.carbs, est.fat),
        protein: est.protein,
        carbs: est.carbs,
        fat: est.fat,
      })
    } else if (picked.__lib) {
      setMealSlot(i, {
        desc: picked.name,
        calories: num(picked.calories),
        protein: num(picked.protein),
        carbs: num(picked.carbs),
        fat: num(picked.fat),
      })
    } else {
      onMealText(i, picked.name)
    }
  }

  const workoutPlan = settings.workoutPlan || { Push: [], Pull: [], Legs: [] }
  const setWorkoutDay = (day, exercises) => set('workoutPlan', { ...workoutPlan, [day]: exercises })
  const fileRef = useRef(null)
  const [msg, setMsg] = useState(null)

  const handleExport = async () => {
    try {
      const n = await downloadBackup()
      setMsg({ ok: true, text: `Exported ${n} records. Keep the file somewhere safe.` })
    } catch (e) {
      setMsg({ ok: false, text: 'Export failed: ' + e.message })
    }
  }

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!confirm('Restore this backup? It will overwrite matching data in this browser, then reload.')) {
      e.target.value = ''
      return
    }
    try {
      const n = await importBackupFile(file)
      setMsg({ ok: true, text: `Restored ${n} records. Reloading…` })
      setTimeout(() => window.location.reload(), 800)
    } catch (err) {
      setMsg({ ok: false, text: 'Import failed: ' + err.message })
    }
    e.target.value = ''
  }

  const handleReset = async () => {
    if (
      !confirm(
        'Delete all logged days, saved foods, and exercise history — on this device and in the cloud if signed in? Targets and your Weekly Plan (split, meals, workouts) are kept. This cannot be undone.'
      )
    )
      return
    await resetLoggedData()
    setMsg({ ok: true, text: 'Logged data cleared. Reloading…' })
    setTimeout(() => window.location.reload(), 800)
  }

  return (
    <div className="stack">
      <CloudSync />

      <Card icon="🎯" title="Targets">
        <div className="field">
          <label className="label">Current phase</label>
          <select value={settings.phase} onChange={(e) => set('phase', e.target.value)}>
            {PHASES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>

        <div className="grid2">
          <div className="field">
            <label className="label">Daily calorie target (kcal)</label>
            <Stepper value={settings.calorieTarget} onChange={(v) => set('calorieTarget', v)} step={50} min={0} />
          </div>
          <div className="field">
            <label className="label">Maintenance / TDEE (kcal)</label>
            <Stepper value={settings.maintenanceCalories} onChange={(v) => set('maintenanceCalories', v)} step={50} min={0} />
          </div>
        </div>
        <div className="section-note">
          Maintenance (TDEE) is the calories you’d eat to hold weight. The Dashboard uses it to show
          your weekly surplus (lean bulk) or deficit (cut).
        </div>

        <div className="grid2">
          <div className="field">
            <label className="label">Protein (g)</label>
            <Stepper value={settings.proteinTarget} onChange={(v) => set('proteinTarget', v)} step={5} min={0} />
          </div>
          <div className="field">
            <label className="label">Carbs (g)</label>
            <Stepper value={settings.carbTarget} onChange={(v) => set('carbTarget', v)} step={5} min={0} />
          </div>
          <div className="field">
            <label className="label">Fat (g)</label>
            <Stepper value={settings.fatTarget} onChange={(v) => set('fatTarget', v)} step={5} min={0} />
          </div>
          <div className="field">
            <label className="label">Target weight (kg)</label>
            <Stepper value={settings.targetBodyWeight} onChange={(v) => set('targetBodyWeight', v)} step={0.5} decimals={1} min={0} />
          </div>
          <div className="field">
            <label className="label">Cardio (sessions / week)</label>
            <Stepper value={settings.cardioTarget} onChange={(v) => set('cardioTarget', v)} step={1} min={0} max={7} />
          </div>
        </div>

        <div className="section-note">
          The diet dashboard measures progress against these. Update them whenever the phase shifts
          (e.g. when contest prep starts and the deficit begins).
        </div>
      </Card>

      <Card icon="📅" title="Weekly Plan">
        <div className="section-note">
          Define your split, meals, and workouts once. On the Today tab, day type
          fills in automatically and a tap on Meal 1–4 or “Mark done” logs the plan
          instead of typing it out again.
        </div>

        <div className="field">
          <label className="label">Split (day type by weekday)</label>
          {WEEKDAY_KEYS.map((day) => (
            <div className="planday" key={day}>
              <span className="planday-label">{day}</span>
              <div className="seg">
                {DAY_TYPES.map((d) => (
                  <button
                    key={d}
                    className={weeklySplit[day] === d ? 'on good' : ''}
                    onClick={() => setSplitDay(day, d)}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="divline" />

        <div className="field">
          <label className="label">Meal plan</label>
          {mealPlan.map((m, i) => (
            <div className="planmeal" key={i}>
              <span className="planmeal-no">Meal {i + 1}</span>
              <Autocomplete
                className="planmeal-field"
                value={m.desc}
                onChange={(v) => onMealText(i, v)}
                onPick={(picked) => onMealPick(i, picked)}
                suggestions={mealSuggestions}
                placeholder="Type a food… chicken, 2 eggs, smoothie"
                name={`mealplan-${i}`}
              />
              {m.desc && (
                <div className="chips">
                  <span className="chip">{num(m.calories)} kcal</span>
                  <span className="chip gray">{num(m.protein)}P</span>
                  <span className="chip gray">{num(m.carbs)}C</span>
                  <span className="chip gray">{num(m.fat)}F</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="divline" />

        <div className="field">
          <label className="label">Workout plan</label>
          {['Push', 'Pull', 'Legs'].map((day) => (
            <div className="planworkout" key={day}>
              <div className="planworkout-head">{day} day</div>
              <ExerciseList
                exercises={workoutPlan[day] || []}
                onChange={(next) => setWorkoutDay(day, next)}
                exerciseLib={exerciseLib}
              />
            </div>
          ))}
        </div>
      </Card>

      <Card icon="📚" title={`Food Library · ${foods.length}`}>
        {foods.length === 0 ? (
          <div className="empty">
            No saved foods yet. Tick “Save to food library” when adding a meal to reuse its macros
            later.
          </div>
        ) : (
          foods.map((f) => (
            <div className="item" key={f.slug}>
              <div className="item-top">
                <div>
                  <div className="item-title">{f.name}</div>
                  <div className="chips">
                    {f.qty ? <span className="chip gray">{f.qty}</span> : null}
                    <span className="chip">{f.calories} kcal</span>
                    <span className="chip gray">{f.protein}P</span>
                    <span className="chip gray">{f.carbs}C</span>
                    <span className="chip gray">{f.fat}F</span>
                  </div>
                </div>
                <button className="icon-btn" aria-label="delete food" onClick={() => onDeleteFood(f.slug)}>
                  🗑
                </button>
              </div>
            </div>
          ))
        )}
      </Card>

      <Card icon="💾" title="Backup & Restore">
        <div className="section-note">
          Your data lives only in this browser. Export a backup regularly (and before clearing
          history or switching phones) so you never lose your prep log.
        </div>
        <div className="row">
          <button className="btn btn-primary" onClick={handleExport}>
            ⬇ Export backup
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            ⬆ Import backup
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={handleImport}
        />
        {msg && (
          <div className={`match ${msg.ok ? 'hit' : 'miss'}`}>
            <span className="dot" /> {msg.text}
          </div>
        )}

        <div className="divline" />

        <div className="section-note">
          Starting a fresh log? This clears every logged day, saved food, and exercise history
          (locally and in the cloud) but keeps your Targets and Weekly Plan intact.
        </div>
        <button className="btn btn-danger btn-block" onClick={handleReset}>
          🗑 Reset all logged data
        </button>
      </Card>

      <div className="tiny faint" style={{ textAlign: 'center', padding: '0 14px' }}>
        TrackFIT · personal prep logbook · data stored locally via {storageBackend}
      </div>
    </div>
  )
}
