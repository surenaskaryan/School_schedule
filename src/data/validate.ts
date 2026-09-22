import { ACCENT_KEYS } from '../domain/accents'
import { SECTION_KINDS } from '../domain/sectionKinds'
import { isValidTime } from '../domain/time'
import type { AccentKey, AppData, Lesson, Section, SectionItem, Weekday } from '../domain/types'
import { createSeed } from './seed'
import { uid } from './uid'

/* Мягкая валидация: всё, что пришло из хранилища или файла, приводится к корректной модели. */

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v)
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '')
const optStr = (v: unknown) => str(v) || undefined
const isDay = (v: unknown): v is Weekday => typeof v === 'number' && v >= 1 && v <= 7 && Number.isInteger(v)
const isAccent = (v: unknown): v is AccentKey => typeof v === 'string' && (ACCENT_KEYS as string[]).includes(v)
const isISODate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)

export const sanitizeLesson = (v: unknown, fallbackOrder = 0): Lesson | null => {
  if (!isObj(v)) return null
  const subject = str(v.subject)
  const start = str(v.start)
  const end = str(v.end)
  if (!subject || !isDay(v.day) || !isValidTime(start) || !isValidTime(end)) return null
  const num = Number(v.number)
  return {
    id: str(v.id) || uid(),
    day: v.day,
    order: typeof v.order === 'number' ? v.order : fallbackOrder,
    number: Number.isFinite(num) && num > 0 ? num : undefined,
    subject,
    start,
    end,
    room: optStr(v.room),
    teacher: optStr(v.teacher),
    notes: optStr(v.notes),
    extracurricular: v.extracurricular === true ? true : undefined,
    date: isISODate(v.date) ? v.date : undefined,
  }
}

const sanitizeItem = (v: unknown): SectionItem | null => {
  if (!isObj(v)) return null
  const title = str(v.title)
  if (!title) return null
  return {
    id: str(v.id) || uid(),
    title,
    note: optStr(v.note),
    date: isISODate(v.date) ? v.date : undefined,
    time: isValidTime(str(v.time)) ? str(v.time) : undefined,
    endTime: isValidTime(str(v.endTime)) ? str(v.endTime) : undefined,
    days: Array.isArray(v.days) ? (v.days.filter(isDay) as Weekday[]) : undefined,
    place: optStr(v.place),
    done: v.done === true ? true : undefined,
    extra: isObj(v.extra) ? (v.extra as SectionItem['extra']) : undefined,
  }
}

const sanitizeSection = (v: unknown, i: number): Section | null => {
  if (!isObj(v)) return null
  const title = str(v.title)
  if (!title) return null
  const kind = typeof v.kind === 'string' && v.kind in SECTION_KINDS ? (v.kind as Section['kind']) : 'notes'
  return {
    id: str(v.id) || uid(),
    title,
    icon: str(v.icon) || 'sparkles',
    accent: isAccent(v.accent) ? v.accent : 'slate',
    kind,
    order: typeof v.order === 'number' ? v.order : i,
    items: Array.isArray(v.items) ? v.items.map(sanitizeItem).filter((x): x is SectionItem => !!x) : [],
  }
}

export function sanitizeAppData(raw: unknown): AppData | null {
  if (!isObj(raw)) return null
  const seed = createSeed()
  const lessons = Array.isArray(raw.lessons)
    ? raw.lessons.map((l, i) => sanitizeLesson(l, i)).filter((x): x is Lesson => !!x)
    : []
  const sections = Array.isArray(raw.sections)
    ? raw.sections.map(sanitizeSection).filter((x): x is Section => !!x)
    : seed.sections
  const accents: Record<string, AccentKey> = {}
  if (isObj(raw.subjectAccents)) {
    for (const [k, v] of Object.entries(raw.subjectAccents)) if (isAccent(v)) accents[k] = v
  }
  const s = isObj(raw.settings) ? raw.settings : {}
  const schoolDays = Array.isArray(s.schoolDays) ? (s.schoolDays.filter(isDay) as Weekday[]) : []
  const source = isObj(raw.source) && str(raw.source.name)
    ? { name: str(raw.source.name), importedAt: str(raw.source.importedAt) }
    : undefined
  return {
    schemaVersion: 1,
    lessons,
    sections,
    subjectAccents: accents,
    settings: {
      studentName: str(s.studentName),
      schoolDays: schoolDays.length ? schoolDays.sort() : seed.settings.schoolDays,
      dimPast: s.dimPast !== false,
    },
    source,
    updatedAt: str(raw.updatedAt) || new Date().toISOString(),
  }
}
