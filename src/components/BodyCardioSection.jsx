import { Card, Toggle, Stepper } from './ui.jsx'
import { CARDIO_TYPES } from '../lib/constants.js'

export default function BodyCardioSection({ entry, settings, onUpdate }) {
  const cardio = entry.cardio
  const patchCardio = (patch) => onUpdate({ cardio: { ...cardio, ...patch } })

  return (
    <Card icon="⚖" title="Body Weight & Cardio">
      <div className="field">
        <label className="label">Morning fasted weight (kg)</label>
        <div className="row">
          <Stepper
            value={entry.bodyWeight}
            onChange={(v) => onUpdate({ bodyWeight: v })}
            step={0.1}
            decimals={1}
            min={0}
          />
        </div>
        {settings.targetBodyWeight ? (
          <div className="tiny muted" style={{ marginTop: 6 }}>
            Phase target: <b className="num">{settings.targetBodyWeight} kg</b>
            {entry.bodyWeight != null && (
              <>
                {' · '}
                {entry.bodyWeight >= settings.targetBodyWeight ? '+' : ''}
                <span className="num">{(entry.bodyWeight - settings.targetBodyWeight).toFixed(1)}</span> kg
              </>
            )}
          </div>
        ) : null}
      </div>

      <div className="divline" />

      <div className="field">
        <Toggle
          checked={cardio.done}
          onChange={(v) => patchCardio({ done: v })}
          tone="iron"
          label={cardio.done ? 'Cardio done' : 'Cardio not done'}
        />
      </div>

      {cardio.done && (
        <div className="row">
          <div className="field">
            <label className="label">Type</label>
            <select value={cardio.type} onChange={(e) => patchCardio({ type: e.target.value })}>
              {CARDIO_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="label">Minutes</label>
            <Stepper value={cardio.duration} onChange={(v) => patchCardio({ duration: v })} step={5} min={0} />
          </div>
        </div>
      )}
    </Card>
  )
}
