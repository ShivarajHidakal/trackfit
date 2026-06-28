import { useState } from 'react'
import { Card, Toggle, Autocomplete, Ring } from './ui.jsx'
import { mealTotals, num, round1, atwater } from '../lib/calc.js'
import { nowTime } from '../lib/dates.js'
import { FOOD_DB, FOOD_PRESETS, estimateFromText, estimateMeal } from '../lib/foodDatabase.js'

const BLANK = {
  desc: '',
  qty: '',
  unit: 'g',
  protein: '',
  carbs: '',
  fat: '',
  saveToLibrary: false,
}

export default function DietSection({ entry, settings, foods, onUpdate, onSaveFood }) {
  const [form, setForm] = useState(BLANK)
  const [perUnit, setPerUnit] = useState(null) // macros per 1 unit, enables scaling
  const [match, setMatch] = useState(null) // { name } | null
  const [manual, setManual] = useState(false) // user typed macros by hand

  const totals = mealTotals(entry.meals)
  const calTarget = settings.calorieTarget || 0
  const calNow = Math.round(totals.calories)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  // Live: typing food(s) auto-fills macros. Handles multiple items in one field
  // ("2 eggs, 10ml mustard oil and 300g rice") by summing each component.
  const onDesc = (v) => {
    setForm((f) => ({ ...f, desc: v }))
    if (manual) {
      setMatch(null)
      return
    }
    const est = estimateMeal(v)
    if (est.matchedCount > 0) {
      setMatch({
        single: est.single,
        items: est.items,
        matchedCount: est.matchedCount,
        totalCount: est.totalCount,
        name: est.single ? est.items[0]?.name : null,
      })
      if (est.single) {
        // one food → keep per-unit scaling so the Qty field rescales
        setPerUnit(est.perUnit)
        setForm((f) => ({
          ...f,
          desc: v,
          qty: est.qty,
          unit: est.unit,
          protein: est.protein,
          carbs: est.carbs,
          fat: est.fat,
        }))
      } else {
        // multiple foods → quantities live in the text, no single Qty scaling
        setPerUnit(null)
        setForm((f) => ({
          ...f,
          desc: v,
          qty: '',
          protein: est.protein,
          carbs: est.carbs,
          fat: est.fat,
        }))
      }
    } else {
      setMatch(null)
      setPerUnit(null)
    }
  }

  // Selecting from the dropdown (preset recipe, DB food, or saved library food).
  const onPick = (item) => {
    setManual(false)
    if (item.__preset) {
      // Expand the recipe into its ingredients and fill the summed macros.
      const est = estimateMeal(item.recipe)
      setPerUnit(null)
      setMatch({
        single: false,
        items: est.items,
        matchedCount: est.matchedCount,
        totalCount: est.totalCount,
      })
      setForm({
        desc: item.name,
        qty: '',
        unit: 'g',
        protein: est.protein,
        carbs: est.carbs,
        fat: est.fat,
        saveToLibrary: false,
      })
      return
    }
    if (item.__lib) {
      // Saved library food: derive per-unit from its stored qty for scaling.
      const baseQty = parseQtyNumber(item.qty) || 1
      const pu = { p: num(item.protein) / baseQty, c: num(item.carbs) / baseQty, f: num(item.fat) / baseQty }
      setPerUnit(pu)
      setMatch({ name: item.name, lib: true, single: true })
      setForm({
        desc: item.name,
        qty: baseQty,
        unit: parseQtyUnit(item.qty),
        protein: num(item.protein),
        carbs: num(item.carbs),
        fat: num(item.fat),
        saveToLibrary: false,
      })
    } else {
      const est = estimateFromText(item.name)
      if (est) {
        setPerUnit(est.perUnit)
        setMatch({ name: est.food.name, single: true })
        setForm({
          desc: est.food.name,
          qty: est.qty,
          unit: est.unit,
          protein: est.protein,
          carbs: est.carbs,
          fat: est.fat,
          saveToLibrary: false,
        })
      }
    }
  }

  // Changing quantity rescales macros proportionally (when we know per-unit).
  const changeQty = (v) => {
    if (perUnit && !manual && num(v) >= 0) {
      const q = num(v)
      setForm((f) => ({
        ...f,
        qty: v,
        protein: round1(perUnit.p * q),
        carbs: round1(perUnit.c * q),
        fat: round1(perUnit.f * q),
      }))
    } else {
      set('qty', v)
    }
  }

  // Editing a macro by hand switches off auto-scaling for this entry.
  const editMacro = (k, v) => {
    setManual(true)
    setPerUnit(null)
    setMatch(null)
    set(k, v)
  }

  const formKcal = atwater(form.protein, form.carbs, form.fat)

  const addMeal = () => {
    if (!form.desc.trim()) return
    const qtyLabel = form.qty !== '' ? `${form.qty}${form.unit === 'pc' ? '' : 'g'}` : ''
    const description = qtyLabel ? `${form.desc} · ${qtyLabel}` : form.desc
    const meal = {
      id: 'm' + Date.now().toString(36),
      description,
      calories: formKcal,
      protein: num(form.protein),
      carbs: num(form.carbs),
      fat: num(form.fat),
      loggedAt: nowTime(),
    }
    onUpdate({ meals: [...entry.meals, meal] })
    if (form.saveToLibrary) {
      onSaveFood({
        name: form.desc.trim(),
        qty: qtyLabel || '1',
        calories: formKcal,
        protein: num(form.protein),
        carbs: num(form.carbs),
        fat: num(form.fat),
      })
    }
    setForm(BLANK)
    setPerUnit(null)
    setMatch(null)
    setManual(false)
  }

  const removeMeal = (id) => onUpdate({ meals: entry.meals.filter((m) => m.id !== id) })

  // Suggestions: recipe presets first, then saved library, then built-in database.
  const suggestions = [
    ...FOOD_PRESETS.map((p) => {
      const est = estimateMeal(p.recipe)
      return {
        label: `${p.name} (recipe)`,
        sub: `🥤 ${est.matchedCount} ingredients · ${atwater(est.protein, est.carbs, est.fat)} kcal`,
        value: { __preset: true, ...p },
      }
    }),
    ...foods.map((f) => ({
      label: f.name,
      sub: `★ saved · ${num(f.calories)} kcal · ${num(f.protein)}P/${num(f.carbs)}C/${num(f.fat)}F`,
      value: { ...f, __lib: true },
    })),
    ...FOOD_DB.map((f) => ({
      label: f.name,
      sub: `${f.kcal} kcal · ${f.p}P/${f.c}C/${f.f}F per ${f.unit === 'pc' ? 'pc' : '100g'}`,
      value: { name: f.name },
    })),
  ]

  return (
    <Card icon="🍽" title="Diet">
      {/* Calorie ring + macro bars */}
      <div className="diet-summary">
        <Ring
          value={calNow}
          max={calTarget}
          label={calNow.toLocaleString()}
          sub={`/ ${calTarget.toLocaleString()}`}
          over={calTarget > 0 && calNow > calTarget}
        />
        <div className="macro-bars">
          <MacroBar label="Protein" v={totals.protein} t={settings.proteinTarget} />
          <MacroBar label="Carbs" v={totals.carbs} t={settings.carbTarget} />
          <MacroBar label="Fat" v={totals.fat} t={settings.fatTarget} />
        </div>
      </div>

      {entry.meals.length === 0 ? (
        <div className="empty">No meals logged yet today.</div>
      ) : (
        <div>
          {entry.meals.map((m, i) => (
            <div className="item" key={m.id}>
              <div className="item-top">
                <div>
                  <div className="item-title">
                    <span className="meal-no">Meal {i + 1}</span>
                  </div>
                  <div className="item-meta">{m.description} · {m.loggedAt}</div>
                  <div className="chips">
                    <span className="chip">{num(m.calories)} kcal</span>
                    <span className="chip gray">{num(m.protein)}P</span>
                    <span className="chip gray">{num(m.carbs)}C</span>
                    <span className="chip gray">{num(m.fat)}F</span>
                  </div>
                </div>
                <button className="icon-btn" aria-label="remove meal" onClick={() => removeMeal(m.id)}>
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="divline" />

      {/* Smart add-meal form */}
      <div className="field">
        <label className="label">Add meal — type a food, macros auto-fill</label>
        <Autocomplete
          value={form.desc}
          onChange={onDesc}
          onPick={onPick}
          suggestions={suggestions}
          placeholder="e.g. 150g chicken breast, 2 eggs, smoothie…"
          name="food"
        />
      </div>

      {/* Match status */}
      {form.desc.trim() && (
        <div className={`match ${match ? 'hit' : 'miss'}`}>
          {match ? (
            match.single ? (
              <>
                <span className="dot" /> Auto-filled from {match.lib ? 'your library' : 'food database'}:{' '}
                <b>{match.name}</b>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, width: '100%' }}>
                <div>
                  <span className="dot" /> Per-ingredient breakdown (<b>{match.matchedCount}</b>/{match.totalCount}):
                </div>
                <div className="ing-list">
                  {match.items.map((it, i) => (
                    <div key={i} className={`ing ${it.matched ? 'ok' : 'no'}`}>
                      <div className="ing-l">
                        <span className="ing-mark">{it.matched ? '✓' : '?'}</span>
                        <span className="ing-name">{it.raw}</span>
                      </div>
                      {it.matched ? (
                        <div className="ing-r">
                          <span className="ing-cal num">{it.calories} kcal</span>
                          <span className="ing-macros num">
                            {it.protein}P · {it.carbs}C · {it.fat}F
                          </span>
                        </div>
                      ) : (
                        <span className="ing-na">not found</span>
                      )}
                    </div>
                  ))}
                </div>
                {match.matchedCount < match.totalCount && (
                  <div className="tiny" style={{ opacity: 0.85 }}>
                    “?” items aren’t in the database — adjust the macros below to include them.
                  </div>
                )}
              </div>
            )
          ) : (
            <>
              <span className="dot" /> Not in database — enter macros below (calories auto-calculate)
            </>
          )}
        </div>
      )}

      <div className="row">
        {(!match || match.single) && (
          <div className="field" style={{ flex: '0 0 38%' }}>
            <label className="label">Qty ({form.unit === 'pc' ? 'pcs' : 'grams'})</label>
            <input
              type="number"
              inputMode="decimal"
              value={form.qty}
              onChange={(e) => changeQty(e.target.value)}
              placeholder={form.unit === 'pc' ? 'pcs' : 'g'}
            />
          </div>
        )}
        <div className="field">
          <label className="label">Calories (auto)</label>
          <div className="kcal-auto num">{formKcal} kcal</div>
        </div>
      </div>

      <div className="grid3">
        <MacroInput label="Protein" v={form.protein} on={(v) => editMacro('protein', v)} />
        <MacroInput label="Carbs" v={form.carbs} on={(v) => editMacro('carbs', v)} />
        <MacroInput label="Fat" v={form.fat} on={(v) => editMacro('fat', v)} />
      </div>

      <div className="add-row">
        <Toggle
          checked={form.saveToLibrary}
          onChange={(v) => set('saveToLibrary', v)}
          tone="iron"
          label="Save to library"
        />
        <button className="btn btn-primary" onClick={addMeal} disabled={!form.desc.trim()}>
          + Add meal
        </button>
      </div>

      <div className="divline" />

      {/* Skin / breakout tracker */}
      <div className="field">
        <Toggle
          checked={entry.skinCheck.brokeOut}
          onChange={(v) => onUpdate({ skinCheck: { ...entry.skinCheck, brokeOut: v } })}
          tone="bad"
          label="Broke out today"
        />
      </div>
      {entry.skinCheck.brokeOut && (
        <div className="field">
          <textarea
            value={entry.skinCheck.notes}
            onChange={(e) => onUpdate({ skinCheck: { ...entry.skinCheck, notes: e.target.value } })}
            placeholder="Skin notes (where, severity)…"
          />
        </div>
      )}
      <div className="section-note">
        Breakouts aren’t auto-blamed on any food. The Dashboard shows what you ate in the
        24–48 h before each breakout so you can spot real patterns yourself.
      </div>
    </Card>
  )
}

function MacroInput({ label, v, on }) {
  return (
    <div className="field">
      <label className="label">{label} (g)</label>
      <input type="number" inputMode="decimal" value={v} onChange={(e) => on(e.target.value)} placeholder="g" />
    </div>
  )
}

function MacroBar({ label, v, t }) {
  const val = Math.round(v)
  const pct = t ? Math.min(100, (val / t) * 100) : 0
  const over = t && val > t
  return (
    <div className="mbar">
      <div className="mbar-top">
        <span className="mbar-l">{label}</span>
        <span className="mbar-v num">
          {val}<i>/{t || '—'}g</i>
        </span>
      </div>
      <div className={`bar ${over ? 'over' : pct >= 90 ? 'good' : ''}`}>
        <i style={{ width: pct + '%' }} />
      </div>
    </div>
  )
}

function parseQtyNumber(qty) {
  const m = String(qty || '').match(/(\d+(?:\.\d+)?)/)
  return m ? parseFloat(m[1]) : null
}
function parseQtyUnit(qty) {
  return /\d\s*(g|ml)\b/i.test(String(qty || '')) ? 'g' : 'pc'
}
