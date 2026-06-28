import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { Card } from './ui.jsx'
import { MUSCLE_GROUPS, PRIORITY_GROUPS } from '../lib/constants.js'
import { mealTotals, average, round1, num } from '../lib/calc.js'
import { lastNDays, prettyDate, todayKey, addDays, daysBetween } from '../lib/dates.js'

export default function Dashboard({ allEntries, settings }) {
  const byDate = Object.fromEntries(allEntries.map((e) => [e.date, e]))
  const anchor = todayKey()

  // ---- Weekly averages (body weight + calories), trend vs previous week ----
  const weekWeights = (offset) =>
    lastNDays(addDays(anchor, offset), 7).map((k) => byDate[k]?.bodyWeight ?? null)
  const weekCals = (offset) =>
    lastNDays(addDays(anchor, offset), 7).map((k) =>
      byDate[k] ? mealTotals(byDate[k].meals).calories : null
    )

  const wAvg = average(weekWeights(0))
  const wAvgPrev = average(weekWeights(-7))
  const cAvg = average(weekCals(0).filter((v) => v && v > 0))
  const cAvgPrev = average(weekCals(-7).filter((v) => v && v > 0))

  // ---- Weight chart: daily dots + rolling 7-day average line ----
  const dated = allEntries.filter((e) => e.bodyWeight != null)
  const chartData = buildChart(allEntries)

  // ---- Breakouts with preceding 24–48h of meals ----
  const breakouts = allEntries
    .filter((e) => e.skinCheck?.brokeOut)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 8)

  // ---- Trailing 7-day volume (sets) per muscle group ----
  const volWindow = lastNDays(anchor, 7)
  const setsByGroup = Object.fromEntries(MUSCLE_GROUPS.map((g) => [g, 0]))
  volWindow.forEach((k) => {
    const e = byDate[k]
    if (!e?.training?.exercises) return
    e.training.exercises.forEach((ex) => {
      if (setsByGroup[ex.muscleGroup] != null) setsByGroup[ex.muscleGroup] += (ex.sets || []).length
    })
  })
  const maxSets = Math.max(1, ...Object.values(setsByGroup))

  // ---- This-week adherence vs last week ----
  const week = weekStats(byDate, anchor, 0, settings)
  const prev = weekStats(byDate, anchor, -7, settings)

  return (
    <div className="stack">
      <WeeklyProgress week={week} prev={prev} settings={settings} wAvg={wAvg} wAvgPrev={wAvgPrev} />
      <EnergyBalance week={week} prev={prev} settings={settings} />

      {/* Headline stats */}
      <div className="stat-grid">
        <Stat
          k="Avg body weight · 7d"
          v={wAvg != null ? round1(wAvg) : '—'}
          unit="kg"
          trend={delta(wAvg, wAvgPrev, 'kg', true)}
        />
        <Stat
          k="Avg calories · 7d"
          v={cAvg != null ? Math.round(cAvg) : '—'}
          unit="kcal"
          trend={delta(cAvg, cAvgPrev, 'kcal', false)}
        />
      </div>
      <div className="section-note">
        Weekly averages — not single days — should drive any calorie change. The app surfaces the
        numbers; the raise/lower call stays a conversation, not an automated rule.
      </div>

      {/* Weight chart */}
      <Card icon="📈" title="Body Weight Trend">
        {dated.length < 2 ? (
          <div className="empty">Log body weight on at least two days to see the trend.</div>
        ) : (
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.07)" strokeDasharray="2 4" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9aa3b2' }} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.12)' }} minTickGap={24} />
                <YAxis domain={['dataMin - 0.5', 'dataMax + 0.5']} tick={{ fontSize: 11, fill: '#9aa3b2' }} tickLine={false} axisLine={false} width={42} />
                <Tooltip
                  contentStyle={{ background: '#1c212a', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 12, color: '#eaeef4', fontSize: 12 }}
                  labelStyle={{ color: '#9aa3b2' }}
                  formatter={(v, n) => [v != null ? `${v} kg` : '—', n === 'avg7' ? '7-day avg' : 'Daily']}
                />
                <Line type="monotone" dataKey="weight" stroke="#2ea6ff" strokeWidth={0} dot={{ r: 3, fill: '#2ea6ff' }} connectNulls name="weight" isAnimationActive={false} />
                <Line type="monotone" dataKey="avg7" stroke="#2ea6ff" strokeWidth={2.5} dot={false} connectNulls name="avg7" isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="tiny faint">Dots = daily weigh-in · line = rolling 7-day average</div>
      </Card>

      {/* Training volume */}
      <Card icon="📊" title="Weekly Volume · sets / muscle">
        <div className="tiny muted" style={{ marginTop: -4 }}>
          Trailing 7 days. ★ = tracked weak-point priority.
        </div>
        {Object.values(setsByGroup).every((v) => v === 0) ? (
          <div className="empty">No sets logged in the last 7 days.</div>
        ) : (
          MUSCLE_GROUPS.map((g) => {
            const n = setsByGroup[g]
            const prio = PRIORITY_GROUPS.includes(g)
            return (
              <div className="vol-row" key={g}>
                <div className="g">
                  {prio && <span className="star">★ </span>}
                  {g}
                </div>
                <div className={`vol-bar ${prio ? 'prio' : ''} ${n === 0 ? 'low' : ''}`}>
                  <i style={{ width: (n / maxSets) * 100 + '%' }} />
                </div>
                <div className="n num">{n}</div>
              </div>
            )
          })
        )}
      </Card>

      {/* Breakout correlation */}
      <Card icon="🔬" title="Breakout Correlation">
        {breakouts.length === 0 ? (
          <div className="empty">No breakouts logged. 🎉</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="tiny muted">
              Foods logged in the 48 h before each breakout. Scan for repeat ingredients — the app
              draws no conclusions for you.
            </div>
            {breakouts.map((b) => (
              <BreakoutCard key={b.date} entry={b} byDate={byDate} />
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

// Aggregate the 7-day window ending at anchor+offset.
function weekStats(byDate, anchor, offset, settings) {
  const keys = lastNDays(addDays(anchor, offset), 7)
  const days = keys.map((k) => byDate[k]).filter(Boolean)
  const mealDays = days.filter((d) => d.meals && d.meals.length)
  const totals = mealDays.map((d) => mealTotals(d.meals))

  const logged = days.filter((d) => (d.meals && d.meals.length) || d.bodyWeight != null).length
  const avgCal = average(totals.map((t) => t.calories))
  const avgPro = average(totals.map((t) => t.protein))
  const sumCal = totals.reduce((s, t) => s + t.calories, 0)
  const cardioDays = days.filter((d) => d.cardio && d.cardio.done).length
  const cardioMin = days.reduce((s, d) => s + (d.cardio && d.cardio.done ? num(d.cardio.duration) : 0), 0)
  const trainDays = days.filter((d) => d.training && d.training.completed).length

  return { logged, avgCal, avgPro, sumCal, mealDays: totals.length, cardioDays, cardioMin, trainDays }
}

// Weekly energy balance vs maintenance, across days that had meals logged.
function EnergyBalance({ week, prev, settings }) {
  const maint = settings.maintenanceCalories
  if (!maint) return null

  const bal = week.mealDays ? Math.round(week.sumCal - maint * week.mealDays) : null
  const prevBal = prev.mealDays ? Math.round(prev.sumCal - maint * prev.mealDays) : null
  const avg = bal != null && week.mealDays ? Math.round(bal / week.mealDays) : null
  const surplus = bal != null && bal >= 0
  const kgEst = bal != null ? round1(bal / 7700) : null // ~7700 kcal per kg

  return (
    <div className="card">
      <div className="card-head">
        <h2><span className="ic">⚡</span>Energy Balance</h2>
        <span className="faint tiny">vs {maint.toLocaleString()} kcal maintenance</span>
      </div>
      <div className="card-body">
        {bal == null ? (
          <div className="empty">Log meals this week to see your surplus / deficit.</div>
        ) : (
          <>
            <div className={`eb-hero ${surplus ? 'surplus' : 'deficit'}`}>
              <div className="eb-big num">
                {bal >= 0 ? '+' : '−'}
                {Math.abs(bal).toLocaleString()}
                <span className="eb-unit">kcal</span>
              </div>
              <div className="eb-tag">{surplus ? 'WEEKLY SURPLUS' : 'WEEKLY DEFICIT'}</div>
            </div>

            <div className="eb-row">
              <div className="eb-cell">
                <div className="eb-k">Avg / day</div>
                <div className="eb-v num">{avg >= 0 ? '+' : '−'}{Math.abs(avg)} <i>kcal</i></div>
              </div>
              <div className="eb-cell">
                <div className="eb-k">Across</div>
                <div className="eb-v num">{week.mealDays} <i>logged days</i></div>
              </div>
              <div className="eb-cell">
                <div className="eb-k">vs last week</div>
                <div className="eb-v num">
                  {prevBal == null ? '—' : `${bal - prevBal >= 0 ? '+' : '−'}${Math.abs(bal - prevBal).toLocaleString()}`}
                </div>
              </div>
            </div>

            <div className="section-note">
              ≈ <b>{kgEst >= 0 ? '+' : '−'}{Math.abs(kgEst)} kg</b> of mass from this balance (rough,
              ~7700 kcal/kg). For {settings.phase === 'Contest Prep' ? 'prep, keep this a steady deficit' : 'a lean bulk, keep this a small steady surplus'} —
              read it alongside the scale-weight trend, not on its own.
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function WeeklyProgress({ week, prev, settings, wAvg, wAvgPrev }) {
  const calPct = settings.calorieTarget ? Math.round(((week.avgCal || 0) / settings.calorieTarget) * 100) : null
  const proPct = settings.proteinTarget ? Math.round(((week.avgPro || 0) / settings.proteinTarget) * 100) : null
  const calPctPrev = settings.calorieTarget && prev.avgCal != null ? Math.round((prev.avgCal / settings.calorieTarget) * 100) : null
  const proPctPrev = settings.proteinTarget && prev.avgPro != null ? Math.round((prev.avgPro / settings.proteinTarget) * 100) : null

  const wChange = wAvg != null && wAvgPrev != null ? round1(wAvg - wAvgPrev) : null

  // A neutral, factual verdict (no calorie-change advice — that stays a conversation).
  const headline =
    week.logged === 0
      ? 'No data logged this week yet — start logging to track progress.'
      : `Logged ${week.logged}/7 days` +
        (wChange != null
          ? ` · body weight ${wChange > 0 ? 'up' : wChange < 0 ? 'down' : 'flat'} ${Math.abs(wChange)} kg vs last week`
          : '')

  return (
    <div className="card">
      <div className="card-head">
        <h2><span className="ic">🔥</span>This Week</h2>
        <span className="faint tiny">trailing 7 days</span>
      </div>
      <div className="card-body">
        <div className="week-headline">{headline}</div>
        <div className="week-grid">
          <WTile
            label="Consistency"
            value={`${week.logged}/7`}
            sub="days logged"
            pct={(week.logged / 7) * 100}
            delta={deltaCount(week.logged, prev.logged, 'd')}
          />
          <WTile
            label="Calories match"
            value={calPct != null ? `${calPct}%` : '—'}
            sub={week.avgCal != null ? `${Math.round(week.avgCal)} / ${settings.calorieTarget} avg` : 'no meals'}
            pct={calPct || 0}
            over={calPct != null && calPct > 110}
            delta={deltaCount(calPct, calPctPrev, 'pp', true)}
          />
          <WTile
            label="Protein done"
            value={proPct != null ? `${proPct}%` : '—'}
            sub={week.avgPro != null ? `${Math.round(week.avgPro)} / ${settings.proteinTarget}g avg` : 'no meals'}
            pct={proPct || 0}
            delta={deltaCount(proPct, proPctPrev, 'pp')}
          />
          <WTile
            label="Cardio"
            value={`${week.cardioDays}/${settings.cardioTarget || 4}`}
            sub={`${week.cardioMin} min total`}
            pct={settings.cardioTarget ? (week.cardioDays / settings.cardioTarget) * 100 : 0}
            delta={deltaCount(week.cardioDays, prev.cardioDays, 'd')}
          />
        </div>
        <div className="week-foot">
          <span>💪 {week.trainDays} workout{week.trainDays === 1 ? '' : 's'} completed</span>
          {prev.trainDays != null && (
            <span className="faint">{deltaText(week.trainDays, prev.trainDays, 'vs last week')}</span>
          )}
        </div>
      </div>
    </div>
  )
}

function WTile({ label, value, sub, pct, over, delta, neutral }) {
  return (
    <div className="wtile">
      <div className="wtile-top">
        <span className="wl">{label}</span>
        {delta}
      </div>
      <div className="wv num">{value}</div>
      <div className={`bar ${over ? 'over' : ''}`}>
        <i style={{ width: Math.min(100, pct) + '%' }} />
      </div>
      <div className="wsub num">{sub}</div>
    </div>
  )
}

// Delta chip vs last week. unit: 'd' days, 'pp' percentage points.
// neutral=true keeps it grey (direction isn't inherently good or bad, e.g. calories).
function deltaCount(now, prev, unit, neutral) {
  if (now == null || prev == null) return <span className="wdelta flat">—</span>
  const d = now - prev
  if (d === 0) return <span className="wdelta flat">±0</span>
  const up = d > 0
  const cls = neutral ? 'neutral' : up ? 'up' : 'down'
  return (
    <span className={`wdelta ${cls}`}>
      {up ? '▲' : '▼'} {Math.abs(d)}
      {unit === 'pp' ? 'pp' : ''}
    </span>
  )
}

function deltaText(now, prev, suffix) {
  const d = now - prev
  if (d === 0) return `±0 ${suffix}`
  return `${d > 0 ? '+' : ''}${d} ${suffix}`
}

function BreakoutCard({ entry, byDate }) {
  const prior = [addDays(entry.date, -2), addDays(entry.date, -1), entry.date]
  return (
    <div className="breakout">
      <div className="bd">⚠ Broke out · {prettyDate(entry.date)}</div>
      {entry.skinCheck.notes && <div className="notes">“{entry.skinCheck.notes}”</div>}
      {prior.map((dk) => {
        const e = byDate[dk]
        const meals = e?.meals || []
        if (!meals.length) return null
        const rel =
          dk === entry.date ? 'same day' : `${-daysBetween(dk, entry.date)}d before`
        return (
          <div key={dk}>
            <div className="dayhdr">
              {prettyDate(dk)} · {rel}
            </div>
            <ul>
              {meals.map((m) => (
                <li key={m.id}>{m.description}</li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}

function Stat({ k, v, unit, trend }) {
  return (
    <div className="stat">
      <div className="k">{k}</div>
      <div className="v num">
        {v} {v !== '—' && <small>{unit}</small>}
      </div>
      {trend}
    </div>
  )
}

// Trend element vs previous week. lowerIsGood flips color meaning for weight.
function delta(now, prev, unit, isWeight) {
  if (now == null || prev == null) return <div className="trend flat">vs last week —</div>
  const d = now - prev
  const r = isWeight ? round1(d) : Math.round(d)
  const dir = d > 0.05 ? 'up' : d < -0.05 ? 'down' : 'flat'
  const arrow = d > 0.05 ? '▲' : d < -0.05 ? '▼' : '–'
  const sign = r > 0 ? '+' : ''
  return (
    <div className={`trend ${dir}`}>
      {arrow} {sign}
      <span className="num">{r}</span> {unit} vs last week
    </div>
  )
}

// Build chart rows for every day from first to last logged entry, with rolling avg.
function buildChart(entries) {
  if (!entries.length) return []
  const byDate = Object.fromEntries(entries.map((e) => [e.date, e]))
  const first = entries[0].date
  const last = entries[entries.length - 1].date
  const rows = []
  let k = first
  let guard = 0
  while (k <= last && guard < 1000) {
    const e = byDate[k]
    const w = e?.bodyWeight ?? null
    // 7-day rolling average ending at k
    const window = lastNDays(k, 7).map((d) => byDate[d]?.bodyWeight ?? null)
    const avg = average(window)
    rows.push({
      date: k,
      label: prettyDate(k).replace(/^\w+ /, ''), // drop weekday for axis density
      weight: w != null ? round1(w) : null,
      avg7: avg != null ? round1(avg) : null,
    })
    k = addDays(k, 1)
    guard++
  }
  return rows
}
