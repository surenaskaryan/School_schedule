import { minutesToTime, normalizeTime, toMinutes } from '../domain/time'
import type { Lesson, Weekday } from '../domain/types'
import { uid } from '../data/uid'

/**
 * Эвристический разбор табличного расписания (xlsx / csv / Google Sheets).
 * Поддерживаются самые частые форматы:
 *  1. «Строки»: блоки по дням, колонки № / время / предмет / кабинет / учитель.
 *  2. «Сетка»: колонки — дни недели, строки — номера уроков, в ячейке предмет (+ кабинет, учитель).
 *  3. Отдельная таблица звонков (№ + время) где угодно в файле — время подставится по номеру урока.
 */

export type Cell = string | number | boolean | Date | null | undefined
export interface RawSheet { name: string; rows: Cell[][] }

export interface ParseResult {
  lessons: Lesson[]
  warnings: string[]
  format: 'rows' | 'grid' | 'none'
}

type Draft = Omit<Lesson, 'id' | 'order' | 'start' | 'end'> & { start?: string; end?: string }

const DAY_PATTERNS: [RegExp, Weekday][] = [
  [/^(понедельник|пн|пон)$/, 1],
  [/^(вторник|вт|втор)$/, 2],
  [/^(среда|ср|сред)$/, 3],
  [/^(четверг|чт|чет|четв)$/, 4],
  [/^(пятница|пт|пят)$/, 5],
  [/^(суббота|сб|суб)$/, 6],
  [/^(воскресенье|вс|вос)$/, 7],
]

const lower = (s: string) => s.toLowerCase().replace(/ё/g, 'е').trim()

/** День недели, если ячейка начинается с его названия: «Понедельник», «ПН», «Пн. 22.09». */
export const detectDay = (text: string): Weekday | null => {
  const t = lower(text)
  if (!t || t.length > 40) return null
  const firstWord = t.split(/[\s,.:;()\d-]+/).filter(Boolean)[0] ?? ''
  for (const [re, day] of DAY_PATTERNS) if (re.test(firstWord)) return day
  return null
}

/** Excel хранит время как Date (1899-12-30 …) или долю суток. */
export const cellText = (c: Cell): string => {
  if (c === null || c === undefined) return ''
  if (c instanceof Date) {
    if (c.getUTCFullYear() <= 1900) return minutesToTime(c.getUTCHours() * 60 + c.getUTCMinutes())
    return `${String(c.getUTCDate()).padStart(2, '0')}.${String(c.getUTCMonth() + 1).padStart(2, '0')}.${c.getUTCFullYear()}`
  }
  return String(c).replace(/\u00a0/g, ' ').trim()
}

const cellTime = (c: Cell): string | null => {
  if (typeof c === 'number' && c > 0 && c < 1) return minutesToTime(Math.round(c * 1440))
  return normalizeTime(cellText(c))
}

const TIME_RANGE = /(\d{1,2})\s*[:.]\s*(\d{2})\s*(?:[-–—−]|до)\s*(\d{1,2})\s*[:.]\s*(\d{2})/
export const parseTimeRange = (text: string): { start: string; end: string } | null => {
  const m = text.match(TIME_RANGE)
  if (!m) return null
  const start = normalizeTime(`${m[1]}:${m[2]}`)
  const end = normalizeTime(`${m[3]}:${m[4]}`)
  if (!start || !end || toMinutes(end) <= toMinutes(start)) return null
  return { start, end }
}

const DATE_RE = /(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?/
const parseDate = (text: string, yearHint: number): string | undefined => {
  if (TIME_RANGE.test(text)) return undefined
  const m = text.match(DATE_RE)
  if (!m) return undefined
  const d = Number(m[1])
  const mo = Number(m[2])
  if (d < 1 || d > 31 || mo < 1 || mo > 12) return undefined
  let y = m[3] ? Number(m[3]) : yearHint
  if (y < 100) y += 2000
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

const ROOM_RE = /(?:каб(?:инет)?\.?|ауд(?:итория)?\.?|к\.)\s*№?\s*([0-9]{1,4}[а-яa-z]?(?:\s*[/,]\s*[0-9]{1,4}[а-яa-z]?)?|[а-яa-z]+\s?зал|спортзал)/i
const BARE_ROOM_RE = /^(?:№\s*)?\d{1,4}[а-яa-z]?(?:\s*[/,]\s*\d{1,4}[а-яa-z]?)?$/i
const TEACHER_RE = /[А-ЯЁ][а-яё]+(?:-[А-ЯЁ][а-яё]+)?\s+[А-ЯЁ]\.\s*[А-ЯЁ]\.?|[А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+(?:вич|вна|ична|ич)\b/

const HEADER_KEYS = {
  day: /^(день|дни|день недели)$/,
  number: /^(№|n|номер|№ урока|урок №|#)$/,
  time: /время|звон/,
  start: /начал/,
  end: /конец|оконч/,
  subject: /предмет|дисциплин|урок|занят/,
  room: /каб|ауд|помещ/,
  teacher: /учит|педагог|преподав|фио/,
  notes: /примеч|заметк|коммент|дз|домашн/,
}
type ColKey = keyof typeof HEADER_KEYS

const findHeader = (rows: Cell[][]): { row: number; cols: Partial<Record<ColKey, number>> } | null => {
  for (let r = 0; r < Math.min(rows.length, 30); r++) {
    const cols: Partial<Record<ColKey, number>> = {}
    rows[r].forEach((c, i) => {
      const t = lower(cellText(c))
      if (!t || t.length > 30) return
      for (const key of Object.keys(HEADER_KEYS) as ColKey[]) {
        if (cols[key] === undefined && HEADER_KEYS[key].test(t)) {
          // «урок №» — это номер, а не предмет.
          if (key === 'subject' && HEADER_KEYS.number.test(t)) continue
          cols[key] = i
          break
        }
      }
    })
    if (cols.subject !== undefined && Object.keys(cols).length >= 2) return { row: r, cols }
  }
  return null
}

/** Ячейка сетки: "Математика\nИванова И.И.\nкаб. 205" или "Математика (205)". */
const splitLessonCell = (text: string) => {
  let rest = text
  let room: string | undefined
  let teacher: string | undefined
  const rm = rest.match(ROOM_RE)
  if (rm) {
    room = rm[1].trim()
    rest = rest.replace(rm[0], ' ')
  }
  const tm = rest.match(TEACHER_RE)
  if (tm) {
    teacher = tm[0].trim()
    rest = rest.replace(tm[0], ' ')
  }
  if (!room) {
    const paren = rest.match(/\((\s*\d{1,4}[а-яa-z]?\s*)\)|\s(\d{2,4}[а-яa-z]?)\s*$/i)
    if (paren) {
      room = (paren[1] ?? paren[2]).trim()
      rest = rest.replace(paren[0], ' ')
    }
  }
  const subject = rest
    .split(/\n/)
    .map((s) => s.replace(/[()[\],;/]+$/g, '').replace(/^[\s,;/-]+|[\s,;/-]+$/g, '').trim())
    .filter(Boolean)[0]
  return { subject: subject ?? '', room, teacher }
}

const leadingNumber = (text: string) => {
  const m = text.match(/^(\d{1,2})(?:\s*(?:урок|[.)]))?$/i)
  const n = m ? Number(m[1]) : NaN
  return n >= 0 && n <= 12 ? n : undefined
}

/* ---------- Формат 1: строки ---------- */
function parseRows(rows: Cell[][], yearHint: number, bells: Map<number, { start: string; end: string }>): Draft[] {
  const header = findHeader(rows)
  const cols = header?.cols ?? {}
  const startRow = header ? header.row + 1 : 0
  const out: Draft[] = []
  let day: Weekday | null = null
  let date: string | undefined

  for (let r = startRow; r < rows.length; r++) {
    const row = rows[r]
    const texts = row.map(cellText)
    const filled = texts.filter(Boolean)
    if (!filled.length) continue

    // День: отдельной строкой-заголовком или в колонке «день» (часто объединённая ячейка).
    const dayCell = cols.day !== undefined ? texts[cols.day] : filled[0]
    const d = dayCell ? detectDay(dayCell) : null
    if (d) {
      day = d
      date = parseDate(filled.join(' '), yearHint)
      if (filled.length <= 2) continue
    }

    // Время
    let time: { start: string; end: string } | null = null
    if (cols.time !== undefined) time = parseTimeRange(texts[cols.time])
    if (!time && cols.start !== undefined && cols.end !== undefined) {
      const s = cellTime(row[cols.start])
      const e = cellTime(row[cols.end])
      if (s && e && toMinutes(e) > toMinutes(s)) time = { start: s, end: e }
    }
    if (!time) for (const t of texts) if ((time = parseTimeRange(t))) break

    // Номер
    let number: number | undefined
    if (cols.number !== undefined) number = leadingNumber(texts[cols.number])
    if (number === undefined) number = leadingNumber(texts.find(Boolean) ?? '')

    // Предмет
    let subject = ''
    let room: string | undefined
    let teacher: string | undefined
    if (cols.subject !== undefined) {
      const parsed = splitLessonCell(texts[cols.subject])
      subject = parsed.subject
      room = parsed.room
      teacher = parsed.teacher
    } else {
      const candidates = texts
        .map((t, i) => ({ t, i }))
        .filter(({ t }) => t && !TIME_RANGE.test(t) && !BARE_ROOM_RE.test(t) && leadingNumber(t) === undefined && !detectDay(t) && /[а-яa-z]{2,}/i.test(t))
      if (candidates.length) {
        const parsed = splitLessonCell(candidates[0].t)
        subject = parsed.subject
        room = parsed.room
        const rest = candidates.slice(1).map((c) => c.t)
        teacher = parsed.teacher ?? rest.find((t) => TEACHER_RE.test(t))
        // Короткий текст после предмета без ФИО — скорее всего кабинет («актовый зал»).
        room = parsed.room ?? rest.find((t) => t !== teacher && t.length <= 24 && !TEACHER_RE.test(t))
      }
    }
    if (cols.room !== undefined && texts[cols.room]) room = texts[cols.room].replace(/^каб(инет)?\.?\s*/i, '')
    if (cols.teacher !== undefined && texts[cols.teacher]) teacher = texts[cols.teacher]
    if (!room) room = texts.find((t, i) => i !== cols.number && BARE_ROOM_RE.test(t) && leadingNumber(t) === undefined)

    // Строка таблицы звонков: номер + время, без предмета.
    if (!subject && number !== undefined && time) {
      bells.set(number, time)
      continue
    }
    if (!subject || !day || subject.length > 80) continue
    if (/^(перемена|обед|завтрак|большая перемена)$/i.test(subject)) continue

    out.push({
      day,
      date,
      number,
      subject,
      start: time?.start,
      end: time?.end,
      room: room || undefined,
      teacher: teacher || undefined,
      notes: cols.notes !== undefined ? texts[cols.notes] || undefined : undefined,
    })
  }
  return out
}

/* ---------- Формат 2: сетка (дни — колонки) ---------- */
function parseGrid(rows: Cell[][], yearHint: number, bells: Map<number, { start: string; end: string }>): Draft[] | null {
  let headerRow = -1
  let dayCols: { col: number; day: Weekday; date?: string; roomCol?: number }[] = []
  for (let r = 0; r < Math.min(rows.length, 30); r++) {
    const found = rows[r]
      .map((c, col) => ({ col, text: cellText(c) }))
      .map(({ col, text }) => ({ col, day: detectDay(text), date: parseDate(text, yearHint) }))
      .filter((x): x is { col: number; day: Weekday; date: string | undefined } => x.day !== null)
    const unique = new Set(found.map((f) => f.day))
    if (unique.size >= 3) {
      headerRow = r
      dayCols = found
      break
    }
  }
  if (headerRow < 0) return null

  // Соседняя колонка с заголовком «каб.» — кабинет этого дня.
  const nextHeaderTexts = [rows[headerRow], rows[headerRow + 1] ?? []]
  dayCols = dayCols.map((dc) => {
    for (const hr of nextHeaderTexts) {
      const t = lower(cellText(hr[dc.col + 1]))
      if (/^(каб|ауд)/.test(t)) return { ...dc, roomCol: dc.col + 1 }
    }
    return dc
  })

  const firstDayCol = Math.min(...dayCols.map((d) => d.col))
  const out: Draft[] = []
  for (let r = headerRow + 1; r < rows.length; r++) {
    const row = rows[r]
    const leftTexts = row.slice(0, firstDayCol).map(cellText)
    let number: number | undefined
    let time: { start: string; end: string } | null = null
    for (const t of leftTexts) {
      if (number === undefined) number = leadingNumber(t)
      if (!time) time = parseTimeRange(t)
    }
    if (number !== undefined && time) bells.set(number, time)

    for (const dc of dayCols) {
      const text = cellText(row[dc.col])
      if (!text || /^(каб|ауд)/i.test(text)) continue
      const parsed = splitLessonCell(text)
      if (!parsed.subject || parsed.subject.length > 80) continue
      const ownTime = parseTimeRange(text)
      const room = dc.roomCol !== undefined ? cellText(row[dc.roomCol]) || parsed.room : parsed.room
      out.push({
        day: dc.day,
        date: dc.date,
        number,
        subject: parsed.subject.replace(TIME_RANGE, '').trim(),
        start: ownTime?.start ?? time?.start,
        end: ownTime?.end ?? time?.end,
        room: room || undefined,
        teacher: parsed.teacher,
      })
    }
  }
  return out
}

/** Стандартные звонки — только как крайний случай, с предупреждением. */
const FALLBACK_BELLS = ['08:30-09:15', '09:25-10:10', '10:25-11:10', '11:25-12:10', '12:20-13:05', '13:15-14:00', '14:10-14:55', '15:05-15:50']

export function parseSheets(sheets: RawSheet[], yearHint = new Date().getFullYear()): ParseResult {
  const bells = new Map<number, { start: string; end: string }>()
  let drafts: Draft[] = []
  let format: ParseResult['format'] = 'none'
  const warnings: string[] = []

  for (const sheet of sheets) {
    const rows = sheet.rows.filter((r) => Array.isArray(r))
    const grid = parseGrid(rows, yearHint, bells)
    if (grid && grid.length) {
      drafts = drafts.concat(grid)
      format = 'grid'
      continue
    }
    const list = parseRows(rows, yearHint, bells)
    if (list.length) {
      drafts = drafts.concat(list)
      if (format === 'none') format = 'rows'
    }
  }

  // Номера уроков по порядку внутри дня, если в файле их нет.
  const byDay = new Map<Weekday, Draft[]>()
  for (const d of drafts) byDay.set(d.day, [...(byDay.get(d.day) ?? []), d])

  let usedFallback = false
  let missingTime = 0
  const lessons: Lesson[] = []
  for (const [, list] of byDay) {
    list.forEach((d, i) => {
      const number = d.number ?? (list.every((x) => x.number === undefined) ? i + 1 : undefined)
      let start = d.start
      let end = d.end
      if ((!start || !end) && number !== undefined && bells.has(number)) ({ start, end } = bells.get(number)!)
      if (!start || !end) {
        const fb = FALLBACK_BELLS[Math.min((number ?? i + 1) - 1, FALLBACK_BELLS.length - 1)]
        ;[start, end] = fb.split('-')
        usedFallback = true
        missingTime++
      }
      lessons.push({
        id: uid(),
        day: d.day,
        order: i,
        number,
        subject: d.subject,
        start,
        end,
        room: d.room,
        teacher: d.teacher,
        notes: d.notes,
        date: undefined,
      })
    })
  }

  // Дата в заголовке дня — это «неделя из файла», а не разовые уроки: храним уроки как еженедельные.
  if (usedFallback) {
    warnings.push(
      `У ${missingTime} ${missingTime === 1 ? 'урока' : 'уроков'} в файле нет времени — подставлены стандартные звонки. Проверьте и поправьте время.`,
    )
  }
  if (!lessons.length) warnings.push('Не удалось найти уроки в файле. Проверьте, что в нём есть дни недели и названия предметов.')
  return { lessons, warnings, format }
}
