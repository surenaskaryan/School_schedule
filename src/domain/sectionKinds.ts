import type { SectionItem, SectionKindId } from './types'

/**
 * Реестр типов секций. Чтобы добавить новый тип секции, достаточно
 * добавить запись сюда (и id в SectionKindId) — формы и карточки
 * строятся по описанию полей автоматически.
 */
export type ItemFieldKey = keyof Pick<
  SectionItem,
  'title' | 'note' | 'date' | 'time' | 'endTime' | 'days' | 'place' | 'done'
>

export interface ItemFieldDef {
  key: ItemFieldKey
  label: string
  type: 'text' | 'textarea' | 'date' | 'time' | 'weekdays' | 'checkbox'
  placeholder?: string
  required?: boolean
}

export interface SectionKind {
  id: SectionKindId
  label: string
  description: string
  itemNoun: string
  /** Показывать чекбокс «выполнено» у элементов. */
  checkable: boolean
  fields: ItemFieldDef[]
  /** Сортировка элементов при показе. */
  sort?: (a: SectionItem, b: SectionItem) => number
}

const byDateTime = (a: SectionItem, b: SectionItem) =>
  (a.date ?? '9999').localeCompare(b.date ?? '9999') || (a.time ?? '').localeCompare(b.time ?? '')

export const SECTION_KINDS: Record<SectionKindId, SectionKind> = {
  tasks: {
    id: 'tasks',
    label: 'Задачи',
    description: 'Список дел с отметкой «сделано»: домашние задания, подготовка.',
    itemNoun: 'задачу',
    checkable: true,
    fields: [
      { key: 'title', label: 'Что сделать', type: 'text', required: true, placeholder: 'Например, № 214–217' },
      { key: 'date', label: 'К какому дню', type: 'date' },
      { key: 'note', label: 'Заметка', type: 'textarea' },
    ],
    sort: (a, b) => Number(!!a.done) - Number(!!b.done) || byDateTime(a, b),
  },
  activities: {
    id: 'activities',
    label: 'Регулярные занятия',
    description: 'Кружки, тренировки, репетиторы — по дням недели.',
    itemNoun: 'занятие',
    checkable: false,
    fields: [
      { key: 'title', label: 'Название', type: 'text', required: true, placeholder: 'Например, Плавание' },
      { key: 'days', label: 'Дни', type: 'weekdays' },
      { key: 'time', label: 'Начало', type: 'time' },
      { key: 'endTime', label: 'Конец', type: 'time' },
      { key: 'place', label: 'Где', type: 'text', placeholder: 'Адрес или зал' },
      { key: 'note', label: 'Заметка', type: 'textarea' },
    ],
    sort: (a, b) => (a.days?.[0] ?? 9) - (b.days?.[0] ?? 9) || (a.time ?? '').localeCompare(b.time ?? ''),
  },
  events: {
    id: 'events',
    label: 'События',
    description: 'Контрольные, собрания, праздники — с датой.',
    itemNoun: 'событие',
    checkable: false,
    fields: [
      { key: 'title', label: 'Название', type: 'text', required: true, placeholder: 'Например, Контрольная по алгебре' },
      { key: 'date', label: 'Дата', type: 'date' },
      { key: 'time', label: 'Время', type: 'time' },
      { key: 'place', label: 'Где', type: 'text' },
      { key: 'note', label: 'Заметка', type: 'textarea' },
    ],
    sort: byDateTime,
  },
  notes: {
    id: 'notes',
    label: 'Заметки',
    description: 'Свободные записи: важное, напоминания, контакты.',
    itemNoun: 'заметку',
    checkable: false,
    fields: [
      { key: 'title', label: 'Заголовок', type: 'text', required: true },
      { key: 'note', label: 'Текст', type: 'textarea' },
    ],
  },
}

export const SECTION_KIND_LIST = Object.values(SECTION_KINDS)
