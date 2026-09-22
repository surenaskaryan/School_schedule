import { GripVertical, MapPin, SquarePen, Trash2, User } from 'lucide-react'
import type { CSSProperties, HTMLAttributes, Ref } from 'react'
import { accentVars } from '../domain/accents'
import type { LessonState } from '../domain/time'
import type { AccentKey, Lesson } from '../domain/types'

interface Props {
  lesson: Lesson
  accent: AccentKey
  state?: LessonState
  /** 0..1 для текущего урока */
  progress?: number
  dim?: boolean
  editing?: boolean
  onOpen?(): void
  onEdit?(): void
  onDelete?(): void
  /** Для drag & drop (dnd-kit) */
  handleProps?: HTMLAttributes<HTMLButtonElement>
  handleRef?: Ref<HTMLButtonElement>
  dragging?: boolean
}

export function LessonCard({
  lesson, accent, state, progress, dim, editing, onOpen, onEdit, onDelete, handleProps, handleRef, dragging,
}: Props) {
  const cls = [
    'lesson',
    state === 'current' && 'is-current',
    state === 'past' && dim && 'is-past',
    editing && 'is-editing',
    dragging && 'is-dragging',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <article className={cls} style={accentVars(accent)}>
      <div className="lesson-time tnum">
        <span className="lesson-start">{lesson.start}</span>
        <span className="lesson-end">{lesson.end}</span>
      </div>

      <div
        className="lesson-card"
        role="button"
        tabIndex={0}
        onClick={editing ? onEdit : onOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            ;(editing ? onEdit : onOpen)?.()
          }
        }}
        aria-label={`${lesson.subject}, ${lesson.start}–${lesson.end}`}
      >
        <span className="lesson-bar" aria-hidden />
        <div className="lesson-main">
          <div className="lesson-kicker">
            {lesson.number !== undefined && <span className="tnum">{lesson.number} урок</span>}
            <span className="lesson-kicker-time tnum">{lesson.start} — {lesson.end}</span>
            {lesson.extracurricular && <span className="pill pill--soft">внеурочное</span>}
            {lesson.date && <span className="pill pill--soft">разово</span>}
            {state === 'current' && (
              <span className="live">
                <span className="live-dot" />
                Сейчас
              </span>
            )}
          </div>
          <h3 className="lesson-subject">{lesson.subject}</h3>
          {(lesson.room || lesson.teacher) && (
            <div className="lesson-meta">
              {lesson.room && (
                <span>
                  <MapPin size={13} />
                  {/^\d/.test(lesson.room) ? `Каб. ${lesson.room}` : lesson.room}
                </span>
              )}
              {lesson.teacher && (
                <span>
                  <User size={13} />
                  {lesson.teacher}
                </span>
              )}
            </div>
          )}
          {lesson.notes && <p className="lesson-notes">{lesson.notes}</p>}
        </div>

        {editing && (
          <div className="lesson-actions" onClick={(e) => e.stopPropagation()}>
            <button className="btn btn--icon btn--ghost" onClick={onEdit} aria-label="Редактировать">
              <SquarePen size={17} />
            </button>
            <button className="btn btn--icon btn--ghost btn--danger-ghost" onClick={onDelete} aria-label="Удалить">
              <Trash2 size={17} />
            </button>
            <button
              ref={handleRef}
              className="btn btn--icon btn--ghost drag-handle"
              aria-label="Перетащить"
              {...handleProps}
            >
              <GripVertical size={17} />
            </button>
          </div>
        )}

        {state === 'current' && progress !== undefined && (
          <span className="lesson-progress" style={{ '--p': progress } as CSSProperties} aria-hidden />
        )}
      </div>
    </article>
  )
}
