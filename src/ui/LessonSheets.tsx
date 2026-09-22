import { CalendarDays, Clock, Hash, MapPin, SquarePen, StickyNote, Trash2, User } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { accentVars, normalizeSubject } from '../domain/accents'
import { knownSubjects, subjectDefaults, suggestLesson } from '../domain/suggest'
import { durationMinutes, formatDayMonth, fromISODate, humanMinutes, isValidTime, onWeekday, toMinutes, weekdayInfo } from '../domain/time'
import type { Lesson, LessonDraft, Weekday } from '../domain/types'
import { useSubjectAccent } from '../hooks/useAccent'
import { useEditor } from '../store/useEditor'
import { useSchedule } from '../store/useSchedule'
import { confirmAction } from './confirm'
import { Field, FieldGroup, Switch, TimeInput, WeekdayPicker } from './controls'
import { Sheet } from './Sheet'
import { toast } from './toast'

/** Удаление с подтверждением и возможностью отменить. */
export async function deleteLessonFlow(lesson: Lesson) {
  const ok = await confirmAction({
    title: 'Удалить урок?',
    text: `«${lesson.subject}», ${weekdayInfo(lesson.day).full.toLowerCase()}, ${lesson.start}–${lesson.end}.`,
  })
  if (!ok) return false
  const removed = useSchedule.getState().deleteLesson(lesson.id)
  if (removed) toast('Урок удалён', { label: 'Вернуть', run: () => useSchedule.getState().restoreLesson(removed) })
  return true
}

type FormState = {
  day: Weekday
  number: string
  subject: string
  start: string
  end: string
  room: string
  teacher: string
  notes: string
  extracurricular: boolean
  oneOff: boolean
  date: string
}

const toForm = (d: LessonDraft): FormState => ({
  day: d.day,
  number: d.number !== undefined ? String(d.number) : '',
  subject: d.subject,
  start: d.start,
  end: d.end,
  room: d.room ?? '',
  teacher: d.teacher ?? '',
  notes: d.notes ?? '',
  extracurricular: !!d.extracurricular,
  oneOff: !!d.date,
  date: d.date ?? '',
})

export function LessonFormSheet() {
  const form = useEditor((s) => s.lessonForm)
  const close = () => useEditor.getState().openLessonForm(null)
  const lessons = useSchedule((s) => s.data.lessons)
  const schoolDays = useSchedule((s) => s.data.settings.schoolDays)
  const accentOf = useSubjectAccent()

  const editing = form?.mode === 'edit' ? lessons.find((l) => l.id === form.id) : undefined
  const [state, setState] = useState<FormState | null>(null)
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (!form) return
    setTouched(false)
    if (form.mode === 'edit') {
      const l = useSchedule.getState().data.lessons.find((x) => x.id === form.id)
      if (l) setState(toForm(l))
    } else {
      setState(toForm(suggestLesson(useSchedule.getState().data.lessons, form.day)))
    }
  }, [form])

  const subjects = useMemo(() => knownSubjects(lessons), [lessons])

  if (!state) return null
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setState((s) => (s ? { ...s, [k]: v } : s))

  const errors = {
    subject: !state.subject.trim() ? 'Введите предмет' : undefined,
    time:
      !isValidTime(state.start) || !isValidTime(state.end)
        ? 'Укажите время'
        : toMinutes(state.end) <= toMinutes(state.start)
          ? 'Конец должен быть позже начала'
          : undefined,
    date: state.oneOff && !state.date ? 'Выберите дату' : undefined,
  }
  const invalid = Object.values(errors).some(Boolean)

  const q = normalizeSubject(state.subject)
  const suggestions = subjects
    .filter((s) => normalizeSubject(s) !== q && (!q || normalizeSubject(s).includes(q)))
    .slice(0, q ? 6 : 10)

  const onSubjectCommit = (subject: string) => {
    const d = subjectDefaults(lessons, subject)
    if (!d) return
    setState((s) => (s ? { ...s, room: s.room || d.room || '', teacher: s.teacher || d.teacher || '' } : s))
  }

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    setTouched(true)
    if (invalid) return
    const num = parseInt(state.number, 10)
    const draft: LessonDraft = {
      day: state.oneOff && state.date ? (((fromISODate(state.date).getDay() + 6) % 7) + 1) as Weekday : state.day,
      number: Number.isFinite(num) && num > 0 ? num : undefined,
      subject: state.subject.trim(),
      start: state.start,
      end: state.end,
      room: state.room.trim() || undefined,
      teacher: state.teacher.trim() || undefined,
      notes: state.notes.trim() || undefined,
      extracurricular: state.extracurricular || undefined,
      date: state.oneOff ? state.date : undefined,
    }
    const st = useSchedule.getState()
    if (editing) {
      st.updateLesson(editing.id, draft)
      toast('Изменения сохранены')
    } else {
      st.addLesson(draft)
      toast(`«${draft.subject}» добавлен ${onWeekday(draft.day)}`)
    }
    close()
  }

  const accent = accentOf(state.subject || 'x')
  const dur = isValidTime(state.start) && isValidTime(state.end) ? durationMinutes(state) : 0

  return (
    <Sheet
      open={!!form}
      onClose={close}
      title={editing ? 'Редактировать урок' : 'Новый урок'}
      subtitle={editing ? editing.subject : `${weekdayInfo(state.day).full}`}
      footer={
        <>
          {editing && (
            <button
              type="button"
              className="btn btn--ghost btn--danger-ghost foot-left"
              onClick={async () => {
                if (await deleteLessonFlow(editing)) close()
              }}
            >
              <Trash2 size={16} /> Удалить
            </button>
          )}
          <button type="button" className="btn btn--ghost" onClick={close}>Отмена</button>
          <button type="submit" form="lesson-form" className="btn btn--primary" disabled={touched && invalid}>
            Сохранить
          </button>
        </>
      }
    >
      <form id="lesson-form" className="form" onSubmit={submit} style={accentVars(accent)}>
        <Field label="Предмет" error={touched ? errors.subject : undefined}>
          <div className="input-accent">
            <span className="input-dot" aria-hidden />
            <input
              className="input"
              data-autofocus={!editing || undefined}
              value={state.subject}
              placeholder="Например, Математика"
              autoComplete="off"
              enterKeyHint="next"
              onChange={(e) => set('subject', e.target.value)}
              onBlur={() => onSubjectCommit(state.subject)}
            />
          </div>
        </Field>
        {suggestions.length > 0 && (
          <div className="suggest" aria-label="Предметы из расписания">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                className="suggest-chip"
                style={accentVars(accentOf(s))}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  set('subject', s)
                  onSubjectCommit(s)
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {!state.oneOff && (
          <FieldGroup label="День">
            <WeekdayPicker value={[state.day]} onChange={([d]) => set('day', d)} days={schoolDays} />
          </FieldGroup>
        )}

        <div className="field-row field-row--3">
          <Field label="Начало" error={touched ? errors.time : undefined}>
            <TimeInput label="Начало" value={state.start} onChange={(v) => set('start', v)} />
          </Field>
          <Field label="Конец" hint={dur > 0 ? `${dur} мин` : undefined}>
            <TimeInput label="Конец" value={state.end} onChange={(v) => set('end', v)} />
          </Field>
          <Field label="№ урока">
            <input
              className="input tnum"
              inputMode="numeric"
              value={state.number}
              placeholder="—"
              onChange={(e) => set('number', e.target.value.replace(/\D/g, '').slice(0, 2))}
            />
          </Field>
        </div>

        <div className="field-row">
          <Field label="Кабинет">
            <input className="input" value={state.room} placeholder="205" onChange={(e) => set('room', e.target.value)} />
          </Field>
          <Field label="Учитель">
            <input className="input" value={state.teacher} placeholder="Фамилия И. О." onChange={(e) => set('teacher', e.target.value)} />
          </Field>
        </div>

        <Field label="Заметки">
          <textarea className="input textarea" rows={2} value={state.notes} placeholder="Необязательно" onChange={(e) => set('notes', e.target.value)} />
        </Field>

        <div className="toggle-row">
          <div>
            <div className="toggle-title">Внеурочное занятие</div>
            <div className="toggle-desc">Кружок или курс внеурочной деятельности в расписании школы</div>
          </div>
          <Switch checked={state.extracurricular} onChange={(v) => set('extracurricular', v)} label="Внеурочное занятие" />
        </div>

        <div className="toggle-row">
          <div>
            <div className="toggle-title">Только в конкретную дату</div>
            <div className="toggle-desc">Разовый урок или замена — не повторяется каждую неделю</div>
          </div>
          <Switch checked={state.oneOff} onChange={(v) => set('oneOff', v)} label="Только в конкретную дату" />
        </div>
        {state.oneOff && (
          <Field label="Дата" error={touched ? errors.date : undefined}>
            <input className="input" type="date" value={state.date} onChange={(e) => set('date', e.target.value)} />
          </Field>
        )}
        <button type="submit" hidden />
      </form>
    </Sheet>
  )
}

export function LessonViewSheet() {
  const id = useEditor((s) => s.lessonView)
  const lesson = useSchedule((s) => s.data.lessons.find((l) => l.id === id))
  const accentOf = useSubjectAccent()
  const close = () => useEditor.getState().openLessonView(null)
  const [last, setLast] = useState<Lesson | undefined>(lesson)
  useEffect(() => {
    if (lesson) setLast(lesson)
  }, [lesson])
  const l = lesson ?? last
  if (!l) return null

  const rows = [
    { icon: Clock, label: 'Время', value: `${l.start} — ${l.end} · ${humanMinutes(durationMinutes(l))}` },
    { icon: CalendarDays, label: 'День', value: l.date ? `${weekdayInfo(l.day).full}, ${formatDayMonth(fromISODate(l.date))} (разово)` : `${weekdayInfo(l.day).full}, каждую неделю` },
    l.number !== undefined && { icon: Hash, label: 'Номер', value: `${l.number} урок${l.extracurricular ? ' · внеурочное' : ''}` },
    l.room && { icon: MapPin, label: 'Кабинет', value: l.room },
    l.teacher && { icon: User, label: 'Учитель', value: l.teacher },
    l.notes && { icon: StickyNote, label: 'Заметки', value: l.notes },
  ].filter(Boolean) as { icon: typeof Clock; label: string; value: string }[]

  return (
    <Sheet
      open={!!lesson}
      onClose={close}
      title={
        <span className="view-title" style={accentVars(accentOf(l.subject))}>
          <span className="view-dot" />
          {l.subject}
        </span>
      }
      footer={
        <>
          <button
            className="btn btn--ghost btn--danger-ghost foot-left"
            onClick={async () => {
              if (await deleteLessonFlow(l)) close()
            }}
          >
            <Trash2 size={16} /> Удалить
          </button>
          <button className="btn btn--primary" data-autofocus onClick={() => useEditor.getState().openLessonForm({ mode: 'edit', id: l.id })}>
            <SquarePen size={16} /> Редактировать
          </button>
        </>
      }
    >
      <dl className="detail-list">
        {rows.map((r) => (
          <div key={r.label} className="detail-row">
            <dt><r.icon size={15} />{r.label}</dt>
            <dd>{r.value}</dd>
          </div>
        ))}
      </dl>
    </Sheet>
  )
}
