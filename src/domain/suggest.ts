import { minutesToTime, toMinutes } from './time'
import type { Lesson, LessonDraft, Weekday } from './types'
import { normalizeSubject } from './accents'

/** Звонки, восстановленные из существующих уроков: номер → самое частое время. */
export function bellsFromLessons(lessons: Lesson[]) {
  const counts = new Map<number, Map<string, number>>()
  for (const l of lessons) {
    if (!l.number) continue
    const key = `${l.start}-${l.end}`
    const m = counts.get(l.number) ?? new Map<string, number>()
    m.set(key, (m.get(key) ?? 0) + 1)
    counts.set(l.number, m)
  }
  const out = new Map<number, { start: string; end: string }>()
  for (const [n, m] of counts) {
    const [best] = [...m.entries()].sort((a, b) => b[1] - a[1])[0]
    const [start, end] = best.split('-')
    out.set(n, { start, end })
  }
  return out
}

/** Черновик нового урока для дня: следующий номер и время по звонкам — меньше ручного ввода. */
export function suggestLesson(lessons: Lesson[], day: Weekday): LessonDraft {
  const dayList = lessons.filter((l) => l.day === day).sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
  const bells = bellsFromLessons(lessons)
  const last = dayList[dayList.length - 1]
  const maxNumber = Math.max(0, ...dayList.map((l) => l.number ?? 0))
  const number = (maxNumber || dayList.length) + 1

  let start = '08:30'
  let end = '09:15'
  const bell = bells.get(number)
  if (bell) ({ start, end } = bell)
  else if (last) {
    const dur = Math.max(30, toMinutes(last.end) - toMinutes(last.start))
    const s = toMinutes(last.end) + 10
    start = minutesToTime(s)
    end = minutesToTime(s + dur)
  } else if (bells.get(1)) ({ start, end } = bells.get(1)!)

  return { day, number, subject: '', start, end }
}

/** Последние кабинет и учитель по предмету — для автозаполнения. */
export function subjectDefaults(lessons: Lesson[], subject: string) {
  const key = normalizeSubject(subject)
  const match = [...lessons].reverse().find((l) => normalizeSubject(l.subject) === key)
  return match ? { room: match.room, teacher: match.teacher } : null
}

export const knownSubjects = (lessons: Lesson[]) =>
  [...new Set(lessons.map((l) => l.subject))].sort((a, b) => a.localeCompare(b, 'ru'))
