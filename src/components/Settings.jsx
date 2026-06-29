import { useRef, useState } from 'react'
import { Card, Stepper } from './ui.jsx'
import { PHASES } from '../lib/constants.js'
import { storageBackend } from '../lib/storage.js'
import { downloadBackup, importBackupFile } from '../lib/backup.js'
import CloudSync from './CloudSync.jsx'

export default function Settings({ settings, foods, onChange, onDeleteFood }) {
  const set = (k, v) => onChange({ ...settings, [k]: v })
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
      </Card>

      <div className="tiny faint" style={{ textAlign: 'center', padding: '0 14px' }}>
        TrackFIT · personal prep logbook · data stored locally via {storageBackend}
      </div>
    </div>
  )
}
