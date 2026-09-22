import { create } from 'zustand'
import type { Weekday } from '../domain/types'

/** Какие окна редактирования открыты. Окна рендерятся один раз в корне приложения. */
type LessonForm = { mode: 'add'; day: Weekday } | { mode: 'edit'; id: string }
type SectionForm = { mode: 'add' } | { mode: 'edit'; id: string }
type ItemForm = { sectionId: string; itemId?: string }

interface EditorState {
  lessonForm: LessonForm | null
  lessonView: string | null
  sectionForm: SectionForm | null
  itemForm: ItemForm | null
  importOpen: boolean
  /** Выбранный день и смещение недели на странице «Расписание». */
  scheduleDay: Weekday | null
  weekOffset: number
  setScheduleDay(d: Weekday | null, weekOffset?: number): void
  setWeekOffset(n: number): void
  openLessonForm(f: LessonForm | null): void
  openLessonView(id: string | null): void
  openSectionForm(f: SectionForm | null): void
  openItemForm(f: ItemForm | null): void
  setImportOpen(v: boolean): void
  closeAll(): void
}

export const useEditor = create<EditorState>((set) => ({
  lessonForm: null,
  lessonView: null,
  sectionForm: null,
  itemForm: null,
  importOpen: false,
  scheduleDay: null,
  weekOffset: 0,
  setScheduleDay: (scheduleDay, weekOffset) => set((s) => ({ scheduleDay, weekOffset: weekOffset ?? s.weekOffset })),
  setWeekOffset: (weekOffset) => set({ weekOffset }),
  openLessonForm: (lessonForm) => set({ lessonForm, lessonView: null }),
  openLessonView: (lessonView) => set({ lessonView }),
  openSectionForm: (sectionForm) => set({ sectionForm }),
  openItemForm: (itemForm) => set({ itemForm }),
  setImportOpen: (importOpen) => set({ importOpen }),
  closeAll: () => set({ lessonForm: null, lessonView: null, sectionForm: null, itemForm: null, importOpen: false }),
}))
