/**
 * Доменная модель приложения. UI работает только с этими типами,
 * а хранение (localStorage сейчас, backend в будущем) скрыто за репозиторием.
 */

/** 1 = понедельник … 7 = воскресенье (ISO). */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7

/** Ключ цветового акцента из палитры `ACCENTS`. */
export type AccentKey =
  | 'violet'
  | 'blue'
  | 'pink'
  | 'green'
  | 'cyan'
  | 'amber'
  | 'orange'
  | 'red'
  | 'teal'
  | 'indigo'
  | 'slate'

export interface Lesson {
  id: string
  day: Weekday
  /** Порядок внутри дня (0, 1, 2 …). Меняется при перетаскивании. */
  order: number
  /** Номер урока по звонкам. Необязателен. */
  number?: number
  subject: string
  /** "HH:MM" */
  start: string
  /** "HH:MM" */
  end: string
  room?: string
  teacher?: string
  notes?: string
  /**
   * Если указана дата (YYYY-MM-DD) — урок разовый и показывается только в этот день.
   * Без даты — урок повторяется каждую неделю.
   */
  date?: string
}

export type LessonDraft = Omit<Lesson, 'id' | 'order'> & { order?: number }

/** Элемент секции. Набор используемых полей определяет тип секции (см. sectionKinds). */
export interface SectionItem {
  id: string
  title: string
  note?: string
  /** YYYY-MM-DD */
  date?: string
  /** HH:MM */
  time?: string
  /** HH:MM */
  endTime?: string
  /** Для повторяющихся занятий: дни недели. */
  days?: Weekday[]
  place?: string
  done?: boolean
  /** Свободные поля для будущих типов секций. */
  extra?: Record<string, string | number | boolean>
}

export type SectionKindId = 'tasks' | 'activities' | 'events' | 'notes'

export interface Section {
  id: string
  title: string
  /** Имя иконки из `SECTION_ICONS`. */
  icon: string
  accent: AccentKey
  kind: SectionKindId
  order: number
  items: SectionItem[]
}

export interface Settings {
  /** Имя ребёнка для приветствия. */
  studentName: string
  /** Какие дни показывать в переключателе. */
  schoolDays: Weekday[]
  /** Приглушать прошедшие уроки. */
  dimPast: boolean
}

export interface AppData {
  /** Версия схемы — для миграций. */
  schemaVersion: 1
  lessons: Lesson[]
  sections: Section[]
  /** Явно назначенные цвета предметов (ключ — нормализованное название). */
  subjectAccents: Record<string, AccentKey>
  settings: Settings
  /** Откуда взято расписание (имя файла импорта). */
  source?: { name: string; importedAt: string }
  updatedAt: string
}
