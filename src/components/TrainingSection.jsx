import { Card, Toggle } from './ui.jsx'
import { DAY_TYPES } from '../lib/constants.js'
import ExerciseList from './ExerciseList.jsx'

export default function TrainingSection({ entry, settings, exerciseLib, onUpdate }) {
  const training = entry.training
  const exercises = training.exercises || []

  const patchTraining = (patch) => onUpdate({ training: { ...training, ...patch } })

  // Marking a fresh day (no exercises logged yet) done pulls in that day's
  // planned exercises/sets from the Weekly Plan template, if one exists.
  // Deep-cloned so editing today's weights never mutates the saved template.
  const onToggleDone = (v) => {
    const template = settings?.workoutPlan?.[training.type]
    if (v && exercises.length === 0 && template && template.length) {
      patchTraining({
        exercises: template.map((ex) => ({ ...ex, sets: ex.sets.map((s) => ({ ...s })) })),
        completed: true,
      })
    } else {
      patchTraining({ completed: v })
    }
  }

  const isRest = training.type === 'Rest'
  const totalSets = exercises.reduce((s, ex) => s + (ex.sets?.length || 0), 0)

  return (
    <Card
      icon="🏋"
      title="Training"
      action={
        <Toggle
          checked={training.completed}
          onChange={onToggleDone}
          tone="good"
          label={training.completed ? 'Done' : 'Mark done'}
        />
      }
    >
      {/* Day type as quick-pick pills instead of a dropdown */}
      <div className="field">
        <label className="label">Day type</label>
        <div className="seg">
          {DAY_TYPES.map((d) => (
            <button
              key={d}
              className={training.type === d ? 'on good' : ''}
              onClick={() => patchTraining({ type: d })}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {isRest && exercises.length === 0 ? (
        <div className="section-note">Rest day — no exercises to log. Recovery counts. 💤</div>
      ) : null}

      <ExerciseList
        exercises={exercises}
        onChange={(next) => patchTraining({ exercises: next })}
        exerciseLib={exerciseLib}
        beforeDate={entry.date}
        allowAdd={false}
      />

      {exercises.length > 0 && (
        <div className="train-total num">
          {exercises.length} exercises · {totalSets} total sets
        </div>
      )}

      {training.completed && (
        <div className="field">
          <Toggle
            checked={!!training.progressiveOverload}
            onChange={(v) => patchTraining({ progressiveOverload: v })}
            tone="good"
            label="Progressive overload today? (more weight/reps than last time)"
          />
        </div>
      )}
    </Card>
  )
}
