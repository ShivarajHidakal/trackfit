import { Autocomplete } from './ui.jsx'
import { MUSCLE_GROUPS } from '../lib/constants.js'
import { exerciseVolume, num } from '../lib/calc.js'
import { previousSession } from '../lib/db.js'
import { prettyDate, todayKey } from '../lib/dates.js'

// Reusable exercise/set editor: name + muscle group + weight×reps set rows +
// add/remove. Used both for logging today's session (TrainingSection) and for
// editing a saved Push/Pull/Legs template (Settings' Weekly Plan). allowAdd
// hides "+ Add exercise" for TrainingSection, where the list is meant to come
// entirely from "Mark done" pulling in the day's template, not manual entry.
export default function ExerciseList({ exercises, onChange, exerciseLib = [], beforeDate, allowAdd = true }) {
  const updateExercise = (idx, patch) =>
    onChange(exercises.map((ex, i) => (i === idx ? { ...ex, ...patch } : ex)))

  const addExercise = () =>
    onChange([...exercises, { muscleGroup: 'Chest', exercise: '', sets: [{ weight: '', reps: '' }] }])

  const removeExercise = (idx) => onChange(exercises.filter((_, i) => i !== idx))

  const addSet = (idx) => {
    const ex = exercises[idx]
    const last = ex.sets[ex.sets.length - 1] || { weight: '', reps: '' }
    updateExercise(idx, { sets: [...ex.sets, { weight: last.weight, reps: '' }] })
  }

  const updateSet = (exIdx, setIdx, patch) => {
    const ex = exercises[exIdx]
    const sets = ex.sets.map((s, i) => (i === setIdx ? { ...s, ...patch } : s))
    updateExercise(exIdx, { sets })
  }

  const removeSet = (exIdx, setIdx) => {
    const ex = exercises[exIdx]
    updateExercise(exIdx, { sets: ex.sets.filter((_, i) => i !== setIdx) })
  }

  const nameSuggestions = exerciseLib
    .slice()
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    .map((e) => ({
      label: e.name,
      sub: e.sessions[0]
        ? `last ${prettyDate(e.sessions[0].date)} · ${e.sessions[0].sets.length} sets`
        : '',
      value: e,
    }))

  const anchor = beforeDate || todayKey()

  return (
    <>
      {exercises.map((ex, i) => {
        const prev = ex.exercise ? previousSession(exerciseLib, ex.exercise, anchor) : null
        const vol = exerciseVolume(ex)
        return (
          <div className="ex" key={i}>
            {/* Title row: exercise name + remove */}
            <div className="ex-head">
              <span className="ex-idx num">{i + 1}</span>
              <Autocomplete
                className="ex-name"
                value={ex.exercise}
                onChange={(v) => updateExercise(i, { exercise: v })}
                onPick={(picked) => updateExercise(i, { exercise: picked.name })}
                suggestions={nameSuggestions}
                placeholder="Exercise name…"
              />
              <button className="icon-btn ex-del" aria-label="remove exercise" onClick={() => removeExercise(i)}>
                ✕
              </button>
            </div>

            {/* Muscle pill + last-time hint */}
            <div className="ex-meta">
              <select
                className="muscle-pill"
                value={ex.muscleGroup}
                onChange={(e) => updateExercise(i, { muscleGroup: e.target.value })}
              >
                {MUSCLE_GROUPS.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
              {prev ? (
                <span className="last-hint">
                  ↻ last: <b>{prev.sets.map((s) => `${num(s.weight)}×${num(s.reps)}`).join(', ')}</b>
                </span>
              ) : (
                <span className="last-hint faint">no previous log</span>
              )}
            </div>

            {/* Compact set rows: weight × reps */}
            <div className="setgrid">
              <div className="setgrid-head">
                <span>Set</span>
                <span>Weight</span>
                <span />
                <span>Reps</span>
                <span />
              </div>
              {ex.sets.map((s, j) => (
                <div className="setrow" key={j}>
                  <span className="setn num">{j + 1}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={s.weight}
                    onChange={(e) => updateSet(i, j, { weight: e.target.value })}
                    placeholder="kg"
                  />
                  <span className="x">×</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={s.reps}
                    onChange={(e) => updateSet(i, j, { reps: e.target.value })}
                    placeholder="reps"
                  />
                  <button
                    className="setdel"
                    aria-label="remove set"
                    onClick={() => removeSet(i, j)}
                    disabled={ex.sets.length === 1}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Footer: add set + summary */}
            <div className="ex-foot">
              <button className="btn btn-sm add-set" onClick={() => addSet(i)}>
                + Add set
              </button>
              <span className="ex-vol num">
                {ex.sets.length} sets · {Math.round(vol)} kg
              </span>
            </div>
          </div>
        )
      })}

      {allowAdd && (
        <button className="btn btn-primary btn-block add-ex" onClick={addExercise}>
          + Add exercise
        </button>
      )}
    </>
  )
}
