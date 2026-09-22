import {
  closestCenter, DndContext, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent,
  type Modifier,
} from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowDownWideNarrow, CalendarRange, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useRef, type TouchEvent } from 'react'
import {
  addDays, formatDayMonth, isoWeekday, lessonsForDate, lessonState, minutesOfDay, plural, startOfWeek, toISODate,
  toMinutes, weekdayInfo,
} from '../domain/time'
import type { Lesson, Weekday } from '../domain/types'
import { useSubjectAccent } from '../hooks/useAccent'
import { useNow } from '../hooks/useNow'
import { useEditor } from '../store/useEditor'
import { useSchedule } from '../store/useSchedule'
import { PageHeader } from '../ui/AppShell'
import { EmptyState } from '../ui/controls'
import { LessonCard } from '../ui/LessonCard'
import { deleteLessonFlow } from '../ui/LessonSheets'
import { ModeToggle } from '../ui/ModeToggle'

export function SchedulePage() {
  const now = useNow()
  const lessons = useSchedule((s) => s.data.lessons)
  const schoolDays = useSchedule((s) => s.data.settings.schoolDays)
  const dimPast = useSchedule((s) => s.data.settings.dimPast)
  const editing = useSchedule((s) => s.mode === 'edit')
  const { scheduleDay, weekOffset, setScheduleDay } = useEditor()
  const accentOf = useSubjectAccent()

  const todayWd = isoWeekday(now)
  const fallbackDay = (schoolDays.includes(todayWd) ? todayWd : schoolDays.find((d) => d > todayWd) ?? schoolDays[0]) as Weekday
  const day = scheduleDay && schoolDays.includes(scheduleDay) ? scheduleDay : fallbackDay
  // На выходных по умолчанию показываем следующую неделю.
  const autoNextWeek = scheduleDay === null && !schoolDays.includes(todayWd) && day < todayWd ? 1 : 0
  const weekStart = addDays(startOfWeek(now), (weekOffset + autoNextWeek) * 7)
  const date = addDays(weekStart, day - 1)
  const isToday = toISODate(date) === toISODate(now)
  const isPastDate = !isToday && date < now

  const dayList = lessonsForDate(lessons, date)
  const nowMin = minutesOfDay(now)

  const weekEnd = addDays(weekStart, schoolDays[schoolDays.length - 1] - 1)
  const weekLabel =
    weekOffset + autoNextWeek === 0 ? 'Эта неделя' : weekOffset + autoNextWeek === 1 ? 'Следующая неделя' : weekOffset + autoNextWeek === -1 ? 'Прошлая неделя' : null
  const range = `${weekStart.getDate()}${weekStart.getMonth() === weekEnd.getMonth() ? '' : ' ' + formatDayMonth(weekStart).split(' ')[1]} – ${formatDayMonth(weekEnd)}`

  const goDay = (d: Weekday) => setScheduleDay(d, weekOffset + autoNextWeek)
  const shiftDay = (dir: 1 | -1) => {
    const i = schoolDays.indexOf(day)
    const ni = i + dir
    if (ni >= 0 && ni < schoolDays.length) goDay(schoolDays[ni])
    else {
      setScheduleDay(dir > 0 ? schoolDays[0] : schoolDays[schoolDays.length - 1], weekOffset + autoNextWeek + dir)
    }
  }

  // Свайп влево/вправо по списку — соседний день (только в режиме просмотра).
  const touch = useRef<{ x: number; y: number } | null>(null)
  const onTouchStart = (e: TouchEvent) => {
    if (editing) return
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  const onTouchEnd = (e: TouchEvent) => {
    if (!touch.current) return
    const dx = e.changedTouches[0].clientX - touch.current.x
    const dy = e.changedTouches[0].clientY - touch.current.y
    touch.current = null
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6) shiftDay(dx < 0 ? 1 : -1)
  }

  const addLesson = () => useEditor.getState().openLessonForm({ mode: 'add', day })

  return (
    <>
      <PageHeader
        eyebrow={<>{weekLabel ?? 'Неделя'} · <span className="tnum">{range}</span></>}
        title="Расписание"
        actions={<ModeToggle compact />}
      />

      <div className="days-bar rise rise-1">
        <button className="btn btn--icon btn--ghost week-nav" onClick={() => setScheduleDay(day, weekOffset + autoNextWeek - 1)} aria-label="Предыдущая неделя">
          <ChevronLeft size={18} />
        </button>
        <div className="days" role="tablist" aria-label="День недели">
          {schoolDays.map((d) => {
            const dd = addDays(weekStart, d - 1)
            const count = lessonsForDate(lessons, dd).length
            const active = d === day
            const today = toISODate(dd) === toISODate(now)
            return (
              <button
                key={d}
                role="tab"
                aria-selected={active}
                className={`day-btn ${active ? 'is-active' : ''} ${today ? 'is-today' : ''}`}
                onClick={() => goDay(d)}
              >
                <span className="day-short">{weekdayInfo(d).short}</span>
                <span className="day-num tnum">{dd.getDate()}</span>
                <span className="day-dots" aria-hidden>
                  {Array.from({ length: Math.min(count, 8) }, (_, i) => <i key={i} />)}
                </span>
              </button>
            )
          })}
        </div>
        <button className="btn btn--icon btn--ghost week-nav" onClick={() => setScheduleDay(day, weekOffset + autoNextWeek + 1)} aria-label="Следующая неделя">
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="day-head rise rise-2">
        <div>
          <h2 className="day-title">
            {weekdayInfo(day).full}
            <span className="day-title-date">, {formatDayMonth(date)}</span>
            {isToday && <span className="pill pill--brand">Сегодня</span>}
          </h2>
          <p className="day-sub tnum">
            {dayList.length
              ? `${dayList.length} ${plural(dayList.length, 'урок', 'урока', 'уроков')} · ${dayList[0].start} — ${dayList[dayList.length - 1].end}`
              : 'Уроков нет'}
          </p>
        </div>
        <div className="day-head-actions">
          {weekOffset + autoNextWeek !== 0 && (
            <button className="btn btn--ghost btn--sm" onClick={() => setScheduleDay(null, 0)}>
              <CalendarRange size={15} /> Сегодня
            </button>
          )}
          {editing && dayList.length > 1 && !isSortedByTime(dayList) && (
            <button className="btn btn--ghost btn--sm" onClick={() => useSchedule.getState().sortDayByTime(day)}>
              <ArrowDownWideNarrow size={15} /> По времени
            </button>
          )}
          {editing && (
            <button className="btn btn--primary btn--sm hide-mobile" onClick={addLesson}>
              <Plus size={15} /> Добавить урок
            </button>
          )}
        </div>
      </div>

      <div className="day-list" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} key={`${toISODate(date)}`}>
        {dayList.length === 0 ? (
          <EmptyState
            icon={<CalendarRange size={22} />}
            title={`${weekdayInfo(day).full}: уроков нет`}
            text={editing ? 'Добавьте первый урок этого дня.' : 'Включите режим редактирования, чтобы добавить уроки.'}
          >
            {editing ? (
              <button className="btn btn--primary" onClick={addLesson}><Plus size={16} /> Добавить урок</button>
            ) : (
              <button className="btn btn--ghost" onClick={() => useSchedule.getState().setMode('edit')}>Редактировать</button>
            )}
          </EmptyState>
        ) : editing ? (
          <SortableDay day={day} list={dayList} />
        ) : (
          <div className="lesson-list">
            {dayList.map((l, i) => {
              const st = isToday ? lessonState(l, nowMin) : isPastDate ? 'past' : 'upcoming'
              const progress = st === 'current' ? (nowMin - toMinutes(l.start)) / Math.max(1, toMinutes(l.end) - toMinutes(l.start)) : undefined
              return (
                <div key={l.id} className="rise" style={{ animationDelay: `${60 + i * 35}ms` }}>
                  <LessonCard
                    lesson={l}
                    accent={accentOf(l.subject)}
                    state={st}
                    progress={progress}
                    dim={dimPast && isToday}
                    onOpen={() => useEditor.getState().openLessonView(l.id)}
                  />
                </div>
              )
            })}
          </div>
        )}

        {editing && dayList.length > 0 && (
          <button className="add-card" onClick={addLesson}>
            <Plus size={18} /> Добавить урок
          </button>
        )}
      </div>

      {editing && (
        <button className="fab" onClick={addLesson} aria-label="Добавить урок">
          <Plus size={24} />
        </button>
      )}
    </>
  )
}

/** Перетаскивание только по вертикали. */
const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 })

const isSortedByTime = (list: Lesson[]) => list.every((l, i) => i === 0 || toMinutes(list[i - 1].start) <= toMinutes(l.start))

function SortableDay({ day, list }: { day: Weekday; list: Lesson[] }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const ids = list.map((l) => l.id)
    const next = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)))
    useSchedule.getState().reorderDay(day, next)
  }
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd} modifiers={[verticalOnly]}>
      <SortableContext items={list.map((l) => l.id)} strategy={verticalListSortingStrategy}>
        <div className="lesson-list">
          {list.map((l) => <SortableLesson key={l.id} lesson={l} />)}
        </div>
      </SortableContext>
    </DndContext>
  )
}

function SortableLesson({ lesson }: { lesson: Lesson }) {
  const accentOf = useSubjectAccent()
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: lesson.id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition, zIndex: isDragging ? 5 : undefined, position: 'relative' }}
    >
      <LessonCard
        lesson={lesson}
        accent={accentOf(lesson.subject)}
        editing
        dragging={isDragging}
        onEdit={() => useEditor.getState().openLessonForm({ mode: 'edit', id: lesson.id })}
        onDelete={() => void deleteLessonFlow(lesson)}
        handleRef={setActivatorNodeRef}
        handleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}
