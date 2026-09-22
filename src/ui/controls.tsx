import { Check } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { ACCENT_KEYS, ACCENTS, accentVars } from '../domain/accents'
import { WEEKDAYS } from '../domain/time'
import type { AccentKey, Weekday } from '../domain/types'
import { SECTION_ICONS } from './icons'

export function Field({ label, hint, children, error }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className={`field ${error ? 'has-error' : ''}`}>
      <span className="field-label">
        {label}
        {hint && <span className="field-hint">{hint}</span>}
      </span>
      {children}
      {error && <span className="field-error">{error}</span>}
    </label>
  )
}

/** Группа без <label>, чтобы клики по кнопкам внутри не «проваливались» в первый элемент. */
export function FieldGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="field" role="group" aria-label={label}>
      <span className="field-label">{label}</span>
      {children}
    </div>
  )
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  className = '',
  ariaLabel,
}: {
  value: T
  options: { value: T; label: ReactNode; icon?: ReactNode }[]
  onChange(v: T): void
  className?: string
  ariaLabel?: string
}) {
  const index = Math.max(0, options.findIndex((o) => o.value === value))
  return (
    <div
      className={`seg ${className}`}
      role="radiogroup"
      aria-label={ariaLabel}
      style={{ '--n': options.length, '--i': index } as CSSProperties}
    >
      <span className="seg-thumb" aria-hidden />
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          className={`seg-btn ${o.value === value ? 'is-active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.icon}
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  )
}

export function WeekdayPicker({
  value,
  onChange,
  multiple,
  days = [1, 2, 3, 4, 5, 6, 7],
}: {
  value: Weekday[]
  onChange(v: Weekday[]): void
  multiple?: boolean
  days?: Weekday[]
}) {
  return (
    <div className="chips">
      {WEEKDAYS.filter((d) => days.includes(d.id)).map((d) => {
        const on = value.includes(d.id)
        return (
          <button
            key={d.id}
            type="button"
            className={`chip-toggle ${on ? 'is-on' : ''}`}
            aria-pressed={on}
            onClick={() => {
              if (!multiple) return onChange([d.id])
              onChange(on ? value.filter((x) => x !== d.id) : ([...value, d.id].sort() as Weekday[]))
            }}
          >
            {d.short}
          </button>
        )
      })}
    </div>
  )
}

export function AccentPicker({ value, onChange }: { value: AccentKey; onChange(v: AccentKey): void }) {
  return (
    <div className="swatches">
      {ACCENT_KEYS.map((k) => (
        <button
          key={k}
          type="button"
          className={`swatch ${k === value ? 'is-on' : ''}`}
          style={accentVars(k)}
          aria-label={ACCENTS[k].label}
          aria-pressed={k === value}
          onClick={() => onChange(k)}
        >
          {k === value && <Check size={13} strokeWidth={3} />}
        </button>
      ))}
    </div>
  )
}

export function IconPicker({ value, accent, onChange }: { value: string; accent: AccentKey; onChange(v: string): void }) {
  return (
    <div className="icon-grid" style={accentVars(accent)}>
      {Object.entries(SECTION_ICONS).map(([key, Icon]) => (
        <button
          key={key}
          type="button"
          className={`icon-opt ${key === value ? 'is-on' : ''}`}
          aria-label={key}
          aria-pressed={key === value}
          onClick={() => onChange(key)}
        >
          <Icon size={18} />
        </button>
      ))}
    </div>
  )
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange(v: boolean): void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`switch ${checked ? 'is-on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="switch-knob" />
    </button>
  )
}

export function EmptyState({ icon, title, text, children }: { icon: ReactNode; title: string; text?: ReactNode; children?: ReactNode }) {
  return (
    <div className="empty rise">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {children && <div className="empty-actions">{children}</div>}
    </div>
  )
}

/** Поле времени 24ч: одинаково на всех устройствах, цифровая клавиатура, двоеточие ставится само. */
export function TimeInput({ value, onChange, label }: { value: string; onChange(v: string): void; label?: string }) {
  return (
    <input
      className="input tnum"
      inputMode="numeric"
      placeholder="08:30"
      aria-label={label}
      maxLength={5}
      value={value}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, '').slice(0, 4)
        onChange(digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits)
      }}
      onBlur={() => {
        const m = value.match(/^(\d{1,2}):?(\d{0,2})$/)
        if (m && m[1]) onChange(`${m[1].padStart(2, '0')}:${(m[2] || '0').padEnd(2, '0')}`)
      }}
    />
  )
}
