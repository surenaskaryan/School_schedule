import type { Lesson, Weekday } from './types'

export const WEEKDAYS: { id: Weekday; short: string; full: string; acc: string }[] = [
  { id: 1, short: 'ПН', full: 'Понедельник', acc: 'понедельник' },
  { id: 2, short: 'ВТ', full: 'Вторник', acc: 'вторник' },
  { id: 3, short: 'СР', full: 'Среда', acc: 'среду' },
  { id: 4, short: 'ЧТ', full: 'Четверг', acc: 'четверг' },
  { id: 5, short: 'ПТ', full: 'Пятница', acc: 'пятницу' },
  { id: 6, short: 'СБ', full: 'Суббота', acc: 'субботу' },
  { id: 7, short: 'ВС', full: 'Воскресенье', acc: 'воскресенье' },
]

export const weekdayInfo = (d: Weekday) => WEEKDAYS[d - 1]

const MONTHS_GEN = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
]

export const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export const isValidTime = (s: string) => /^([01]?\d|2[0-3]):[0-5]\d$/.test(s)

/** "8:5" / "08.30" / "8-30" → "08:30". Возвращает null, если не время. */
export const normalizeTime = (raw: string): string | null => {
  const m = raw.trim().match(/^(\d{1,2})\s*[:.\-ч]\s*(\d{2})$/)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

export const minutesToTime = (min: number) => {
  const v = ((min % 1440) + 1440) % 1440
  return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`
}

export const isoWeekday = (date: Date): Weekday => (((date.getDay() + 6) % 7) + 1) as Weekday

export const toISODate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export const fromISODate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const addDays = (date: Date, n: number) => {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

/** Понедельник недели, в которую попадает дата. */
export const startOfWeek = (date: Date) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return addDays(d, 1 - isoWeekday(d))
}

export const dateForWeekday = (weekStart: Date, day: Weekday) => addDays(weekStart, day - 1)

export const formatDayMonth = (date: Date) => `${date.getDate()} ${MONTHS_GEN[date.getMonth()]}`

export const formatLongDate = (date: Date) =>
  `${weekdayInfo(isoWeekday(date)).full} · ${formatDayMonth(date)}`

export const minutesOfDay = (date: Date) => date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60

/** Уроки на конкретную дату: еженедельные уроки этого дня + разовые уроки с этой датой. */
export const lessonsForDate = (lessons: Lesson[], date: Date): Lesson[] => {
  const day = isoWeekday(date)
  const iso = toISODate(date)
  return lessons
    .filter((l) => l.day === day && (!l.date || l.date === iso))
    .sort((a, b) => a.order - b.order || toMinutes(a.start) - toMinutes(b.start))
}

export type LessonState = 'past' | 'current' | 'upcoming'

export const lessonState = (lesson: Lesson, nowMin: number): LessonState => {
  if (nowMin >= toMinutes(lesson.end)) return 'past'
  if (nowMin >= toMinutes(lesson.start)) return 'current'
  return 'upcoming'
}

export type DayPhase =
  | { kind: 'empty' }
  | { kind: 'before'; next: Lesson; minutesLeft: number }
  | { kind: 'lesson'; current: Lesson; next?: Lesson; progress: number; minutesLeft: number }
  | { kind: 'break'; prev: Lesson; next: Lesson; progress: number; minutesLeft: number }
  | { kind: 'done'; last: Lesson }

/** Что происходит прямо сейчас в учебном дне. */
export const dayPhase = (dayLessons: Lesson[], nowMin: number): DayPhase => {
  const list = [...dayLessons].sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
  if (!list.length) return { kind: 'empty' }
  const first = list[0]
  if (nowMin < toMinutes(first.start)) {
    return { kind: 'before', next: first, minutesLeft: toMinutes(first.start) - nowMin }
  }
  for (let i = 0; i < list.length; i++) {
    const l = list[i]
    const s = toMinutes(l.start)
    const e = toMinutes(l.end)
    if (nowMin >= s && nowMin < e) {
      return {
        kind: 'lesson',
        current: l,
        next: list[i + 1],
        progress: Math.min(1, Math.max(0, (nowMin - s) / Math.max(1, e - s))),
        minutesLeft: e - nowMin,
      }
    }
    const n = list[i + 1]
    if (n && nowMin >= e && nowMin < toMinutes(n.start)) {
      const ns = toMinutes(n.start)
      return {
        kind: 'break',
        prev: l,
        next: n,
        progress: (nowMin - e) / Math.max(1, ns - e),
        minutesLeft: ns - nowMin,
      }
    }
  }
  return { kind: 'done', last: list[list.length - 1] }
}

/** "12 минут", "1 ч 5 мин" */
export const humanMinutes = (m: number) => {
  const total = Math.max(0, Math.ceil(m))
  if (total < 60) return `${total} ${plural(total, 'минута', 'минуты', 'минут')}`
  const h = Math.floor(total / 60)
  const rest = total % 60
  return rest ? `${h} ч ${rest} мин` : `${h} ${plural(h, 'час', 'часа', 'часов')}`
}

export const plural = (n: number, one: string, few: string, many: string) => {
  const a = Math.abs(n) % 100
  const b = a % 10
  if (a > 10 && a < 20) return many
  if (b > 1 && b < 5) return few
  if (b === 1) return one
  return many
}

export const durationMinutes = (l: Pick<Lesson, 'start' | 'end'>) => toMinutes(l.end) - toMinutes(l.start)

/** «в понедельник», «во вторник» */
export const onWeekday = (d: Weekday) => `${d === 2 ? 'во' : 'в'} ${weekdayInfo(d).acc}`
