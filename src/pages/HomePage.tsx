import { ArrowRight, CalendarRange, Coffee, FileSpreadsheet, MapPin, MoonStar, Plus, Sparkles, User } from 'lucide-react'
import type { CSSProperties } from 'react'
import { accentVars } from '../domain/accents'
import {
  addDays, dayPhase, formatDayMonth, formatLongDate, humanMinutes, isoWeekday, lessonsForDate, lessonState,
  minutesOfDay, onWeekday, plural, startOfWeek, toISODate, weekdayInfo, type DayPhase,
} from '../domain/time'
import type { AccentKey, Lesson, Weekday } from '../domain/types'
import { useSubjectAccent } from '../hooks/useAccent'
import { getNow, useNow } from '../hooks/useNow'
import { navigate } from '../hooks/useRoute'
import { useEditor } from '../store/useEditor'
import { sortedSections, useSchedule } from '../store/useSchedule'
import { EmptyState } from '../ui/controls'
import { sectionIcon } from '../ui/icons'

const greeting = (h: number) => (h < 5 ? 'Доброй ночи' : h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : 'Добрый вечер')

const roomLabel = (room?: string) => (room ? (/^\d/.test(room) ? `Кабинет ${room}` : room) : undefined)

export function HomePage() {
  const now = useNow()
  const data = useSchedule((s) => s.data)
  const accentOf = useSubjectAccent()
  const { lessons, settings } = data
  const nowMin = minutesOfDay(now)
  const today = lessonsForDate(lessons, now)
  const phase = dayPhase(today, nowMin)
  const name = settings.studentName

  // Ближайший учебный день после сегодняшнего
  let nextDate: Date | null = null
  let nextLessons: Lesson[] = []
  for (let i = 1; i <= 14; i++) {
    const d = addDays(now, i)
    if (!settings.schoolDays.includes(isoWeekday(d))) continue
    const list = lessonsForDate(lessons, d)
    if (list.length) {
      nextDate = d
      nextLessons = list
      break
    }
  }

  if (!lessons.length) {
    return (
      <>
        <Hero now={now} name={name} />
        <EmptyState
          icon={<CalendarRange size={22} />}
          title="Расписание пока пустое"
          text="Загрузите файл с расписанием (Excel или CSV) — уроки, время, кабинеты и учителя подтянутся автоматически. Или добавьте уроки вручную."
        >
          <button className="btn btn--primary" onClick={() => useEditor.getState().setImportOpen(true)}>
            <FileSpreadsheet size={16} /> Импортировать файл
          </button>
          <button
            className="btn btn--ghost"
            onClick={() => {
              useSchedule.getState().setMode('edit')
              navigate('schedule')
              useEditor.getState().openLessonForm({ mode: 'add', day: Math.min(isoWeekday(now), 5) as Weekday })
            }}
          >
            <Plus size={16} /> Добавить урок
          </button>
        </EmptyState>
      </>
    )
  }

  const upNext =
    phase.kind === 'lesson' ? phase.next
      : phase.kind === 'break' ? today[today.findIndex((l) => l.id === phase.next.id) + 1]
        : phase.kind === 'before' ? today[1]
          : undefined

  return (
    <div className="home">
      <Hero now={now} name={name} summary={today.length ? `${today.length} ${plural(today.length, 'урок', 'урока', 'уроков')} · ${today[0].start} — ${today[today.length - 1].end}` : undefined} />

      <div className="home-grid">
        <div className="home-main">
          {phase.kind === 'empty' ? (
            <DayOff next={nextDate} nextLessons={nextLessons} accentOf={accentOf} />
          ) : (
            <>
              <NowCard phase={phase} accentOf={accentOf} tomorrow={nextDate ? { date: nextDate, first: nextLessons[0] } : null} />
              {upNext && (
                <section className="rise rise-2">
                  <h2 className="section-label">Дальше</h2>
                  <NextCard lesson={upNext} accent={accentOf(upNext.subject)} />
                </section>
              )}
              <section className="rise rise-3">
                <div className="section-label-row">
                  <h2 className="section-label">Уроки сегодня</h2>
                  <button className="link-btn" onClick={() => {
                    useEditor.getState().setScheduleDay(isoWeekday(now), 0)
                    navigate('schedule')
                  }}>
                    Всё расписание <ArrowRight size={14} />
                  </button>
                </div>
                <ol className="timeline">
                  {today.map((l) => {
                    const st = lessonState(l, nowMin)
                    return (
                      <li
                        key={l.id}
                        className={`tl-row is-${st} ${settings.dimPast ? 'dim-past' : ''}`}
                        style={accentVars(accentOf(l.subject))}
                        onClick={() => useEditor.getState().openLessonView(l.id)}
                      >
                        <span className="tl-num tnum">{l.number ?? ''}</span>
                        <span className="tl-dot" />
                        <span className="tl-time tnum">{l.start}<span>{l.end}</span></span>
                        <span className="tl-subject">{l.subject}</span>
                        <span className="tl-room">{l.room}</span>
                      </li>
                    )
                  })}
                </ol>
              </section>
            </>
          )}
        </div>

        <aside className="home-side">
          <WeekCard now={now} />
          <UpcomingCard now={now} />
        </aside>
      </div>
    </div>
  )
}


function Hero({ now, name, summary }: { now: Date; name: string; summary?: string }) {
  return (
    <header className="hero rise">
      <p className="eyebrow">
        {greeting(now.getHours())}
        {name ? `, ${name}` : ''}
      </p>
      <h1 className="hero-date">
        <span>{weekdayInfo(isoWeekday(now)).full}</span>
        <span className="hero-sep">·</span>
        <span className="hero-day">{formatDayMonth(now)}</span>
      </h1>
      {summary && <p className="hero-summary tnum">{summary}</p>}
    </header>
  )
}

function NowCard({
  phase, accentOf, tomorrow,
}: {
  phase: Exclude<DayPhase, { kind: 'empty' }>
  accentOf(s: string): AccentKey
  tomorrow: { date: Date; first: Lesson } | null
}) {
  if (phase.kind === 'done') {
    return (
      <section className="now now--calm rise rise-1" style={accentVars('slate')}>
        <div className="now-top">
          <span className="now-label"><MoonStar size={14} /> На сегодня всё</span>
        </div>
        <h2 className="now-subject">Уроки закончились</h2>
        <p className="now-meta tnum">Последний урок — {phase.last.subject}, до {phase.last.end}</p>
        {tomorrow && (
          <div className="now-foot">
            <span>
              {isTomorrow(tomorrow.date) ? 'Завтра' : capitalize(onWeekday(isoWeekday(tomorrow.date)))} первый урок —{' '}
              <b>{tomorrow.first.subject}</b> в <span className="tnum">{tomorrow.first.start}</span>
            </span>
          </div>
        )}
      </section>
    )
  }

  const lesson = phase.kind === 'lesson' ? phase.current : phase.next
  const accent = accentOf(lesson.subject)
  const progress = phase.kind === 'before' ? null : phase.progress
  const label =
    phase.kind === 'lesson' ? 'Сейчас' : phase.kind === 'break' ? 'Перемена · дальше' : 'Скоро'
  const footer =
    phase.kind === 'lesson' ? `До конца ${humanMinutes(phase.minutesLeft)}`
      : phase.kind === 'break' ? `До урока ${humanMinutes(phase.minutesLeft)}`
        : `Начало через ${humanMinutes(phase.minutesLeft)}`

  return (
    <section
      className={`now ${phase.kind === 'lesson' ? 'now--live' : ''} rise rise-1`}
      style={accentVars(accent)}
      onClick={() => useEditor.getState().openLessonView(lesson.id)}
      role="button"
      tabIndex={0}
    >
      <div className="now-glow" aria-hidden />
      <div className="now-top">
        <span className="now-label">
          {phase.kind === 'lesson' ? <span className="live-dot" /> : phase.kind === 'break' ? <Coffee size={14} /> : <Sparkles size={14} />}
          {label}
        </span>
        {lesson.number !== undefined && <span className="now-num tnum">{lesson.number} урок</span>}
      </div>
      <h2 className="now-subject">{lesson.subject}</h2>
      <div className="now-meta">
        <span className="tnum">{lesson.start} — {lesson.end}</span>
        {lesson.room && <span><MapPin size={14} />{roomLabel(lesson.room)}</span>}
        {lesson.teacher && <span className="now-teacher"><User size={14} />{lesson.teacher}</span>}
      </div>

      {progress !== null && (
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
          <div className="progress-track">
            <div className="progress-fill" style={{ '--p': progress } as CSSProperties} />
          </div>
        </div>
      )}
      <div className="now-foot tnum">
        <span>{footer}</span>
        {progress !== null && <span className="now-pct">{Math.round(progress * 100)}%</span>}
      </div>
    </section>
  )
}

const capitalize = (s: string) => s[0].toUpperCase() + s.slice(1)

const isTomorrow = (d: Date) => toISODate(d) === toISODate(addDays(getNow(), 1))

function NextCard({ lesson, accent }: { lesson: Lesson; accent: AccentKey }) {
  return (
    <button className="next" style={accentVars(accent)} onClick={() => useEditor.getState().openLessonView(lesson.id)}>
      <span className="next-bar" />
      <span className="next-main">
        <span className="next-subject">{lesson.subject}</span>
        <span className="next-meta tnum">
          {lesson.start} — {lesson.end}
          {lesson.room && <> · {roomLabel(lesson.room)}</>}
        </span>
      </span>
      <ArrowRight size={18} className="next-arrow" />
    </button>
  )
}

function DayOff({ next, nextLessons, accentOf }: { next: Date | null; nextLessons: Lesson[]; accentOf(s: string): AccentKey }) {
  return (
    <section className="now now--calm rise rise-1" style={accentVars('teal')}>
      <div className="now-glow" aria-hidden />
      <div className="now-top">
        <span className="now-label"><MoonStar size={14} /> Сегодня без уроков</span>
      </div>
      <h2 className="now-subject">Выходной</h2>
      {next && (
        <>
          <p className="now-meta">
            Следующий учебный день — {weekdayInfo(isoWeekday(next)).full.toLowerCase()}, {formatDayMonth(next)}
          </p>
          <div className="dayoff-list">
            {nextLessons.slice(0, 8).map((l) => (
              <span key={l.id} className="dayoff-chip" style={accentVars(accentOf(l.subject))}>
                <span className="tnum">{l.start}</span> {l.subject}
              </span>
            ))}
          </div>
        </>
      )}
    </section>
  )
}

function WeekCard({ now }: { now: Date }) {
  const lessons = useSchedule((s) => s.data.lessons)
  const days = useSchedule((s) => s.data.settings.schoolDays)
  const weekStart = startOfWeek(now)
  const todayIso = toISODate(now)
  return (
    <section className="card week-card rise rise-2">
      <h2 className="card-title">Неделя</h2>
      <div className="week-list">
        {days.map((d) => {
          const date = addDays(weekStart, d - 1)
          const list = lessonsForDate(lessons, date)
          const isToday = toISODate(date) === todayIso
          const past = date < now && !isToday
          return (
            <button
              key={d}
              className={`week-row ${isToday ? 'is-today' : ''} ${past ? 'is-past' : ''}`}
              onClick={() => {
                useEditor.getState().setScheduleDay(d, 0)
                navigate('schedule')
              }}
            >
              <span className="week-day">{weekdayInfo(d).short}</span>
              <span className="week-date tnum">{date.getDate()}</span>
              <span className="week-bars" aria-hidden>
                {list.slice(0, 9).map((l) => <WeekBar key={l.id} lesson={l} />)}
              </span>
              <span className="week-count tnum">{list.length || '—'}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function WeekBar({ lesson }: { lesson: Lesson }) {
  const accentOf = useSubjectAccent()
  return <span className="week-bar" style={accentVars(accentOf(lesson.subject))} title={lesson.subject} />
}

/** Сводка по секциям: невыполненные задачи, ближайшие события, занятия сегодня. */
function UpcomingCard({ now }: { now: Date }) {
  const data = useSchedule((s) => s.data)
  const sections = sortedSections(data)
  const todayIso = toISODate(now)
  const horizon = toISODate(addDays(now, 14))
  const wd = isoWeekday(now)

  const items = sections.flatMap((s) =>
    s.items
      .filter((it) => {
        if (s.kind === 'tasks') return !it.done
        if (s.kind === 'events') return !!it.date && it.date >= todayIso && it.date <= horizon
        if (s.kind === 'activities') return !!it.days?.includes(wd)
        return false
      })
      .map((it) => ({ it, s })),
  )
  items.sort((a, b) => (a.it.date ?? '9999').localeCompare(b.it.date ?? '9999'))

  return (
    <section className="card upcoming-card rise rise-3">
      <div className="card-title-row">
        <h2 className="card-title">Скоро</h2>
        <a className="link-btn" href="#/sections">Секции <ArrowRight size={14} /></a>
      </div>
      {items.length === 0 ? (
        <p className="muted small">Нет задач и событий на ближайшие дни.</p>
      ) : (
        <ul className="upcoming-list">
          {items.slice(0, 6).map(({ it, s }) => {
            const Icon = sectionIcon(s.icon)
            const when =
              s.kind === 'activities' ? `сегодня${it.time ? ` в ${it.time}` : ''}`
                : it.date ? (it.date === todayIso ? 'сегодня' : formatLongDate(new Date(it.date + 'T00:00')).split(' · ')[1])
                  : ''
            return (
              <li key={it.id} style={accentVars(s.accent)}>
                <button className="upcoming-row" onClick={() => useEditor.getState().openItemForm({ sectionId: s.id, itemId: it.id })}>
                  <span className="upcoming-icon"><Icon size={14} /></span>
                  <span className="upcoming-title">{it.title}</span>
                  {when && <span className="upcoming-when">{when}</span>}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
