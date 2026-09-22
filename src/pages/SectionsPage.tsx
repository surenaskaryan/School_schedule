import {
  closestCenter, DndContext, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import { arrayMove, rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Check, Clock, GripVertical, LayoutGrid, MapPin, Plus, Settings2 } from 'lucide-react'
import type { HTMLAttributes, Ref } from 'react'
import { accentVars } from '../domain/accents'
import { SECTION_KINDS } from '../domain/sectionKinds'
import { formatDayMonth, fromISODate, toISODate, weekdayInfo } from '../domain/time'
import type { Section, SectionItem } from '../domain/types'
import { useNow } from '../hooks/useNow'
import { useEditor } from '../store/useEditor'
import { sortedSections, useSchedule } from '../store/useSchedule'
import { PageHeader } from '../ui/AppShell'
import { EmptyState } from '../ui/controls'
import { sectionIcon } from '../ui/icons'
import { ModeToggle } from '../ui/ModeToggle'

export function SectionsPage() {
  const data = useSchedule((s) => s.data)
  const sections = sortedSections(data)
  const editing = useSchedule((s) => s.mode === 'edit')
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const ids = sections.map((s) => s.id)
    useSchedule.getState().reorderSections(arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))))
  }
  const newSection = () => useEditor.getState().openSectionForm({ mode: 'add' })

  return (
    <>
      <PageHeader
        eyebrow="Всё, что вне уроков"
        title="Секции"
        actions={
          <>
            {editing && (
              <button className="btn btn--primary btn--sm hide-mobile" onClick={newSection}>
                <Plus size={15} /> Новая секция
              </button>
            )}
            <ModeToggle compact />
          </>
        }
      />

      {sections.length === 0 ? (
        <EmptyState
          icon={<LayoutGrid size={22} />}
          title="Секций пока нет"
          text="Секции — это домашние задания, кружки, тренировки, контрольные и всё остальное, что важно не забыть."
        >
          <button className="btn btn--primary" onClick={newSection}><Plus size={16} /> Создать секцию</button>
        </EmptyState>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={sections.map((s) => s.id)} strategy={rectSortingStrategy}>
            <div className="sections-grid">
              {sections.map((s, i) => (
                <SortableSection key={s.id} section={s} editing={editing} index={i} />
              ))}
              {editing && (
                <button className="add-card add-card--tall" onClick={newSection}>
                  <Plus size={18} /> Новая секция
                </button>
              )}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </>
  )
}

function SortableSection({ section, editing, index }: { section: Section; editing: boolean; index: number }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
    disabled: !editing,
  })
  return (
    <div
      ref={setNodeRef}
      className="rise"
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        zIndex: isDragging ? 5 : undefined,
        position: 'relative',
        animationDelay: `${60 + index * 50}ms`,
      }}
    >
      <SectionCard
        section={section}
        editing={editing}
        dragging={isDragging}
        handleRef={setActivatorNodeRef}
        handleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}

function SectionCard({
  section, editing, dragging, handleRef, handleProps,
}: {
  section: Section
  editing: boolean
  dragging?: boolean
  handleRef?: Ref<HTMLButtonElement>
  handleProps?: HTMLAttributes<HTMLButtonElement>
}) {
  const kind = SECTION_KINDS[section.kind]
  const Icon = sectionIcon(section.icon)
  const items = kind.sort ? [...section.items].sort(kind.sort) : section.items
  const open = (item?: SectionItem) => useEditor.getState().openItemForm({ sectionId: section.id, itemId: item?.id })
  const pending = kind.checkable ? section.items.filter((i) => !i.done).length : section.items.length

  return (
    <section className={`section-card ${dragging ? 'is-dragging' : ''}`} style={accentVars(section.accent)}>
      <header className="section-head">
        <span className="section-icon"><Icon size={18} /></span>
        <div className="section-head-text">
          <h2 className="section-title">{section.title}</h2>
          <p className="section-meta">
            {kind.label}
            {section.items.length > 0 && <> · <span className="tnum">{kind.checkable ? `${pending} из ${section.items.length}` : pending}</span></>}
          </p>
        </div>
        {editing && (
          <div className="section-actions">
            <button
              className="btn btn--icon btn--ghost"
              onClick={() => useEditor.getState().openSectionForm({ mode: 'edit', id: section.id })}
              aria-label="Настроить секцию"
            >
              <Settings2 size={17} />
            </button>
            <button ref={handleRef} className="btn btn--icon btn--ghost drag-handle" aria-label="Перетащить секцию" {...handleProps}>
              <GripVertical size={17} />
            </button>
          </div>
        )}
      </header>

      {items.length > 0 ? (
        <ul className="s-items">
          {items.map((it) => <ItemRow key={it.id} section={section} item={it} onOpen={() => open(it)} />)}
        </ul>
      ) : (
        <p className="s-empty">Пока пусто</p>
      )}

      <button className="s-add" onClick={() => open()}>
        <Plus size={15} /> Добавить {kind.itemNoun}
      </button>
    </section>
  )
}

function ItemRow({ section, item, onOpen }: { section: Section; item: SectionItem; onOpen(): void }) {
  const now = useNow(60_000)
  const kind = SECTION_KINDS[section.kind]
  const todayIso = toISODate(now)
  const overdue = kind.checkable && !item.done && item.date && item.date < todayIso
  const dateLabel = item.date ? (item.date === todayIso ? 'Сегодня' : formatDayMonth(fromISODate(item.date))) : null

  return (
    <li className={`s-item ${item.done ? 'is-done' : ''}`}>
      {kind.checkable && (
        <button
          className={`s-check ${item.done ? 'is-on' : ''}`}
          role="checkbox"
          aria-checked={!!item.done}
          aria-label={item.done ? 'Отметить как невыполненное' : 'Отметить как выполненное'}
          onClick={() => useSchedule.getState().updateItem(section.id, item.id, { done: !item.done || undefined })}
        >
          {item.done && <Check size={12} strokeWidth={3} />}
        </button>
      )}
      {section.kind === 'events' && item.date && (
        <span className="s-date tnum">
          <b>{fromISODate(item.date).getDate()}</b>
          <span>{formatDayMonth(fromISODate(item.date)).split(' ')[1].slice(0, 3)}</span>
        </span>
      )}
      <button className="s-body" onClick={onOpen}>
        <span className="s-title">{item.title}</span>
        <span className="s-meta">
          {section.kind === 'activities' && item.days?.length ? (
            <span>{item.days.map((d) => weekdayInfo(d).short).join(' · ')}</span>
          ) : null}
          {section.kind !== 'events' && dateLabel && <span className={overdue ? 'is-overdue' : ''}>{dateLabel}</span>}
          {item.time && (
            <span className="tnum"><Clock size={12} />{item.time}{item.endTime ? `–${item.endTime}` : ''}</span>
          )}
          {item.place && <span><MapPin size={12} />{item.place}</span>}
          {section.kind === 'notes' && item.note && <span className="s-note">{item.note}</span>}
        </span>
      </button>
    </li>
  )
}
