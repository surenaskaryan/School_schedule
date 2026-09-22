import { create } from 'zustand'
import { repository } from '../data/repository'
import { createSeed } from '../data/seed'
import { uid } from '../data/uid'
import { toMinutes } from '../domain/time'
import type {
  AccentKey, AppData, Lesson, LessonDraft, Section, SectionItem, Settings, Weekday,
} from '../domain/types'
import { normalizeSubject } from '../domain/accents'

type Mode = 'view' | 'edit'

interface ScheduleState {
  ready: boolean
  data: AppData
  mode: Mode

  hydrate(data: AppData): void
  setMode(mode: Mode): void

  addLesson(draft: LessonDraft): Lesson
  updateLesson(id: string, patch: Partial<LessonDraft>): void
  deleteLesson(id: string): Lesson | undefined
  restoreLesson(lesson: Lesson): void
  reorderDay(day: Weekday, orderedIds: string[]): void
  sortDayByTime(day: Weekday): void
  setSubjectAccent(subject: string, accent: AccentKey): void
  replaceLessons(lessons: Lesson[], sourceName: string): void

  addSection(s: Omit<Section, 'id' | 'order' | 'items'>): Section
  updateSection(id: string, patch: Partial<Omit<Section, 'id' | 'items'>>): void
  deleteSection(id: string): void
  reorderSections(orderedIds: string[]): void

  addItem(sectionId: string, item: Omit<SectionItem, 'id'>): void
  updateItem(sectionId: string, itemId: string, patch: Partial<SectionItem>): void
  deleteItem(sectionId: string, itemId: string): void

  updateSettings(patch: Partial<Settings>): void
  replaceAll(data: AppData): void
  resetAll(): void
}

const touch = (data: AppData): AppData => ({ ...data, updatedAt: new Date().toISOString() })

const dayLessons = (lessons: Lesson[], day: Weekday) =>
  lessons.filter((l) => l.day === day).sort((a, b) => a.order - b.order)

const clean = <T extends object>(o: T): T => {
  const out = { ...o } as Record<string, unknown>
  for (const k of Object.keys(out)) if (out[k] === '' || out[k] === undefined) delete out[k]
  return out as T
}

export const useSchedule = create<ScheduleState>((set, get) => {
  const mutate = (fn: (d: AppData) => AppData) => set((s) => ({ data: touch(fn(s.data)) }))

  const mapSection = (id: string, fn: (s: Section) => Section) =>
    mutate((d) => ({ ...d, sections: d.sections.map((s) => (s.id === id ? fn(s) : s)) }))

  return {
    ready: false,
    data: createSeed(),
    mode: 'view',

    hydrate: (data) => set({ data, ready: true }),
    setMode: (mode) => set({ mode }),

    addLesson: (draft) => {
      const same = dayLessons(get().data.lessons, draft.day)
      // Новый урок встаёт по времени начала, чтобы не приходилось его двигать руками.
      const startMin = toMinutes(draft.start)
      const insertAt = same.findIndex((l) => toMinutes(l.start) > startMin)
      const lesson: Lesson = clean({ ...draft, id: uid(), order: 0 }) as Lesson
      const ordered = [...same]
      ordered.splice(insertAt === -1 ? ordered.length : insertAt, 0, lesson)
      const orderMap = new Map(ordered.map((l, i) => [l.id, i]))
      mutate((d) => ({
        ...d,
        lessons: [
          ...d.lessons.map((l) => (orderMap.has(l.id) ? { ...l, order: orderMap.get(l.id)! } : l)),
          { ...lesson, order: orderMap.get(lesson.id)! },
        ],
      }))
      return { ...lesson, order: orderMap.get(lesson.id)! }
    },

    updateLesson: (id, patch) =>
      mutate((d) => {
        const current = d.lessons.find((l) => l.id === id)
        if (!current) return d
        const movedDay = patch.day !== undefined && patch.day !== current.day
        const order = movedDay ? dayLessons(d.lessons, patch.day!).length : current.order
        const next = clean({ ...current, ...patch, order }) as Lesson
        return { ...d, lessons: d.lessons.map((l) => (l.id === id ? next : l)) }
      }),

    deleteLesson: (id) => {
      const lesson = get().data.lessons.find((l) => l.id === id)
      mutate((d) => ({ ...d, lessons: d.lessons.filter((l) => l.id !== id) }))
      return lesson
    },

    restoreLesson: (lesson) => mutate((d) => ({ ...d, lessons: [...d.lessons, lesson] })),

    reorderDay: (day, orderedIds) => {
      const map = new Map(orderedIds.map((id, i) => [id, i]))
      mutate((d) => ({
        ...d,
        lessons: d.lessons.map((l) => (l.day === day && map.has(l.id) ? { ...l, order: map.get(l.id)! } : l)),
      }))
    },

    sortDayByTime: (day) => {
      const ids = dayLessons(get().data.lessons, day)
        .sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
        .map((l) => l.id)
      get().reorderDay(day, ids)
    },

    setSubjectAccent: (subject, accent) =>
      mutate((d) => ({ ...d, subjectAccents: { ...d.subjectAccents, [normalizeSubject(subject)]: accent } })),

    replaceLessons: (lessons, sourceName) =>
      mutate((d) => ({ ...d, lessons, source: { name: sourceName, importedAt: new Date().toISOString() } })),

    addSection: (s) => {
      const section: Section = { ...s, id: uid(), order: get().data.sections.length, items: [] }
      mutate((d) => ({ ...d, sections: [...d.sections, section] }))
      return section
    },

    updateSection: (id, patch) => mapSection(id, (s) => ({ ...s, ...patch })),

    deleteSection: (id) =>
      mutate((d) => ({
        ...d,
        sections: d.sections.filter((s) => s.id !== id).map((s, i) => ({ ...s, order: i })),
      })),

    reorderSections: (orderedIds) => {
      const map = new Map(orderedIds.map((id, i) => [id, i]))
      mutate((d) => ({ ...d, sections: d.sections.map((s) => ({ ...s, order: map.get(s.id) ?? s.order })) }))
    },

    addItem: (sectionId, item) =>
      mapSection(sectionId, (s) => ({ ...s, items: [...s.items, clean({ ...item, id: uid() })] })),

    updateItem: (sectionId, itemId, patch) =>
      mapSection(sectionId, (s) => ({
        ...s,
        items: s.items.map((it) => (it.id === itemId ? clean({ ...it, ...patch }) : it)),
      })),

    deleteItem: (sectionId, itemId) =>
      mapSection(sectionId, (s) => ({ ...s, items: s.items.filter((it) => it.id !== itemId) })),

    updateSettings: (patch) => mutate((d) => ({ ...d, settings: { ...d.settings, ...patch } })),

    replaceAll: (data) => set({ data: touch(data) }),

    resetAll: () => set({ data: createSeed() }),
  }
})

/* Автосохранение: любое изменение данных уходит в репозиторий (с небольшим debounce). */
let saveTimer: ReturnType<typeof setTimeout> | undefined
useSchedule.subscribe((state, prev) => {
  if (!state.ready || state.data === prev.data) return
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => void repository.save(state.data), 150)
})
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    const s = useSchedule.getState()
    if (s.ready) void repository.save(s.data)
  })
}

/* Селекторы */
export const sortedSections = (d: AppData) => [...d.sections].sort((a, b) => a.order - b.order)
