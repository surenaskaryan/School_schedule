import { Trash2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { accentVars } from '../domain/accents'
import { SECTION_KIND_LIST, SECTION_KINDS, type ItemFieldDef } from '../domain/sectionKinds'
import { isValidTime } from '../domain/time'
import type { AccentKey, Section, SectionItem, SectionKindId, Weekday } from '../domain/types'
import { useEditor } from '../store/useEditor'
import { useSchedule } from '../store/useSchedule'
import { confirmAction } from './confirm'
import { AccentPicker, Field, FieldGroup, IconPicker, Switch, TimeInput, WeekdayPicker } from './controls'
import { sectionIcon } from './icons'
import { Sheet } from './Sheet'
import { toast } from './toast'

export async function deleteSectionFlow(section: Section) {
  const ok = await confirmAction({
    title: 'Удалить секцию?',
    text: section.items.length
      ? `«${section.title}» и всё, что в ней (${section.items.length}), будет удалено.`
      : `«${section.title}» будет удалена.`,
  })
  if (!ok) return false
  useSchedule.getState().deleteSection(section.id)
  toast('Секция удалена')
  return true
}

/* ---------------- Секция ---------------- */

type SectionState = { title: string; icon: string; accent: AccentKey; kind: SectionKindId }

export function SectionFormSheet() {
  const form = useEditor((s) => s.sectionForm)
  const close = () => useEditor.getState().openSectionForm(null)
  const section = useSchedule((s) => (form?.mode === 'edit' ? s.data.sections.find((x) => x.id === form.id) : undefined))
  const [st, setSt] = useState<SectionState>({ title: '', icon: 'sparkles', accent: 'violet', kind: 'tasks' })
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (!form) return
    setTouched(false)
    const s = form.mode === 'edit' ? useSchedule.getState().data.sections.find((x) => x.id === form.id) : undefined
    setSt(s ? { title: s.title, icon: s.icon, accent: s.accent, kind: s.kind } : { title: '', icon: 'sparkles', accent: 'violet', kind: 'tasks' })
  }, [form])

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    setTouched(true)
    if (!st.title.trim()) return
    const store = useSchedule.getState()
    if (section) {
      store.updateSection(section.id, { ...st, title: st.title.trim() })
      toast('Секция обновлена')
    } else {
      store.addSection({ ...st, title: st.title.trim() })
      toast(`Секция «${st.title.trim()}» создана`)
    }
    close()
  }

  const Icon = sectionIcon(st.icon)

  return (
    <Sheet
      open={!!form}
      onClose={close}
      title={section ? 'Настроить секцию' : 'Новая секция'}
      footer={
        <>
          {section && (
            <button
              type="button"
              className="btn btn--ghost btn--danger-ghost foot-left"
              onClick={async () => {
                if (await deleteSectionFlow(section)) close()
              }}
            >
              <Trash2 size={16} /> Удалить
            </button>
          )}
          <button type="button" className="btn btn--ghost" onClick={close}>Отмена</button>
          <button type="submit" form="section-form" className="btn btn--primary">Сохранить</button>
        </>
      }
    >
      <form id="section-form" className="form" onSubmit={submit}>
        <div className="section-preview" style={accentVars(st.accent)}>
          <span className="section-icon section-icon--lg"><Icon size={22} /></span>
          <div>
            <div className="section-preview-title">{st.title || 'Название секции'}</div>
            <div className="section-preview-kind">{SECTION_KINDS[st.kind].label}</div>
          </div>
        </div>

        <Field label="Название" error={touched && !st.title.trim() ? 'Введите название' : undefined}>
          <input
            className="input"
            data-autofocus
            value={st.title}
            placeholder="Например, Репетитор"
            onChange={(e) => setSt({ ...st, title: e.target.value })}
          />
        </Field>

        <FieldGroup label="Тип">
          <div className="kind-grid">
            {SECTION_KIND_LIST.map((k) => (
              <button
                key={k.id}
                type="button"
                className={`kind-opt ${st.kind === k.id ? 'is-on' : ''}`}
                aria-pressed={st.kind === k.id}
                onClick={() => setSt({ ...st, kind: k.id })}
              >
                <span className="kind-label">{k.label}</span>
                <span className="kind-desc">{k.description}</span>
              </button>
            ))}
          </div>
        </FieldGroup>

        <FieldGroup label="Цвет">
          <AccentPicker value={st.accent} onChange={(accent) => setSt({ ...st, accent })} />
        </FieldGroup>

        <FieldGroup label="Иконка">
          <IconPicker value={st.icon} accent={st.accent} onChange={(icon) => setSt({ ...st, icon })} />
        </FieldGroup>
        <button type="submit" hidden />
      </form>
    </Sheet>
  )
}

/* ---------------- Элемент секции ---------------- */

type ItemState = Omit<SectionItem, 'id'>

export function ItemFormSheet() {
  const form = useEditor((s) => s.itemForm)
  const close = () => useEditor.getState().openItemForm(null)
  const section = useSchedule((s) => s.data.sections.find((x) => x.id === form?.sectionId))
  const [lastSection, setLastSection] = useState(section)
  const [st, setSt] = useState<ItemState>({ title: '' })
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (section) setLastSection(section)
  }, [section])

  useEffect(() => {
    if (!form) return
    setTouched(false)
    const sec = useSchedule.getState().data.sections.find((x) => x.id === form.sectionId)
    const item = sec?.items.find((i) => i.id === form.itemId)
    if (item) {
      const { id: _id, ...rest } = item
      void _id
      setSt(rest)
    } else setSt({ title: '' })
  }, [form])

  const sec = section ?? lastSection
  if (!sec) return null
  const kind = SECTION_KINDS[sec.kind]
  const editing = !!form?.itemId

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    setTouched(true)
    if (!st.title.trim()) return
    const store = useSchedule.getState()
    const clean = {
      ...st,
      title: st.title.trim(),
      time: st.time && isValidTime(st.time) ? st.time : undefined,
      endTime: st.endTime && isValidTime(st.endTime) ? st.endTime : undefined,
    }
    if (editing) store.updateItem(sec.id, form!.itemId!, clean)
    else store.addItem(sec.id, clean)
    toast(editing ? 'Сохранено' : `Добавлено в «${sec.title}»`)
    close()
  }

  const renderField = (f: ItemFieldDef) => {
    const v = st[f.key]
    const setV = (val: unknown) => setSt((s) => ({ ...s, [f.key]: val === '' ? undefined : val }))
    switch (f.type) {
      case 'text':
        return (
          <Field key={f.key} label={f.label} error={f.required && touched && !st.title.trim() ? 'Обязательное поле' : undefined}>
            <input
              className="input"
              data-autofocus={f.key === 'title' || undefined}
              value={(v as string) ?? ''}
              placeholder={f.placeholder}
              onChange={(e) => setV(e.target.value)}
            />
          </Field>
        )
      case 'textarea':
        return (
          <Field key={f.key} label={f.label}>
            <textarea className="input textarea" rows={3} value={(v as string) ?? ''} placeholder={f.placeholder ?? 'Необязательно'} onChange={(e) => setV(e.target.value)} />
          </Field>
        )
      case 'date':
        return (
          <Field key={f.key} label={f.label}>
            <input className="input" type="date" value={(v as string) ?? ''} onChange={(e) => setV(e.target.value)} />
          </Field>
        )
      case 'time':
        return (
          <Field key={f.key} label={f.label}>
            <TimeInput label={f.label} value={(v as string) ?? ''} onChange={setV} />
          </Field>
        )
      case 'weekdays':
        return (
          <FieldGroup key={f.key} label={f.label}>
            <WeekdayPicker multiple value={(v as Weekday[]) ?? []} onChange={(d) => setV(d.length ? d : undefined)} />
          </FieldGroup>
        )
      case 'checkbox':
        return (
          <div key={f.key} className="toggle-row">
            <div className="toggle-title">{f.label}</div>
            <Switch checked={!!v} onChange={setV} label={f.label} />
          </div>
        )
    }
  }

  // Время рядом в одну строку, остальное — по одному полю.
  const fields = kind.fields
  const timeFields = fields.filter((f) => f.type === 'time')
  const other = fields.filter((f) => f.type !== 'time')
  const timeAfter = other.findIndex((f) => f.type === 'weekdays' || f.type === 'date')

  return (
    <Sheet
      open={!!form}
      onClose={close}
      title={editing ? 'Редактировать' : `Добавить ${kind.itemNoun}`}
      subtitle={sec.title}
      footer={
        <>
          {editing && (
            <button
              type="button"
              className="btn btn--ghost btn--danger-ghost foot-left"
              onClick={async () => {
                const ok = await confirmAction({ title: 'Удалить запись?', text: `«${st.title}» будет удалена.` })
                if (!ok) return
                useSchedule.getState().deleteItem(sec.id, form!.itemId!)
                toast('Удалено')
                close()
              }}
            >
              <Trash2 size={16} /> Удалить
            </button>
          )}
          <button type="button" className="btn btn--ghost" onClick={close}>Отмена</button>
          <button type="submit" form="item-form" className="btn btn--primary">Сохранить</button>
        </>
      }
    >
      <form id="item-form" className="form" onSubmit={submit} style={accentVars(sec.accent)}>
        {other.map((f, i) => (
          <div key={f.key} className="form-slot">
            {renderField(f)}
            {i === (timeAfter === -1 ? 0 : timeAfter) && timeFields.length > 0 && (
              <div className={`field-row ${timeFields.length === 1 ? 'field-row--1' : ''}`}>{timeFields.map(renderField)}</div>
            )}
          </div>
        ))}
        {kind.checkable && editing && (
          <div className="toggle-row">
            <div className="toggle-title">Выполнено</div>
            <Switch checked={!!st.done} onChange={(done) => setSt({ ...st, done: done || undefined })} label="Выполнено" />
          </div>
        )}
        <button type="submit" hidden />
      </form>
    </Sheet>
  )
}
