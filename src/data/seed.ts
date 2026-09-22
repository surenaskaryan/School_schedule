import type { AppData, Lesson } from '../domain/types'
import initial from './initial-schedule.json'
import { uid } from './uid'

/**
 * Начальное состояние при первом запуске.
 * Уроки — из реального файла расписания (raspisanie_urokov_starshego.xlsx),
 * перенесены в initial-schedule.json. Время уроков: звонки из того же файла.
 * Кабинеты и учителя в файле не указаны — их можно добавить в приложении.
 */
export const createSeed = (): AppData => ({
  schemaVersion: 1,
  lessons: initial.lessons.map((l) => ({ ...l }) as Lesson),
  source: { ...initial.source },
  sections: [
    { id: uid(), title: 'Домашние задания', icon: 'notebook', accent: 'violet', kind: 'tasks', order: 0, items: [] },
    { id: uid(), title: 'Кружки и тренировки', icon: 'dumbbell', accent: 'green', kind: 'activities', order: 1, items: [] },
    { id: uid(), title: 'Контрольные и события', icon: 'flag', accent: 'amber', kind: 'events', order: 2, items: [] },
    { id: uid(), title: 'Важное', icon: 'star', accent: 'pink', kind: 'notes', order: 3, items: [] },
  ],
  subjectAccents: {},
  settings: {
    studentName: '',
    schoolDays: [1, 2, 3, 4, 5],
    dimPast: true,
  },
  updatedAt: new Date().toISOString(),
})
