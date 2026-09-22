import type { AppData } from '../domain/types'
import { uid } from './uid'

/**
 * Начальное состояние. Уроков здесь нет намеренно: расписание берётся
 * только из реального файла (Настройки → Импорт) или вводится вручную.
 * Если рядом с приложением лежит `initial-schedule.json`, он загружается
 * при первом запуске (см. loadInitialData).
 */
export const createSeed = (): AppData => ({
  schemaVersion: 1,
  lessons: [],
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
