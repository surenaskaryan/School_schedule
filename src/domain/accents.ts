import type { CSSProperties } from 'react'
import type { AccentKey } from './types'

/**
 * Сдержанная палитра акцентов. Используется точечно: полоска, точка, мягкий отсвет.
 * `rgb` — для полупрозрачных фонов/свечения через rgb(var(--a) / α).
 */
export const ACCENTS: Record<AccentKey, { label: string; hex: string; rgb: string }> = {
  violet: { label: 'Фиолетовый', hex: '#a594ff', rgb: '165 148 255' },
  indigo: { label: 'Индиго', hex: '#8193ff', rgb: '129 147 255' },
  blue: { label: 'Синий', hex: '#62a8ff', rgb: '98 168 255' },
  cyan: { label: 'Бирюзовый', hex: '#4fd4e8', rgb: '79 212 232' },
  teal: { label: 'Морской', hex: '#3fd1b0', rgb: '63 209 176' },
  green: { label: 'Зелёный', hex: '#6ad78e', rgb: '106 215 142' },
  amber: { label: 'Янтарный', hex: '#f3c164', rgb: '243 193 100' },
  orange: { label: 'Оранжевый', hex: '#f59a6b', rgb: '245 154 107' },
  red: { label: 'Красный', hex: '#f47a86', rgb: '244 122 134' },
  pink: { label: 'Розовый', hex: '#ee8ac4', rgb: '238 138 196' },
  slate: { label: 'Графит', hex: '#a3acbd', rgb: '163 172 189' },
}

export const ACCENT_KEYS = Object.keys(ACCENTS) as AccentKey[]

/** Стиль, который прокидывает акцент в CSS-переменную --a. */
export const accentVars = (key: AccentKey) =>
  ({ '--a': ACCENTS[key].rgb, '--a-hex': ACCENTS[key].hex }) as CSSProperties

export const normalizeSubject = (s: string) => s.trim().toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ')

/** Предмет → цвет по ключевым словам (можно переопределить в настройках). */
const SUBJECT_RULES: [RegExp, AccentKey][] = [
  [/матем|алгебр|геометр|вероятн|статист/, 'violet'],
  [/англ|english|немец|франц|испан|иностр|китай/, 'blue'],
  [/русск|родн.*яз/, 'pink'],
  [/литер|чтени/, 'pink'],
  [/физкульт|физическ.*культ|физ-ра|физра|спорт|плаван/, 'green'],
  [/информ|программ|робот/, 'cyan'],
  [/окруж|биолог|природ|эколог/, 'teal'],
  [/хими/, 'teal'],
  [/физик/, 'indigo'],
  [/истор|обществ|право|географ|орксэ|светск|культур/, 'amber'],
  [/музык|изо|рисован|искусств|технолог|труд|черчен/, 'orange'],
  [/обж|безопасн|разговор|классн/, 'slate'],
]

export const guessSubjectAccent = (subject: string): AccentKey => {
  const s = normalizeSubject(subject)
  for (const [re, key] of SUBJECT_RULES) if (re.test(s)) return key
  // Стабильный цвет по хешу названия, чтобы незнакомый предмет не прыгал между цветами.
  let h = 0
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const pool: AccentKey[] = ['indigo', 'teal', 'amber', 'slate', 'cyan', 'violet']
  return pool[h % pool.length]
}
