import { useEffect, useRef, useState } from 'react'
import { num } from '../lib/calc.js'

/* Chalk toggle switch. tone: 'good' | 'iron' | 'bad' */
export function Toggle({ checked, onChange, label, tone = 'good' }) {
  return (
    <div
      className={`toggle ${checked ? 'on ' + tone : ''}`}
      role="switch"
      aria-checked={checked}
      tabIndex={0}
      onClick={() => onChange(!checked)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onChange(!checked)
        }
      }}
    >
      <span className="track">
        <span className="knob" />
      </span>
      {label && <span className="txt">{label}</span>}
    </div>
  )
}

/* Big +/- numeric stepper for one-handed entry. */
export function Stepper({ value, onChange, step = 1, min = 0, max = Infinity, decimals = 0 }) {
  const clamp = (v) => Math.min(max, Math.max(min, v))
  const fmt = (v) => (decimals ? Number(v.toFixed(decimals)) : v)
  return (
    <div className="stepper">
      <button type="button" aria-label="decrease" onClick={() => onChange(fmt(clamp(num(value) - step)))}>
        −
      </button>
      <input
        type="number"
        inputMode="decimal"
        value={value === null || value === undefined ? '' : value}
        onChange={(e) => onChange(e.target.value === '' ? null : fmt(clamp(num(e.target.value))))}
      />
      <button type="button" aria-label="increase" onClick={() => onChange(fmt(clamp(num(value) + step)))}>
        +
      </button>
    </div>
  )
}

/*
 * Free-text input with autocomplete from a list of suggestions.
 * suggestions: [{ label, sub, value }]; onPick(value) fires on selection.
 */
export function Autocomplete({ value, onChange, onPick, suggestions, placeholder, name, className }) {
  const [open, setOpen] = useState(false)
  const [hl, setHl] = useState(-1)
  const ref = useRef(null)

  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const q = (value || '').toLowerCase().trim()
  const matches = q
    ? suggestions.filter((s) => s.label.toLowerCase().includes(q)).slice(0, 8)
    : suggestions.slice(0, 8)

  const choose = (s) => {
    onPick(s.value)
    setOpen(false)
    setHl(-1)
  }

  return (
    <div className="ac" ref={ref}>
      <input
        type="text"
        name={name}
        className={className}
        value={value || ''}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
          setHl(-1)
        }}
        onFocus={() => suggestions.length && setOpen(true)}
        onKeyDown={(e) => {
          if (!open) return
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setHl((h) => Math.min(matches.length - 1, h + 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setHl((h) => Math.max(0, h - 1))
          } else if (e.key === 'Enter' && hl >= 0 && matches[hl]) {
            e.preventDefault()
            choose(matches[hl])
          } else if (e.key === 'Escape') {
            setOpen(false)
          }
        }}
      />
      {open && matches.length > 0 && (
        <div className="ac-list">
          {matches.map((s, i) => (
            <div
              key={s.value.slug || s.label + i}
              className={`ac-item ${i === hl ? 'hl' : ''}`}
              onMouseEnter={() => setHl(i)}
              onMouseDown={(e) => {
                e.preventDefault()
                choose(s)
              }}
            >
              <div className="n">{s.label}</div>
              {s.sub && <div className="m">{s.sub}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* SVG circular progress ring (lime by default, red when over target). */
export function Ring({ value, max, size = 132, stroke = 11, label, sub, over }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const pct = max > 0 ? Math.min(1, value / max) : 0
  const dash = circ * pct
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-track" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className={`ring-fill ${over ? 'over' : ''}`}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring-center">
        <div className="ring-val num">{label}</div>
        {sub && <div className="ring-sub num">{sub}</div>}
      </div>
    </div>
  )
}

export function Card({ icon, title, action, children }) {
  return (
    <section className="card">
      <div className="card-head">
        <h2>
          {icon && <span className="ic">{icon}</span>}
          {title}
        </h2>
        {action}
      </div>
      <div className="card-body">{children}</div>
    </section>
  )
}

export function SaveHint({ show }) {
  return <div className={`savehint ${show ? 'show' : ''}`}>✓ Saved</div>
}
