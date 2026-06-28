import { Card } from './ui.jsx'
import { REEL_STATUSES } from '../lib/constants.js'
import { reelStats } from '../lib/calc.js'
import { todayKey } from '../lib/dates.js'

export default function ReelSection({ entry, allEntries, onUpdate }) {
  const reel = entry.reel
  const patch = (p) => onUpdate({ reel: { ...reel, ...p } })

  // Streak reflects reality (anchored to actual today), not the viewed date.
  const merged = allEntries.some((e) => e.date === entry.date)
    ? allEntries
    : [...allEntries, entry]
  const stats = reelStats(merged, todayKey())

  const statusTone = (s) => (s === 'Posted' ? 'good' : s === 'Skipped' ? '' : 'iron')

  return (
    <Card icon="🎬" title="Reel / Content">
      <div className="streak-row">
        <div className="streak">
          <div className="v num">{stats.streak}</div>
          <div className="l">Day streak</div>
        </div>
        <div className="streak">
          <div className="v num">{stats.daysSincePost == null ? '—' : stats.daysSincePost}</div>
          <div className="l">Days since post</div>
        </div>
        <div className="streak">
          <div className="v num">{stats.totalPosted}</div>
          <div className="l">Total posted</div>
        </div>
      </div>

      <div className="field">
        <label className="label">Status</label>
        <div className="seg">
          {REEL_STATUSES.map((s) => (
            <button
              key={s}
              className={`${reel.status === s ? 'on ' + statusTone(s) : ''}`}
              onClick={() => patch({ status: s })}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label className="label">Remarks</label>
        <textarea
          value={reel.remarks}
          onChange={(e) => patch({ remarks: e.target.value })}
          placeholder="Content notes — what you filmed, how it felt, the post caption…"
        />
      </div>

      {stats.daysSincePost != null && stats.daysSincePost >= 2 && (
        <div className="section-note">
          It’s been {stats.daysSincePost} days since your last post — a quick clip today keeps
          momentum. No pressure on rest days though.
        </div>
      )}
    </Card>
  )
}
