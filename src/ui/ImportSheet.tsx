import { FileSpreadsheet, TriangleAlert, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { accentVars } from '../domain/accents'
import { WEEKDAYS } from '../domain/time'
import type { Lesson } from '../domain/types'
import { useSubjectAccent } from '../hooks/useAccent'
import { readScheduleFile, type ImportResult } from '../import/readFile'
import { useEditor } from '../store/useEditor'
import { useSchedule } from '../store/useSchedule'
import { confirmAction } from './confirm'
import { Sheet } from './Sheet'
import { toast } from './toast'

export function ImportSheet() {
  const open = useEditor((s) => s.importOpen)
  const close = () => useEditor.getState().setImportOpen(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [over, setOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const accentOf = useSubjectAccent()
  const hasLessons = useSchedule((s) => s.data.lessons.length > 0)

  useEffect(() => {
    if (open) {
      setResult(null)
      setError(null)
    }
  }, [open])

  const handle = async (file?: File | null) => {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      setResult(await readScheduleFile(file))
    } catch (e) {
      setResult(null)
      setError(e instanceof Error ? e.message : 'Не удалось прочитать файл.')
    } finally {
      setBusy(false)
    }
  }

  const apply = async () => {
    if (!result) return
    const store = useSchedule.getState()
    if (result.kind === 'backup') {
      const ok = await confirmAction({
        title: 'Восстановить из копии?',
        text: 'Текущие уроки, секции и настройки будут заменены данными из файла.',
        confirmLabel: 'Восстановить',
      })
      if (!ok) return
      store.replaceAll(result.data)
      toast('Данные восстановлены')
    } else {
      if (hasLessons) {
        const ok = await confirmAction({
          title: 'Заменить расписание?',
          text: 'Текущие уроки будут заменены уроками из файла. Секции и настройки останутся.',
          confirmLabel: 'Заменить',
        })
        if (!ok) return
      }
      store.replaceLessons(result.result.lessons, result.fileName)
      toast(`Импортировано уроков: ${result.result.lessons.length}`)
    }
    close()
  }

  const lessons = result?.kind === 'lessons' ? result.result.lessons : []
  const byDay = WEEKDAYS.map((d) => ({ ...d, list: lessons.filter((l) => l.day === d.id) })).filter((d) => d.list.length)
  const canApply = result && (result.kind === 'backup' || lessons.length > 0)

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Импорт расписания"
      subtitle="Excel (.xlsx), CSV или резервная копия (.json)"
      footer={
        <>
          <button className="btn btn--ghost" onClick={close}>Отмена</button>
          <button className="btn btn--primary" disabled={!canApply} onClick={apply}>
            {result?.kind === 'backup' ? 'Восстановить' : 'Импортировать'}
          </button>
        </>
      }
    >
      <div className="form">
        <button
          type="button"
          className={`dropzone ${over ? 'is-over' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setOver(true)
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setOver(false)
            void handle(e.dataTransfer.files?.[0])
          }}
        >
          <span className="dropzone-icon">{busy ? <span className="spinner" /> : <Upload size={20} />}</span>
          <span className="dropzone-title">{result ? result.fileName : 'Выберите файл или перетащите сюда'}</span>
          <span className="dropzone-hint">
            Из Google Таблиц: Файл → Скачать → Microsoft Excel (.xlsx)
          </span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xlsm,.csv,.tsv,.txt,.json"
          hidden
          onChange={(e) => {
            void handle(e.target.files?.[0])
            e.target.value = ''
          }}
        />

        {error && (
          <div className="notice notice--danger">
            <TriangleAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        {result?.kind === 'lessons' &&
          result.result.warnings.map((w) => (
            <div key={w} className="notice">
              <TriangleAlert size={16} />
              <span>{w}</span>
            </div>
          ))}

        {result?.kind === 'backup' && (
          <div className="notice notice--ok">
            <FileSpreadsheet size={16} />
            <span>
              Резервная копия: {result.data.lessons.length} уроков, {result.data.sections.length} секций.
            </span>
          </div>
        )}

        {byDay.length > 0 && (
          <div className="import-preview">
            <div className="import-summary">
              Найдено <b>{lessons.length}</b> уроков · {byDay.length} дн.
            </div>
            {byDay.map((d) => (
              <div key={d.id} className="import-day">
                <div className="import-day-title">{d.full}</div>
                {d.list.map((l: Lesson) => (
                  <div key={l.id} className="import-row" style={accentVars(accentOf(l.subject))}>
                    <span className="import-num tnum">{l.number ?? '·'}</span>
                    <span className="import-time tnum">{l.start}–{l.end}</span>
                    <span className="import-subj">{l.subject}</span>
                    <span className="import-extra">{[l.room, l.teacher].filter(Boolean).join(' · ')}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </Sheet>
  )
}
